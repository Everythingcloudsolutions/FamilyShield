#cloud-config
# FamilyShield OCI ARM VM Bootstrap
# Environment: ${environment}
# Year: 2026

package_update: true
package_upgrade: true

packages:
  - docker.io
  - docker-compose-v2
  - curl
  - wget
  - git
  - unzip
  - jq
  - htop
  - ufw
  - fail2ban
  - wireguard
  - resolvconf
  - ca-certificates  # Required for Caddy HTTPS certificate validation

# Create ubuntu user docker access
groups:
  - docker

users:
  - default
  - name: ubuntu
    groups: [docker, sudo]
    sudo: ALL=(ALL) NOPASSWD:ALL

write_files:
  # docker-compose.yml placeholder — the real file is written by the infra workflow via SSH
  # AFTER tofu apply completes. Using a placeholder here means changing docker-compose.yaml.tpl
  # does NOT change user_data, so the VM is NOT recreated on every app config change.
  # Volumes (adguard_conf, headscale_data, ntfy_data, etc.) persist across infra runs.
  # NOTE: Must use root owner in write_files (ubuntu user not yet initialized)
  - path: /opt/familyshield/docker-compose.yml
    content: |
      # Placeholder — overwritten by infra workflow (infra-dev.yml / infra-prod.yml)
      # The infra workflow renders docker-compose.yaml.tpl and copies it here via SSH.
      # On reboots after first deploy, this file contains the real stack config.
      services: {}
    owner: root:root
    permissions: '0644'

  # Systemd service to start stack on boot
  - path: /etc/systemd/system/familyshield.service
    content: |
      [Unit]
      Description=FamilyShield Docker Compose Stack
      After=docker.service
      Requires=docker.service

      [Service]
      Type=oneshot
      RemainAfterExit=yes
      WorkingDirectory=/opt/familyshield
      ExecStart=/usr/bin/docker compose up -d
      ExecStop=/usr/bin/docker compose down
      User=ubuntu

      [Install]
      WantedBy=multi-user.target

  # Persistent data volume mount script
  # Runs at first boot; fstab handles all subsequent reboots automatically.
  # Retries up to 60s for the OCI volume attachment to complete (race condition window).
  - path: /tmp/mount-data-volume.sh
    content: |
      #!/bin/bash
      set -euo pipefail
      DATA_DEVICE="/dev/oracleoci/oraclevdb"
      DATA_MOUNT="/opt/familyshield-data"

      # Wait up to 60 seconds for OCI to complete volume attachment
      for i in $(seq 1 20); do
        if test -b "$DATA_DEVICE"; then
          break
        fi
        echo "Waiting for data volume device $DATA_DEVICE (attempt $i/20)..."
        sleep 3
      done

      if ! test -b "$DATA_DEVICE"; then
        echo "WARNING: Data volume device $DATA_DEVICE not found after 60s — services will use boot volume (fallback)"
        echo "The infra workflow Bootstrap VM step will retry mounting after tofu apply completes."
        mkdir -p "$DATA_MOUNT"
        exit 0
      fi

      # Format ext4 on first boot (no filesystem = brand new volume)
      if ! blkid "$DATA_DEVICE" | grep -q TYPE; then
        echo "First boot: formatting persistent data volume..."
        mkfs.ext4 -L familyshield-data -F "$DATA_DEVICE"
      fi

      # Mount
      mkdir -p "$DATA_MOUNT"
      if ! mountpoint -q "$DATA_MOUNT"; then
        mount "$DATA_DEVICE" "$DATA_MOUNT"
      fi

      # Add UUID-based fstab entry (survives device renaming, nofail = safe reboot)
      DEVICE_UUID=$(blkid -s UUID -o value "$DATA_DEVICE")
      if [ -n "$DEVICE_UUID" ] && ! grep -q "$DEVICE_UUID" /etc/fstab; then
        echo "UUID=$DEVICE_UUID $DATA_MOUNT ext4 defaults,_netdev,nofail 0 2" >> /etc/fstab
      fi

      # Create per-service data directories
      mkdir -p \
        "$DATA_MOUNT/adguard/work" \
        "$DATA_MOUNT/adguard/conf" \
        "$DATA_MOUNT/headscale" \
        "$DATA_MOUNT/influxdb" \
        "$DATA_MOUNT/grafana" \
        "$DATA_MOUNT/mitmproxy" \
        "$DATA_MOUNT/redis" \
        "$DATA_MOUNT/ntfy/cache" \
        "$DATA_MOUNT/ntfy/data" \
        "$DATA_MOUNT/portainer" \
        "$DATA_MOUNT/headplane"
      chown -R ubuntu:ubuntu "$DATA_MOUNT"
      # Per-service ownership overrides — must match container user UIDs
      chown -R 472:472 "$DATA_MOUNT/grafana"          # Grafana runs as uid 472
      chown -R 1000:1000 "$DATA_MOUNT/mitmproxy"      # mitmproxy user in container is uid/gid 1000
      echo "Persistent data volume ready at $DATA_MOUNT ($(df -h $DATA_MOUNT | tail -1 | awk '{print $4}') free)"

  # UFW rules (with mitmproxy support)
  - path: /tmp/setup-ufw.sh
    content: |
      #!/bin/bash
      ufw default deny incoming
      ufw default allow outgoing
      ufw allow 22/tcp     # SSH
      ufw allow 80/tcp     # HTTP — Caddy ACME challenge (auto-redirects to HTTPS after cert issued)
      ufw allow 443/tcp    # HTTPS (Caddy reverse proxy for Headscale)
      ufw allow 443/udp    # QUIC protocol
      ufw allow 51820/udp  # WireGuard VPN
      ufw --force enable

  # fail2ban config
  - path: /etc/fail2ban/jail.local
    content: |
      [sshd]
      enabled = true
      port = 22
      maxretry = 5
      bantime = 3600

  # Caddy configuration — reverse proxy Headscale with auto-HTTPS
  # Listens on 0.0.0.0:443, proxies to localhost:8080 (Headscale)
  - path: /etc/caddy/Caddyfile
    content: |
      vpn-${environment}.everythingcloud.ca:443 {
        log {
          output stdout
          format console
        }
        reverse_proxy localhost:8080 {
          header_up Connection "upgrade"
          header_up Upgrade "{http.request.header.Upgrade}"
          header_up X-Forwarded-For "{http.request.header.CF-Connecting-IP}"
          header_up X-Forwarded-Proto "https"
          header_up X-Forwarded-Host "{http.request.host}"
          header_down -Server
        }
      }
    owner: root:root
    permissions: '0644'

runcmd:
  # Disable systemd-resolved stub listener — frees port 53 for AdGuard Home
  # Ubuntu 22.04 binds 0.0.0.0:53 by default; AdGuard needs that port
  - mkdir -p /etc/systemd/resolved.conf.d
  - 'echo -e "[Resolve]\nDNSStubListener=no" > /etc/systemd/resolved.conf.d/no-stub.conf'
  - systemctl restart systemd-resolved
  - ln -sf /run/systemd/resolve/resolv.conf /etc/resolv.conf

  # Setup UFW
  - bash /tmp/setup-ufw.sh

  # Enable fail2ban
  - systemctl enable fail2ban
  - systemctl start fail2ban

  # Mount persistent OCI Block Volume + create service data dirs
  - bash /tmp/mount-data-volume.sh

  # Create app dirs (boot volume — service configs, not data)
  - chown -R ubuntu:ubuntu /opt/familyshield

  # NOTE: Caddy now runs as a Docker service (caddy container in docker-compose)
  # Caddyfile is already written above; docker-compose will mount it

  # Enable and start FamilyShield stack
  - systemctl daemon-reload
  - systemctl enable familyshield
  - systemctl start familyshield

  # Signal completion
  - echo "FamilyShield bootstrap complete - ${environment}" >> /var/log/familyshield-init.log
  - date >> /var/log/familyshield-init.log

final_message: |
  FamilyShield VM bootstrap complete.
  Environment: ${environment}
  Portal URL will be available once Cloudflare Tunnel connects.
