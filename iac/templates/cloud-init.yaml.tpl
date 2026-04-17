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

# Create ubuntu user docker access
groups:
  - docker

users:
  - default
  - name: ubuntu
    groups: [docker, sudo]
    sudo: ALL=(ALL) NOPASSWD:ALL

write_files:
  # Docker Compose stack
  - path: /opt/familyshield/docker-compose.yml
    encoding: b64
    content: ${docker_compose_b64}
    owner: ubuntu:ubuntu
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

  # UFW rules
  - path: /tmp/setup-ufw.sh
    content: |
      #!/bin/bash
      ufw default deny incoming
      ufw default allow outgoing
      ufw allow 22/tcp     # SSH
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

  # Create dirs
  - mkdir -p /opt/familyshield/data/{adguard,headscale,influxdb,grafana,mitmproxy}
  - chown -R ubuntu:ubuntu /opt/familyshield

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
