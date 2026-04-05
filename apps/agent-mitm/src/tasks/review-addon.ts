/**
 * FamilyShield agent-mitm — Task: review-addon
 *
 * Reads the familyshield_addon.py source from the OCI VM (via the running
 * container or the mounted volume), then hands it to the agent for review.
 * Returns the raw Python source plus any static metadata extracted from it.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { SshClient } from "../ssh.js";

export interface AddonReviewData {
  /** Full source code of the addon */
  readonly source: string;
  /** Number of supported platforms found */
  readonly platformCount: number;
  /** Names of supported platforms */
  readonly platforms: string[];
  /** Number of total regex patterns */
  readonly patternCount: number;
  /** Number of ignored host patterns */
  readonly ignoredHostCount: number;
  /** Addon file path on the VM */
  readonly filePath: string;
  /** Last-modified timestamp (human-readable) */
  readonly lastModified: string;
}

/**
 * Fetch and parse the mitmproxy addon source from the container.
 */
export async function getAddonForReview(
  ssh: SshClient,
  container: string,
  addonPath: string,
): Promise<AddonReviewData> {
  // Try to cat the file from inside the container first
  let sourceResult = await ssh.exec(
    `docker exec ${container} cat ${addonPath} 2>/dev/null`,
  );

  // Fallback: try common host-side paths if container exec fails
  if (sourceResult.code !== 0 || !sourceResult.stdout.trim()) {
    const fallbackPaths = [
      "/opt/familyshield/mitm/familyshield_addon.py",
      "/home/ubuntu/FamilyShield/apps/mitm/familyshield_addon.py",
      `${addonPath}`,
    ];

    for (const path of fallbackPaths) {
      const attempt = await ssh.exec(`cat ${path} 2>/dev/null`);
      if (attempt.code === 0 && attempt.stdout.trim()) {
        sourceResult = attempt;
        break;
      }
    }
  }

  const source = sourceResult.stdout.trim();

  if (!source) {
    return {
      source:           "ERROR: Could not read addon source code. Check container status and addon path.",
      platformCount:    0,
      platforms:        [],
      patternCount:     0,
      ignoredHostCount: 0,
      filePath:         addonPath,
      lastModified:     "unknown",
    };
  }

  // Static analysis of the source
  const platforms = extractPlatforms(source);
  const patternCount = countPatterns(source);
  const ignoredHostCount = countIgnoredHosts(source);

  // Get file modification time
  const statResult = await ssh.exec(
    `docker exec ${container} stat -c '%y' ${addonPath} 2>/dev/null || stat -c '%y' ${addonPath} 2>/dev/null || echo 'unknown'`,
  );
  const lastModified = statResult.stdout.trim() || "unknown";

  return {
    source,
    platformCount:    platforms.length,
    platforms,
    patternCount,
    ignoredHostCount,
    filePath:         addonPath,
    lastModified,
  };
}

/** Extract platform names from PLATFORM_PATTERNS dict keys */
function extractPlatforms(source: string): string[] {
  const match = source.match(/PLATFORM_PATTERNS[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
  if (!match) return [];

  const platformKeys: string[] = [];
  const keyRegex = /"([a-z]+)":\s*\[/g;
  let m: RegExpExecArray | null;
  const content = match[1] ?? "";

  while ((m = keyRegex.exec(content)) !== null) {
    if (m[1]) platformKeys.push(m[1]);
  }
  return platformKeys;
}

/** Count total regex patterns defined in PLATFORM_PATTERNS */
function countPatterns(source: string): number {
  // Count re.compile( occurrences
  return (source.match(/re\.compile\(/g) ?? []).length;
}

/** Count entries in IGNORE_HOSTS set */
function countIgnoredHosts(source: string): number {
  const match = source.match(/IGNORE_HOSTS\s*=\s*\{([^}]+)\}/s);
  if (!match) return 0;
  return (match[1]?.match(/"/g) ?? []).length / 2;
}
