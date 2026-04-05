/**
 * FamilyShield agent-mitm — SSH client factory
 *
 * Provides a thin wrapper around node-ssh to run commands on the OCI VM
 * hosting the mitmproxy container.
 *
 * Author: FamilyShield / Everythingcloudsolutions
 * Year:   2026
 */

import { NodeSSH } from "node-ssh";
import type { SshConfig, SshResult } from "./types.js";

export class SshClient {
  private readonly ssh: NodeSSH;
  private readonly config: SshConfig;
  private connected = false;

  constructor(config: SshConfig) {
    this.ssh = new NodeSSH();
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.ssh.connect({
      host:       this.config.host,
      username:   this.config.username,
      privateKey: this.config.privateKeyPath,
    });
    this.connected = true;
  }

  async exec(command: string): Promise<SshResult> {
    if (!this.connected) await this.connect();

    const result = await this.ssh.execCommand(command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      code:   result.code,
    };
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    this.ssh.dispose();
    this.connected = false;
  }
}

/**
 * Build SshConfig from environment variables.
 * Throws if required vars are missing.
 */
export function sshConfigFromEnv(): SshConfig {
  const host = process.env["OCI_VM_HOST"];
  const username = process.env["OCI_VM_USER"];
  const privateKeyPath = process.env["OCI_SSH_KEY_PATH"];

  if (!host) throw new Error("OCI_VM_HOST environment variable is required");
  if (!username) throw new Error("OCI_VM_USER environment variable is required");
  if (!privateKeyPath) throw new Error("OCI_SSH_KEY_PATH environment variable is required");

  return { host, username, privateKeyPath };
}
