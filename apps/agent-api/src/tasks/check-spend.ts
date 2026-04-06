/**
 * Task: check-spend
 * =================
 * Builds the prompt for reviewing LLM API spend.
 * Checks Supabase llm_spend table (if it exists) and parses recent logs
 * to estimate Groq token usage and Anthropic fallback invocations.
 *
 * Budget targets (2026):
 *   Groq:      500k tokens/day FREE — 15M tokens/month
 *   Anthropic: $5 CAD/month hard cap for fallback
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

/** Monthly Anthropic budget cap in CAD */
const MONTHLY_BUDGET_CAD = 5.0;

/** Approximate claude-haiku-4-5 pricing per million tokens (input + output blended) */
const HAIKU_COST_PER_MILLION_CAD = 0.80; // ~$0.80 CAD blended (input $0.25/M + output $1.25/M)

export function buildCheckSpendPrompt(): string {
  const supabaseUrl     = process.env.SUPABASE_URL ?? "(not set)";
  const hasSupabaseKey  = Boolean(process.env.SUPABASE_SERVICE_KEY);
  const currentMonth    = new Date().toISOString().slice(0, 7); // YYYY-MM

  return `
Review FamilyShield's LLM API spend for ${currentMonth}.

## Budget Context

| Provider | Model                    | Quota / Cap                  |
|----------|--------------------------|------------------------------|
| Groq     | llama-3.3-70b-versatile  | 500k tokens/day FREE         |
| Anthropic| claude-haiku-4-5         | $${MONTHLY_BUDGET_CAD} CAD/month hard cap |

Groq fallback → Anthropic happens when:
1. Groq returns an error (rate limit, outage)
2. Groq quota is exhausted for the day

## Approximate Anthropic pricing (claude-haiku-4-5)
- Input:  ~$0.25 USD / 1M tokens  (~$0.34 CAD)
- Output: ~$1.25 USD / 1M tokens  (~$1.70 CAD)
- Blended (90% input / 10% output): ~${HAIKU_COST_PER_MILLION_CAD.toFixed(2)} CAD / 1M tokens
- Monthly budget of $${MONTHLY_BUDGET_CAD} CAD ≈ ~${Math.floor(MONTHLY_BUDGET_CAD / HAIKU_COST_PER_MILLION_CAD)}M tokens fallback capacity

## What to check

1. **Supabase llm_spend table** — Read the LLM router code first to understand the data model:
   Read file: llm/router.ts

   Then query Supabase if credentials are available:
   ${hasSupabaseKey ? `curl -s -H "apikey: $SUPABASE_SERVICE_KEY" \\
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \\
        "${supabaseUrl}/rest/v1/llm_spend?order=created_at.desc&limit=50"` : "(SUPABASE_SERVICE_KEY not set — check llm/router.ts and logs only)"}

2. **Log analysis** — Search recent logs for Anthropic fallback usage:
   Look for lines containing "Groq failed, falling back to Anthropic" in recent logs.
   Use Grep to search the worker source code for how fallbacks are logged.

3. **content_events table** — Count ai_provider distribution:
   ${hasSupabaseKey ? `curl -s -H "apikey: $SUPABASE_SERVICE_KEY" \\
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \\
        "${supabaseUrl}/rest/v1/content_events?select=ai_provider&order=captured_at.desc&limit=1000"` : "(skipping — no Supabase credentials)"}

4. **Risk score cache hit rate** — Redis cache reduces AI calls:
   Check how many events have cached risk scores vs fresh AI calls.
   Look for "Risk score from cache" log lines.

## Report format

Provide:
- Groq usage this month: N tokens (N% of daily free quota on average)
- Anthropic fallbacks this month: N calls, N tokens, estimated $X.XX CAD
- Budget remaining: $X.XX CAD (XX% used)
- Cache hit rate: XX% (reduces AI spend)
- Recommendation: OK / Warning / Action required

Flag immediately if Anthropic spend exceeds $${(MONTHLY_BUDGET_CAD * 0.8).toFixed(2)} CAD (80% of budget).
`.trim();
}
