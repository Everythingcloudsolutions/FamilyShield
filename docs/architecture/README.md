# FamilyShield — Architecture

> All diagrams render natively in GitHub. For editable source files see `docs/diagrams/`.

---

## C4 Model

The C4 model describes the system at four levels of detail.

---

### Level 1 — System Context

```mermaid
C4Context
  title FamilyShield — System Context

  Person(parent, "Parent / Guardian", "Manages rules, reviews usage, receives alerts")
  Person(child, "Child", "Uses internet across all devices")

  System(familyshield, "FamilyShield", "Parental control platform — DNS filtering, SSL inspection, AI risk scoring, usage dashboard")

  System_Ext(oci, "Oracle Cloud (OCI Toronto)", "Always Free ARM VM — hosts all backend services")
  System_Ext(cloudflare, "Cloudflare", "DNS, Tunnel, Zero Trust access")
  System_Ext(supabase, "Supabase", "PostgreSQL database + Realtime")
  System_Ext(groq, "Groq / Anthropic", "AI risk classification")
  System_Ext(platforms, "Content Platforms", "YouTube, Roblox, Twitch, Discord APIs")

  Rel(parent, familyshield, "Manages rules, views dashboard", "HTTPS")
  Rel(child, familyshield, "All internet traffic routed through", "WireGuard VPN / DoH")
  Rel(familyshield, oci, "Runs on")
  Rel(familyshield, cloudflare, "DNS + Tunnel")
  Rel(familyshield, supabase, "Stores events + rules")
  Rel(familyshield, groq, "AI risk scoring")
  Rel(familyshield, platforms, "Enriches content metadata")
```

---

### Level 2 — Container Diagram

```mermaid
C4Container
  title FamilyShield — Container Diagram

  Person(parent, "Parent")
  Person(child, "Child device")

  Container_Boundary(oci_vm, "OCI ARM VM — ca-toronto-1") {
    Container(adguard, "AdGuard Home", "Docker", "DNS filtering, per-device profiles, DoH/DoT")
    Container(headscale, "Headscale", "Docker", "Self-hosted Tailscale control plane — WireGuard VPN mesh")
    Container(mitm, "mitmproxy", "Docker / Python", "Transparent SSL proxy — extracts content IDs")
    Container(redis, "Redis", "Docker", "Event queue — mitmproxy → enrichment worker")
    Container(api, "API Worker", "Node.js / Docker", "Platform API enrichment + AI risk scoring")
    Container(nodered, "Node-RED", "Docker", "Rule engine — evaluates events against child profiles")
    Container(influxdb, "InfluxDB", "Docker", "Time-series metrics storage")
    Container(grafana, "Grafana", "Docker", "Usage dashboards")
    Container(ntfy, "ntfy", "Docker", "Push notifications to parent phone")
    Container(cloudflared, "cloudflared", "Docker", "Cloudflare Tunnel daemon — outbound only")
  }

  Container(portal, "Parent Portal", "Next.js 14", "Hosted on Cloudflare Pages — familyshield.everythingcloud.ca")
  ContainerDb(supabase, "Supabase", "PostgreSQL", "Events, rules, profiles, audit log")

  Rel(child, adguard, "DNS queries", "DoH port 443")
  Rel(child, headscale, "VPN connection", "WireGuard UDP 51820")
  Rel(child, mitm, "HTTPS traffic", "Transparent proxy")
  Rel(mitm, redis, "Content events", "Redis LPUSH")
  Rel(redis, api, "Consumes events", "Redis BLPOP")
  Rel(api, nodered, "Enriched events", "HTTP")
  Rel(api, supabase, "Stores results", "HTTPS")
  Rel(nodered, adguard, "Block/allow", "REST API")
  Rel(nodered, ntfy, "Push alerts", "HTTP")
  Rel(influxdb, grafana, "Metrics", "InfluxDB API")
  Rel(cloudflared, portal, "Exposes portal", "Tunnel")
  Rel(parent, portal, "Manages rules", "HTTPS")
  Rel(portal, supabase, "Realtime updates", "WebSocket")
```

---

### Level 3 — Component: API Worker

```mermaid
C4Component
  title API Worker — Component Diagram

  Container_Boundary(api, "API Worker (Node.js)") {
    Component(queue, "Event Consumer", "Redis BLPOP", "Consumes raw events from mitmproxy")
    Component(enricher, "Platform Enricher", "TypeScript", "Calls YouTube, Roblox, Twitch, Discord APIs")
    Component(cache, "Metadata Cache", "Redis TTL 24h", "Avoids duplicate API calls for same content ID")
    Component(llm, "LLM Router", "TypeScript", "Groq primary, Anthropic fallback, spend tracking")
    Component(store, "Event Store", "Supabase client", "Persists enriched events to PostgreSQL")
    Component(alerts, "Alert Dispatcher", "TypeScript", "Triggers ntfy push if risk threshold exceeded")
    Component(health, "Health Endpoint", "Express", "GET /health — used by Docker healthcheck")
  }

  ComponentDb(redis, "Redis", "Event queue")
  ComponentDb(supabase, "Supabase DB", "Events table")
  Component_Ext(youtube, "YouTube Data API v3")
  Component_Ext(roblox, "Roblox Open API")
  Component_Ext(twitch, "Twitch API")
  Component_Ext(groq, "Groq API")
  Component_Ext(anthropic, "Anthropic API")

  Rel(queue, redis, "Reads events")
  Rel(queue, enricher, "Passes event")
  Rel(enricher, cache, "Check cache first")
  Rel(enricher, youtube, "video ID → title/category")
  Rel(enricher, roblox, "game ID → name/rating")
  Rel(enricher, twitch, "channel → mature flag")
  Rel(enricher, llm, "Enriched metadata → risk score")
  Rel(llm, groq, "Primary classifier")
  Rel(llm, anthropic, "Fallback classifier")
  Rel(llm, store, "Stores result")
  Rel(store, supabase, "INSERT event")
  Rel(store, alerts, "If risk >= threshold")
```

---

## Deployment Diagram

```mermaid
flowchart TB
  subgraph github["GitHub (Private Repo)"]
    code["Source code"]
    actions["GitHub Actions"]
    secrets["Repository Secrets"]
    ghcr["GHCR — Docker images"]
  end

  subgraph oci["OCI Toronto — ca-toronto-1"]
    subgraph dev_comp["Compartment: familyshield-dev"]
      dev_vm["ARM VM\n4 OCPU / 24GB\nVM.Standard.A1.Flex"]
      dev_bucket["Object Storage\nTerraform state"]
    end
    subgraph stg_comp["Compartment: familyshield-staging"]
      stg_vm["ARM VM"]
    end
    subgraph prd_comp["Compartment: familyshield-prod"]
      prd_vm["ARM VM"]
    end
  end

  subgraph cloudflare["Cloudflare"]
    dns["DNS — everythingcloud.ca"]
    tunnel_dev["Tunnel → dev"]
    tunnel_stg["Tunnel → staging"]
    tunnel_prd["Tunnel → prod"]
    zt["Zero Trust"]
  end

  subgraph external["External Services"]
    supabase["Supabase"]
    groq["Groq"]
    anthropic["Anthropic"]
  end

  code --> actions
  secrets --> actions
  actions -->|"tofu apply (auto)"| dev_comp
  actions -->|"tofu apply (auto)"| stg_comp
  actions -->|"tofu apply (manual approve)"| prd_comp
  actions --> ghcr
  ghcr -->|"docker pull"| dev_vm
  ghcr -->|"docker pull"| stg_vm
  ghcr -->|"docker pull"| prd_vm
  dev_vm --> tunnel_dev --> dns
  stg_vm --> tunnel_stg --> dns
  prd_vm --> tunnel_prd --> dns
  dns --> zt
  dev_vm --> supabase
  dev_vm --> groq
  dev_vm --> anthropic
```

---

## Data Flow — Content Inspection

```mermaid
sequenceDiagram
  participant D as Child Device
  participant AG as AdGuard (DNS)
  participant M as mitmproxy
  participant R as Redis
  participant W as API Worker
  participant YT as YouTube API
  participant AI as Groq AI
  participant DB as Supabase
  participant P as Parent Portal
  participant N as ntfy (Push)

  D->>AG: DNS query: youtube.com
  AG->>AG: Check blocklist
  AG-->>D: Resolve (allowed)

  D->>M: HTTPS GET youtube.com/watch?v=xYz123
  M->>M: Decrypt (CA cert trusted)
  M->>M: Extract video_id=xYz123
  M->>R: LPUSH content_events {platform,id,device,ts}

  W->>R: BLPOP content_events
  W->>W: Check cache (miss)
  W->>YT: GET /videos?id=xYz123&part=snippet,contentRating
  YT-->>W: {title, category, ytRating}
  W->>AI: classify({title, category, platform})
  AI-->>W: {risk_level: "medium", categories: ["gaming"]}
  W->>DB: INSERT events (device, child, content, risk)
  W->>DB: UPDATE child_stats

  alt risk_level >= threshold
    W->>N: POST /familyshield-alerts {title, risk, child}
    N-->>P: Push notification to parent
  end

  P->>DB: Subscribe realtime
  DB-->>P: Event streamed (WebSocket)
```

---

## Environment Architecture

```mermaid
flowchart LR
  subgraph environments["Three OCI Compartments"]
    dev["dev\nfamilyshield-dev.everythingcloud.ca\nAuto-deploy on merge"]
    staging["staging\nfamilyshield-staging.everythingcloud.ca\nAuto-deploy after dev"]
    prod["prod\nfamilyshield.everythingcloud.ca\nManual approval required"]
  end

  dev -->|"Passes smoke tests"| staging
  staging -->|"Manual trigger + approve"| prod
```

---

## Security Architecture

```mermaid
flowchart TD
  subgraph internet["Internet"]
    user["Parent browser"]
    child["Child device"]
  end

  subgraph cloudflare_edge["Cloudflare Edge"]
    ddos["DDoS protection"]
    zt["Zero Trust Access\n(email allowlist)"]
    tunnel["Cloudflare Tunnel\n(outbound-only from OCI)"]
  end

  subgraph oci_vm["OCI ARM VM"]
    ufw["UFW Firewall\nAllow: 22 SSH, 51820 WireGuard only"]
    f2b["fail2ban\n5 attempts → 1hr ban"]
    docker["Docker Compose\nInternal network only"]
  end

  user -->|"HTTPS"| ddos
  ddos --> zt
  zt -->|"Authenticated"| tunnel
  tunnel -->|"Outbound connection"| docker

  child -->|"WireGuard VPN UDP 51820"| ufw
  child -->|"DoH port 443"| cloudflare_edge
  ufw --> f2b
  f2b --> docker

  note1["No open HTTP/HTTPS\ninbound ports on OCI"]
  note2["All admin UIs behind\nCloudflare Zero Trust"]
```

---

*Diagrams generated with Mermaid — renders in GitHub, VS Code, and Notion.*
*Editable draw.io sources: `docs/diagrams/`*
