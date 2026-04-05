# FamilyShield Agent API

Claude Agent SDK-based CLI for managing the FamilyShield content enrichment pipeline.

## What it does

The agent reads the API worker source code (`apps/api/src/`) and uses the Claude Agent SDK
to help you manage and operate the enrichment pipeline without leaving the terminal.

## Tasks

| Task | Description |
|------|-------------|
| `review-queue` | Show Redis queue depth and recent enrichment activity |
| `check-spend` | Review LLM API spend vs monthly budget ($5 CAD Anthropic cap) |
| `add-enricher <platform>` | Guide through adding a new platform enricher |
| `review-logs` | Analyse API worker logs for errors and anomalies |
| `diagnose <platform>` | Diagnose enrichment issues for a specific platform |
| `test-enricher <platform> <id>` | Test a specific enricher against a real content ID |

## Setup

```bash
cd apps/agent-api
cp ../../.env.example .env
# Edit .env with your credentials
npm install
```

### Required environment variables

```bash
ANTHROPIC_API_KEY=sk-ant-...     # Claude API key (required)
SUPABASE_URL=https://...         # Supabase project URL (optional)
SUPABASE_SERVICE_KEY=eyJ...      # Supabase service role key (optional)
REDIS_URL=redis://localhost:6379 # Redis URL (optional, defaults to localhost)
GROQ_API_KEY=gsk_...             # Groq API key (optional, for spend tracking)
```

## Usage

```bash
# Review queue depth and recent events
npx tsx src/index.ts review-queue

# Check AI API spend vs budget
npx tsx src/index.ts check-spend

# Add a new enricher for Instagram
npx tsx src/index.ts add-enricher instagram

# Review API worker logs for errors
npx tsx src/index.ts review-logs

# Diagnose YouTube enrichment issues
npx tsx src/index.ts diagnose youtube

# Test the YouTube enricher with a specific video ID
npx tsx src/index.ts test-enricher youtube dQw4w9WgXcQ

# Test the Roblox enricher
npx tsx src/index.ts test-enricher roblox 3290543031

# Test the Twitch enricher
npx tsx src/index.ts test-enricher twitch xqc
```

## Architecture

```
agent-api/
  src/
    index.ts          -- CLI entry point, argument parsing
    agent.ts          -- Core agent (system prompt, query() invocation)
    tasks/
      review-queue.ts -- review-queue + diagnose prompts
      check-spend.ts  -- check-spend prompt
      add-enricher.ts -- add-enricher prompt
      review-logs.ts  -- review-logs + diagnose prompts
      test-enricher.ts-- test-enricher prompt
```

The agent uses the Claude Agent SDK `query()` function with:
- **Model**: `claude-sonnet-4-6`
- **Tools**: `Read`, `Glob`, `Grep`, `Bash`
- **cwd**: `apps/api/src/` (the API worker source)
- **Permission mode**: `default` (prompts before destructive operations)

## Agent capabilities

- Reads and explains enricher code (`apps/api/src/enrichers/`)
- Makes live API calls to test enrichers (YouTube, Roblox, Twitch, Discord)
- Queries Supabase for recent events and spend data
- Checks Redis queue depth
- Proposes code fixes for broken enrichers
- Tracks AI API spend vs budget

The agent will **not** commit code changes — it proposes them for developer review.

## Platform coverage

| Platform | Enricher | API Auth Needed |
|----------|----------|-----------------|
| YouTube | `enrichers/youtube.ts` | `YOUTUBE_API_KEY` |
| Roblox | `enrichers/roblox.ts` | None (public API) |
| Twitch | `enrichers/twitch.ts` | `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` |
| Discord | `enrichers/discord.ts` | `DISCORD_BOT_TOKEN` |
| Instagram | time-based only | None |

## Building

```bash
npm run build      # Compile TypeScript to dist/
npm run typecheck  # Type-check without emitting
npm run lint       # ESLint check
```

## Docker

```bash
# Build image
docker build -t familyshield-agent-api .

# Run a task (mount the API src dir so the agent can read enrichers)
docker run --rm \
  --env-file .env \
  -v $(pwd)/../api/src:/app/api-src:ro \
  familyshield-agent-api review-queue
```

---

Author: FamilyShield / Everythingcloudsolutions
Year: 2026
