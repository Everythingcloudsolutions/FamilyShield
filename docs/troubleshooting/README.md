# FamilyShield — Troubleshooting Guide

> Last updated: 2026-04-05
> Platform: FamilyShield v1 — OCI ca-toronto-1 (Toronto, Canada)

---

## Table of Contents

- [Section 1: Parent Troubleshooting (Plain English)](#section-1-parent-troubleshooting-plain-english)
  - [1. My child's device lost internet connection](#1-my-childs-device-lost-internet-connection)
  - [2. I stopped receiving alerts on my phone](#2-i-stopped-receiving-alerts-on-my-phone)
  - [3. The dashboard isn't loading](#3-the-dashboard-isnt-loading)
  - [4. A website that should be blocked isn't blocked](#4-a-website-that-should-be-blocked-isnt-blocked)
  - [5. My child's activity isn't showing up on the dashboard](#5-my-childs-activity-isnt-showing-up-on-the-dashboard)
  - [6. I blocked a site but it's still accessible](#6-i-blocked-a-site-but-its-still-accessible)
  - [7. I can't log in to the parent portal](#7-i-cant-log-in-to-the-parent-portal)
  - [8. The ntfy notification links don't work](#8-the-ntfy-notification-links-dont-work)
  - [9. I added a new device but it's not being monitored](#9-i-added-a-new-device-but-its-not-being-monitored)
  - [10. Activity shows the wrong child](#10-activity-shows-the-wrong-child)
- [Section 2: Developer / Technical Troubleshooting](#section-2-developer--technical-troubleshooting)
  - [Checking Container Health](#checking-container-health)
  - [AdGuard Home Issues](#adguard-home-issues)
  - [Headscale / Tailscale VPN Issues](#headscale--tailscale-vpn-issues)
  - [mitmproxy SSL Inspection Issues](#mitmproxy-ssl-inspection-issues)
  - [Redis Queue Issues](#redis-queue-issues)
  - [API Worker Issues](#api-worker-issues)
  - [Supabase Issues](#supabase-issues)
  - [Cloudflare Tunnel Issues](#cloudflare-tunnel-issues)
  - [Node-RED Issues](#node-red-issues)
  - [OCI VM Issues](#oci-vm-issues)
  - [GitHub Actions CI/CD Issues](#github-actions-cicd-issues)

---

## Section 1: Parent Troubleshooting (Plain English)

This section is for parents. No technical knowledge required. Find the symptom that matches your situation and follow the steps.

---

### 1. My child's device lost internet connection

**What's happening:** FamilyShield routes your child's internet through a secure tunnel (VPN). If that connection drops, the device may lose internet access entirely — this is by design, so browsing cannot happen outside of monitoring.

**Steps to fix:**

1. **Check the Tailscale app on the child's device.**
   - On iPhone/iPad: Open the Tailscale app. The status should say "Connected". If it says "Disconnected" or shows a red indicator, tap the toggle to reconnect.
   - On Windows/Mac: Look for the Tailscale icon in the taskbar or menu bar. Click it and choose "Connect".
   - On Android: Open Tailscale from the app drawer and tap "Connect".

2. **Check the device's Wi-Fi or mobile data.** Make sure the device has a working internet connection before FamilyShield can work. Try opening a browser — if nothing loads at all, check Wi-Fi settings first.

3. **Restart Tailscale.** Close the Tailscale app completely and reopen it. On iPhone, swipe it away from the app switcher and relaunch.

4. **Restart the device.** A simple restart fixes most VPN connection issues.

5. **Still not working?** Contact the FamilyShield administrator (Mohit). The cloud server may need attention.

---

### 2. I stopped receiving alerts on my phone

**What's happening:** FamilyShield sends alerts through an app called ntfy. If alerts stop arriving, either the app lost its connection or notifications are turned off on your phone.

**Steps to fix:**

1. **Open the ntfy app on your phone.** Check that you are subscribed to the correct topic (channel). Your topic name was set during setup — it should match the one in your welcome email. If the topic list is empty, re-subscribe using the topic name provided.

2. **Check your phone's notification settings.**
   - On iPhone: Settings → Notifications → ntfy → Allow Notifications must be ON.
   - On Android: Settings → Apps → ntfy → Notifications → All notifications must be ON.

3. **Check that ntfy is not in battery saver mode.** On Android, battery optimization can kill background apps. Go to Settings → Battery → Battery Optimization → find ntfy → select "Don't optimize".

4. **Re-subscribe to your alert topic.** In the ntfy app, tap the "+" button and enter your topic name again. This refreshes the subscription.

5. **Send a test alert.** Log in to the FamilyShield parent portal and use the "Send Test Alert" button in Settings. If you receive it, alerts are working. If not, proceed to step 6.

6. **Still not working?** The ntfy notification service on the FamilyShield server may be down. Contact the FamilyShield administrator.

---

### 3. The dashboard isn't loading

**What's happening:** The parent portal is hosted at https://familyshield.everythingcloud.ca. If it won't load, it could be a temporary outage, a login issue, or a network problem on your end.

**Steps to fix:**

1. **Check your own internet connection.** Try opening another website. If nothing loads, the problem is your network, not FamilyShield.

2. **Try a different browser.** Open the portal in Chrome, Firefox, or Safari. Sometimes a browser extension or cached data causes loading issues.

3. **Clear your browser cache.**
   - Chrome: Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac) → select "Cached images and files" → Clear data.
   - Safari: Preferences → Advanced → Show Develop menu → Develop → Empty Caches.

4. **Try an incognito / private window.** This bypasses cached data and extensions. If the portal loads in incognito, the issue is a browser extension or cached session.

5. **Wait 5 minutes and try again.** The portal may be restarting after an update.

6. **Check the status page (if available).** Visit https://familyshield-dev.everythingcloud.ca/health in your browser. If you see "OK", the backend is running fine and the issue is likely your browser.

7. **Still not loading?** Contact the FamilyShield administrator.

---

### 4. A website that should be blocked isn't blocked

**What's happening:** FamilyShield blocks websites using DNS filtering. This only works when the child's device is connected to FamilyShield's VPN. If the VPN is off, blocks don't apply.

**Steps to fix:**

1. **Confirm the VPN is connected.** Check Tailscale on the child's device (see issue #1 above). DNS blocking only works while Tailscale is connected.

2. **Check that the site is actually in your blocklist.** Log in to the parent portal and go to Rules → Blocked Sites. Confirm the website is listed. Website addresses must be exact — "youtube.com" and "www.youtube.com" may need separate entries.

3. **Check the category is blocked for that child's profile.** Each child has an age-based profile (Strict / Moderate / Guided). A site may be allowed under one profile but blocked under another.

4. **The website might be using a different address.** Some websites use multiple domains. For example, blocking "facebook.com" may not block "m.facebook.com" (the mobile version). Try adding both variants.

5. **The block may not have taken effect yet.** DNS changes can take up to 5 minutes to apply on a connected device. Try putting the device in Airplane mode for 10 seconds, then turn Airplane mode off.

6. **Still accessible?** The child's device may not be correctly enrolled. Proceed to issue #5 for enrollment checks.

---

### 5. My child's activity isn't showing up on the dashboard

**What's happening:** Activity is logged when the child's device connects through FamilyShield's VPN and traffic passes through the inspection layer. No activity means either the device isn't connected, or monitoring isn't capturing traffic.

**Steps to fix:**

1. **Check that Tailscale is connected on the child's device** (see issue #1).

2. **Check the dashboard time filter.** On the dashboard, make sure you're looking at "Today" or the correct date range. Activity from yesterday won't show under "Last hour".

3. **Check the child's name in the portal.** Go to Devices and confirm the child's device is listed and assigned to the correct child profile.

4. **Check if any activity at all is being logged.** If the child just got the device or just enrolled, there may genuinely be no activity yet. Ask your child to open YouTube or Roblox while connected, then check the dashboard after 2–3 minutes.

5. **The device may not have the FamilyShield certificate installed.** Without this certificate, HTTPS (secure) traffic cannot be inspected and won't be logged. Refer to the device enrollment guide for your device type.

6. **Still no activity?** Contact the FamilyShield administrator to check if the monitoring pipeline is running.

---

### 6. I blocked a site but it's still accessible

**What's happening:** After you add a block, the child's device may still have the old DNS answer saved in its local cache — like a browser remembering old directions. This is temporary.

**Steps to fix:**

1. **Wait and try again.** DNS caches typically clear within 5–10 minutes. Ask your child to close the browser tab, wait a few minutes, and try again.

2. **Restart the browser on the child's device.** Close all browser windows completely and reopen.

3. **Clear the DNS cache on the child's device.**
   - On Windows: Open Command Prompt and type `ipconfig /flushdns`, press Enter.
   - On iPhone/iPad: Toggle Airplane mode on, wait 10 seconds, toggle off.
   - On Android: Toggle Airplane mode on, wait 10 seconds, toggle off.

4. **Check the browser isn't using a private DNS (DNS-over-HTTPS).** Some browsers (Firefox, Brave) have their own DNS settings that can bypass FamilyShield.
   - In Firefox: Settings → General → scroll to "Network Settings" → click Settings → make sure "Enable DNS over HTTPS" is off.
   - In Brave: Settings → Privacy and security → Security → Use secure DNS → turn off.

5. **Confirm the block is saved.** Log in to the portal and double-check the blocked site entry was saved correctly.

---

### 7. I can't log in to the parent portal

**What's happening:** The parent portal uses Cloudflare Zero Trust for secure login. Login issues are usually related to your email, an expired session, or a browser problem.

**Steps to fix:**

1. **Check you are using the correct email address.** Only email addresses that were registered during setup can log in. Try the email address you used when you set up your FamilyShield account.

2. **Check your spam/junk folder.** If you use email-based login (magic link), the login email may have been filtered as spam.

3. **Try a fresh browser window.** Open an incognito or private window and go to https://familyshield.everythingcloud.ca again. Click "Log In" and try your email.

4. **Clear cookies for the portal domain.** Old or corrupted session cookies can block login.
   - Chrome: Press Ctrl+Shift+Delete → select "Cookies and other site data" → Clear data → try logging in again.

5. **Try a different browser or device.** If you can log in on your phone but not your laptop, the issue is browser-specific.

6. **Check that your email provider isn't blocking Cloudflare emails.** Cloudflare sends verification emails from a cloudflare.com address. Make sure these aren't filtered.

7. **Still locked out?** Contact the FamilyShield administrator to reset your access.

---

### 8. The ntfy notification links don't work

**What's happening:** When FamilyShield sends an alert, it may include a link to view more details about the flagged content. If that link doesn't open correctly, the URL configuration may need updating.

**Steps to fix:**

1. **Make sure you are logged in to the parent portal first.** The links in notifications will take you to the portal, which requires you to be logged in. Open https://familyshield.everythingcloud.ca in your browser, log in, then tap the notification link again.

2. **Try copying and pasting the link.** Instead of tapping, long-press on the link in the ntfy notification, copy it, and paste it into your browser.

3. **Check you're using the ntfy app, not a web browser notification.** The ntfy mobile app handles links differently from browser-based notifications. Install the ntfy app from the App Store or Google Play if you haven't already.

4. **Check your default browser settings.** If the link opens in an unexpected browser where you're not logged in, set your default browser to the one where you normally use the portal.

5. **Still not working?** Contact the FamilyShield administrator — the portal URL in the notification settings may need to be updated.

---

### 9. I added a new device but it's not being monitored

**What's happening:** Adding a device requires several steps to complete enrollment: installing Tailscale, installing the FamilyShield certificate, and assigning the device to a child profile. If any step was missed, monitoring won't work.

**Steps to fix:**

1. **Check the enrollment checklist.** Every device must have:
   - [ ] Tailscale app installed and connected (showing "Connected" in green)
   - [ ] FamilyShield CA certificate installed and trusted
   - [ ] Device registered in the FamilyShield portal under the correct child profile

2. **Verify Tailscale is connected.** Open the Tailscale app on the new device. It must show "Connected" and display a Tailscale IP address (usually starting with 100.x.x.x).

3. **Check the device appears in the portal.** Log in to the parent portal → Devices. If the new device is not listed, it hasn't been registered yet. Follow the device enrollment guide for your device type.

4. **Check the certificate is installed and trusted.**
   - On iPhone: Go to Settings → General → VPN & Device Management. The FamilyShield certificate should be listed. Also go to Settings → General → About → Certificate Trust Settings and make sure FamilyShield is toggled ON.
   - On Windows: Search for "Manage computer certificates" → Trusted Root Certification Authorities → should contain FamilyShield CA.

5. **Assign the device to a child.** In the portal → Devices → click the device → assign it to the correct child profile.

6. **Generate some test traffic.** With everything connected, open YouTube on the child's device and wait 2–3 minutes. Check the dashboard to see if activity appears.

---

### 10. Activity shows the wrong child

**What's happening:** Each device must be correctly mapped to a child profile. If two children swap devices, or if a device was reassigned, activity may appear under the wrong name.

**Steps to fix:**

1. **Log in to the parent portal** and go to the Devices section.

2. **Find the device showing wrong activity.** Click on the device name.

3. **Change the child assignment.** In the device settings, change "Assigned to" from the incorrect child to the correct child. Save the change.

4. **Check device names are clear.** Rename devices to something obvious like "Emma's iPhone" or "Jake's iPad" so it's easy to spot if something is wrong in the future.

5. **Historical activity cannot be re-attributed.** Once you correct the assignment, future activity will show under the correct child. Past activity recorded under the wrong profile cannot be moved.

6. **If two children share a device:** This is not recommended. FamilyShield applies rules per device, not per user account. A shared device should have the more restrictive profile of the two children applied to it.

---

## Section 2: Developer / Technical Troubleshooting

This section is for the developer (Mohit). It assumes SSH access to the OCI VM and familiarity with Docker, Linux, and the FamilyShield architecture.

**OCI VM:** Ubuntu 22.04 ARM64, ca-toronto-1
**SSH:** `ssh ubuntu@<vm-public-ip>` (or via Tailscale: `ssh ubuntu@100.x.x.x`)

---

### Checking Container Health

#### Reading `docker ps` output

SSH into the OCI VM and run:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

Expected output (all 10 containers healthy):

```
NAMES                        STATUS                    PORTS
familyshield-cloudflared     Up 3 hours                
familyshield-ntfy            Up 3 hours                0.0.0.0:2586->2586/tcp
familyshield-grafana         Up 3 hours                0.0.0.0:3001->3000/tcp
familyshield-influxdb        Up 3 hours                0.0.0.0:8086->8086/tcp
familyshield-nodered         Up 3 hours                0.0.0.0:1880->1880/tcp
familyshield-api             Up 3 hours                0.0.0.0:3001->3001/tcp
familyshield-redis           Up 3 hours                127.0.0.1:6379->6379/tcp
familyshield-mitmproxy       Up 3 hours                0.0.0.0:8888-8889->8888-8889/tcp
familyshield-headscale       Up 3 hours                0.0.0.0:8080->8080/tcp
familyshield-adguard         Up 3 hours                0.0.0.0:53->53/udp, 0.0.0.0:3080->3080/tcp
```

**Status indicators to watch for:**

| Status | Meaning | Action |
|--------|---------|--------|
| `Up X hours/days` | Healthy | None |
| `Up X seconds` | Recently restarted — may be crash-looping | Check logs immediately |
| `Restarting (1) X seconds ago` | Crash-looping | Check logs, fix root cause |
| `Exited (1) X minutes ago` | Stopped with error | Check logs, restart |
| `Exited (0) X minutes ago` | Stopped cleanly | Intentional or restart needed |
| `(health: starting)` | Health check pending | Wait 30s, check again |
| `(unhealthy)` | Health check failing | Check logs and health endpoint |

#### Checking individual container logs

```bash
# Last 100 lines of a specific container
docker logs --tail 100 familyshield-api

# Follow logs in real time (Ctrl+C to exit)
docker logs -f familyshield-api

# Logs with timestamps
docker logs --timestamps --tail 50 familyshield-mitmproxy

# Logs since a specific time
docker logs --since "2026-04-05T10:00:00" familyshield-redis

# All containers — pipe to grep for errors
docker logs familyshield-api 2>&1 | grep -i "error\|fatal\|exception"
```

#### Restarting unhealthy containers

```bash
# Restart a single container
docker restart familyshield-api

# Stop and start (harder restart)
docker stop familyshield-api && docker start familyshield-api

# Recreate a container from its compose definition
cd /opt/familyshield
docker compose up -d --force-recreate familyshield-api

# Restart all containers
docker compose restart

# Full stack down and up (last resort — brief outage)
docker compose down && docker compose up -d
```

#### Checking container resource usage

```bash
# Live resource stats for all containers
docker stats

# One-time snapshot
docker stats --no-stream

# Inspect a container's full configuration
docker inspect familyshield-api | jq '.[0].HostConfig'
```

---

### AdGuard Home Issues

#### DNS not resolving

**Symptom:** Devices get no DNS responses; all sites appear down even though VPN is connected.

**Diagnose:**

```bash
# Check AdGuard container is running
docker ps | grep adguard

# Test DNS resolution from inside the container
docker exec familyshield-adguard nslookup google.com 127.0.0.1

# Test from the host VM
dig @127.0.0.1 google.com

# Check AdGuard is listening on port 53
ss -ulnp | grep :53

# Check logs for errors
docker logs --tail 50 familyshield-adguard
```

**Common causes and fixes:**

```bash
# Port 53 conflict — systemd-resolved may be using port 53
sudo systemctl status systemd-resolved
# If running and conflicting, disable it:
sudo systemctl disable --now systemd-resolved
sudo rm /etc/resolv.conf
echo "nameserver 127.0.0.1" | sudo tee /etc/resolv.conf

# Restart AdGuard after resolving port conflict
docker restart familyshield-adguard
```

#### Blocklist not updating

**Symptom:** Known blocked domains are resolving. AdGuard UI shows blocklist last updated days ago.

```bash
# Trigger a manual blocklist update via AdGuard REST API
curl -s -u admin:${ADGUARD_PASSWORD} \
  http://localhost:3080/control/filtering/refresh \
  -H "Content-Type: application/json" \
  -d '{"whitelist": false}'

# Check current blocklist status
curl -s -u admin:${ADGUARD_PASSWORD} \
  http://localhost:3080/control/filtering/status | jq .

# View AdGuard logs for filter update errors
docker logs familyshield-adguard 2>&1 | grep -i "filter\|blocklist\|update"
```

#### AdGuard API unresponsive (port 3080)

```bash
# Check if port 3080 is listening
ss -tlnp | grep :3080

# Test API directly
curl -v http://localhost:3080/control/status

# Check container health
docker inspect --format='{{.State.Health.Status}}' familyshield-adguard

# If unresponsive, restart container
docker restart familyshield-adguard

# Tail logs after restart to confirm successful startup
docker logs -f familyshield-adguard
```

Expected healthy API response:
```json
{"dns_addresses":["0.0.0.0"],"dns_port":53,"http_port":3080,"protection_enabled":true,"running":true}
```

#### Per-device profile not applying

**Symptom:** A specific child's device is not getting the correct block rules.

```bash
# List all AdGuard client profiles via API
curl -s -u admin:${ADGUARD_PASSWORD} \
  http://localhost:3080/control/clients | jq '.clients[] | {name, ids, use_global_settings, filtering_enabled}'

# Check the client's assigned MAC or IP matches the device
# Tailscale IPs are in the 100.x.x.x range — confirm which IP the device is using
docker exec familyshield-headscale headscale nodes list

# Update a client profile to use the correct filter group
curl -s -u admin:${ADGUARD_PASSWORD} \
  http://localhost:3080/control/clients/update \
  -H "Content-Type: application/json" \
  -d '{"name":"emmas-iphone","data":{"name":"emmas-iphone","ids":["100.64.0.5"],"use_global_settings":false,"filtering_enabled":true}}'
```

---

### Headscale / Tailscale VPN Issues

#### Device shows as offline

```bash
# List all registered nodes and their status
docker exec familyshield-headscale headscale nodes list

# Example output — look for "online" vs "offline" in last column:
# ID  | Hostname       | Name           | MachineKey | NodeKey | Last Seen           | Online
# 1   | emmas-iphone   | emmas-iphone   | [abc123]   | [def456]| 2026-04-05 09:15:22 | false

# Check when the device last checked in
docker exec familyshield-headscale headscale nodes list --output json | \
  jq '.[] | {hostname, last_seen, online}'

# Check Headscale logs for connection attempts
docker logs --tail 100 familyshield-headscale | grep -i "error\|refused\|timeout"
```

#### WireGuard handshake failures

**Symptom:** Device appears registered but can't establish tunnel; logs show handshake timeouts.

```bash
# Check Headscale WireGuard interface on the VM
sudo wg show

# Check if UDP port 8080 is accessible (Headscale coordination port)
sudo ufw status | grep 8080
# Should show: 8080/udp ALLOW

# Check OCI security list — port 8080 UDP must be allowed inbound
# (Check OCI console or iac/modules/oci-network/main.tf)

# View detailed Headscale logs
docker logs -f familyshield-headscale 2>&1 | grep -i "wireguard\|handshake\|peer"

# Restart Headscale to re-establish peer connections
docker restart familyshield-headscale
```

#### Client can't connect to Headscale

**Symptom:** Tailscale app on device shows error connecting to custom control server.

```bash
# Verify Headscale server URL is reachable
curl -v https://familyshield.everythingcloud.ca/headscale/

# Check Cloudflare Tunnel is forwarding correctly to Headscale port 8080
docker logs --tail 50 familyshield-cloudflared | grep -i "headscale\|8080"

# Verify Headscale configuration
docker exec familyshield-headscale cat /etc/headscale/config.yaml | grep -E "server_url|listen_addr"

# Generate a new pre-auth key for re-enrollment
docker exec familyshield-headscale headscale preauthkeys create \
  --user familyshield \
  --expiration 24h \
  --reusable
```

#### Key expiry

**Symptom:** Device was working but suddenly disconnected; logs mention "key expired".

```bash
# List nodes and check key expiry
docker exec familyshield-headscale headscale nodes list --output json | \
  jq '.[] | {hostname, expiry, online}'

# Extend expiry for a specific node (by node ID)
docker exec familyshield-headscale headscale nodes expire --identifier 3

# Or disable key expiry entirely for trusted family devices
docker exec familyshield-headscale headscale nodes expire --identifier 3 --expiry 0

# To re-register a device that has expired, generate a new pre-auth key
docker exec familyshield-headscale headscale preauthkeys create \
  --user familyshield \
  --expiration 72h
# Then run: tailscale up --login-server=https://familyshield.everythingcloud.ca/headscale --authkey=<key>
```

---

### mitmproxy SSL Inspection Issues

#### CA cert not trusted on device

**Symptom:** Browser shows "Your connection is not private" errors. HTTPS traffic not logged.

```bash
# Verify the CA cert is accessible from the mitmproxy container
docker exec familyshield-mitmproxy ls -la /home/mitmproxy/.mitmproxy/
# Should show: mitmproxy-ca-cert.pem, mitmproxy-ca-cert.cer, mitmproxy-ca.p12

# Extract the CA cert for distribution
docker cp familyshield-mitmproxy:/home/mitmproxy/.mitmproxy/mitmproxy-ca-cert.pem \
  /opt/familyshield/certs/familyshield-ca.pem

# Verify cert details
openssl x509 -in /opt/familyshield/certs/familyshield-ca.pem -noout -text | \
  grep -E "Subject:|Not After:|Not Before:"
```

**Device-specific installation:**
- **iOS:** The `.pem` file must be served over HTTP (not HTTPS) for iOS to download and prompt installation. After install, go to Settings → General → About → Certificate Trust Settings and toggle ON.
- **Windows:** Double-click the `.cer` file → Install Certificate → Local Machine → Trusted Root Certification Authorities.
- **Android 7+:** Android restricts user-installed CAs for apps. Requires a device MDM profile or rooted device. Consider DNS-only monitoring for Android.

#### Traffic passing through but not captured

**Symptom:** mitmproxy container is running, device has cert trusted, but no events appear in Redis.

```bash
# Check mitmproxy is receiving traffic
docker logs --tail 100 familyshield-mitmproxy | grep -E "GET|POST|CONNECT"

# Check the addon is loaded
docker logs familyshield-mitmproxy | grep -i "addon\|familyshield"
# Expected: "FamilyShield addon loaded"

# Check Redis is receiving events from the addon
docker exec familyshield-redis redis-cli LLEN fs:events

# Verify the addon file is mounted correctly
docker exec familyshield-mitmproxy ls -la /app/familyshield_addon.py

# Check mitmproxy is running in transparent proxy mode (not SOCKS)
docker inspect familyshield-mitmproxy | jq '.[0].Args'

# Check the device's proxy settings point to the correct IP and port 8888
# From the device: HTTP proxy = 100.x.x.x (VM's Tailscale IP), port = 8888
```

#### High CPU usage in mitmproxy container

**Symptom:** `docker stats` shows mitmproxy consuming >80% CPU; system sluggish.

```bash
# Check real-time stats
docker stats familyshield-mitmproxy --no-stream

# Check if a specific flow is looping
docker logs --tail 200 familyshield-mitmproxy | \
  grep "CONNECT" | sort | uniq -c | sort -rn | head -20

# Check addon for errors causing retry loops
docker logs familyshield-mitmproxy 2>&1 | grep -i "traceback\|exception\|error"

# Limit mitmproxy CPU if needed (emergency throttle)
docker update --cpus="1.5" familyshield-mitmproxy

# If a single domain is hammering mitmproxy, add it to the ignore list
# Edit docker-compose.yml — add to mitmproxy command:
# --ignore-hosts '^(.+\.)?problem-domain\.com$'
docker compose up -d familyshield-mitmproxy
```

#### Specific platforms bypassing inspection

**Symptom:** YouTube or Roblox traffic visible in DNS logs but not in mitmproxy captures.

```bash
# Check if the app uses certificate pinning (common with mobile apps)
docker logs familyshield-mitmproxy | grep -i "certificate\|pinning\|ssl.*error" | tail -50

# Check if the platform is on the mitmproxy ignore list
docker inspect familyshield-mitmproxy | jq '.[0].Args'

# For TikTok — this is expected: TikTok is DNS-blocked, not inspected
# For YouTube/Roblox on iOS — ensure certificate pinning bypass profile is installed
# on the device (requires supervised MDM for full bypass)

# Check what AdGuard sees vs what mitmproxy sees
docker exec familyshield-redis redis-cli LRANGE fs:events 0 20 | grep -i youtube
```

---

### Redis Queue Issues

#### Queue backlog building up

**Symptom:** `fs:events` list length keeps growing; events are not being consumed by the API worker.

```bash
# Check current queue depth
docker exec familyshield-redis redis-cli LLEN fs:events

# Check queue depth over time (run a few times, 10s apart)
watch -n 10 'docker exec familyshield-redis redis-cli LLEN fs:events'

# Peek at the first 5 events without consuming them
docker exec familyshield-redis redis-cli LRANGE fs:events 0 4

# Check if the API worker is running and healthy
docker ps | grep familyshield-api
docker logs --tail 50 familyshield-api | grep -i "consume\|process\|error"

# If backlog > 10,000 and events are stale, trim the queue (emergency)
# This discards oldest events — use only if worker has been down for hours
docker exec familyshield-redis redis-cli LTRIM fs:events 0 999
```

#### Events not being consumed

```bash
# Check the API worker's consumer loop is running
docker logs --tail 100 familyshield-api | grep -E "consume|BRPOP|processing|error"

# Check Redis connectivity from the API container
docker exec familyshield-api node -e "
  const redis = require('redis');
  const c = redis.createClient({url: 'redis://familyshield-redis:6379'});
  c.connect().then(() => { console.log('Redis OK'); c.quit(); }).catch(console.error);
"

# Check environment variables are set correctly in the API container
docker exec familyshield-api env | grep -E "REDIS|SUPABASE|GROQ"

# Restart the API worker
docker restart familyshield-api

# Monitor consumption after restart
docker logs -f familyshield-api | grep -i "event\|process\|consume"
```

#### Redis OOM (out of memory)

**Symptom:** Redis logs show `OOM command not allowed`; events being dropped.

```bash
# Check Redis memory usage
docker exec familyshield-redis redis-cli INFO memory | \
  grep -E "used_memory_human|maxmemory_human|mem_fragmentation_ratio"

# Check maxmemory policy
docker exec familyshield-redis redis-cli CONFIG GET maxmemory
docker exec familyshield-redis redis-cli CONFIG GET maxmemory-policy

# Set a memory limit if not set (e.g., 512MB with LRU eviction)
docker exec familyshield-redis redis-cli CONFIG SET maxmemory 512mb
docker exec familyshield-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Check all keys and their sizes
docker exec familyshield-redis redis-cli --bigkeys

# Flush stale processed events (if using a separate processed set)
docker exec familyshield-redis redis-cli DEL fs:processed

# Full memory report
docker exec familyshield-redis redis-cli MEMORY DOCTOR
```

---

### API Worker Issues

#### Worker not processing events

```bash
# Check container status and recent restarts
docker ps --filter name=familyshield-api --format "{{.Status}}"

# Check logs for startup errors
docker logs --tail 100 familyshield-api

# Common startup errors to look for:
# - "Cannot find module" → Node.js dependency missing, rebuild image
# - "ECONNREFUSED redis:6379" → Redis not ready yet, restart API worker
# - "Invalid Supabase URL" → env vars not set

# Verify the worker process is actually running inside the container
docker exec familyshield-api ps aux | grep node

# Manually trigger a test event consumption (if debug endpoint exists)
curl -s http://localhost:3001/health | jq .
```

#### Groq API rate limit errors

**Symptom:** Logs show `429 Too Many Requests` from Groq; AI enrichment failing.

```bash
# Check for rate limit errors in API logs
docker logs familyshield-api 2>&1 | grep -i "groq\|429\|rate.limit" | tail -20

# Check current Groq usage at: https://console.groq.com/
# Free tier: 500,000 tokens/day — resets at midnight UTC

# Check LLM router configuration
docker exec familyshield-api cat /app/src/llm/router.ts 2>/dev/null || \
  docker exec familyshield-api env | grep GROQ

# Confirm Anthropic fallback is configured
docker exec familyshield-api env | grep ANTHROPIC

# If Groq is consistently rate-limited, reduce event batch size
# Edit apps/api/src/worker/event-consumer.ts → lower BATCH_SIZE constant
# Rebuild and redeploy:
docker compose up -d --build familyshield-api
```

#### Anthropic fallback not triggering

**Symptom:** Groq fails with 429, but Anthropic fallback doesn't activate; events are dropped.

```bash
# Check Anthropic API key is set
docker exec familyshield-api env | grep ANTHROPIC_API_KEY

# Check LLM router logs for fallback logic
docker logs familyshield-api 2>&1 | grep -i "anthropic\|fallback\|haiku" | tail -20

# Test Anthropic API key directly
docker exec familyshield-api node -e "
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic();
  client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 10,
    messages: [{role: 'user', content: 'ping'}]
  }).then(r => console.log('Anthropic OK:', r.stop_reason)).catch(console.error);
"

# Check the router.ts fallback threshold — Groq errors should trigger fallback
# Rebuild after any code changes:
docker compose up -d --build familyshield-api
```

#### Platform API errors (YouTube, Roblox quota)

```bash
# Check YouTube Data API v3 quota errors
docker logs familyshield-api 2>&1 | grep -i "youtube\|quota\|403" | tail -20
# YouTube free quota: 10,000 units/day. Each video lookup = 1 unit.
# If exceeded, logs will show: "The caller does not have permission" or "quotaExceeded"
# Fix: Create additional YouTube Data API keys in Google Cloud Console and rotate

# Check Roblox API errors
docker logs familyshield-api 2>&1 | grep -i "roblox\|429\|503" | tail -20
# Roblox open API has no quota but may rate-limit; add backoff if needed

# Check Discord bot errors
docker logs familyshield-api 2>&1 | grep -i "discord\|token\|unauthorized" | tail -20
# 401 Unauthorized = Discord bot token expired or invalid; regenerate in Discord Dev Portal

# Check Twitch API errors
docker logs familyshield-api 2>&1 | grep -i "twitch\|access.token\|401" | tail -20
# Twitch uses OAuth; token may expire. Check TWITCH_ACCESS_TOKEN env var expiry.

# View all current enricher environment variables (keys truncated in output)
docker exec familyshield-api env | grep -E "YOUTUBE|ROBLOX|DISCORD|TWITCH" | \
  sed 's/=.*/=[REDACTED]/'
```

---

### Supabase Issues

#### Connection failures

**Symptom:** API worker logs show `connection refused` or `SSL SYSCALL error` to Supabase.

```bash
# Check Supabase connection from the API container
docker exec familyshield-api node -e "
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const c = createClient(url, key);
  c.from('events').select('count').limit(1)
    .then(({data, error}) => { console.log(error ? 'FAIL: ' + error.message : 'OK: ' + JSON.stringify(data)); });
"

# Check Supabase environment variables
docker exec familyshield-api env | grep SUPABASE

# Check if Supabase project is paused (free tier pauses after 1 week of inactivity)
# Visit: https://supabase.com/dashboard → check project status
# If paused: click "Resume project" — takes ~30 seconds to come back

# Test Supabase REST endpoint directly
curl -s \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  "https://<project-ref>.supabase.co/rest/v1/events?limit=1" | jq .
```

#### Storage quota approaching limit

**Symptom:** Supabase dashboard shows storage near 500MB (free tier limit).

```bash
# Check database size via Supabase SQL editor (run in Supabase dashboard):
# SELECT pg_size_pretty(pg_database_size(current_database()));

# Identify largest tables
# SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS size
# FROM pg_catalog.pg_statio_user_tables
# ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

# Archive and delete old events from the OCI VM
docker exec familyshield-api node -e "
  const { createClient } = require('@supabase/supabase-js');
  const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  // Delete events older than 90 days
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  c.from('events').delete().lt('created_at', cutoff)
    .then(({error, count}) => console.log(error || 'Deleted: ' + count));
"

# Run VACUUM to reclaim space after bulk deletes (in Supabase SQL editor):
# VACUUM FULL events;
```

#### Realtime WebSocket disconnections

**Symptom:** Parent portal dashboard stops updating live; requires page refresh to see new data.

```bash
# Check Supabase Realtime status from portal browser console
# Open browser DevTools → Console → look for WebSocket errors:
# "WebSocket connection failed" or "Realtime: disconnected"

# Check Realtime is enabled for the events table
# Supabase Dashboard → Database → Replication → check 'events' table is in the publication

# Check Cloudflare tunnel WebSocket support
docker logs familyshield-cloudflared | grep -i "websocket\|upgrade\|101"

# Cloudflare tunnel config must have http2Origin enabled for WebSocket passthrough
# Check iac/modules/cloudflare-dns/main.tf — cloudflare_tunnel_config resource

# Test WebSocket connectivity
docker exec familyshield-api node -e "
  const WebSocket = require('ws');
  const ws = new WebSocket('wss://<project-ref>.supabase.co/realtime/v1/websocket?apikey=<key>&vsn=1.0.0');
  ws.on('open', () => { console.log('WebSocket OK'); ws.close(); });
  ws.on('error', (e) => console.error('WebSocket FAIL:', e.message));
"
```

---

### Cloudflare Tunnel Issues

#### Tunnel disconnected

**Symptom:** Portal returns "Error 1033: Argo Tunnel error" or times out completely.

```bash
# Check cloudflared container status
docker ps | grep cloudflared
docker logs --tail 50 familyshield-cloudflared

# Look for connection errors in logs
docker logs familyshield-cloudflared 2>&1 | grep -i "error\|failed\|disconnect" | tail -20

# Check tunnel credentials are mounted
docker exec familyshield-cloudflared ls -la /etc/cloudflared/

# Restart cloudflared (it will re-establish connection automatically)
docker restart familyshield-cloudflared

# Monitor reconnection
docker logs -f familyshield-cloudflared | grep -i "connect\|tunnel\|register"
# Expected: "Connection registered connIndex=0 ip=<Cloudflare edge IP>"

# Verify tunnel ID from Cloudflare dashboard matches the credential file
docker exec familyshield-cloudflared cat /etc/cloudflared/config.yml
# tunnel: <tunnel-UUID> — must match what's in Cloudflare Zero Trust dashboard
```

#### Portal returning 502 / 503

**Symptom:** Tunnel is connected but portal pages return 502 Bad Gateway or 503 Service Unavailable.

```bash
# 502 = tunnel connected but backend service is down
# 503 = cloudflared can't reach the origin

# Check which service is behind each route
docker exec familyshield-cloudflared cat /etc/cloudflared/config.yml
# ingress rules map hostnames to local ports — verify the port is correct

# Check the Next.js portal container (if running on OCI) or Cloudflare Pages
# For Cloudflare Pages deployments, check the Pages dashboard for build errors

# Check the API health endpoint (if portal calls the API)
curl -s http://localhost:3001/health | jq .

# Check if the port is actually listening
ss -tlnp | grep -E "3000|3001|1880"

# For 503 — check cloudflared can reach the origin service
docker exec familyshield-cloudflared curl -sv http://localhost:3001/health
```

#### Zero Trust blocking legitimate access

**Symptom:** Mohit (or a parent) gets a "Access Denied" page when trying to reach the portal.

```bash
# Check Zero Trust Access policy in Cloudflare dashboard:
# Zero Trust → Access → Applications → FamilyShield Portal → Policies
# Verify the email address is in the "Include" list (or matches the allowed email domain)

# Check the Access audit log in Cloudflare:
# Zero Trust → Logs → Access → filter by email

# For self-debugging — check the cf-access-jwt cookie in the browser
# DevTools → Application → Cookies → cf-access-jwt
# Decode at jwt.io to see which email is being authenticated

# If a parent is locked out, add their email to the Access policy in Cloudflare dashboard
# No infrastructure restart needed — policy changes take effect within seconds

# Test Zero Trust authentication from CLI (generates a service token)
# For automated health checks, use a Cloudflare Service Token instead of user auth
```

---

### Node-RED Issues

#### Flow not triggering

**Symptom:** Rules should fire based on events but nothing happens; no alerts sent.

```bash
# Check Node-RED container status
docker ps | grep nodered
docker logs --tail 50 familyshield-nodered

# Access Node-RED debug panel
# The Node-RED UI is at http://localhost:1880 (via Tailscale or SSH tunnel)
# Check the debug sidebar (bug icon) for flow errors

# Check if inject/MQTT/Redis input nodes are connected
# In the Node-RED editor, disconnected nodes show as grey

# Check Node-RED logs for flow errors
docker logs familyshield-nodered 2>&1 | grep -i "error\|exception\|fail" | tail -30

# Restart Node-RED (flows reload automatically)
docker restart familyshield-nodered

# Check Node-RED can reach Redis
docker exec familyshield-nodered node -e "
  const redis = require('redis');
  const c = redis.createClient({url: 'redis://familyshield-redis:6379'});
  c.connect().then(() => { console.log('Redis reachable from Node-RED'); c.quit(); });
"

# SSH tunnel to access Node-RED UI locally for debugging
ssh -L 1880:localhost:1880 ubuntu@<vm-ip>
# Then open http://localhost:1880 in your browser
```

#### Rules not evaluating correctly

```bash
# Export current flows for inspection
curl -s http://localhost:1880/flows | jq . > /tmp/nodered-flows-$(date +%Y%m%d).json

# Check Node-RED context store (where rule state is kept)
docker exec familyshield-nodered node -e "
  // Check context via REST API
" 
# Or use Node-RED dashboard: Debug → Context Data

# Review flow for common issues:
# 1. Switch nodes with wrong comparison types (string vs number)
# 2. Function nodes with uncaught exceptions (check debug output)
# 3. Missing msg.payload structure for input events

# Inject a test message to debug a specific flow
# In Node-RED UI: add a temporary Inject node → connect to the problematic node → deploy → click inject
```

#### ntfy alerts not sending from Node-RED

```bash
# Check the ntfy HTTP request node configuration in Node-RED
# Method: POST
# URL: http://familyshield-ntfy:2586/<topic>
# Headers: Title, Priority, Tags

# Test ntfy directly from the VM
curl -s \
  -H "Title: FamilyShield Test" \
  -H "Priority: default" \
  -d "Test alert from $(date)" \
  http://localhost:2586/familyshield-alerts

# Check ntfy container logs
docker logs --tail 30 familyshield-ntfy

# Check ntfy server config
docker exec familyshield-ntfy cat /etc/ntfy/server.yml

# Test ntfy from inside the Node-RED container
docker exec familyshield-nodered curl -s \
  -H "Title: Test" \
  -d "Test from Node-RED container" \
  http://familyshield-ntfy:2586/familyshield-alerts
# If this fails, check Docker network connectivity between containers

# Check Docker network
docker network inspect familyshield_default | jq '.[0].Containers | to_entries[] | .value.Name'
# All containers should be on the same network
```

---

### OCI VM Issues

#### SSH access

```bash
# Primary SSH (public IP)
ssh -i ~/.ssh/familyshield_oci ubuntu@<oci-public-ip>

# Via Tailscale (if Headscale is running and VM is enrolled)
ssh ubuntu@100.x.x.x

# If SSH key is lost — use OCI Console:
# OCI Dashboard → Compute → Instances → familyshield-vm → 
# Click "Cloud Shell" or use "Console Connection"

# If SSH is hanging — check UFW rules
# Via OCI Console serial console:
sudo ufw status
sudo ufw allow 22/tcp  # if somehow removed

# Check fail2ban hasn't banned your IP
sudo fail2ban-client status sshd
sudo fail2ban-client set sshd unbanip <your-ip>
```

#### Disk space full (Docker images, logs)

**Symptom:** Containers crashing with "no space left on device"; `df -h` shows /dev/sda1 at 100%.

```bash
# Check disk usage
df -h

# Find what's using space
du -sh /var/lib/docker/*
du -sh /var/log/*

# Docker cleanup (safe — removes stopped containers, unused images, build cache)
docker system prune -f

# More aggressive cleanup (removes all unused images, not just dangling ones)
docker system prune -af

# Check Docker log sizes (can grow very large)
docker system df

# Limit container log sizes going forward
# Add to docker-compose.yml under each service:
# logging:
#   driver: "json-file"
#   options:
#     max-size: "50m"
#     max-file: "3"

# Manually truncate a specific container's log (emergency)
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' familyshield-mitmproxy)

# Check for large files in /var/log
sudo du -sh /var/log/* | sort -rh | head -10

# Rotate system logs
sudo logrotate -f /etc/logrotate.conf

# Check OCI Object Storage bucket sizes (Terraform state, backups)
# oci os object list --bucket-name familyshield-tfstate --all | jq '[.[].size] | add'
```

#### CPU / Memory pressure

**Symptom:** `docker stats` shows containers throttled; system load average > 4.0 (4 OCPUs).

```bash
# Check current load
uptime
# Check: load average should be below 4.0 (4 OCPU ARM VM)

# Check memory
free -h

# Check which container is using the most CPU/memory
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | sort -k2 -rh

# Check system processes
top -bn1 | head -20

# mitmproxy and the API worker are the typical CPU consumers
# Limit mitmproxy CPU if needed
docker update --cpus="2.0" familyshield-mitmproxy
docker update --cpus="1.0" familyshield-api

# Check for zombie processes
ps aux | awk '$8=="Z"'

# If memory is exhausted, check for Redis memory leak
docker exec familyshield-redis redis-cli INFO memory

# Set swap (OCI ARM VMs don't have swap by default)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

#### VM unreachable

**Symptom:** SSH times out; Cloudflare Tunnel shows as disconnected; all monitoring stops.

```bash
# Step 1: Check from OCI Console
# Login → Compute → Instances → familyshield-vm
# Check: Instance State (should be "Running")
# Check: Console Connection → Open Console to see if OS is responsive

# Step 2: If instance is running but unreachable — check OCI security list
# Networking → Virtual Cloud Networks → familyshield-vcn → 
# Security Lists → Ingress Rules: port 22 TCP must be allowed from your IP

# Step 3: If instance is stopped — start it from OCI Console
# Click "Start" — wait ~2 minutes for full boot

# Step 4: After reboot, verify Docker auto-started
ssh ubuntu@<ip>
sudo systemctl status docker
docker ps  # All containers should be running (docker-compose systemd service)

# Step 5: If containers didn't auto-start
sudo systemctl status familyshield
# If not found, manually start:
cd /opt/familyshield && docker compose up -d

# Step 6: Verify Cloudflare Tunnel reconnected
docker logs --tail 20 familyshield-cloudflared
# Should show "Connection registered"

# Step 7: Check cloud-init logs if this is a newly provisioned VM
sudo cat /var/log/cloud-init-output.log | tail -50
```

---

### GitHub Actions CI/CD Issues

#### OCI authentication failures

**Symptom:** CI job fails with "OCI service error: 401" or "Authentication is required".

```bash
# The oci-login reusable action uses an OCI IAM user + API key
# Required GitHub Secrets (check Settings → Secrets and variables → Actions):
# - OCI_USER_OCID
# - OCI_FINGERPRINT
# - OCI_TENANCY_OCID
# - OCI_REGION (should be ca-toronto-1)
# - OCI_PRIVATE_KEY (the PEM private key, including BEGIN/END lines)

# Verify the API key is still active in OCI
# OCI Console → Identity → Users → <ci-user> → API Keys
# Check the fingerprint matches OCI_FINGERPRINT secret

# Test OCI CLI authentication locally (mimics what CI does)
oci iam user get --user-id $OCI_USER_OCID

# If the API key has been rotated, update the GitHub secret:
# 1. Generate new key pair: oci setup keys
# 2. Upload public key to OCI: Identity → Users → API Keys → Add API Key
# 3. Update GitHub Secret OCI_PRIVATE_KEY with new private key
# 4. Update GitHub Secret OCI_FINGERPRINT with new fingerprint

# Check the oci-login action logs in GitHub Actions for the exact error
# Actions → pr-check / deploy-dev → expand "OCI Login" step
```

#### tofu plan failures

**Symptom:** PR check fails; tofu plan comment is not posted to the PR.

```bash
# Check the GitHub Actions log for the exact tofu error
# Actions → pr-check → expand "OpenTofu Plan" step

# Common errors:

# 1. "Error: No valid credential sources found"
#    → OCI authentication failed (see above)

# 2. "Error: Invalid value for input variable"
#    → Check iac/environments/dev/terraform.tfvars — required variable missing

# 3. "Error: timeout while waiting for state to become 'AVAILABLE'"
#    → OCI resource creation timeout — re-run the workflow

# 4. "Error acquiring the state lock"
#    → A previous apply is still running, or a lock is stuck
#    → Check OCI Object Storage for the lock file: familyshield-tfstate/envs/dev/terraform.tfstate.lock

# Force-unlock a stuck state (get lock ID from the error message)
cd iac
tofu init -backend-config=environments/dev/backend.tfvars
tofu force-unlock <lock-id>

# 5. "Error: Provider registry.terraform.io/hashicorp/oci not found"
#    → Providers not initialized — ensure tofu init runs before plan in the action

# Run plan locally to debug
cd iac
tofu init -backend-config=environments/dev/backend.tfvars
tofu plan -var-file=environments/dev/terraform.tfvars
```

#### Docker image build failures

**Symptom:** `app-build.yml` workflow fails; images not pushed to GHCR.

```bash
# Check GitHub Actions log for the build step error
# Actions → app-build → expand "Build and push" step

# Common errors:

# 1. "denied: permission_denied" pushing to ghcr.io
#    → GITHUB_TOKEN needs write:packages permission
#    → Check the workflow YAML: permissions: packages: write
#    → Check repo Settings → Actions → General → "Read and write permissions"

# 2. "error: failed to solve: failed to read dockerfile"
#    → Dockerfile path is wrong in the workflow
#    → Check: context and file parameters in docker/build-push-action

# 3. TypeScript compilation errors
docker build -t test-build ./apps/api  # Run locally to see full error
cd apps/api && npm run build  # Check TypeScript errors locally

# 4. Python build errors (mitmproxy)
docker build -t test-mitm ./apps/mitm
cd apps/mitm && python -m pytest tests/  # Run tests locally

# 5. "no space left on device" on GitHub Actions runner
#    → Caused by large Docker layers — use .dockerignore to exclude node_modules, .git
#    → Check apps/api/.dockerignore and apps/mitm/.dockerignore exist

# List available images in GHCR
# Visit: https://github.com/orgs/Everythingcloudsolutions/packages
# Or via API:
curl -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/orgs/Everythingcloudsolutions/packages?package_type=container

# Pull and test a specific image
docker pull ghcr.io/everythingcloudsolutions/familyshield-api:latest
docker run --rm ghcr.io/everythingcloudsolutions/familyshield-api:latest node -e "console.log('OK')"
```

---

## Quick Reference: Key Ports & Endpoints

| Service | Port | Internal URL | Purpose |
|---------|------|-------------|---------|
| AdGuard Home | 53 (UDP) | `familyshield-adguard:53` | DNS filtering |
| AdGuard API | 3080 | `http://localhost:3080` | Management API |
| Headscale | 8080 | `familyshield-headscale:8080` | VPN coordination |
| mitmproxy | 8888 | `familyshield-mitmproxy:8888` | HTTP/S proxy |
| mitmproxy Web UI | 8889 | `http://localhost:8889` | Traffic inspection UI |
| Redis | 6379 | `familyshield-redis:6379` | Event queue |
| API Worker | 3001 | `http://localhost:3001` | Enrichment + health |
| Node-RED | 1880 | `http://localhost:1880` | Rule engine UI |
| InfluxDB | 8086 | `http://localhost:8086` | Metrics API |
| Grafana | 3000 | `http://localhost:3000` | Dashboards |
| ntfy | 2586 | `http://familyshield-ntfy:2586` | Push notifications |
| Cloudflare Tunnel | — | outbound only | Portal access |

## Quick Reference: Useful One-Liners

```bash
# Full stack status
docker ps --format "table {{.Names}}\t{{.Status}}" | grep familyshield

# Tail all container logs simultaneously
docker compose -f /opt/familyshield/docker-compose.yml logs -f --tail=10

# Check Redis queue depth
docker exec familyshield-redis redis-cli LLEN fs:events

# Test DNS resolution
dig @localhost google.com +short

# Check disk usage summary
df -h / && docker system df

# Restart all containers in order
docker compose -f /opt/familyshield/docker-compose.yml restart

# Check all container health statuses
docker ps --format "{{.Names}}: {{.Status}}" | grep -v "Up [0-9]* [mhd]"

# Stream live events from Redis queue (non-destructive peek)
watch -n 2 'docker exec familyshield-redis redis-cli LRANGE fs:events 0 4'

# Check OCI VM uptime and load
uptime && free -h && df -h /

# Export Supabase events table (for backup/debug)
# Run via Supabase SQL editor:
# COPY (SELECT * FROM events WHERE created_at > now() - interval '7 days') 
# TO '/tmp/events-export.csv' CSV HEADER;
```

---

*FamilyShield — Intelligent Parental Control Platform*
*Operated by Mohit (Everythingcloudsolutions) — Toronto, Canada*
*Platform version: 1.0 — 2026*
