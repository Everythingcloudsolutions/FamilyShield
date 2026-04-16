# FamilyShield — Parent User Guide

> **Last updated:** April 2026
> **Portal address:** https://familyshield.everythingcloud.ca
> **Support:** See [Getting Help](#12-getting-help) at the end of this guide

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
12. [Getting Help](#12-getting-help)

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
2. Go to: **https://familyshield.everythingcloud.ca**
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

Enrolling a device means connecting that device to FamilyShield so monitoring can begin. You will install a free app called **Tailscale** (a VPN app — think of it as a secure tunnel that routes your child's internet through FamilyShield's monitoring server).

> **Note:** Tailscale is a well-known, trusted app used by millions of people worldwide. It does not slow down browsing or use extra data in any noticeable way.

### iPhone or iPad

**What you will need:** The iPhone or iPad your child uses, and about 10 minutes.

1. On the child's iPhone, open the **App Store**.
2. Search for **Tailscale** and install it (it is free).
3. Open Tailscale and tap **Sign in with other**.
4. You will see a screen asking for a login key. Switch to the parent portal on your phone.
5. In the portal, go to your child's profile and tap **Add Device → iPhone/iPad**.
6. The portal will show you a short code (called an "auth key"). Copy it.
7. Go back to Tailscale on your child's device and paste that code.
8. Tailscale will ask for permission to add a VPN configuration. Tap **Allow**.
9. If prompted, enter your child's iPhone passcode to confirm.
10. Back in the parent portal, you will see the device appear under your child's profile within about 30 seconds.
11. Tap **Assign to [child's name]** to link the device.

> **What just happened?** Your child's iPhone now routes its internet traffic through FamilyShield's monitoring server. You will see a small VPN icon in the top right of the iPhone's screen at all times when monitoring is active — your child can see this too.

You also need to install a security certificate (a digital file that allows FamilyShield to check encrypted websites, like YouTube):

12. In the parent portal, tap **Download Certificate** for this device.
13. Open the downloaded file on the iPhone. You may be prompted to go to **Settings → General → VPN & Device Management** to install it.
14. Tap **Install**, enter the passcode, and tap **Install** again.
15. Go to **Settings → General → About → Certificate Trust Settings** and toggle on the FamilyShield certificate.

> **Note:** This certificate only lets FamilyShield identify which YouTube video or Roblox game your child is viewing. It cannot read passwords, payment details, or private messages.

---

### Android Phone or Tablet

**What you will need:** The Android device your child uses, and about 10 minutes.

1. Open the **Google Play Store** on the child's device.
2. Search for **Tailscale** and install it (free).
3. Open Tailscale and tap **Sign in**.
4. In the parent portal, go to your child's profile and tap **Add Device → Android**.
5. The portal will show you an auth key. Copy it.
6. In Tailscale on the child's device, choose **Sign in with auth key** and paste the key.
7. Tailscale will ask permission to create a VPN connection. Tap **OK**.
8. The device will appear in the parent portal — tap **Assign to [child's name]**.

To install the security certificate on Android:

9. In the parent portal, tap **Download Certificate** for this device.
10. On the Android device, go to **Settings → Security → Install from storage** (the exact wording varies by phone brand — on Samsung it may be under **Biometrics and Security → Other security settings**).
11. Select the certificate file you downloaded and follow the prompts to install it.
12. Give the certificate a name like "FamilyShield" when asked.

---

### Windows PC or Laptop

**What you will need:** The Windows computer your child uses, and about 15 minutes.

1. On the child's Windows computer, open a web browser and go to **https://tailscale.com/download**.
2. Download and install the **Windows** version of Tailscale.
3. Once installed, Tailscale will appear in the system tray (bottom right of the screen, near the clock).
4. Click the Tailscale icon and choose **Log in**.
5. In the parent portal, go to your child's profile and tap **Add Device → Windows**.
6. Copy the auth key shown in the portal.
7. Paste it into the Tailscale login screen and click **Connect**.
8. The computer will appear in the parent portal — tap **Assign to [child's name]**.

To install the security certificate on Windows:

9. In the parent portal, tap **Download Certificate** for this device.
10. On the Windows computer, double-click the downloaded certificate file.
11. A window will open. Click **Install Certificate**.
12. Choose **Local Machine** and click **Next**.
13. Choose **Place all certificates in the following store**, then click **Browse** and select **Trusted Root Certification Authorities**.
14. Click **Next**, then **Finish**.
15. A confirmation message will appear saying the import was successful.

---

### Mac (MacBook, iMac, Mac Mini)

**What you will need:** The Mac your child uses, and about 15 minutes.

1. On the Mac, open the **App Store**.
2. Search for **Tailscale** and install it (free).
3. Click the Tailscale icon in the menu bar (top right of the screen) and choose **Log in**.
4. In the parent portal, go to your child's profile and tap **Add Device → Mac**.
5. Copy the auth key shown in the portal.
6. Paste it into the Tailscale window and click **Connect**.
7. The Mac will appear in the parent portal — tap **Assign to [child's name]**.

To install the security certificate on Mac:

8. In the parent portal, tap **Download Certificate** for this device.
9. On the Mac, double-click the downloaded certificate file. It will open in an app called **Keychain Access**.
10. Double-click the FamilyShield certificate in the list.
11. Click the arrow next to **Trust** to expand that section.
12. Change **When using this certificate** to **Always Trust**.
13. Close the window and enter your Mac password to confirm.

---

### Game Consoles (PlayStation, Xbox, Nintendo Switch)

Game consoles use a simpler form of monitoring — DNS filtering. This means FamilyShield can block websites and games at the network level, but cannot see detailed activity like it can on phones and computers. No VPN app or certificate is needed.

1. In the parent portal, go to your child's profile and tap **Add Device → Game Console**.
2. Select the console type (PlayStation, Xbox, or Nintendo Switch).
3. The portal will show you two DNS server addresses (for example, 192.0.2.1 and 192.0.2.2).
4. On the console, go to **Settings → Network → Advanced Settings → DNS Settings → Manual**.
5. Enter the two addresses shown in the portal.
6. Save and restart the console's network connection.

> **Note:** On game consoles, FamilyShield can block specific games and websites, and set online play hours. It cannot analyse the content of games in the same detail as on phones and computers.

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

## 12. Getting Help

### In-portal help

Every page in the portal has a small **?** icon in the top right corner. Tap it for context-sensitive help about that specific page.

### Troubleshooting guide

For step-by-step solutions to common problems (device not showing online, alerts not arriving, certificate errors), see:

`docs/troubleshooting/README.md`

This guide is available in the FamilyShield documentation on GitHub.

### Community support

FamilyShield is open source. If you have a question that is not answered here, you can:

- Open an issue on GitHub: https://github.com/Everythingcloudsolutions/FamilyShield
- Search existing issues — another parent may have had the same question

### Contacting support

For direct support, contact:

- **Email:** support@everythingcloudsolutions.ca
- **Response time:** Within 2 business days (Canada business hours, Eastern Time)

When contacting support, please include:
- Your child's device type (iPhone, Android, Windows, Mac)
- A description of what happened
- Any error messages you saw (a screenshot is helpful)

> **Note:** For your privacy, never include passwords or the content of your child's activity feed in support emails.

---

*FamilyShield User Guide — Version 1.0 — April 2026*
*Everythingcloudsolutions — Canada*
*https://familyshield.everythingcloud.ca*
