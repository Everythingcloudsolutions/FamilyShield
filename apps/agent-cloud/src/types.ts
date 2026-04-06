/**
 * FamilyShield Cloud Agent — Shared Types
 * =========================================
 * Strict TypeScript types for the cloud agent. No `any`.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

/** The 10 Docker containers managed by FamilyShield. */
export const CONTAINERS = [
  "familyshield-adguard",
  "familyshield-headscale",
  "familyshield-mitmproxy",
  "familyshield-redis",
  "familyshield-api",
  "familyshield-nodered",
  "familyshield-influxdb",
  "familyshield-grafana",
  "familyshield-ntfy",
  "familyshield-cloudflared",
] as const;

export type ContainerName = (typeof CONTAINERS)[number];

/** Port mapping for each container (informational). */
export const CONTAINER_PORTS: Record<ContainerName, string> = {
  "familyshield-adguard": "53, 3080",
  "familyshield-headscale": "8080",
  "familyshield-mitmproxy": "8888, 8889",
  "familyshield-redis": "6379",
  "familyshield-api": "3001",
  "familyshield-nodered": "1880",
  "familyshield-influxdb": "8086",
  "familyshield-grafana": "3001",
  "familyshield-ntfy": "2586",
  "familyshield-cloudflared": "(outbound only)",
};

/** Supported agent task names accepted from the CLI. */
export type TaskName =
  | "health-check"
  | "restart"
  | "logs"
  | "resources"
  | "diagnose";

/** Parsed CLI task with optional service/symptom argument. */
export interface ParsedTask {
  name: TaskName;
  /** Service name for restart/logs tasks, or symptom description for diagnose. */
  argument: string | null;
}

/** Configuration sourced from environment variables. */
export interface AgentConfig {
  anthropicApiKey: string;
  ociVmHost: string;
  ociVmUser: string;
  sshKeyPath: string;
  environment: "dev" | "staging" | "prod";
}

/** Health status for a single container. */
export interface ContainerStatus {
  name: ContainerName;
  running: boolean;
  health: string;
  uptime: string;
  cpuPercent: string;
  memUsage: string;
}

/** Full result from a health-check task. */
export interface HealthCheckResult {
  timestamp: string;
  environment: string;
  vmReachable: boolean;
  containers: ContainerStatus[];
  summary: string;
  reportPath: string | null;
}

/** Result from a restart task. */
export interface RestartResult {
  container: string;
  success: boolean;
  message: string;
  requiresConfirmation: boolean;
}

/** Result from a logs task. */
export interface LogsResult {
  container: string;
  lines: string[];
  lineCount: number;
}

/** VM resource usage snapshot. */
export interface ResourcesResult {
  timestamp: string;
  cpuUsagePercent: number;
  memUsedGb: number;
  memTotalGb: number;
  memPercent: number;
  diskUsedGb: number;
  diskTotalGb: number;
  diskPercent: number;
  loadAverage: string;
  uptime: string;
}

/** Result from a diagnose task. */
export interface DiagnoseResult {
  symptom: string;
  findings: string[];
  rootCause: string;
  recommendation: string;
  severity: "low" | "medium" | "high" | "critical";
}
