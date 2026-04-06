# /review-alerts — Review Recent FamilyShield Risk Alerts

Query Supabase for recent high-risk events and produce a human-readable summary.

## Steps

1. Ask the user:
   - Time period: last 24 hours (default) / last 7 days / last 30 days
   - Filter by child? (all children, or specific child name)
   - Minimum risk level: medium (default) / high / critical only

2. Query Supabase using the REST API or Supabase CLI:

```bash
# Using curl against Supabase REST API
curl -s "{SUPABASE_URL}/rest/v1/events" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -G \
  --data-urlencode "select=id,device_id,child_id,platform,content_id,content_title,risk_level,risk_categories,created_at" \
  --data-urlencode "risk_level=in.(medium,high,critical)" \
  --data-urlencode "created_at=gte.$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --data-urlencode "order=created_at.desc" \
  --data-urlencode "limit=100"
```

3. Also query the children and devices tables to resolve IDs to names.

4. Also check for any unacknowledged alerts:
```bash
curl -s "{SUPABASE_URL}/rest/v1/alerts" \
  -H "apikey: {SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer {SUPABASE_ANON_KEY}" \
  -G \
  --data-urlencode "acknowledged_at=is.null" \
  --data-urlencode "order=sent_at.desc"
```

## Report format

Produce a clear summary with:

### Summary
- Total events in period
- Breakdown by risk level (medium / high / critical)
- Breakdown by child
- Breakdown by platform

### Top concerns (high/critical only)
For each high/critical event, show:
- Child name
- Platform (YouTube / Roblox / etc.)
- Content title (if available)
- Risk categories (e.g. "violence", "mature content")
- When it happened
- Whether parent was notified (alert sent)

### Patterns to watch
Identify any patterns:
- Same child repeatedly accessing similar content
- Specific platforms generating most alerts
- Time-of-day patterns (late night activity)
- Unusual volume spikes

### Unacknowledged alerts
List any alerts that were sent but not acknowledged by the parent.

### Recommended actions
Based on the data, suggest:
- Rules to add (e.g. "Consider blocking gaming sites after 10pm for [child]")
- Profile adjustments (e.g. "Consider moving [child] to the stricter profile")
- Follow-up conversations to have with the child

## Environment variables needed
- `SUPABASE_URL` — from `.env` or GitHub Secrets
- `SUPABASE_ANON_KEY` — from `.env` or GitHub Secrets

## Example output structure

```
📊 FamilyShield Alert Review — Last 24 Hours
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary
  Total events: 147
  Medium risk:   89
  High risk:     12  ← requires attention
  Critical:       2  ← immediate action needed

By child:
  Emma (age 12):  94 events (8 high, 2 critical)
  Jack  (age 9):  53 events (4 high, 0 critical)

⚠️  High Risk Events (12)
...

🚨 Critical Events (2)
...

📋 Unacknowledged Alerts (3)
...

💡 Recommendations
...
```
