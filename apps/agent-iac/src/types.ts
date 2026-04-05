/**
 * Shared types for the FamilyShield IaC Agent
 * Year: 2026
 */

/** The three deployment environments FamilyShield supports. */
export type Environment = "dev" | "staging" | "prod";

/** Options passed to every task function. */
export interface TaskOptions {
  /** Target environment. */
  environment: Environment;
  /** Explicit prod override flag — must be set to interact with prod. */
  forceProd: boolean;
  /** Absolute path to the iac/ directory. */
  iacDir: string;
}

/** Result returned from a tofu command execution. */
export interface TofuResult {
  /** Raw stdout output from the command. */
  stdout: string;
  /** Raw stderr output from the command. */
  stderr: string;
  /** Process exit code. */
  exitCode: number;
  /** Whether the command completed successfully. */
  success: boolean;
}

/** Parsed representation of a tofu plan summary. */
export interface PlanSummary {
  /** Number of resources to be added. */
  toAdd: number;
  /** Number of resources to be changed. */
  toChange: number;
  /** Number of resources to be destroyed. */
  toDestroy: number;
  /** Full plan output text. */
  rawOutput: string;
  /** Whether the plan has any changes. */
  hasChanges: boolean;
}

/** A detected drift item between desired and actual state. */
export interface DriftItem {
  /** The resource address that has drifted. */
  resourceAddress: string;
  /** Description of the detected drift. */
  description: string;
}

/** Result of a drift detection run. */
export interface DriftReport {
  /** Whether drift was detected. */
  hasDrift: boolean;
  /** List of drifted resources. */
  items: DriftItem[];
  /** Raw plan output used to detect drift. */
  rawOutput: string;
  /** Timestamp of the drift check. */
  checkedAt: string;
}

/** A single IaC output value. */
export interface OutputValue {
  /** Output name. */
  name: string;
  /** Output value (may be any JSON-serialisable type). */
  value: string;
  /** Whether this output is marked sensitive. */
  sensitive: boolean;
}
