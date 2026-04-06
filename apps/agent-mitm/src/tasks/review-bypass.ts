/**
 * FamilyShield agent-mitm — Task: review-bypass
 *
 * Identifies platforms and techniques that bypass SSL inspection and explains
 * the current mitigation status for each. Also checks mitmproxy logs for
 * evidence of bypass attempts (DoH queries, VPN traffic, certificate errors).
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { SshClient } from "../ssh.js";
import type { BypassedPlatform } from "../types.js";

export interface BypassReportData {
  readonly knownBypasses: BypassedPlatform[];
  readonly logEvidence: string;
  readonly adguardBlockedDomains: string[];
  readonly recommendedActions: string[];
}

/**
 * Static registry of known bypass methods for each platform.
 * This is the source of truth for what the agent should explain.
 */
const KNOWN_BYPASSES: BypassedPlatform[] = [
  {
    platform:           "TikTok",
    bypassMethod:       "cert-pinning",
    mitigation:         "DNS block at AdGuard Home — all TikTok domains are blocked outright.",
    currentMitigation:  "DNS block (complete)",
  },
  {
    platform:           "Instagram (app)",
    bypassMethod:       "cert-pinning",
    mitigation:         "Instagram app uses certificate pinning — mitmproxy cannot inspect app traffic. " +
                        "Browser traffic (instagram.com) IS inspected. " +
                        "Mitigation: enforce browser-only access via DNS + AdGuard blocking of app-specific hostnames.",
    currentMitigation:  "Partial (browser only)",
  },
  {
    platform:           "Snapchat",
    bypassMethod:       "cert-pinning",
    mitigation:         "Snapchat uses certificate pinning. DNS block recommended for under-15 profiles.",
    currentMitigation:  "DNS block (age-profile dependent)",
  },
  {
    platform:           "Signal / WhatsApp",
    bypassMethod:       "cert-pinning",
    mitigation:         "End-to-end encrypted messaging apps use cert pinning. " +
                        "FamilyShield does not attempt to inspect message content (privacy principle). " +
                        "DNS-based time restrictions are the only lever.",
    currentMitigation:  "DNS time-of-day restrictions only",
  },
  {
    platform:           "Google Chrome (QUIC/HTTP3)",
    bypassMethod:       "unknown",
    mitigation:         "Chrome uses QUIC (UDP port 443) which bypasses TCP-based mitmproxy. " +
                        "Block UDP port 443 at the firewall to force fallback to TLS/TCP. " +
                        "AdGuard Home can also set CNAME records to force TCP.",
    currentMitigation:  "Firewall rule: block UDP/443 (recommended, check if applied)",
  },
  {
    platform:           "DNS-over-HTTPS (DoH)",
    bypassMethod:       "dns-over-https",
    mitigation:         "If a device uses DoH (e.g., Cloudflare 1.1.1.1), it bypasses AdGuard Home. " +
                        "Block DoH providers at the firewall: 1.1.1.1:443, 8.8.8.8:443, 9.9.9.9:443. " +
                        "AdGuard Home's DNS rewrites only work if the device uses AdGuard as its resolver.",
    currentMitigation:  "Firewall rule: block known DoH IPs (recommended, check if applied)",
  },
  {
    platform:           "VPN apps (commercial)",
    bypassMethod:       "vpn",
    mitigation:         "Commercial VPN apps (ProtonVPN, NordVPN, etc.) tunnel all traffic, bypassing " +
                        "both AdGuard Home and mitmproxy. Headscale/Tailscale is FamilyShield's own VPN — " +
                        "child devices should not have other VPN apps installed. " +
                        "Block VPN protocol ports at firewall: UDP/1194 (OpenVPN), UDP/51820 (WireGuard if not ours), TCP/443 (SSL VPN).",
    currentMitigation:  "Headscale-only policy (VPN port blocking recommended)",
  },
];

/**
 * Build the bypass report by combining static knowledge with live log evidence.
 */
export async function getBypassReport(
  ssh: SshClient,
  container: string,
): Promise<BypassReportData> {
  // Scan recent mitmproxy logs for bypass evidence
  const logsResult = await ssh.exec(
    `docker logs ${container} --tail 500 2>&1`,
  );
  const logs = logsResult.stdout;

  const logEvidence = extractBypassEvidence(logs);

  // Check AdGuard Home for current block list coverage
  const adguardBlockedDomains = await getAdguardBlockedDomains(ssh);

  // Build recommendations
  const recommendedActions = buildRecommendations(adguardBlockedDomains);

  return {
    knownBypasses:           KNOWN_BYPASSES,
    logEvidence,
    adguardBlockedDomains,
    recommendedActions,
  };
}

/** Extract lines from mitmproxy logs that suggest bypass attempts */
function extractBypassEvidence(logs: string): string {
  const suspiciousPatterns = [
    /SSL handshake.*failed/i,
    /certificate.*verify.*failed/i,
    /connection.*reset/i,
    /QUIC/i,
    /TLS.*error/i,
    /upstream connect error/i,
    /CONNECT.*443.*refused/i,
  ];

  const evidenceLines: string[] = [];
  for (const line of logs.split("\n")) {
    if (suspiciousPatterns.some((p) => p.test(line))) {
      evidenceLines.push(line.trim());
    }
  }

  if (evidenceLines.length === 0) {
    return "No bypass evidence found in recent logs.";
  }

  return evidenceLines.slice(-50).join("\n");
}

/** Query AdGuard Home API for blocked domains count */
async function getAdguardBlockedDomains(ssh: SshClient): Promise<string[]> {
  const result = await ssh.exec(
    `docker exec familyshield-adguard wget -qO- http://localhost:3000/control/filtering/status 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print('\\n'.join(str(r.get('name','?')) for r in d.get('filters',[])))" 2>/dev/null || echo ""`,
  );

  if (!result.stdout.trim()) return [];

  return result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

/** Build action recommendations based on current state */
function buildRecommendations(blockedDomains: string[]): string[] {
  const recommendations: string[] = [];

  if (!blockedDomains.some((d) => d.toLowerCase().includes("tiktok"))) {
    recommendations.push(
      "Add TikTok domain blocklist to AdGuard Home (tiktok.com, tiktokv.com, musical.ly)",
    );
  }

  recommendations.push(
    "Verify firewall rule blocks UDP/443 (prevents QUIC/HTTP3 bypass)",
    "Verify firewall rule blocks known DoH provider IPs (1.1.1.1, 8.8.8.8 on port 443)",
    "Audit child devices for installed VPN apps",
    "Enable AdGuard Home's 'Safe Browsing' and 'Safe Search' enforcement",
    "Review mitmproxy certificate error count — high numbers may indicate bypass attempts",
  );

  return recommendations;
}
