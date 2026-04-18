# FamilyShield — Troubleshooting Guide

> Last updated: 2026-04-16
> Platform: FamilyShield v1 — OCI ca-toronto-1 (Toronto, Canada)

> **New joiners and infrastructure debuggers:** Start with the companion document:
> **[Infrastructure Deployment Troubleshooting Log](infrastructure.md)** — a chronological record of every real deployment pipeline problem encountered, with root causes and exact fixes.

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
  - [Quick Health Check](#quick-health-check-start-here)
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
  - [Issue: Device Can't Connect to Tailscale](#issue-device-cant-connect-to-tailscale)
  - [Issue: Device Connected to Tailscale but No Internet](#issue-device-connected-to-tailscale-but-no-internet)
  - [Issue: mitmproxy Not Intercepting HTTPS](#issue-mitmproxy-not-intercepting-https)
  - [Issue: API Not Receiving Events from mitmproxy](#issue-api-not-receiving-events-from-mitmproxy)
  - [Issue: Alerts Not Appearing in Portal](#issue-alerts-not-appearing-in-portal)
  - [Issue: ntfy Not Sending Alerts](#issue-ntfy-not-sending-alerts)
  - [Issue: High Memory Usage](#issue-high-memory-usage)
  - [Service Restart Order](#service-restart-order)
  - [Still Broken? Debug Checklist](#still-broken-debug-checklist)

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

**What's happening:** The parent portal is hosted at <https://familyshield.everythingcloud.ca>. If it won't load, it could be a temporary outage, a login issue, or a network problem on your end.

**Steps to fix:**

1. **Check your own internet connection.** Try opening another website. If nothing loads, the problem is your network, not FamilyShield.

2. **Try a different browser.** Open the portal in Chrome, Firefox, or Safari. Sometimes a browser extension or cached data causes loading issues.

3. **Clear your browser cache.**
   - Chrome: Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac) → select "Cached images and files" → Clear data.
   - Safari: Preferences → Advanced → Show Develop menu → Develop → Empty Caches.

4. **Try an incognito / private window.** This bypasses cached data and extensions. If the portal loads in incognito, the issue is a browser extension or cached session.

5. **Wait 5 minutes and try again.** The portal may be restarting after an update.

6. **Check the status page (if available).** Visit <https://familyshield-dev.everythingcloud.ca/health> in your browser. If you see "OK", the backend is running fine and the issue is likely your browser.

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

3. **Try a fresh browser window.** Open an incognito or private window and go to <https://familyshield.everythingcloud.ca> again. Click "Log In" and try your email.

4. **Clear cookies for the portal domain.** Old or corrupted session cookies can block login.
   - Chrome: Press Ctrl+Shift+Delete → select "Cookies and other site data" → Clear data → try logging in again.

5. **Try a different browser or device.** If you can log in on your phone but not your laptop, the issue is browser-specific.

6. **Check that your email provider isn't blocking Cloudflare emails.** Cloudflare sends verification emails from a cloudflare.com address. Make sure these aren't filtered.

7. **Still locked out?** Contact the FamilyShield administrator to reset your access.

---

### 8. The ntfy notification links don't work

**What's happening:** When FamilyShield sends an alert, it may include a link to view more details about the flagged content. If that link doesn't open correctly, the URL configuration may need updating.

**Steps to fix:**

1. **Make sure you are logged in to the parent portal first.** The links in notifications will take you to the portal, which requires you to be logged in. Open <https://familyshield.everythingcloud.ca> in your browser, log in, then tap the notification link again.

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

### Quick Health Check (Start Here)

Run this every time something breaks:

```bash
ssh -i ~/.ssh/familyshield ubuntu@<vm-ip>

# All services running?
docker compose ps

# Expected output:
# NAME                    STATUS
# familyshield-adguard    Up (healthy)
# familyshield-headscale  Up (healthy)
# familyshield-mitmproxy  Up (healthy)
# familyshield-redis      Up (healthy)
# familyshield-api        Up (healthy)
# familyshield-ntfy       Up (healthy)
# familyshield-portal     Up (healthy)

# Any failed?
docker compose ps --filter "status=exited"

# Check last 50 lines of logs
docker compose logs --tail 50 --timestamps
```

**If any service is DOWN:** Jump to that service's section below.

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

#### AdGuard admin UI shows 503 / setup wizard not complete

**Symptom:** `adguard-dev.everythingcloud.ca` returns 503 Bad Gateway from Cloudflare.

**Cause:** AdGuard's first-launch setup wizard runs on container port 3000. The Cloudflare tunnel routes
to host:3080 → container:80. Port 80 is empty until the wizard is completed. Container port 3000 is
**not mapped to the host** — `ssh -L 3000:localhost:3000` does NOT work.

**Fix — port-forward directly to the container IP on the bridge network:**

```bash
# AdGuard container is at 172.20.0.2 on the familyshield bridge network
ssh -L 3000:172.20.0.2:3000 -i ~/.ssh/familyshield ubuntu@<vm-ip> -N
```

Leave that terminal open (no shell, just forwarding). Open `http://localhost:3000` in your browser.

In the wizard, **you must set Admin Web Interface port to 80** (not 3000). After the wizard completes:
- Port 3000 wizard disappears → "Connection refused" on port-forward = setup is done (expected)
- AdGuard now serves on port 80 → Cloudflare tunnel at `adguard-dev.everythingcloud.ca` works
- Container healthcheck passes

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

#### `--user` flag requires numeric ID, not username

**Symptom:** `preauthkeys create --user parent` fails with:
`invalid argument "parent" for "-u, --user" flag: strconv.ParseUint: parsing "parent": invalid syntax`

**Cause:** Recent headscale versions changed `--user` to accept the numeric user ID only.

**Fix:**

```bash
# Get the numeric ID first
docker exec familyshield-headscale headscale users list
# Example output: ID=1, Name=parent

# Use the ID, not the name
docker exec familyshield-headscale headscale preauthkeys create --user 1 --reusable --expiration 8760h
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

> **Architecture note (2026-04-16):** Cloudflare resources (tunnel, DNS, access apps, service token, WAF) are managed by the `iac/cloudflare/` OpenTofu module with its own separate state (`cloudflare/{env}/terraform.tfstate`). The `setup-cloudflare-{env}` job in `infra-dev.yml` / `infra-prod.yml` runs `tofu apply` in that directory, then captures the tunnel token and service token credentials as GitHub Secrets. The `cloudflared` daemon runs on the OCI VM as a standalone `docker run` container started in the same job. For the full history of how this architecture was reached, see [Infrastructure Deployment Troubleshooting Log](infrastructure.md).

#### Tunnel shows as INACTIVE in Cloudflare dashboard

**Symptom:** Cloudflare dashboard shows tunnel status as **INACTIVE**; portal returns timeouts or 502.

```bash
# 1. Check if cloudflared container is running on the VM
ssh ubuntu@<vm-ip> "docker ps | grep cloudflared"
# Should show: familyshield-cloudflared  Up X minutes

# 2. Check cloudflared logs for connection status
ssh ubuntu@<vm-ip> "docker logs familyshield-cloudflared --tail 20"
# Healthy: "Registered tunnel connection connIndex=0"
# Bad token: "Invalid tunnel token" or "Authentication error"

# 3. If cloudflared is not running, get the real token then start it:
export CLOUDFLARE_API_TOKEN="<your-token>"
export CLOUDFLARE_ACCOUNT_ID="<your-account>"
TUNNEL_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel" \
  | jq -r '.result[] | select(.name=="familyshield-dev") | .id')
TUNNEL_TOKEN=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/token" \
  | jq -r '.result')

ssh ubuntu@<vm-ip> "
  docker stop familyshield-cloudflared 2>/dev/null || true
  docker rm familyshield-cloudflared 2>/dev/null || true
  docker run -d \
    --name familyshield-cloudflared \
    --restart unless-stopped \
    --network host \
    cloudflare/cloudflared:latest \
    tunnel --no-autoupdate run --token $TUNNEL_TOKEN
"
```

#### Tunnel was active, then went INACTIVE

```bash
# Usually means cloudflared crashed or the VM rebooted without --restart taking effect
ssh ubuntu@<vm-ip>

docker ps -a | grep cloudflared

# If Exited — restart it (has --restart unless-stopped):
docker start familyshield-cloudflared

# If docker daemon didn't start on boot:
sudo systemctl restart docker
docker start familyshield-cloudflared

# Check reason for exit:
docker logs familyshield-cloudflared --tail 30
# "context canceled" = intentional stop
# "ERR Fail to dial" = network issue — retry
# "certificate has expired" = token expired — re-run setup-cloudflare workflow
```

#### Portal returning 502 or 503

```bash
# 502 = cloudflared is connected but the backend service (api or portal) is down
# 503 = cloudflared cannot reach the origin at all

# Check if api and portal containers are running:
ssh ubuntu@<vm-ip> "docker ps --format '{{.Names}}: {{.Status}}'"

# If missing — check if docker-compose.yml exists:
ssh ubuntu@<vm-ip> "ls /opt/familyshield/docker-compose.yml"

# If docker-compose.yml exists, start api and portal:
ssh ubuntu@<vm-ip> "cd /opt/familyshield && docker compose up -d api portal"

# If docker-compose.yml is MISSING (broken cloud-init):
# Re-run the deploy workflow — the bootstrap step restores it automatically
# Or render and copy it manually per the procedure in infrastructure.md Issue 8

# Confirm the services respond locally:
ssh ubuntu@<vm-ip> "curl -s http://localhost:3001/health"
ssh ubuntu@<vm-ip> "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
```

#### Zero Trust blocking legitimate access

```bash
# Check Zero Trust Access policy in Cloudflare dashboard:
# Zero Trust → Access → Applications → FamilyShield Portal → Policies
# Verify the email address is in the "Include" list

# Check the Access audit log:
# Zero Trust → Logs → Access → filter by email

# For self-debugging — check the cf-access-jwt cookie in the browser
# DevTools → Application → Cookies → cf-access-jwt
# Decode at jwt.io to see which email is being authenticated

# Add a parent's email to the Access policy — no restart needed; takes effect in seconds
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

### ntfy Issues

#### `ntfy user add` fails with "inappropriate ioctl for device"

**Symptom:** Running `docker exec familyshield-ntfy ntfy user add parent` exits silently or prints
`password: inappropriate ioctl for device`

**Cause:** `ntfy user add` prompts for a password interactively. Without a TTY allocated, Docker can't
attach to the terminal for password input.

**Fix:** Always use `-it` when running ntfy commands that prompt for input:

```bash
docker exec -it familyshield-ntfy ntfy user add parent
# Prompts: Enter Password: ●●●●●●●●
```

After creating the user, grant topic access (this doesn't need `-it`):

```bash
docker exec familyshield-ntfy ntfy access parent familyshield-alerts rw
```

#### Verify ntfy users and access

```bash
# List all users
docker exec familyshield-ntfy ntfy user list

# List access control entries
docker exec familyshield-ntfy ntfy access

# Test publish (should succeed for parent user)
curl -u parent:<password> -d "Test alert" https://notify-dev.everythingcloud.ca/familyshield-alerts
```

#### ntfy container unhealthy / not starting

```bash
# Check logs
docker logs familyshield-ntfy --tail 30

# Common cause: NTFY_CACHE_FILE or NTFY_AUTH_FILE path doesn't exist inside container
# The volumes (ntfy_cache, ntfy_data) are created by docker-compose — verify they exist:
docker volume ls | grep ntfy

# Restart
docker restart familyshield-ntfy
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

**Architecture note (2026-04-16):** FamilyShield deployments are now split into two workflows:
- **Infra workflows** (`infra-dev.yml`, `infra-prod.yml`) — triggered by `iac/**` changes; runs tofu apply → setup-cloudflare → smoke-infra → tighten-ssh
- **App workflows** (`deploy-dev.yml`, `deploy-prod.yml`) — triggered by `apps/**` changes; uses Cloudflare tunnel SSH exclusively

For the full history of how this architecture was reached, see [Infrastructure Deployment Troubleshooting Log](infrastructure.md).

**Symptom:** The `deploy-app-dev` or `verify-tunnel` job in `deploy-dev.yml` retries SSH 18 times and fails:

```
Attempt 1/18 — tunnel not ready, waiting 10s...
...
Attempt 18/18 — tunnel not ready, waiting 10s...
⚠️  Tunnel SSH not reachable after 3 min
```

**Root cause:** `cloudflared access ssh --hostname ssh-dev.everythingcloud.ca` requires Cloudflare Zero Trust authentication. Without a **service token**, the runner hits the Access auth wall (which normally redirects to a browser) and the connection silently fails.

This is a separate credential from:

- `CLOUDFLARE_API_TOKEN` — manages resources via the Cloudflare REST API
- The tunnel token — what cloudflared on the VM uses to run the tunnel

A **Cloudflare Access Service Token** (Client ID + Client Secret pair) is what non-interactive clients like GitHub Actions runners use to authenticate through Cloudflare Zero Trust.

**Fix — Step 1: Create the service token**

1. Go to **dash.cloudflare.com → Zero Trust**
2. In the Zero Trust sidebar: **Access controls → Service credentials → Service Tokens**
3. Click **Create Service Token**
4. Fill in:
   - **Name:** `familyshield-github-actions`
   - **Service Token Duration:** Non-expiring
5. Click **Generate token**
6. Copy the **Client ID** and **Client Secret** — shown only once
7. Add as GitHub repository secrets (Settings → Secrets and variables → Actions):
   - `CF_ACCESS_CLIENT_ID` → Client ID
   - `CF_ACCESS_CLIENT_SECRET` → Client Secret

**Fix — Step 2: Add the service token to the SSH application policy**

1. In Zero Trust: **Access controls → Applications**
2. Find **FamilyShield SSH dev** → click **Edit**
3. Click the **Policies** tab → **Add a policy**
4. Fill in:
   - **Policy name:** `CI Access`
   - **Action:** `Service Auth` ← must be "Service Auth", not "Allow" — "Allow" still triggers browser login
5. Under **Include**, click **Add include** → selector: **Service Token** → value: `familyshield-github-actions`
6. Click **Save policy** → **Save application**
7. Re-run the `deploy-dev.yml` workflow

**How to verify from your laptop:**

```bash
# Requires cloudflared installed locally
ssh -i ~/.ssh/familyshield \
  -o StrictHostKeyChecking=no \
  -o ProxyCommand="cloudflared access ssh \
    --hostname ssh-dev.everythingcloud.ca \
    --service-token-id <CF_ACCESS_CLIENT_ID> \
    --service-token-secret <CF_ACCESS_CLIENT_SECRET>" \
  ubuntu@ssh-dev.everythingcloud.ca "echo ok"
```

If this returns `ok`, the service token and policy are correctly configured.

See **SETUP.md Part 3.4** for the full first-time setup walkthrough.

---

#### Cloudflare API Token — Missing Scopes (Error 10000 or 12130)

**Symptom:** `tofu apply` for `iac/cloudflare/` fails with `Authentication error (10000)` or `access.api.error.invalid_request: tags contain a tag that does not exist`.

**Cause — 10000:** The API token is missing one or more required scopes. The `iac/cloudflare/` module requires **5 scopes**:

```
Zone → DNS → Edit
Account → Cloudflare Tunnel → Edit
Account → Access: Apps and Policies → Edit
Account → Access: Service Tokens → Edit        ← needed for service token creation
Zone → Config Rules → Edit                     ← needed for WAF ruleset
```

The "Edit zone DNS" template only grants the first. The old 3-scope token used by `cloudflare-api.sh` is also insufficient.

**Fix:** Recreate the token in Cloudflare → Profile → API Tokens → Create Token → Custom Token. Select all 5 scopes. Update `CLOUDFLARE_API_TOKEN` GitHub secret.

---

#### `cf-mitigated: challenge` — Bot Fight Mode Blocking GitHub Actions

**Symptom:** `verify-tunnel` in `deploy-dev.yml` fails. SSH output contains:

```
< HTTP/2 403
< cf-mitigated: challenge
```

SSH returns exit 255 even though service token credentials are correct.

**Root cause:** Cloudflare's **Bot Fight Mode** (free tier) detects GitHub Actions runner IPs as datacenter IPs and issues a JavaScript challenge *before* the Access policy even evaluates the service token headers. The WAF config rule (`security_level = "essentially_off"`, `bic = false`) handles Security Level and Browser Integrity Check but does **not** disable Bot Fight Mode — Bot Fight Mode is a separate toggle that cannot be controlled via the API on the free tier.

**Fix (one-time, manual):**

1. Cloudflare dashboard → **Security → Bots**
2. Set **Bot Fight Mode → OFF**
3. Re-run `deploy-dev.yml`

This applies zone-wide. The tradeoff is reduced bot protection for all subdomains, but the tunnel itself provides the real security boundary via Zero Trust.

---

#### `cloudflared access ssh` — Wrong Environment Variable Names

**Symptom:** `verify-tunnel` silently fails (5 attempts, each timing out or returning access denied). The runner has `CF_ACCESS_CLIENT_ID` set as an environment variable but cloudflared ignores it.

**Root cause:** `cloudflared` reads `TUNNEL_SERVICE_TOKEN_ID` / `TUNNEL_SERVICE_TOKEN_SECRET` env vars — **not** `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`. Those two names are the **HTTP request header names** that Cloudflare Access expects in the request. They are not cloudflared environment variables.

When `cloudflared access ssh` is invoked with only env vars named `CF_ACCESS_CLIENT_ID`, it finds no credentials and either fails silently or prompts for browser-based auth (which times out in CI).

**Fix:** Always pass credentials explicitly via flags:

```bash
-o ProxyCommand="cloudflared access ssh \
  --hostname ${SSH_HOST} \
  --service-token-id ${CF_ACCESS_CLIENT_ID} \
  --service-token-secret ${CF_ACCESS_CLIENT_SECRET}"
```

**Note:** This is how `verify-tunnel` and `deploy-app-dev` are implemented in `deploy-dev.yml` — the flags are required, not optional.

---

#### Pre-Deploy 502 in `verify-tunnel` — Expected Behaviour

**Symptom:** After adding a portal HTTP health check to `verify-tunnel`, the step fails with 502 before deployment has run.

**Root cause:** `verify-tunnel` runs before `build-and-push` and `deploy-app-dev`. At that point, the Cloudflare tunnel is active but the portal and API containers are not yet running (or were not started after a fresh infra deploy). cloudflared receives the request and proxies it to `localhost:3000`, which is not yet listening — producing a 502.

**Fix:** `verify-tunnel` only checks **SSH reachability** (does a `cloudflared access ssh` connect succeed?). Portal HTTP health belongs in `smoke-test`, which runs **after** `deploy-app-dev`. A 502 before deployment is expected and correct.

**Current behaviour:** `verify-tunnel` in `deploy-dev.yml` establishes an SSH connection and runs `echo "tunnel-ok"`. If SSH succeeds, the job passes. HTTP checks are not performed here.

---

#### Cloudflare OpenTofu — Existing Resources Block First Apply

**Symptom:** `tofu apply` fails with `tunnel with name already exists`, `access application already exists`, or similar resource conflict errors.

**Root cause:** If the environment was previously bootstrapped with `scripts/cloudflare-api.sh`, those resources (tunnel, access apps) still exist. OpenTofu has no existing state for them and cannot take ownership automatically — it tries to create new ones and hits conflicts.

**Fix:**

1. Delete existing tunnel: **Zero Trust → Networks → Tunnels** → find `familyshield-{env}` → delete
2. Delete existing access apps: **Zero Trust → Access → Applications** → delete `FamilyShield AdGuard {env}`, `FamilyShield Grafana {env}`, `FamilyShield SSH {env}`
3. DNS records: **do not delete** — `allow_overwrite = true` in `iac/cloudflare/dns.tf` takes ownership automatically
4. Re-run `infra-dev.yml`

---



**Symptom:** `infra-dev.yml` or `infra-prod.yml` fails at one of the four jobs (tofu apply, setup-cloudflare, smoke-infra, tighten-ssh).

**Troubleshooting by job:**

1. **tofu apply fails**
   - Check for OCI quota exhaustion: `oci compute instance list --compartment-id <compartment>`
   - Check for state lock: `aws s3 ls s3://familyshield-tfstate/dev/.terraform.lock.hcl`
   - Check for OCI authentication error: verify OCI_USER_OCID, OCI_FINGERPRINT, OCI_PRIVATE_KEY GitHub Secrets
   - Full details: see [Infrastructure Deployment Troubleshooting Log](infrastructure.md) — Issues 1–7

2. **setup-cloudflare fails**
   - Check CLOUDFLARE_API_TOKEN has all **FIVE** scopes: Zone DNS Edit, Tunnel Edit, Access Apps Edit, **Access Service Tokens Edit**, **Zone Config Rules Edit**
   - Check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ZONE_ID are correct
   - Check VM can be reached via public IP SSH during deployment (NSG is open 0.0.0.0/0)
   - **First-time setup:** If the environment was previously set up with `cloudflare-api.sh`, delete existing resources first — tunnel, access apps — before `tofu apply` (DNS records are safe: `allow_overwrite = true` handles them)
   - Full details: see [Infrastructure Deployment Troubleshooting Log](infrastructure.md) — Issues 10–13

3. **smoke-infra fails (tunnel not ACTIVE)**
   - Check Cloudflare tunnel token was created successfully
   - Check cloudflared daemon is running on the VM: `docker logs familyshield-cloudflared`
   - Full details: see [Infrastructure Deployment Troubleshooting Log](infrastructure.md) — Issue 8

4. **tighten-ssh fails**
   - This job runs a second `tofu apply` with `TF_VAR_admin_ssh_cidrs='["173.33.214.49/32"]'`
   - Check for state lock (Terraform may still be locked from previous apply)
   - Wait 5 minutes and retry — the lock should clear
   - Full details: see [Infrastructure Deployment Troubleshooting Log](infrastructure.md) — Issue 9

**To re-run infra workflow:**
```bash
# Manually trigger via GitHub CLI
gh workflow run infra-dev.yml --ref development

# Or via GitHub UI:
# Actions → Infra Dev → Run workflow
```

---

#### App workflow fails (deploy-dev.yml or deploy-prod.yml)

**Symptom:** `deploy-dev.yml` or `deploy-prod.yml` fails at one of five jobs (wait-for-infra, verify-tunnel, build-and-push, deploy-app, smoke-test).

**Troubleshooting by job:**

1. **wait-for-infra fails**
   - This job polls GitHub API for infra workflow status if both iac/** and apps/** changed in same commit
   - Check: has infra-dev.yml finished successfully? (check Actions tab)
   - If infra failed, app workflow will fail here
   - Fix: re-run infra-dev.yml first, then app workflow will proceed

2. **verify-tunnel fails**
   - Pre-check confirms Cloudflare tunnel is reachable before wasting build time
   - Check: is infra-dev.yml complete and tunnel ACTIVE?
   - Check: is cloudflared running on the VM? `docker ps | grep cloudflared`
   - Full details: see [Infrastructure Deployment Troubleshooting Log](infrastructure.md) — Issue 8

3. **build-and-push fails**
   - TypeScript or Python compilation errors
   - Check: run `cd apps/api && npm run build` locally to see errors
   - Check: run `cd apps/mitm && pytest tests/` locally for Python errors
   - Full details: see CI/CD Issues section below → "Docker image build failures"

4. **deploy-app fails (SSH via tunnel timeout)**
   - App workflow SSHes to VM via Cloudflare tunnel: `ssh ubuntu@ssh-dev.everythingcloud.ca`
   - Check: Cloudflare Access Service Token (CF_ACCESS_CLIENT_ID + CF_ACCESS_CLIENT_SECRET) configured in GitHub Secrets?
   - Check: is the VM reachable? Can you SSH from your laptop?
   - Full details: see earlier section "deploy-dev SSH via Cloudflare tunnel times out"

5. **smoke-test fails**
   - Health check endpoints returning 5xx or timeout
   - Check: are api and portal containers running? `docker ps | grep api && docker ps | grep portal`
   - Check: container logs for errors: `docker logs familyshield-api`
   - Full details: see [Infrastructure Deployment Troubleshooting Log](infrastructure.md) — Issue 8

---

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

#### Compartment not found during IaC deployment

**Symptom:** `tofu apply` or `tofu plan` fails with error:

```
❌ FamilyShield compartment 'familyshield-{environment}' not found in OCI.
This compartment must be created by the bootstrap script BEFORE running tofu apply.
```

**Root cause:** The `bootstrap-oci.sh` script has not been run, or it failed at **Step 7** (Create environment compartments).

**Fix:**

1. Run the bootstrap script from your local Windows laptop (one-time setup):

```bash
chmod +x scripts/bootstrap-oci.sh
bash scripts/bootstrap-oci.sh
```

1. The script performs 11 steps. **Step 7** creates three compartments:
   - `familyshield-dev`
   - `familyshield-staging`
   - `familyshield-prod`

2. Verify the compartments were created:

```bash
# List all compartments in your tenancy
oci iam compartment list --compartment-id $OCI_TENANCY_OCID --all --query "data[?name | contains('familyshield')]" --output table
```

You should see three compartments listed. If not, the bootstrap script failed — re-run it and check for errors in Step 7.

1. After bootstrap completes, re-run the workflow:

```bash
gh workflow run deploy-dev.yml --ref development
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

### Issue: Device Can't Connect to Tailscale

**Symptom**

- Child installs Tailscale + enters preauth key
- Gets error: "Failed to connect" or "Authentication failed"
- Device has internet (WiFi works, other apps can connect)

**Diagnosis**

**Step 1: Is Headscale running?**

```bash
docker ps | grep headscale
# Should show: familyshield-headscale ... Up

docker logs familyshield-headscale --tail 20
# Should show no error logs
```

**Step 2: Is preauth key valid?**

```bash
docker exec familyshield-headscale headscale preauthkeys list

# Should show something like:
# Key              | User   | Reusable | Expiration
# tskey-client-... | parent | true     | 2027-04-18

# Check expiration is in future
```

**Step 3: Can child reach Headscale?**

```bash
# From parent's machine:
nslookup headscale-dev.everythingcloud.ca
# Should resolve to VM IP

# Or test from child's device:
# Open Terminal app → ping headscale-dev.everythingcloud.ca
# Should get responses (if ping enabled)
```

**Step 4: Check Cloudflare tunnel is routing correctly**

```bash
# If tunnel exists:
cloudflared tunnel ingress validate

# Should show headscale route is configured
```

**Solutions**

**Solution 1: Preauth key expired**

```bash
# Generate new key
docker exec familyshield-headscale headscale preauthkeys create \
  --user 1 --reusable --expiration 8760h

# Output: tskey-client-NEWKEY
# Give to parent, retry on child device
```

**Solution 2: Headscale container crashed**

```bash
# Restart it
docker restart familyshield-headscale

# Verify health
docker exec familyshield-headscale headscale nodes list
# Should work
```

**Solution 3: Headscale can't reach external Tailscale servers**

```bash
# Check container networking
docker network inspect familyshield_default

# Verify it has internet access
docker exec familyshield-headscale curl https://tailscale.com
# Should get HTTP 200
```

**Solution 4: DNS resolution broken**

```bash
# From VM:
nslookup headscale-dev.everythingcloud.ca 8.8.8.8
# If fails, contact DevOps to check Cloudflare routing

# Workaround: Use VM IP directly in Tailscale app
# Instead of "headscale-dev.everythingcloud.ca"
# Use: 40.233.115.22:8080 (example VM IP)
```

---

### Issue: Device Connected to Tailscale but No Internet

**Symptom**

- Tailscale shows "Connected"
- Device has VPN IP (e.g., `100.64.1.5`)
- But can't browse websites or DNS queries fail

**Diagnosis**

**Step 1: Verify device has correct DNS**

```bash
# From child device (on Tailscale):
# iOS: Settings → Wi-Fi → (network) → DNS
# Android: Settings → Network & Internet → Advanced → DNS

# Should show: AdGuard container IP OR
#             127.0.0.1 (if DNS is proxied locally)
```

**Step 2: Test DNS directly**

```bash
# From child device:
# iOS: App: "DNS" app or use Terminal
# Android: Use ping app or terminal

# Test: nslookup google.com 172.20.0.2
# Should return: 142.251.41.14

# If hangs or times out: DNS not responding
```

**Step 3: Is AdGuard running?**

```bash
docker ps | grep adguard
# Should show: familyshield-adguard ... Up

docker logs familyshield-adguard --tail 20
# Should show no errors
```

**Step 4: Check transparent proxy / iptables**

```bash
# Verify traffic is being routed through mitmproxy
iptables -L -n | grep 8888
# Should show rules for port 8888

# If empty: iptables rules not configured
```

**Solutions**

**Solution 1: AdGuard not responding on DNS**

```bash
# Verify DNS port is open
docker exec familyshield-adguard netstat -tlnp | grep 53
# Should show: 0.0.0.0:53

# If not listening on 53:
# Check AdGuard setup (port should be 53, not 5053)
# Edit `/opt/familyshield/adguard/AdGuardHome.yaml`:
# dns:
#   port: 53  # NOT 5053

docker restart familyshield-adguard
```

**Solution 2: Firewall blocking DNS**

```bash
# On VM, check firewall allows UDP 53
sudo ufw status
# Should show: dns (53) ALLOW

# If not:
sudo ufw allow 53/udp
sudo ufw reload
```

**Solution 3: Tailscale DNS config not pushed to device**

```bash
# On VM:
docker exec familyshield-headscale cat /etc/headscale/config.yaml | grep -A 5 dns

# Should show:
# dns:
#   nameservers:
#     - 172.20.0.2  # AdGuard

# If AdGuard IP is wrong, update config and restart Headscale

docker restart familyshield-headscale

# On child: Tailscale settings → Clear saved settings → reconnect
```

**Solution 4: Docker bridge network routing broken**

```bash
# Verify AdGuard container can be reached from Tailscale network
docker exec familyshield-api curl http://172.20.0.2:80
# Should return AdGuard web UI HTML

# If times out: container IP wrong or network isolation issue
```

---

### Issue: mitmproxy Not Intercepting HTTPS

**Symptom**

- Child has Tailscale + mitmproxy cert installed
- Child browses HTTPS sites (YouTube, etc.)
- But mitmproxy not logging traffic
- API not receiving content IDs

**Diagnosis**

**Step 1: Is certificate installed on device?**

```bash
# Ask parent to verify:
# iOS: Settings → General → VPN & Device Management → check "mitmproxy" exists
# Android: Settings → Security → Device Admin → check mitmproxy

# If not found: certificate installation failed
```

**Step 2: Is mitmproxy running?**

```bash
docker ps | grep mitmproxy
# Should show: familyshield-mitmproxy ... Up

docker logs familyshield-mitmproxy --tail 50
# Should show proxy listening on port 8888
```

**Step 3: Are HTTPS requests hitting mitmproxy?**

```bash
# Watch real-time traffic
docker exec familyshield-mitmproxy tail -f ~/.mitmproxy/flow.log 2>/dev/null | head -20

# If no output: traffic not reaching mitmproxy
```

**Step 4: Check transparent proxy is configured**

```bash
# Verify iptables routes traffic to mitmproxy
sudo iptables -L -n -v | grep -i redir
# Should show rules redirecting port 443/80 to 8888/8889

# If empty: iptables not configured (cloud-init issue)
```

**Step 5: Can device reach mitmproxy?**

```bash
# From child device (on Tailscale):
# curl http://mitm.it:8080
# Should return certificate download page

# If times out: mitmproxy not reachable from VPN
```

**Solutions**

**Solution 1: Certificate not installed**

```bash
# Parent retry:
# 1. Safari → http://mitm.it
# 2. Tap correct OS (iOS/Android)
# 3. Follow installation steps
# 4. Verify in Settings

# If still fails: cert may be corrupted
# Delete from device, retry download
```

**Solution 2: iptables rules missing**

```bash
# Verify cloud-init ran successfully
sudo systemctl status cloud-final
# Should show: "active (exited)"

# If failed:
cat /var/log/cloud-init-output.log | tail -50
# Look for iptables commands

# Manual fix:
sudo iptables -t nat -A OUTPUT -p tcp --dport 80 -j REDIRECT --to-port 8080
sudo iptables -t nat -A OUTPUT -p tcp --dport 443 -j REDIRECT --to-port 8443

# Persist (cloud-init should do this):
sudo iptables-save | sudo tee /etc/iptables/rules.v4
sudo systemctl restart netfilter-persistent
```

**Solution 3: mitmproxy cert expired**

```bash
# Check cert validity
docker exec familyshield-mitmproxy openssl x509 -in ~/.mitmproxy/mitmproxy-ca.pem -text -noout | grep -A 2 "Not"
# Should show expiration is in future (years)

# If expired (unlikely unless VM is very old):
docker exec familyshield-mitmproxy rm ~/.mitmproxy/mitmproxy-ca*
docker restart familyshield-mitmproxy
# Child must re-download cert from http://mitm.it
```

**Solution 4: Wrong transparent proxy mode**

```bash
# Check mitmproxy command
docker inspect familyshield-mitmproxy | grep "Cmd"
# Should show: "mitmproxy --listen-port 8888 --mode transparent"

# If mode is wrong, fix docker-compose and rebuild:
docker compose down
docker compose up -d
```

---

### Issue: API Not Receiving Events from mitmproxy

**Symptom**

- mitmproxy is running and logging traffic
- But Redis queue is empty
- API not processing events
- Alerts not being created

**Diagnosis**

**Step 1: Is Redis running?**

```bash
docker ps | grep redis
# Should show: familyshield-redis ... Up

docker logs familyshield-redis --tail 20
# Should show no errors
```

**Step 2: Any events in Redis?**

```bash
docker exec familyshield-redis redis-cli
# Inside redis-cli:
> KEYS *
# Should show keys like: contentevents, alerts, etc

> LLEN contentevents
# If > 0: events are queued

> LRANGE contentevents 0 -1
# Shows actual events in queue
```

**Step 3: Is API running?**

```bash
docker ps | grep api
# Should show: familyshield-api ... Up

docker logs familyshield-api --tail 50
# Should show: "Polling Redis..." and processing events

# If errors: check YOUTUBE_API_KEY, TWITCH_CLIENT_ID secrets
```

**Step 4: Does mitmproxy know about Redis?**

```bash
docker logs familyshield-mitmproxy --tail 50 | grep -i redis
# Should show successful Redis connection

# Or check mitmproxy config:
cat /etc/familyshield/mitmproxy/familyshield_addon.py | grep redis
# Should reference Redis host:port
```

**Solutions**

**Solution 1: mitmproxy not connecting to Redis**

```bash
# Verify Redis is reachable from mitmproxy container
docker exec familyshield-mitmproxy ping familyshield-redis
# Or: telnet familyshield-redis 6379

# If fails: Docker network broken

# Fix: restart both
docker restart familyshield-redis familyshield-mitmproxy
```

**Solution 2: API not polling Redis**

```bash
# Check API environment variables
docker exec familyshield-api env | grep -i redis
# Should show: REDIS_URL=redis://familyshield-redis:6379

# If empty: env not set

# Fix: set in docker-compose and restart
docker compose down
docker compose up -d familyshield-api
```

**Solution 3: Events not being generated by mitmproxy**

```bash
# Verify mitmproxy is actually intercepting traffic
# Have child open browser → visit youtube.com while watching:

docker logs familyshield-mitmproxy --tail 30 --follow
# Should show HTTP request logs

# If no logs: traffic not reaching mitmproxy (see HTTPS interception section)
```

**Solution 4: API missing API keys**

```bash
# Check secrets are set
docker exec familyshield-api env | grep API_KEY
# Should show: YOUTUBE_API_KEY=AIzaSy...

# If empty: GitHub secret not set

# Fix:
# GitHub → Settings → Secrets & Variables → Actions
# Ensure YOUTUBE_API_KEY, TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET exist

# Re-run deployment workflow
```

---

### Issue: Alerts Not Appearing in Portal

**Symptom**

- API is processing events (logs show no errors)
- Alerts table is being written to Supabase
- But parent dashboard is empty

**Diagnosis**

**Step 1: Do alerts exist in Supabase?**

```sql
-- Supabase Dashboard → SQL Editor:
SELECT COUNT(*) FROM alerts;
-- Should show > 0

-- If 0: API not writing to Supabase
-- If > 0: data exists, may be RLS issue or portal bug
```

**Step 2: Check RLS policies**

```sql
-- Supabase SQL Editor:
SELECT * FROM pg_policies WHERE tablename = 'alerts';
-- Should show a policy restricting to parent_id = auth.uid()

-- Test policy allows access:
-- Log in as parent in portal
-- DevTools → Network → check SQL query succeeds (200 OK)
```

**Step 3: Is portal making the right query?**

```bash
# Parent opens portal, DevTools (F12) → Network
# Look for: /rest/v1/alerts?...
# Should see: 200 OK response with data

# If 401 Unauthorized: auth not working
# If empty array: no data matching current user
```

**Step 4: Check parent ID is set correctly**

```sql
-- In Supabase alerts table:
SELECT DISTINCT device_ip FROM alerts LIMIT 5;
-- Should show device IPs like: 100.64.1.5

-- Check if alerts match parent's devices:
SELECT * FROM alerts WHERE device_ip = '100.64.1.5' LIMIT 1;
-- Should return data
```

**Solutions**

**Solution 1: API not writing to Supabase**

```bash
# Check API logs
docker logs familyshield-api --tail 50 | grep -i supabase
# Should show: "Storing alert in Supabase"

# If errors like "Connection refused":
# Verify Supabase URL is correct

docker exec familyshield-api env | grep SUPABASE_URL
# Should show: SUPABASE_URL=https://xxxx.supabase.co

# Test connection:
docker exec familyshield-api curl https://xxxx.supabase.co/rest/v1/
# Should return 200 (not 404)
```

**Solution 2: RLS blocking parent from seeing data**

```sql
-- Temporarily disable RLS to test:
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;

-- Retry in portal → should see all alerts

-- If it works, RLS policy is too strict
-- Check and fix the policy:
DROP POLICY "parent_sees_own_alerts" ON alerts;

CREATE POLICY "parent_sees_own_alerts" ON alerts
  FOR SELECT
  USING (
    device_ip IN (
      SELECT device_ip FROM devices WHERE parent_id = auth.uid()
    )
  );

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
```

**Solution 3: Parent auth not working**

```bash
# Check Supabase auth is configured
docker exec familyshield-portal env | grep SUPABASE
# Should show: SUPABASE_URL, SUPABASE_ANON_KEY

# Test auth in portal:
# Open portal → try to log in
# DevTools → Network → check /auth/v1/ requests
# Should see 200 OK

# If 401: SUPABASE_ANON_KEY may be wrong
```

**Solution 4: Wrong device IP in alerts**

```sql
-- Check which IPs are in alerts vs which devices parent owns:
SELECT DISTINCT a.device_ip FROM alerts a
LEFT JOIN devices d ON a.device_ip = d.device_ip
WHERE d.parent_id IS NULL;
-- Any rows here = orphaned alerts with no matching device record
-- Fix: update devices table to include the correct IP
```

---

### Issue: ntfy Not Sending Alerts

**Symptom**

- API detects high-risk content
- Calls ntfy successfully (no errors in logs)
- But parent's phone doesn't receive notification

**Diagnosis**

**Step 1: Is ntfy running?**

```bash
docker ps | grep ntfy
# Should show: familyshield-ntfy ... Up

docker logs familyshield-ntfy --tail 20
```

**Step 2: Did API call ntfy?**

```bash
docker logs familyshield-api --tail 50 | grep -i ntfy
# Should show: "Sending to ntfy: POST /familyshield-alerts"

# If no output: API didn't reach ntfy code
```

**Step 3: Did ntfy receive the call?**

```bash
docker logs familyshield-ntfy --tail 50 | grep POST
# Should show: "POST /familyshield-alerts HTTP/1.1 200"

# If 404 or no POST: message didn't arrive
```

**Step 4: Are there subscribers?**

```bash
# Check ntfy subscribers to the topic
docker exec familyshield-ntfy sqlite3 /var/lib/ntfy/ntfy.db \
  "SELECT username, topic FROM subscriptions WHERE topic='familyshield-alerts';"

# Should show: parent | familyshield-alerts
# If empty: parent never subscribed
```

**Step 5: Is parent's phone subscribed?**

```bash
# Parent opens ntfy app
# Should see: "familyshield-alerts" in subscription list
# If not: not subscribed

# Parent re-subscribe:
# Tap "+" → enter "familyshield-alerts" → "Subscribe"
```

**Solutions**

**Solution 1: Parent not subscribed**

```bash
# Parent opens ntfy app
# Tap "+" or "Subscribe"
# Enter: familyshield-alerts
# Subscribe

# Or via web:
# https://notify-dev.everythingcloud.ca/familyshield-alerts
# Tap "Subscribe" button at bottom
```

**Solution 2: ntfy not receiving calls from API**

```bash
# Check API knows ntfy URL
docker exec familyshield-api env | grep NTFY_URL
# Should show: NTFY_URL=http://familyshield-ntfy:2586

# Verify connectivity:
docker exec familyshield-api curl http://familyshield-ntfy:2586/
# Should get response (not "Connection refused")
```

**Solution 3: Parent's phone Do Not Disturb is on**

```bash
# Parent phone:
# iOS: Control Center → Do Not Disturb (crescent moon icon) → turn OFF
# Android: Settings → Sounds & Vibration → Do Not Disturb → OFF

# Retry: API should detect high-risk content
# ntfy app should show notification
```

**Solution 4: ntfy notifications filtered by app**

```bash
# Parent's phone:
# iOS: Settings → ntfy → Notifications → Allow Notifications (ON)
# Android: Settings → Apps → ntfy → Notifications → ON

# Clear app cache if stuck:
# iOS: offload app (Settings → App → Offload) then reinstall
# Android: Settings → Apps → ntfy → Storage → Clear Cache
```

---

### Issue: High Memory Usage

**Symptom**

- VM running slowly
- `free -h` shows little available memory
- Docker containers being killed

**Diagnosis**

```bash
# Check memory per container
docker stats --no-stream

# Should show each container's memory usage

# Total memory available:
free -h
# Limit: 24GB (OCI A1.Flex Always Free)

# If > 20GB used: something is leaking memory
```

**Solutions**

**Solution 1: Redis consuming too much**

```bash
# Check Redis memory
docker exec familyshield-redis redis-cli INFO memory
# Look for: used_memory_human

# If > 1GB: old data not being evicted

# Check Redis eviction policy:
docker exec familyshield-redis redis-cli CONFIG GET maxmemory-policy
# Should be: allkeys-lru or similar

# If not set:
docker exec familyshield-redis redis-cli CONFIG SET maxmemory 2gb
docker exec familyshield-redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

**Solution 2: API has memory leak**

```bash
# Check API logs for memory growth
docker stats familyshield-api --no-stream

# Run for 10 minutes with watch:
watch -n 5 'docker stats --no-stream | grep api'
# If memory keeps growing: memory leak

# Restart API:
docker restart familyshield-api

# If immediately grows again: bug in code
```

---

### Service Restart Order

Use this when multiple services are unhealthy or after a VM reboot where containers did not auto-start:

```bash
# Safe order to restart all services:
docker compose down

# Wait 10 seconds
sleep 10

# Bring back up
docker compose up -d

# Verify all healthy:
docker compose ps
```

---

### Still Broken? Debug Checklist

If the per-service sections above have not resolved the issue, collect full diagnostic data before escalating:

```bash
# 1. Collect all logs
docker compose logs > /tmp/familyshield-logs.txt

# 2. Check system resources
top -b -n 1 > /tmp/top.txt
df -h > /tmp/disk.txt

# 3. Network diagnostics
netstat -tlnp | grep LISTEN > /tmp/ports.txt
iptables -L -n -v > /tmp/iptables.txt

# 4. Contact support with:
# - These log files
# - Output of: docker compose ps
# - What you were trying to do
# - When it started failing
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
