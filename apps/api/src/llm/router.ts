/**
 * FamilyShield LLM Router
 * =======================
 * Routes AI classification requests to Groq (primary) or Anthropic (fallback).
 * Tracks spend per call and stores in Supabase for the spend tracker widget.
 *
 * Groq:     llama-3.3-70b-versatile — free 500k tokens/day
 * Anthropic: claude-haiku-4-5       — ~$0.02 CAD/month fallback usage
 */

import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import type { EnrichedEvent } from "../types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface RiskResult {
  risk_level: "low" | "medium" | "high" | "critical";
  categories: string[];
  confidence: number;
  provider: "groq" | "anthropic";
  tokens_used: number;
}

const SYSTEM_PROMPT = `You are FamilyShield's content safety classifier.
Classify the provided content metadata for risk to children ages 6-17.

Respond ONLY with a JSON object — no markdown, no preamble:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "categories": ["violence", "adult", "gambling", "drugs", "hate", "predatory", "gaming", "educational", "entertainment"],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}

Risk levels:
- low: educational, family-friendly, age-appropriate
- medium: mild violence, scary themes, some mature language
- high: significant violence, strong language, adult themes, inappropriate for under-15
- critical: sexual content, extreme violence, drugs, predatory content — block immediately`;

function buildPrompt(event: EnrichedEvent): string {
  return `Platform: ${event.platform}
Type: ${event.content_type}
Title: ${event.title ?? "unknown"}
Category: ${event.category ?? "unknown"}
Description: ${(event.description ?? "").slice(0, 200)}
Age restriction flag: ${event.age_restricted ?? false}
Mature flag: ${event.mature_flag ?? false}`;
}

export async function scoreRisk(event: EnrichedEvent): Promise<RiskResult> {
  const prompt = buildPrompt(event);

  // Try Groq first
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user",   content: prompt },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    const parsed = parseRiskResponse(text);
    return {
      ...parsed,
      provider: "groq",
      tokens_used: completion.usage?.total_tokens ?? 0,
    };
  } catch (groqError: any) {
    // Fallback to Anthropic if Groq fails or quota exceeded
    console.warn("Groq failed, falling back to Anthropic:", groqError?.message);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0]?.type === "text" ? message.content[0].text : "";
    const parsed = parseRiskResponse(text);
    return {
      ...parsed,
      provider: "anthropic",
      tokens_used: (message.usage.input_tokens ?? 0) + (message.usage.output_tokens ?? 0),
    };
  }
}

function parseRiskResponse(text: string): Omit<RiskResult, "provider" | "tokens_used"> {
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      risk_level: parsed.risk_level ?? "medium",
      categories: parsed.categories ?? [],
      confidence: parsed.confidence ?? 0.5,
    };
  } catch {
    // Safe default on parse failure
    return { risk_level: "medium", categories: ["unknown"], confidence: 0.3 };
  }
}
