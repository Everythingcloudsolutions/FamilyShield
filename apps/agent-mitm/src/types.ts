/**
 * FamilyShield agent-mitm — Shared TypeScript types
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

// ── Task names ────────────────────────────────────────────────────────────────

export type TaskName =
  | "status"
  | "review-addon"
  | "traffic-report"
  | "cert-info"
  | "test-capture"
  | "review-bypass";

// ── SSH connection config ─────────────────────────────────────────────────────

export interface SshConfig {
  readonly host: string;
  readonly username: string;
  readonly privateKeyPath: string;
}

// ── Agent task context ────────────────────────────────────────────────────────

export interface TaskContext {
  readonly ssh: SshConfig;
  readonly container: string;
  readonly addonPath: string;
}

// ── mitmproxy container status ────────────────────────────────────────────────

export type ContainerStatus = "running" | "stopped" | "missing";

export interface ContainerStats {
  readonly status: ContainerStatus;
  readonly uptime: string;
  readonly cpuPercent: string;
  readonly memoryUsage: string;
  readonly memoryLimit: string;
  readonly restartCount: number;
}

// ── Traffic event (mirrors Python addon ContentEvent) ────────────────────────

export interface TrafficEvent {
  readonly platform: string;
  readonly content_type: string;
  readonly content_id: string;
  readonly device_ip: string;
  readonly url: string;
  readonly timestamp: number;
  readonly environment: string;
  readonly raw_path: string;
}

// ── Traffic report summary ────────────────────────────────────────────────────

export interface PlatformBreakdown {
  readonly platform: string;
  readonly count: number;
  readonly percent: number;
}

export interface TrafficSummary {
  readonly windowHours: number;
  readonly totalRequests: number;
  readonly capturedEvents: number;
  readonly captureRate: number;
  readonly platformBreakdown: PlatformBreakdown[];
  readonly recentEvents: TrafficEvent[];
}

// ── Certificate information ───────────────────────────────────────────────────

export interface CertInfo {
  readonly subject: string;
  readonly issuer: string;
  readonly notBefore: string;
  readonly notAfter: string;
  readonly daysUntilExpiry: number;
  readonly fingerprint: string;
  readonly serialNumber: string;
}

// ── Test-capture result ───────────────────────────────────────────────────────

export interface CaptureTestResult {
  readonly url: string;
  readonly wouldCapture: boolean;
  readonly platform: string | null;
  readonly contentType: string | null;
  readonly extractedId: string | null;
  readonly matchedPattern: string | null;
  readonly reason: string;
}

// ── Bypass detection ──────────────────────────────────────────────────────────

export type BypassMethod = "cert-pinning" | "dns-over-https" | "vpn" | "unknown";

export interface BypassedPlatform {
  readonly platform: string;
  readonly bypassMethod: BypassMethod;
  readonly mitigation: string;
  readonly currentMitigation: string;
}

// ── Agent message content block ───────────────────────────────────────────────

export interface TextContentBlock {
  readonly type: "text";
  readonly text: string;
}

// ── Raw SSH command result ────────────────────────────────────────────────────

export interface SshResult {
  readonly stdout: string;
  readonly stderr: string;
  readonly code: number | null;
}
