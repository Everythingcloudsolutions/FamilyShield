---
description: "Continue FamilyShield app development with architecture-first decisions, remote tunnel-aware operations, and functional end-to-end delivery"
name: "Continue Functional Development"
argument-hint: "Feature/bug/area to advance (e.g., API alerts pipeline, portal auth, deploy-dev blockers)"
agent: "agent"
---
Continue implementation of FamilyShield for the specified target area, keeping architecture and design constraints intact and prioritizing a working functional outcome.

Inputs:
- User target area or goal from prompt invocation arguments
- Current repository state and existing implementation
- Remote access is available through the established SSH tunnel

Required approach:
1. Read project context from [CLAUDE.md](../../CLAUDE.md), [README.md](../../README.md), and [docs/architecture/README.md](../../docs/architecture/README.md).
2. Identify the next highest-value incomplete item for the requested target area.
3. Implement the change end-to-end in small, verifiable steps:
   - Update code and related configuration.
   - Add or update tests.
   - Validate with relevant local commands.
   - If needed, perform safe remote checks over the existing SSH tunnel.
4. Preserve architecture decisions (OCI + Cloudflare Tunnel + Supabase + Redis + Next.js + API worker + mitmproxy) unless explicitly asked to change them.
5. Keep security and deployment safety in mind:
   - Do not expose secrets.
   - Avoid destructive commands unless explicitly approved.
   - Prefer reversible changes and clear migration steps.

Output format:
- Goal selected and assumptions
- Files changed and why
- Commands run and key results
- Functional status after changes (what works now)
- Remaining blockers or next smallest step

Quality bar:
- Deliver runnable, tested increments, not partial scaffolding.
- Maintain consistency with existing coding standards and workflows.
- Call out ambiguity early and proceed with explicit assumptions when safe.
