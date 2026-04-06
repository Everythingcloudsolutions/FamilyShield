/**
 * FamilyShield agent-mitm — Task: cert-info
 *
 * Reads the mitmproxy CA certificate from the container and extracts
 * metadata: subject, issuer, expiry date, fingerprint.
 *
 * IMPORTANT: If the cert is near expiry, the agent will warn that re-generating
 * it requires re-enrolling all child devices — this is a high-friction
 * operation and should not be taken lightly.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { SshClient } from "../ssh.js";
import type { CertInfo } from "../types.js";

export interface CertInfoResult {
  readonly caCert: CertInfo | null;
  readonly certPem: string;
  readonly enrollmentInstructions: string;
  readonly warningMessage: string;
  readonly certFound: boolean;
}

// Standard path where mitmproxy stores its CA cert inside the container
const MITM_CA_PATH = "/root/.mitmproxy/mitmproxy-ca-cert.pem";
const MITM_CA_PATH_CRT = "/root/.mitmproxy/mitmproxy-ca-cert.cer";

/**
 * Extract mitmproxy CA certificate information.
 */
export async function getCertInfo(
  ssh: SshClient,
  container: string,
): Promise<CertInfoResult> {
  // Try to read the CA cert from inside the container
  let certPem = "";

  for (const path of [MITM_CA_PATH, MITM_CA_PATH_CRT]) {
    const result = await ssh.exec(
      `docker exec ${container} cat ${path} 2>/dev/null`,
    );
    if (result.code === 0 && result.stdout.includes("-----BEGIN CERTIFICATE-----")) {
      certPem = result.stdout.trim();
      break;
    }
  }

  if (!certPem) {
    return {
      caCert:                  null,
      certPem:                 "",
      enrollmentInstructions:  buildEnrollmentInstructions(),
      warningMessage:          "CA certificate not found. mitmproxy may not have initialised yet — start the container first.",
      certFound:               false,
    };
  }

  // Use openssl on the VM to parse the cert
  const opensslResult = await ssh.exec(
    `echo '${escapeSingleQuotes(certPem)}' | openssl x509 -noout -text 2>/dev/null`,
  );

  let caCert: CertInfo | null = null;

  if (opensslResult.code === 0 && opensslResult.stdout) {
    caCert = parseOpensslOutput(opensslResult.stdout, certPem);
  } else {
    // Fallback: write to tmp file and parse
    const tmpPath = "/tmp/fs-agent-ca.pem";
    await ssh.exec(`docker cp ${container}:${MITM_CA_PATH} ${tmpPath} 2>/dev/null`);
    const fallbackResult = await ssh.exec(
      `openssl x509 -noout -text -in ${tmpPath} 2>/dev/null && rm -f ${tmpPath}`,
    );
    if (fallbackResult.code === 0) {
      caCert = parseOpensslOutput(fallbackResult.stdout, certPem);
    }
  }

  const warningMessage = buildWarningMessage(caCert);

  return {
    caCert,
    certPem,
    enrollmentInstructions: buildEnrollmentInstructions(),
    warningMessage,
    certFound: true,
  };
}

/** Parse openssl x509 -text output into a CertInfo struct */
function parseOpensslOutput(opensslText: string, certPem: string): CertInfo {
  const subjectMatch  = /Subject:\s*(.+)/.exec(opensslText);
  const issuerMatch   = /Issuer:\s*(.+)/.exec(opensslText);
  const notBeforeMatch = /Not Before:\s*(.+)/.exec(opensslText);
  const notAfterMatch  = /Not After\s*:\s*(.+)/.exec(opensslText);
  const serialMatch   = /Serial Number:\s*\n?\s*(.+)/.exec(opensslText);

  const notAfterStr = notAfterMatch?.[1]?.trim() ?? "";
  const notAfter    = notAfterStr ? new Date(notAfterStr) : null;
  const daysUntilExpiry = notAfter
    ? Math.floor((notAfter.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : -999;

  // Fingerprint: SHA-256 of the PEM
  // We pass certPem to compute it via openssl on the same exec — approximate here
  const fingerprintMatch = /SHA256 Fingerprint=([A-F0-9:]+)/i.exec(opensslText);

  return {
    subject:          subjectMatch?.[1]?.trim()   ?? "unknown",
    issuer:           issuerMatch?.[1]?.trim()    ?? "unknown",
    notBefore:        notBeforeMatch?.[1]?.trim() ?? "unknown",
    notAfter:         notAfterStr,
    daysUntilExpiry,
    fingerprint:      fingerprintMatch?.[1]       ?? "run: openssl x509 -fingerprint -sha256 -noout",
    serialNumber:     serialMatch?.[1]?.trim()    ?? "unknown",
  };
}

/** Build warning message based on cert expiry */
function buildWarningMessage(cert: CertInfo | null): string {
  if (!cert) return "";

  const days = cert.daysUntilExpiry;

  if (days < 0) {
    return `CRITICAL: CA certificate EXPIRED ${Math.abs(days)} day(s) ago. ` +
           `mitmproxy will be rejecting connections. ` +
           `A new CA cert must be generated and re-enrolled on ALL child devices.`;
  }

  if (days < 30) {
    return `WARNING: CA certificate expires in ${days} day(s). ` +
           `Plan a cert rotation soon — this requires re-enrolling ALL child devices ` +
           `(iOS, Windows, etc.) with the new CA certificate.`;
  }

  if (days < 90) {
    return `NOTICE: CA certificate expires in ${days} day(s). ` +
           `No immediate action needed, but schedule rotation within the next 60 days.`;
  }

  return `OK: CA certificate is valid for ${days} more day(s). No action required.`;
}

/** Device enrollment instructions for the CA cert */
function buildEnrollmentInstructions(): string {
  return [
    "=== CA Certificate Enrollment Instructions ===",
    "",
    "To install the FamilyShield CA cert on a child device:",
    "",
    "iOS (iPhone/iPad):",
    "  1. Visit http://mitm.it on the device (device must be using FamilyShield DNS/VPN)",
    "  2. Tap 'Apple iOS' and follow the profile installation prompts",
    "  3. Go to Settings → General → VPN & Device Management → install the profile",
    "  4. Go to Settings → General → About → Certificate Trust Settings → enable full trust",
    "",
    "Windows:",
    "  1. Download the cert from http://mitm.it/cert/cer",
    "  2. Double-click the .cer file → Install Certificate",
    "  3. Select 'Local Machine' → 'Trusted Root Certification Authorities'",
    "",
    "⚠️  IMPORTANT: Regenerating the CA cert requires re-doing the above on EVERY device.",
    "   Coordinate with the family before rotating certs.",
  ].join("\n");
}

function escapeSingleQuotes(s: string): string {
  return s.replace(/'/g, "'\\''");
}
