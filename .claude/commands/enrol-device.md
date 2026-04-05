# /enrol-device — Enrol a Child's Device in FamilyShield

Generate step-by-step device enrolment instructions for a child's device.

## Steps

1. Ask the user:
   - What type of device? (iPhone/iPad, Android, Windows PC/laptop, Mac, PlayStation/Xbox/Nintendo Switch)
   - Which child is this device for? (to customise instructions with their name)
   - Which environment? (dev / prod — determines server URLs)

2. Generate complete step-by-step instructions tailored to the device type

## Instructions to generate per device type

### iPhone / iPad (iOS 15 or later)

**Part 1 — Install the VPN app (Tailscale)**
1. Open the App Store on the device
2. Search for "Tailscale" and install it (it's free)
3. Open Tailscale and tap "Get Started"
4. When asked to log in, tap "Sign in with other" and enter the server address: `https://headscale.familyshield.everythingcloud.ca` (or dev URL)
5. Use the enrolment key provided by FamilyShield (shown in the parent portal under Devices > Add Device)
6. Allow Tailscale to add a VPN configuration when iOS asks

**Part 2 — Install the security certificate (for full monitoring)**
1. Open Safari (must be Safari, not Chrome) and go to: `https://cert.familyshield.everythingcloud.ca`
2. A prompt will appear saying "This website is trying to download a configuration profile." Tap Allow
3. Go to Settings > General > VPN & Device Management
4. Tap on "FamilyShield CA" under Downloaded Profile
5. Tap Install and enter your iPhone passcode
6. Go to Settings > General > About > Certificate Trust Settings
7. Turn on "FamilyShield Root CA" and tap Continue

**Verify:** Open Safari and go to youtube.com — it should load normally. Activity will now appear in the parent dashboard within 2 minutes.

---

### Android (Android 8 or later)

**Part 1 — Install the VPN app**
1. Open the Play Store and search for "Tailscale" — install it
2. Open Tailscale and tap Get Started
3. Tap "Sign in with other server" and enter: `https://headscale.familyshield.everythingcloud.ca`
4. Enter the enrolment key from the parent portal (Devices > Add Device)
5. Tap Connect when prompted

**Part 2 — Install the security certificate**
1. Open Chrome and go to: `https://cert.familyshield.everythingcloud.ca`
2. The certificate file will download automatically
3. Go to Settings > Security > Install a certificate > CA certificate
4. Tap "Install anyway" and select the downloaded FamilyShield certificate
5. Give it any name (e.g. "FamilyShield")

> **Note:** Some Android manufacturers have slightly different menu names. If you can't find "Install a certificate", search "certificate" in your Settings app.

---

### Windows PC / Laptop (Windows 10 or 11)

**Part 1 — Install the VPN app**
1. Go to https://tailscale.com/download and download Tailscale for Windows
2. Run the installer and follow the prompts
3. When Tailscale opens, click "Log in"
4. In the browser window, change the server URL to: `https://headscale.familyshield.everythingcloud.ca`
5. Enter the enrolment key from the parent portal

**Part 2 — Install the security certificate**
1. Download the certificate from: `https://cert.familyshield.everythingcloud.ca`
2. Double-click the downloaded file (familyshield-ca.crt)
3. Click "Install Certificate..."
4. Choose "Local Machine" and click Next (you may need admin password)
5. Select "Place all certificates in the following store"
6. Click Browse and select "Trusted Root Certification Authorities"
7. Click OK, then Next, then Finish

---

### Mac (macOS 12 or later)

**Part 1 — Install the VPN app**
1. Open the Mac App Store and search for "Tailscale" — install it
2. Open Tailscale from your Applications folder
3. Click the Tailscale icon in the menu bar (top right)
4. Click "Log in..." and change the server to: `https://headscale.familyshield.everythingcloud.ca`
5. Enter the enrolment key from the parent portal

**Part 2 — Install the security certificate**
1. Open Safari and go to: `https://cert.familyshield.everythingcloud.ca`
2. The certificate will download to your Downloads folder
3. Double-click the certificate file — it opens Keychain Access
4. Click "Add" to install it
5. Find "FamilyShield Root CA" in Keychain Access (search for it)
6. Double-click it, expand "Trust", and set "Always Trust" next to SSL

---

### Game Consoles / Smart TVs

Game consoles (PlayStation, Xbox, Nintendo Switch) and smart TVs cannot have the Tailscale app or certificate installed. They use **DNS-only monitoring**:

1. Go to your home router's admin panel (usually at 192.168.1.1)
2. Change the DNS server to: `[AdGuard Home IP from parent portal under Settings > DNS]`
3. This applies DNS-based blocking to all devices on your home network

> **Note:** DNS-only monitoring cannot see the specific content being viewed — only the website/platform visited. Full monitoring requires the Tailscale VPN app.

---

## After enrolment

- The device should appear in the parent portal under **Devices** within 5 minutes
- If it doesn't appear, check that Tailscale shows "Connected" on the device
- If the device connects but shows no activity, check the certificate is trusted
- The child will see a "FamilyShield is active" indicator in the Tailscale app

## Getting the enrolment key

The enrolment key is shown in the parent portal at:
**Settings > Devices > Add New Device > Show Enrolment Key**

Each key expires after 24 hours and can only be used once per device.
