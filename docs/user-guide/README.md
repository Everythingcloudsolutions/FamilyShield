# FamilyShield — Parent User Guide

> **Last updated:** April 2026
> **Portal address:** <https://familyshield.everythingcloud.ca>
> **Support:** See [Getting Help](#13-getting-help) at the end of this guide

---

## Table of Contents

1. [Welcome to FamilyShield](#1-welcome-to-familyshield)
2. [What You Will Need Before Starting](#2-what-you-will-need-before-starting)
3. [Setting Up Your Account](#3-setting-up-your-account)
4. [Enrolling a Child's Device](#4-enrolling-a-childs-device)
5. [Understanding the Dashboard](#5-understanding-the-dashboard)
6. [Setting Rules for Your Child](#6-setting-rules-for-your-child)
7. [Understanding Alerts](#7-understanding-alerts)
8. [Handling Access Requests](#8-handling-access-requests)
9. [Monitoring Specific Platforms](#9-monitoring-specific-platforms)
10. [Your Child's Privacy](#10-your-childs-privacy)
11. [Frequently Asked Questions](#11-frequently-asked-questions)
12. [Parent Troubleshooting — Quick Reference](#12-parent-troubleshooting--quick-reference)
13. [Getting Help](#13-getting-help)

---

## 1. Welcome to FamilyShield

### What is FamilyShield?

FamilyShield is a parental control platform that helps you keep your children safe online — no matter where they are or what device they are using.

Most parental control apps only work at home, using your Wi-Fi router. FamilyShield works differently. Monitoring happens in the cloud (meaning on a secure server), so protection follows your child to school, a friend's house, or anywhere else they go.

### What can FamilyShield do?

- Show you every website and app your child visits — in plain English
- Automatically detect risky content on YouTube, Roblox, Twitch, and Discord
- Block websites you choose — instantly, from your phone
- Send you a push notification the moment something concerning happens
- Let you set daily screen time limits
- Block TikTok by default (it cannot be unblocked on devices enrolled by children under 14)
- Give your child a way to politely request access to a site you have blocked

### Why is FamilyShield different?

| Other parental control apps | FamilyShield |
|---|---|
| Only work on your home Wi-Fi | Works everywhere — home, school, mobile data |
| Show you a list of websites visited | Show you what your child actually watched or played |
| Require a subscription fee | Runs on an open-source server you own — no monthly fee |
| Store your family's data on someone else's servers | Your data stays in a Canadian server (Toronto region) |

### Full transparency — what does that mean?

FamilyShield is built on a principle called full transparency. This means your child knows that monitoring is active. The VPN app on their device shows a small icon in the status bar. There are no hidden spy tools.

Research shows that children respond better to open boundaries than to secret surveillance. FamilyShield gives you the tools to have an honest conversation: "I can see what you do online, and I'm here to help — not to punish."

---

## 2. What You Will Need Before Starting

> **Note:** This guide is for everyday use after FamilyShield has been set up. The first-time server setup requires a developer or a technically confident person. If you have not done that yet, contact your setup person before continuing.

Once the server is running, here is what you need to get started:

**On your phone (parent device):**

- [ ] Any modern smartphone (iPhone or Android)
- [ ] The **ntfy** app installed (free — this is how you receive alerts)
- [ ] A web browser (Safari, Chrome, or Edge are all fine)

**What you will need to know:**

- [ ] The email address your account was created with
- [ ] Your password (set during first-time setup)

**Before enrolling a child's device:**

- [ ] The device your child uses (iPhone, Android, Windows laptop, or Mac)
- [ ] About 10 minutes per device
- [ ] Your child present — they need to tap "Allow" or "Trust" at certain steps

**You do not need:**

- Any technical knowledge
- An IT background
- To understand how VPNs or DNS work

---

## 3. Setting Up Your Account

### Logging in to the parent portal

The parent portal is the website where you manage everything. Think of it like the Settings app for your child's internet.

1. Open a web browser on your phone or computer.
2. Go to: **<https://familyshield.everythingcloud.ca>**
3. Enter your email address and password.
4. Tap or click **Sign In**.

> **Note:** The portal uses two-step verification (you will receive a short code by email or text to confirm it is really you). This keeps other people from accessing your family's settings.

> **Security note (2026-04):** In some environments, you may also see a browser authentication prompt before the portal loads. This is an additional protection layer for sensitive parent pages.

### Creating your family profile

The first time you log in, you will be asked to set up your family.

1. On the welcome screen, tap **Set up my family**.
2. Enter your family name (for example, "The Smith Family"). This is just for your own reference.
3. Tap **Continue**.

### Adding a child

You can add as many children as you need.

1. From the dashboard, tap **Add Child** (top right corner).
2. Fill in:
   - **Child's name** — first name only is fine
   - **Date of birth** — used to select the right age profile automatically
   - **Age profile** — FamilyShield will suggest one based on their age, but you can change it:
     - **Strict (ages 6–10):** Very limited content, no social media, educational focus
     - **Moderate (ages 11–14):** Most content allowed with monitoring, social media limited
     - **Guided (ages 15–17):** Light monitoring, more freedom, alerts for high-risk content only
3. Tap **Save Child**.

You will see your child's name appear on the dashboard. They do not have any devices enrolled yet — that comes next.

---

## 4. Enrolling a Child's Device

Enrolling a device means connecting it to FamilyShield so monitoring can begin. This section walks you through every step, one at a time.

> **How long does it take?** About 15–20 minutes per device. You only need to do this once per device.

### What happens during enrolment — plain English overview

There are four parts to enrolling a device:

| Part | What you do | Who does it | Time |
|---|---|---|---|
| **A** | Generate a connection key on the server | The person who set up the server | 5 minutes |
| **B** | Install the Tailscale VPN app and connect it | On the child's device | 5 minutes |
| **C** | Install the security certificate and set DNS | On the child's device | 5–10 minutes |
| **D** | Register the device in the portal | In the FamilyShield portal | 2 minutes |

**What is Tailscale?** It is a free, widely trusted VPN app. Once installed, it creates a secure private connection between your child's device and the FamilyShield monitoring server. Think of it as a secure tunnel — all your child's internet traffic passes through the server so FamilyShield can inspect it.

**What is a security certificate?** It is a small digital file that lets FamilyShield read encrypted websites (like YouTube or Roblox). Without it, FamilyShield can only see that your child visited a site, not which video they watched or which game they played. The certificate cannot read passwords, payment details, or private messages.

---

### 4.1 What You Need Before Starting

Before you start, make sure you have:

- A parent phone and the child's phone — both connected to WiFi
- The **VPN server address** from your IT admin: `https://vpn.familyshield.everythingcloud.ca`. This is a one-time setting entered into the Tailscale app — you will not need to type it on every device.
- An **enrolment key** from your IT admin (a long code sent to you via iMessage or WhatsApp — you copy it on your phone and paste it on the child's device). See Part A below.
- About 20 minutes of uninterrupted time

---

### 4.2 How FamilyShield Protection Works (Plain English)

All internet from your child's device travels through a protective filter before reaching the real internet. The filter blocks bad websites (adult sites, gambling, malware), identifies what they watch (YouTube video titles, Roblox game names, Twitch channels), and sends you an alert on your phone when something concerning is detected. Once setup is complete, your child just uses their phone normally — there is nothing extra for them to do, and they will not notice any difference in speed or how apps work.

---

### 4.3 Step 1: Install Tailscale on Child's Device (5 minutes)

Tailscale is a free, widely trusted app that connects your child's device to the FamilyShield network. Think of it as the doorway into the protected network.

1. On the child's phone, open the **App Store** (iPhone) or **Google Play** (Android)
2. Search for: `Tailscale`
3. Install the official Tailscale app — it has a blue icon
4. Open the app — you will see a login screen

**Wait — do not log in yet.** You need the enrolment key first. Get that in Step 2 below, then come back.

> **For Windows PCs and Macs:** See Part B later in this section for detailed device-specific instructions.

---

### 4.4 Step 2: Get Your Enrolment Key (2 minutes)

The enrolment key is a code your IT admin generates on the server. It gives permission for your child's device to join the protected network. One key can be reused for all your family's devices and is valid for one year — you only need to ask for this once.

**How your IT admin sends it to you:**

Your admin will generate the key on the server and send it to you using one of these methods:
- A text message (SMS)
- iMessage or WhatsApp
- A QR code you scan with your phone's camera

> **You do not need to copy anything from a computer screen.** The admin sends the key directly to your phone. Once you have it, you simply paste it when Tailscale asks for it.

> **Already have a key?** Skip straight to Step 3.

---

### 4.5 Step 3: Connect Child's Device to FamilyShield (5 minutes)

This is done inside the Tailscale app on the child's device. The app asks for the **VPN server address** first, then the enrolment key.

**Back in the Tailscale app on the child's device:**

1. Tap **Get started** or **Log in**
2. Before you tap any "Sign in with Google/Apple" button, look for one of these options:
   - A gear icon or **Settings** in the top corner
   - A link that says **Use a custom control server** or **Self-hosted control server**
   - Under "More options" → "Change server"
3. Tap that option and enter the server address:

   ```
   https://vpn.familyshield.everythingcloud.ca
   ```

   Then tap **Save** or **Done**.

4. The app will now show a field asking for an **Auth key** or **Pre-auth key**. Paste the enrolment key your admin sent you.
5. Tap **Connect** or **Sign in**.
6. The device will ask permission to add a VPN — tap **Allow**.
7. You will see: **Connected** with a green indicator. A small VPN icon appears in the device's status bar — your child can see this icon, which is intentional (full transparency).

> **iPhone/iPad tip:** If the app opens a browser instead of asking for a key, the browser page will have a text field where you can paste the enrolment key. Paste it there and tap **Connect**.

---

### 4.6 Step 4: Install the Safety Certificate (3 minutes)

**Why is this needed?** So FamilyShield can see what your child is watching — YouTube video titles, Roblox game names, and so on. Without this certificate, we can only see that they visited YouTube, not which video they watched. The certificate cannot read passwords, payment details, or private messages.

**Make sure Tailscale shows Connected before doing these steps.**

#### iPhone

1. On the child's iPhone, open **Safari**
2. Type this address into the address bar and tap Go:

   ```
   http://mitm.it
   ```

   (Use `http://` not `https://` — this is intentional and correct)

3. You will see the mitmproxy certificate download page
4. Tap **iOS** or **Install**
5. A popup appears saying **Profile Download** — tap **Allow**
6. Open the **Settings** app → tap **General** → tap **Profiles and Device Management** (or **VPN & Device Management** on newer iPhones)
7. Find **mitmproxy** and tap it
8. Tap **Install** in the top right corner, then enter the child's device passcode
9. Tap **Install** again on the warning screen, then tap **Done**
10. Now go to **Settings → General → About** → scroll to the very bottom → tap **Certificate Trust Settings**
11. Find the **mitmproxy** certificate and toggle the switch to **ON** (it turns green) — tap **Continue** to confirm

#### Android

1. On the child's Android phone, open any web browser
2. Go to: `http://mitm.it`
3. Tap **Android**
4. A file downloads named `mitmproxy-ca-cert.cer`
5. Open **Settings → Security and Privacy → Security** (the exact path varies by phone — on Samsung try **Biometrics and Security → Other security settings → Install from device storage**)
6. Look for **Install from storage** or **Install certificates**
7. Select the downloaded file
8. Give it a name: `FamilyShield`
9. Tap **OK**

> **For Windows and Mac certificates:** See Part C later in this section for detailed device-specific instructions.

---

### 4.7 Step 5: Set Up Notifications on Your Phone (5 minutes)

You will receive real-time alerts on your phone — for example: "YouTube — HIGH RISK (violent content)." Alerts come through a free app called ntfy (pronounced "notify").

These steps are for **your phone** — the parent's phone — not the child's device.

1. Open the App Store (iPhone) or Google Play (Android) on your phone
2. Search for: `ntfy`
3. Install **ntfy** (free — it has an orange notification icon)
4. Open ntfy
5. Tap the **+** button or **Subscribe**
6. Enter this topic name exactly as shown: `familyshield-alerts` (all lowercase, no spaces)
7. Tap **Subscribe**

You will now receive a push notification any time the system detects high-risk content on your child's device — even when you are not looking at the portal.

---

### 4.8 Step 6: Log into Your Parent Dashboard (1 minute)

1. On your phone or computer, open a web browser
2. Go to the portal URL your IT admin gave you (for example, `https://familyshield.everythingcloud.ca`)
3. Log in with your email and password
4. You should see three sections: **Dashboard**, **Devices**, and **Alerts**
5. Your child's device should appear in **Devices** within a few minutes of completing the steps above

**You are done.** FamilyShield is now active on your child's device. The system runs automatically in the background — no ongoing steps needed.

---

### Part A — Generate a Connection Key

> **Who does this:** The person who set up the FamilyShield server (usually a technically confident parent or family member). If that is not you, ask them to do this part and send you the key. You can then skip to Part B.

This step connects to the FamilyShield server and creates a **connection key** — a code that the Tailscale app uses to authenticate the device. One key can be reused for all your devices for up to one year, so you only need to do this once.

**The important thing:** You do not need to copy this key directly to the child's device. Generate it on the server, then send it to the parent's phone via iMessage, WhatsApp, or SMS. From the parent's phone it can be copy-pasted onto any device.

**What you need:**

- A computer (Mac, Windows, or Linux)
- The SSH key file for the server (saved as `familyshield` in your `.ssh` folder)
- The server's SSH address

---

**Step A-1 — Open a terminal on your computer**

- **Mac:** Press `Command + Space`, type `Terminal`, and press Enter.
- **Windows:** Press the Windows key, type `PowerShell`, and press Enter.

---

**Step A-2 — Connect to the FamilyShield server**

```
ssh -i ~/.ssh/familyshield ubuntu@ssh.everythingcloud.ca
```

> **First time connecting?** If you see "The authenticity of host … can't be established. Are you sure?", type `yes` and press Enter.

You are connected when you see a prompt like: `ubuntu@familyshield-vm:~$`

---

**Step A-3 — Create the connection key**

```
docker exec familyshield-headscale headscale preauthkeys create --user familyshield --reusable --expiration 8760h
```

The output will show:

```
Key | 2026-04-18 12:00:00 | false | true | abc123def456abc123def456abc123def456abc123def456
```

**Copy only the last column** (the long string after the final `|`).

---

**Step A-4 — Send the key to the parent's phone**

The easiest options — pick whichever your family uses:

**Option 1 — Send via iMessage or WhatsApp (recommended)**

Paste the key into a message to yourself (your parent phone). Open the message on your phone, copy the key, then paste it on the child's device when Tailscale asks.

**Option 2 — Generate a QR code on the server**

If `qrencode` is installed on the server, run:
```
docker exec familyshield-headscale headscale preauthkeys list --user familyshield
# Copy the key value, then:
echo -n "YOUR-KEY-HERE" | qrencode -t UTF8
```
A QR code will print in the terminal. Scan it with the child's phone camera — the key goes straight into the clipboard.

---

**Step A-5 — Disconnect from the server**

Type `exit` and press Enter.

---

### Part B — Install Tailscale on the Device

Now switch to the child's device. Follow the instructions for their device type below.

---

#### iPhone or iPad

**What you need:** The iPhone or iPad, the enrolment key sent to you by your admin, and about 5 minutes.

1. On the child's iPhone or iPad, open the **App Store** and search for `Tailscale`. Install the official Tailscale app (it is free — blue icon).
2. Open Tailscale. Tap **Get started**.
3. **Before signing in**, look for a settings option to set a custom server:
   - On some versions: tap the **gear icon** in the top-right corner before logging in
   - On others: tap the three dots `···` or scroll down to find **"Use a custom control server"**
4. Enter the server address:

   ```
   https://vpn.familyshield.everythingcloud.ca
   ```

   Tap **Save** or **Done**.

5. Now tap **Log in**. The app may open a browser page — look for a text field labelled **Pre-auth key** or **Auth key**.
6. Paste the enrolment key your admin sent you (copy it from the iMessage/WhatsApp message).
7. Tap **Connect** or **Submit**.
8. iOS will ask permission to add a VPN configuration. Tap **Allow**. Enter the device passcode if asked.
9. You will see **Connected** and a small VPN icon at the top of the screen.

**Tailscale is now installed.** Continue to Part C to install the security certificate.

---

#### Android Phone or Tablet

**What you need:** The Android device, the enrolment key sent to you by your admin, and about 5 minutes.

1. On the child's Android device, open the **Google Play Store**, search for `Tailscale`, and install it (free).
2. Open Tailscale and tap **Get started**.
3. **Before signing in**, set the custom control server:
   - Tap the three-dot menu `⋮` in the top-right corner
   - Select **Settings** or **Custom control server**
4. Enter the server address:

   ```
   https://vpn.familyshield.everythingcloud.ca
   ```

   Tap **Save**.

5. Tap **Log in**. When prompted for an **Auth key**, paste the enrolment key your admin sent you.
6. Tap **Connect**.
7. Android will ask permission to create a VPN connection. Tap **OK**.
8. Tailscale will show **Connected** with a key icon in the status bar.

**Tailscale is now installed.** Continue to Part C.

---

#### Windows PC or Laptop

**What you need:** The Windows computer, the enrolment key from Part A, and about 5 minutes.

1. Go to **<https://tailscale.com/download/windows>** and download the installer. Run it and click **Next** through the steps.
2. Look for the Tailscale icon in the bottom-right system tray (near the clock). Click it, then click **Log in**.
3. A browser window opens. Before signing in with an account, look for **"Use a custom control server"** or **"Self-hosted control server"** and click it.
4. Enter: `https://vpn.familyshield.everythingcloud.ca` and click **Save**.
5. The page now shows an **Auth key** field. Paste the enrolment key.
6. Click **Sign in** or **Connect**.
7. The Tailscale icon in the system tray will turn green or solid to show it is connected.

**Tailscale is now installed.** Continue to Part C.

---

#### Mac (MacBook, iMac, Mac Mini)

**What you need:** The Mac, the enrolment key from Part A, and about 5 minutes.

1. Open the **App Store** on the Mac, search for `Tailscale`, and install it (free).
2. Click the Tailscale icon in the **menu bar** (top-right of the screen). Click **Log in**.
3. A browser window opens. Before signing in with an account, look for **"Use a custom control server"** and click it.
4. Enter: `https://vpn.familyshield.everythingcloud.ca` and click **Save**.
5. The page shows an **Auth key** field. Paste the enrolment key.
6. Click **Sign in**.
7. If the Mac asks permission to add a VPN configuration, click **Allow** and enter the Mac password.
8. The menu bar icon turns solid or green to show it is connected.

**Tailscale is now installed.** Continue to Part C.

---

### Part C — Install the Security Certificate and Set DNS

This part must be done on the child's device while Tailscale is running (connected). The certificate lets FamilyShield identify which YouTube videos, Roblox games, and other content your child is viewing.

> **Important:** Make sure Tailscale shows **Connected** before doing these steps. If Tailscale is not running, the certificate page will not load.

---

#### Step C-1 — Download and install the certificate

1. On the child's device, open a web browser (Safari on iPhone/iPad, Chrome on Android/Windows/Mac).
2. Type exactly this address into the browser and press Enter or Go:

   ```
   http://mitm.it
   ```

   > **Note:** This is `http://` not `https://` — that is intentional. Type it exactly as written.

3. A page will load showing the FamilyShield certificate download. It will have options for different device types. Tap or click the button for the correct device.

   > **What is this page?** This page is served by the FamilyShield monitoring software (mitmproxy) on the server. It only appears when your device is connected through FamilyShield's tunnel — it proves the connection is working.

Now follow the device-specific steps to actually install the certificate:

---

**iPhone/iPad — installing the certificate:**

1. Tap the certificate download button for **iOS / iPadOS**.
2. A prompt will appear saying "This website is trying to download a configuration profile." Tap **Allow**.
3. Open the **Settings** app (the grey icon with gears).
4. At the top of Settings, you will see a banner saying **Profile Downloaded**. Tap it.

   > **Tip:** If you do not see the banner, go to Settings → General → VPN & Device Management — the profile will be listed there.

5. Tap **Install** in the top right corner.
6. Enter the child's iPhone passcode when prompted.
7. Tap **Install** again on the warning screen.
8. Tap **Done**.

Now you need to tell your iPhone to trust this certificate:

1. Go to **Settings → General → About**.
2. Scroll to the very bottom and tap **Certificate Trust Settings**.
3. You will see a certificate named **mitmproxy** or **FamilyShield**. Toggle the switch next to it to **ON** (it turns green).
4. A warning will appear. Tap **Continue** to confirm.

The certificate is now installed and trusted.

---

**Android — installing the certificate:**

1. Tap the certificate download button for **Android**.
2. The file will download to your Downloads folder.
3. Open **Settings** on the Android device.
4. Go to **Security** (or **Biometrics and Security** on Samsung devices).
5. Look for **Install from storage**, **Install certificates**, or **Trusted credentials** — the exact name varies by phone model. On Samsung: **Biometrics and Security → Other security settings → Install from device storage**.
6. Find and tap the certificate file you just downloaded (it may be named `mitmproxy-ca-cert.pem` or similar).
7. Give it a name like `FamilyShield` when prompted.
8. Tap **OK**.

---

**Windows — installing the certificate:**

1. Click the certificate download button for **Windows**.
2. A file will download (usually called `mitmproxy-ca-cert.p12` or `mitmproxy-ca-cert.cer`).
3. Find the file in your **Downloads** folder and double-click it.
4. A window called **Certificate Import Wizard** will open. Click **Next**.
5. The file path is already filled in — click **Next** again.
6. Leave the password field empty and click **Next**.
7. Select **Place all certificates in the following store** and click **Browse**.
8. Choose **Trusted Root Certification Authorities** from the list. Click **OK**.
9. Click **Next**, then **Finish**.
10. A security warning will appear. Click **Yes** to confirm.
11. A message will say "The import was successful." Click **OK**.

---

**Mac — installing the certificate:**

1. Click the certificate download button for **macOS**.
2. The file will download (named something like `mitmproxy-ca-cert.pem`).
3. Open your **Downloads** folder and double-click the certificate file.
4. An app called **Keychain Access** will open. A dialog will ask which keychain to add it to — choose **System** and click **Add**.
5. Enter your Mac password to confirm.
6. In Keychain Access, click on the **System** keychain in the left panel, then click **Certificates** at the top.
7. Find the certificate named **mitmproxy** in the list and double-click it.
8. A details window will open. Click the small triangle next to **Trust** to expand that section.
9. In the dropdown next to **When using this certificate**, choose **Always Trust**.
10. Close the window. Enter your Mac password again to save the change.

---

#### Step C-2 — Set the DNS server

DNS is the system that looks up website addresses. Pointing it to FamilyShield allows AdGuard (the filtering component) to block unwanted sites.

First, you need to find the FamilyShield server's VPN address. You can find this by:

- Looking at the Tailscale app — tap or click the Tailscale icon and look for the IP address shown next to the **server node** (it will be a number starting with `100.64`)
- Or running this command in a terminal connected to the server: `docker exec familyshield-headscale headscale nodes list` — the server's own IP will appear in the `ADDRESSES` column

Write down that IP address. It will look something like `100.64.0.1`. For the steps below, replace `SERVER-VPN-IP` with the address you found.

---

**iPhone/iPad — setting DNS:**

1. Open **Settings** on the iPhone.
2. Tap **Wi-Fi**.
3. Tap the **ⓘ** (info) icon next to the Wi-Fi network the device is connected to.
4. Scroll down to **DNS** and tap **Configure DNS**.
5. Change **Automatic** to **Manual**.
6. Tap **Add Server** and type the server's VPN address (e.g., `100.64.0.1`).
7. Remove any other DNS servers listed by tapping the red minus icon next to them, then tapping **Delete**.
8. Tap **Save** in the top right corner.

> **Note:** You may need to repeat this for each Wi-Fi network the device connects to, including home Wi-Fi and school Wi-Fi. For mobile data, go to Settings → Cellular → Cellular Data Options and look for a DNS setting, or it will be applied automatically via the VPN profile.

---

**Android — setting DNS:**

Steps vary slightly by Android version and phone brand.

1. Open **Settings** and tap **Wi-Fi**.
2. Long-press the Wi-Fi network the device is connected to, then tap **Modify network** or **Manage network settings**.
3. Look for **IP settings** and change it from **DHCP** to **Static**.
4. A **DNS 1** field will appear. Enter the server's VPN address (e.g., `100.64.0.1`).
5. Leave **DNS 2** blank or remove it.
6. Tap **Save**.

> **Alternative (Android 9 and newer):** Go to Settings → Network & internet → Private DNS. Choose **Private DNS provider hostname** and enter the server's VPN address. This applies to all networks automatically.

---

**Windows — setting DNS:**

1. Click the **Start** button, then click the **Settings** gear icon.
2. Go to **Network & Internet**.
3. Click **Wi-Fi** (or **Ethernet** if using a cable), then click the network name.
4. Scroll down to **DNS server assignment** and click **Edit**.
5. Change **Automatic (DHCP)** to **Manual**.
6. Turn on the **IPv4** toggle.
7. In the **Preferred DNS** field, enter the server's VPN address (e.g., `100.64.0.1`).
8. Leave **Alternate DNS** blank.
9. Click **Save**.

---

**Mac — setting DNS:**

1. Click the **Apple** menu (top left corner) and choose **System Settings** (or **System Preferences** on older Macs).
2. Click **Wi-Fi** (or **Network**).
3. Click the **Details** button next to the Wi-Fi network you are connected to.
4. Click **DNS** in the left sidebar.
5. Click the **+** button and type the server's VPN address (e.g., `100.64.0.1`).
6. If there are other DNS entries, remove them by selecting each one and clicking the **−** button.
7. Click **OK**, then click **Apply**.

---

### Part D — Register the Device in the Portal

The last step is to add the device to your FamilyShield portal so you can see it on the dashboard and assign it to a child's profile.

1. Open the FamilyShield portal on your phone or computer: **<https://familyshield.everythingcloud.ca>**
2. Click **Devices** in the navigation menu.
3. Click the **Enrol Device** button.
4. Fill in the form:
   - **Device name:** Give it a name you will recognise — for example, `Emma's iPhone` or `Living Room iPad`.
   - **IP address:** Enter the Tailscale VPN IP address assigned to the device. You can find this by opening the Tailscale app on the device and looking at the **My IP** or **This device** section. It will be a number starting with `100.64`.
   - **Age profile:** Select the profile that matches the child who uses this device (**Strict**, **Moderate**, or **Guided**).
5. Click **Enrol**.

The device will appear on your Devices page. Within a few seconds it should show a green **Online** status, confirming that monitoring is active.

> **How to confirm it is working:** Open a browser on the child's device and visit any website. Then go back to the FamilyShield portal dashboard. You should see a new entry appear in the Activity Feed within about 30 seconds.

---

### Game Consoles (PlayStation, Xbox, Nintendo Switch)

Game consoles use a simpler form of monitoring — DNS filtering only. This means FamilyShield can block websites and games at the network level, but cannot see detailed content like which game or video was viewed. No VPN app or certificate is needed.

**Steps:**

1. Find your FamilyShield server's public IP address (you used this during setup, or check with your server admin).
2. On the console, go to the **Network Settings**:
   - **PlayStation:** Settings → Network → Set Up Internet Connection → Custom → DNS Settings → Manual
   - **Xbox:** Settings → General → Network Settings → Advanced Settings → DNS Settings
   - **Nintendo Switch:** System Settings → Internet → Internet Settings → (select your network) → Change Settings → DNS → Manual
3. Enter the server's public IP address as the **Primary DNS**.
4. Leave **Secondary DNS** blank or set it to `1.1.1.1` (Cloudflare's public resolver) as a fallback.
5. Save and test the connection.

> **Note:** On game consoles, FamilyShield can block specific games and websites, and apply time-based rules. It cannot analyse the content of games in the same detail as on phones and computers.

---

## 5. Understanding the Dashboard

When you log in to the portal, the first screen you see is the Dashboard. Here is what each section means.

If FamilyShield cannot currently reach the cloud database service, the portal may show a yellow status banner indicating "offline" or "degraded" mode. In this state, existing pages remain available but live data updates may be temporarily unavailable.

### Devices Online

A row of coloured circles, one per device. **Green** means the device is currently connected and being monitored. **Grey** means the device is offline or the VPN is not running.

> **Tip:** If a device shows grey when your child is supposed to be online, tap it to see the last time it was connected.

### Activity Feed

A live list of every website and app your child visited today, in the order they visited it. Each entry shows:

- The name of the website or app (in plain English, not a technical address)
- The time it was visited
- A small coloured dot: **blue** = normal, **yellow** = worth watching, **red** = flagged as risky

Tap any entry to see more detail — for example, if your child watched a YouTube video, you will see the video title and channel name.

### Risk Alerts

A list of the most recent alerts that FamilyShield sent you. If you missed a notification on your phone, you can find it here. Tap any alert to see the full details and choose what to do.

### Screen Time Chart

A bar chart showing how many hours per day your child spent online over the past week. Each bar is colour-coded by category — for example, educational sites are shown in green, gaming in blue, and social media in orange.

> **Tip:** Tap any bar to see a breakdown of exactly which apps or sites made up that time.

### Access Requests

A badge showing how many requests your child has submitted asking you to unblock a website. Tap to review them (see Section 8 for full details).

---

## 6. Setting Rules for Your Child

### Blocking a specific website

1. In the portal, go to your child's profile.
2. Tap **Rules → Block a website**.
3. Type the website address (for example, `reddit.com`).
4. Tap **Block**.

The block takes effect within about 60 seconds on all of your child's enrolled devices. Your child will see a message saying the site is blocked by FamilyShield.

### Allowing a blocked website

1. In the portal, go to your child's profile.
2. Tap **Rules → Blocked websites**.
3. Find the website in the list and tap **Allow**.

The website will be accessible again within about 60 seconds.

### Setting screen time limits

> **Note:** Screen time limits are coming in a future update. The portal will show a notice when this feature is available in 2026.

When available, screen time limits will let you:

- Set a daily total time limit (for example, 2 hours per day)
- Set a bedtime — all devices go offline at a certain hour
- Allow exceptions on weekends

### Choosing an age profile

Changing a child's age profile adjusts all the content rules at once.

1. Go to your child's profile.
2. Tap **Edit Profile**.
3. Under **Age Profile**, choose **Strict**, **Moderate**, or **Guided**.
4. Tap **Save**.

Here is a plain-English summary of what each profile does:

**Strict (recommended for ages 6–10)**

- Social media is blocked (YouTube is allowed with strict filtering)
- Gaming sites are limited to age-rated titles
- New websites are blocked unless you have approved them

**Moderate (recommended for ages 11–14)**

- Social media is monitored but not blocked
- YouTube is allowed with moderate filtering
- Mature content is blocked
- TikTok remains blocked

**Guided (recommended for ages 15–17)**

- Most content is allowed
- High-risk content (adult sites, extreme violence) is blocked
- Alerts sent to parent for medium and high-risk activity
- Your child has more freedom but monitoring is still active

> **Note:** You know your child best. These are starting points, not rigid rules. You can mix and match by using one profile and then adding or removing individual blocks on top of it.

---

## 7. Understanding Alerts

### How alerts work

When FamilyShield detects something worth your attention, it sends a push notification to your phone. Alerts come through the **ntfy** app (a free notification app).

### Installing the ntfy app

1. On your phone, open the **App Store** (iPhone) or **Google Play** (Android).
2. Search for **ntfy** and install it (free).
3. Open ntfy and tap **Subscribe to topic**.
4. In the parent portal, go to **Settings → Notifications**.
5. You will see your personal topic name — something like `familyshield-xxxxxxxx`. Copy it.
6. Paste it into ntfy and tap **Subscribe**.

You will now receive all alerts on your phone, even when you are not looking at the portal.

### Alert levels explained

**Blue — Information**
Nothing to worry about. These are just regular activity summaries.
Example: "Emma watched 3 YouTube videos this afternoon."

**Yellow — Medium risk**
Something worth checking. Not necessarily a problem, but worth a look.
Example: "Emma visited a gaming site rated for ages 13+."
What to do: Open the portal, tap the alert, read the detail. If it looks fine, tap **Dismiss**. If you want to block it, tap **Block this site**.

**Red — High risk**
FamilyShield detected content that may be harmful. You should review this promptly.
Example: "Emma attempted to view adult content. It was blocked."
What to do: Open the portal, read the details, and consider having a conversation with your child. Tap **Mark as reviewed** when done.

> **Note:** A red alert does not always mean something bad happened. It often means FamilyShield worked — it detected and blocked something before your child saw it. Use it as a conversation starter, not a punishment trigger.

### Alert fatigue — keeping it manageable

If you receive too many alerts and they start to feel overwhelming, you can adjust the sensitivity:

1. Go to **Settings → Alert Settings** in the portal.
2. Under your child's name, change **Alert sensitivity** from **All** to **Medium and high only** or **High only**.
3. Tap **Save**.

---

## 8. Handling Access Requests

### What is an access request?

If your child tries to visit a blocked website and thinks it should be allowed, they can submit an access request directly from the blocked-page message. It works like raising their hand in class — respectful, no drama.

### How your child submits a request

When your child sees the "blocked" page, they will see a button that says **Request Access**. They tap it, type a short reason (for example, "I need this for my school project on dinosaurs"), and tap **Send**. That is it.

### How you receive the request

You will get a push notification (via ntfy) saying something like:
> "Emma is requesting access to nationalgeographic.com — 'I need this for my school project on dinosaurs.'"

You can also see all pending requests on your dashboard under **Access Requests**.

### Approving or denying a request

1. Tap the notification, or open the portal and tap **Access Requests**.
2. You will see the website name, your child's reason, and a preview of what the site contains.
3. Tap **Approve** to allow the site, or **Deny** to keep it blocked.
4. Optionally, type a short message to your child explaining your decision.
5. Your child will see the result the next time they try to visit that site.

> **Tip:** If you approve a request, you can choose to allow it temporarily (for example, for 7 days) or permanently. Temporary approvals are great for school projects.

---

## 9. Monitoring Specific Platforms

### YouTube

**What FamilyShield can see:**

- The title of every video your child watched
- The channel name
- Whether the video was flagged as mature, violent, or sexual by YouTube's own age rating system
- An AI-generated risk score for each video (low, medium, or high)

**What FamilyShield cannot see:**

- Your child's YouTube account, comments, or subscriptions
- Videos watched while offline (downloaded videos are not monitored)

**What happens with risky videos:**
If a video scores as high risk, your child's browser or app will block the video and you will receive an alert.

---

### Roblox

**What FamilyShield can see:**

- The name of every game your child played
- The age rating of each game (as set by Roblox)
- A risk score based on user reports and game content

**What FamilyShield cannot see:**

- Chat messages between players
- Your child's Roblox account details

**What happens with risky games:**
Games rated for ages 17+ will be blocked under the Strict and Moderate profiles. You will receive an alert if your child attempts to join one.

---

### Twitch

**What FamilyShield can see:**

- The name of the channel your child watched
- Whether the channel is marked as Mature Content by Twitch

**What FamilyShield cannot see:**

- Chat messages
- Your child's Twitch account

**What happens with mature channels:**
Channels marked as Mature Content are blocked under Strict and Moderate profiles. You will receive an alert.

---

### Discord

**What FamilyShield can see:**

- Whether your child is connected to Discord
- The name of the server (community) they joined (if it is a public server)
- Whether the server has been flagged by community reports for inappropriate content

**What FamilyShield cannot see:**

- Private messages or direct messages
- The content of any conversations

> **Note:** Discord is one of the more challenging platforms to monitor because most of its content is in private chat. FamilyShield focuses on flagging high-risk servers. We recommend having a direct conversation with your child about Discord etiquette.

---

### TikTok

TikTok is **blocked by default** on all FamilyShield devices. This is because:

- TikTok uses technology (called certificate pinning) that prevents secure monitoring
- FamilyShield cannot tell you what your child is watching on TikTok, only that they used it
- Given this limitation, it is safer to block it entirely than to monitor it poorly

Parents can choose to unblock TikTok for children aged 15–17 under the Guided profile. To do this:

1. Go to your child's profile.
2. Tap **Rules → Blocked platforms**.
3. Find TikTok and tap **Allow (Guided profile only)**.

> **Note:** Even when unblocked, FamilyShield cannot monitor TikTok content — only the time spent on it. This limitation is TikTok's technical decision, not FamilyShield's.

---

### Instagram

**What FamilyShield can see:**

- Time spent on Instagram
- Reel or video IDs (when viewed in a browser — not in the app due to app encryption)

**What FamilyShield cannot see:**

- Direct messages
- Posts viewed in the Instagram app

Under Strict profile, Instagram is blocked. Under Moderate and Guided, it is monitored with time-based alerts.

---

## 10. Your Child's Privacy

We take privacy seriously. FamilyShield was designed with Canadian privacy principles in mind.

### What data is collected

- URLs (website addresses) visited by your child's devices
- Platform content IDs — for example, a YouTube video ID (not the video itself)
- Time and duration of website visits
- Device connection status (online or offline)

### What data is NOT collected

- The content of any private messages (Discord DMs, iMessages, WhatsApp, etc.)
- Passwords or payment information
- Photos or videos stored on your child's device
- Location data
- Screenshots or recordings of your child's screen
- Email content

### Where is data stored?

All data is stored on a server in **Toronto, Canada** (Oracle Cloud Infrastructure's ca-toronto-1 region). Your data does not leave Canada.

### How long is data kept?

- Activity logs are kept for **90 days**, then automatically deleted.
- Alert history is kept for **1 year**.
- You can manually delete any data at any time from **Settings → Privacy → Delete data**.

### Who can see the data?

Only you — the parent who set up the account. FamilyShield does not sell data, share it with advertisers, or provide it to third parties. The only exception would be if required by a Canadian court order.

### Your child's awareness

As mentioned in Section 1, FamilyShield operates on full transparency. Your child can see:

- That the VPN is running (the VPN icon appears on their device)
- That FamilyShield is monitoring their device (a small status indicator in the blocked-page messages)

Your child cannot see the specific reports or alerts in the parent portal.

---

## 11. Frequently Asked Questions

**Q: My child turned off the VPN app. Does that mean monitoring stopped?**

A: If your child turns off the Tailscale app, their device will lose internet access entirely — FamilyShield is configured so that internet only works through the monitoring tunnel. Their phone will show "No internet connection" until Tailscale is turned back on. This prevents bypassing.

---

**Q: Can my child use a different Wi-Fi network to get around FamilyShield?**

A: No. The monitoring happens through the Tailscale VPN app installed on the device, not through your home Wi-Fi. It works on any Wi-Fi network and on mobile data too.

---

**Q: Will FamilyShield slow down my child's internet?**

A: In most cases, no noticeable slowdown. The monitoring server is in Toronto, and traffic is routed through it very quickly. Video streaming, gaming, and browsing all work at normal speed.

---

**Q: My child got a new phone. What do I do?**

A: Follow the device enrolment steps in Section 4 for the new phone. Then, in the parent portal, go to your child's profile, find the old device, and tap **Remove device**. This keeps your reports clean and ensures the old phone is no longer monitored.

---

**Q: Can I monitor two children with separate rules?**

A: Yes. Each child has their own profile with their own rules, age profile, and activity feed. You can add as many children as you need from the dashboard.

---

**Q: Does FamilyShield work on school-issued devices?**

A: It depends on the school's device policy. Many school-issued devices have restrictions that prevent installing new apps or certificates. Check with your child's school IT department before trying to enrol a school device.

---

**Q: My child is 18 next month. What happens?**

A: Nothing changes automatically — FamilyShield does not remove monitoring based on age. When you are ready, go to your child's profile and tap **Deactivate monitoring**. This removes all rules and blocks but keeps the activity history. Alternatively, you can delete the profile entirely.

---

**Q: I received a high-risk alert but I am not sure what it means. Who do I ask?**

A: Tap the alert in the portal for a plain-English explanation. If you are still unsure, use the **Ask FamilyShield** button (available in the alert detail) for an AI-generated explanation written for parents. If you believe something serious happened, contact your child's school counsellor or local child protection services as appropriate.

---

**Q: Can my child see the alerts I receive?**

A: No. Alerts are sent to the parent portal and the ntfy app on your phone. Your child cannot see the portal, the alerts, or your ntfy notifications.

---

**Q: Does FamilyShield cost money?**

A: FamilyShield itself is free and open source. It runs on Oracle Cloud's Always Free tier, which provides a free server for life with no credit card required after initial setup. The only potential cost is if your usage grows beyond the free tier — for a family of typical size, this is very unlikely. All costs are in **CAD ($)** if they ever apply.

---

**Q: What if my child uses a VPN or proxy app to bypass FamilyShield?**

A: FamilyShield blocks known VPN and proxy services at the DNS level (the system that looks up website addresses). Most consumer VPN apps will not work on an enrolled device. If you suspect your child found a workaround, go to **Activity Feed → Filter by: Suspicious** to look for unusual traffic patterns. The portal will also send you an alert if it detects a bypass attempt.

---

**Q: Is my family's data safe from hackers?**

A: FamilyShield uses industry-standard security: encrypted connections (HTTPS), Cloudflare's network protection, and regular automated security updates. The server has no open internet ports — all access goes through Cloudflare's secure tunnel. No system is 100% hack-proof, but FamilyShield follows best practices.

---

**Q: Can my child see the certificate I installed?**

A: On iPhone, they can go to Settings → General → Profiles and see "mitmproxy". They cannot remove it without your device passcode, so seeing it does not give them any way to bypass monitoring. On Android, the certificate is visible in Settings → Security — same situation.

---

**Q: What if my child disconnects Tailscale?**

A: Their device loses internet access immediately. FamilyShield is configured so that all internet access must go through the VPN (the protected tunnel). They would need to reconnect Tailscale before they can browse anything. You will see their device go offline in the Devices section of the portal.

---

**Q: Will the VPN icon bother my child?**

A: Most children stop noticing it within a day or two. You can explain it openly: it is a safety tool, like a seatbelt — always on, not intrusive. FamilyShield is built on full transparency, so there is no need to hide it.

---

**Q: I see YouTube activity but no video titles — why?**

A: The safety certificate is not installed on that device, or was not completed correctly. Follow the certificate installation steps in Section 4.6 to install it. On iPhone, make sure you complete the Certificate Trust Settings step (Settings → General → About → Certificate Trust Settings) — that step is easy to miss.

---

**Q: My child's Tailscale shows them as connected but they say the internet is slow?**

A: The FamilyShield server may be under temporary load, or the connection between the device and server may be weak. Ask your IT admin to check that the server is healthy. If slowness persists for more than a few hours, contact support.

---

## 12. Parent Troubleshooting — Quick Reference

These are the most common issues parents run into during and after setup, with plain-English fixes. For technical errors and developer-level issues, see the full troubleshooting guide at `docs/troubleshooting/README.md`.

---

**My child's device won't connect to Tailscale**

- Check: Is WiFi or mobile data turned on?
- Try: Close the Tailscale app completely, restart the phone, then reopen Tailscale.
- If the connection still fails after restarting: The enrolment key may have expired. Contact your IT admin and ask them to generate a new one. Keys expire after one year.

---

**I am not getting ntfy notifications**

- Check 1: Is the ntfy app installed on your phone (the parent's phone)?
- Check 2: Is your phone's Do Not Disturb turned off? On iPhone: swipe down from the top right corner of the screen — the crescent moon icon should not be highlighted. On Android: go to Settings → Sounds → Do Not Disturb → make sure it is off.
- Check 3: Did you subscribe to exactly `familyshield-alerts` — all lowercase, no spaces?
- Fix: Uninstall and reinstall ntfy, then resubscribe to the topic.

---

**Safari shows "This connection is not private"**

This warning is expected the first time you visit an HTTPS website after installing the safety certificate. It does not mean anything is wrong.

- Fix: Tap **Show Details** → scroll down → tap **Visit this website**.
- After that, Safari remembers your choice and will not show the warning for that site again.

---

**My child can see a VPN icon in their status bar**

This is completely normal. The small VPN icon means their device is connected to the FamilyShield network and protection is active.

- You can explain it to your child: "FamilyShield is keeping you safe online — it works like a seatbelt, always on and not in the way."
- Your child will not notice any speed difference or extra steps when browsing.

---

**I see activity from YouTube but no video titles**

The safety certificate is probably not installed correctly, or the trust step was skipped.

- Fix: Go back to Section 4.6 and follow the certificate installation steps again on the child's device. On iPhone, pay special attention to the final Certificate Trust Settings step: Settings → General → About → Certificate Trust Settings → toggle mitmproxy to ON.

---

## 13. Getting Help

### In-portal help

Every page in the portal has a small **?** icon in the top right corner. Tap it for context-sensitive help about that specific page.

### Troubleshooting guide

For step-by-step solutions to common problems (device not showing online, alerts not arriving, certificate errors), see:

`docs/troubleshooting/README.md`

This guide is available in the FamilyShield documentation on GitHub.

### Community support

FamilyShield is open source. If you have a question that is not answered here, you can:

- Open an issue on GitHub: <https://github.com/Everythingcloudsolutions/FamilyShield>
- Search existing issues — another parent may have had the same question

### Contacting support

For direct support, contact:

- **Email:** <support@everythingcloudsolutions.ca>
- **Response time:** Within 2 business days (Canada business hours, Eastern Time)

When contacting support, please include:

- Your child's device type (iPhone, Android, Windows, Mac)
- A description of what happened
- Any error messages you saw (a screenshot is helpful)

> **Note:** For your privacy, never include passwords or the content of your child's activity feed in support emails.

---

*FamilyShield User Guide — Version 1.0 — April 2026*
*Everythingcloudsolutions — Canada*
*<https://familyshield.everythingcloud.ca>*
