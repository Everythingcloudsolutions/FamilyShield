/**
 * FamilyShield agent-mitm — Task: status
 *
 * Queries the OCI VM for the mitmproxy container's runtime status,
 * resource utilisation, and recent log tail. Returns a structured
 * summary that the agent can reason over.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import type { SshClient } from "../ssh.js";
import type { ContainerStats, ContainerStatus } from "../types.js";

export interface StatusResult {
  readonly containerStats: ContainerStats;
  readonly recentLogs: string;
  readonly redisQueueDepth: number | null;
  readonly proxyListening: boolean;
  readonly webUiListening: boolean;
}

/**
 * Gather mitmproxy container status from the OCI VM.
 */
export async function getStatus(
  ssh: SshClient,
  container: string,
): Promise<StatusResult> {
  // 1. Container inspect — single JSON field extraction
  const inspectResult = await ssh.exec(
    `docker inspect --format '{{.State.Status}}|{{.State.StartedAt}}|{{.RestartCount}}' ${container} 2>/dev/null || echo 'missing'`,
  );

  let containerStats: ContainerStats;

  if (inspectResult.stdout.trim() === "missing" || inspectResult.code !== 0) {
    containerStats = {
      status:        "missing",
      uptime:        "N/A",
      cpuPercent:    "N/A",
      memoryUsage:   "N/A",
      memoryLimit:   "N/A",
      restartCount:  0,
    };
  } else {
    const parts = inspectResult.stdout.trim().split("|");
    const rawStatus = parts[0]?.trim() ?? "unknown";
    const startedAt  = parts[1]?.trim() ?? "";
    const restartStr = parts[2]?.trim() ?? "0";

    const status: ContainerStatus =
      rawStatus === "running" ? "running" :
      rawStatus === "exited"  ? "stopped" :
                                "missing";

    // Resource stats (only meaningful when running)
    let cpuPercent  = "N/A";
    let memoryUsage = "N/A";
    let memoryLimit = "N/A";

    if (status === "running") {
      const statsResult = await ssh.exec(
        `docker stats ${container} --no-stream --format '{{.CPUPerc}}|{{.MemUsage}}' 2>/dev/null`,
      );
      if (statsResult.code === 0 && statsResult.stdout.trim()) {
        const statsParts = statsResult.stdout.trim().split("|");
        cpuPercent  = statsParts[0]?.trim() ?? "N/A";
        const memParts = (statsParts[1] ?? "").split("/");
        memoryUsage = memParts[0]?.trim() ?? "N/A";
        memoryLimit = memParts[1]?.trim() ?? "N/A";
      }
    }

    // Calculate human-readable uptime from startedAt timestamp
    const uptime = startedAt
      ? formatUptime(new Date(startedAt))
      : "N/A";

    containerStats = {
      status,
      uptime,
      cpuPercent,
      memoryUsage,
      memoryLimit,
      restartCount: parseInt(restartStr, 10) || 0,
    };
  }

  // 2. Recent log lines (last 50)
  const logsResult = await ssh.exec(
    `docker logs ${container} --tail 50 2>&1 || echo 'Container not running'`,
  );
  const recentLogs = logsResult.stdout.trim();

  // 3. Redis queue depth
  const redisResult = await ssh.exec(
    `docker exec familyshield-redis redis-cli LLEN familyshield:content_events 2>/dev/null`,
  );
  let redisQueueDepth: number | null = null;
  const parsed = parseInt(redisResult.stdout.trim(), 10);
  if (!isNaN(parsed)) redisQueueDepth = parsed;

  // 4. Port checks (proxy port 8888, web UI port 8889)
  const portResult = await ssh.exec(
    `ss -tlnp 2>/dev/null | grep -E ':(8888|8889)' | wc -l`,
  );
  const portCount = parseInt(portResult.stdout.trim(), 10) || 0;
  const proxyListening  = portCount >= 1;
  const webUiListening  = portCount >= 2;

  return {
    containerStats,
    recentLogs,
    redisQueueDepth,
    proxyListening,
    webUiListening,
  };
}

/**
 * Format a Date into a human-readable uptime string like "3d 4h 12m".
 */
function formatUptime(since: Date): string {
  const ms = Date.now() - since.getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0)    parts.push(`${days}d`);
  if (hours > 0)   parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}
