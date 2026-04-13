# FamilyShield — Setup Guide

> **Who this is for:** Anyone setting up FamilyShield for the first time, including people with no prior Oracle Cloud experience.
> **Time needed:** About 2 hours the first time.
> **Cost:** $0 CAD/month — this guide uses Always Free tiers throughout.
> **Last updated:** 2026-04-13

---

## Overview — What You Will Set Up

Before any scripts can run, you need accounts and credentials from five services:

| Service | What it does in FamilyShield | Cost |
| --- | --- | --- |
| Oracle Cloud (OCI) | Hosts the VM that runs all 10 Docker containers | Free (Always Free tier) |
| Cloudflare | DNS, Tunnel (no open ports), Zero Trust access | Free |
| Supabase | Database — stores all activity, alerts, rules | Free (500 MB) |
| Groq | AI that classifies content — primary engine | Free (500k tokens/day) |
| Anthropic | AI fallback when Groq is unavailable | ~$0.02 CAD/month |

You also need three tools installed on your Windows laptop before running any scripts.

---

## Part 1 — Install Required Tools on Your Laptop

### 1.1 Python (needed for OCI CLI)

OCI CLI requires Python 3.8 or newer.

1. Open a browser and go to **python.org/downloads**
2. Download the latest Python 3.x installer for Windows
3. Run the installer — **tick "Add Python to PATH"** before clicking Install
4. Open a new terminal (Command Prompt or PowerShell) and verify:

   ```shell
   python --version
   ```

   You should see something like `Python 3.12.x`

### 1.2 OCI CLI

1. In the same terminal, run:

   ```shell
   pip install oci-cli
   ```

2. Verify it installed:

   ```shell
   oci --version
   ```

   You should see something like `3.x.x`

### 1.3 OpenTofu (Infrastructure tool)

OpenTofu is what deploys and manages the cloud resources.

1. Go to **opentofu.org/docs/intro/install**
2. Download the Windows AMD64 zip file
3. Unzip it — you get a single `tofu.exe` file
4. Move `tofu.exe` to `C:\Windows\System32\` (or any folder already on your PATH)
5. Verify:

   ```shell
   tofu --version
   ```

### 1.4 GitHub CLI

1. In a terminal, run:

   ```shell
   winget install GitHub.cli
   ```

2. Close and reopen the terminal, then authenticate:

   ```shell
   gh auth login
   ```

   Choose: GitHub.com → HTTPS → Login with a web browser → follow the prompts

3. Verify:

   ```shell
   gh auth status
   ```

### 1.5 Git Bash (needed to run shell scripts on Windows)

The bootstrap and setup scripts are bash scripts. On Windows you need Git Bash to run them.

1. Go to **git-scm.com/download/win**
2. Download and install Git for Windows — this includes Git Bash
3. After installation, you can open Git Bash from the Start menu
4. All `bash scripts/...` commands in this guide must be run in **Git Bash**, not Command Prompt or PowerShell

---

## Part 2 — Oracle Cloud (OCI) Account

This is the most involved part. Follow every step carefully — especially the region selection, which **cannot be changed later**.

### 2.1 Create an OCI Account

1. Go to **oracle.com/cloud/free**
2. Click **Start for free**
3. Fill in your details:
   - **Country:** Canada
   - **Email:** your personal email (Oracle sends verification)
4. Verify your email when prompted
5. On the **Home Region** screen — this is critical:
   - Select **Canada Southeast (Toronto) — ca-toronto-1**
   - **This cannot be changed after account creation**
6. Complete phone number verification (Oracle calls or texts)
7. Enter credit card details — **you will not be charged** for Always Free resources, but Oracle requires a card to prevent abuse

> After account creation, Oracle takes 5–15 minutes to provision your account. You will receive an email when it is ready.

### 2.2 First Login

1. Go to **cloud.oracle.com**
2. Enter your **Cloud Account Name** — this was shown during signup (your tenancy name, usually your company or personal name)
3. Sign in with your email and password

You should see the OCI Console dashboard.

### 2.3 Find Your Tenancy OCID

Your Tenancy OCID is a unique identifier for your OCI account. You will need it for OCI CLI setup.

1. Click the **profile icon** in the top-right corner of the Console (looks like a person silhouette)
2. Click **Tenancy: [your name]**
3. On the Tenancy Details page, find **OCID** — it starts with `ocid1.tenancy.oc1..`
4. Click **Copy** next to it
5. Paste it into a text file — you will use it shortly

### 2.4 Find Your User OCID

1. Click the **profile icon** again (top-right)
2. Click **User Settings** (or **My Profile**)
3. On the User Details page, find **OCID** — it starts with `ocid1.user.oc1..`
4. Click **Copy** and save it in your text file

### 2.5 Generate an API Key for OCI CLI

This API key is what allows OCI CLI on your laptop to authenticate with your OCI account.

1. You should still be on the **User Settings / My Profile** page
2. In the left menu, click **API Keys**
3. Click **Add API Key**
4. Select **Generate API Key Pair**
5. Click **Download Private Key** — save the file as `oci_private_key.pem` into a folder like `C:\Users\mohit\.oci\`
6. Click **Add**
7. A **Configuration File Preview** box appears — it shows something like:

   ```ini
   [DEFAULT]
   user=ocid1.user.oc1..aaaaaa...
   fingerprint=ab:cd:ef:12:34:56:78:90:...
   tenancy=ocid1.tenancy.oc1..aaaaaa...
   region=ca-toronto-1
   key_file=<path to your key>
   ```

8. **Save the fingerprint value** (e.g. `ab:cd:ef:12:34:56:...`) to your text file — you will need it in the next step

### 2.6 Configure OCI CLI

Now you will tell OCI CLI on your laptop how to authenticate.

1. Open **Git Bash**
2. Run:

   ```bash
   oci setup config
   ```

3. Answer each prompt exactly as shown:

   | Prompt | What to enter |
   | --- | --- |
   | Enter a location for your config | Press **Enter** (uses default `~/.oci/config`) |
   | Enter a user OCID | Paste your User OCID from step 2.4 |
   | Enter a tenancy OCID | Paste your Tenancy OCID from step 2.3 |
   | Enter a region | Type `ca-toronto-1` |
   | Do you want to generate a new API Signing RSA key pair? | Type `n` then Enter — you already generated one in step 2.5 |
   | Enter the location of your private key file | Paste the full path to `oci_private_key.pem`, e.g. `/c/Users/mohit/.oci/oci_private_key.pem` (use forward slashes in Git Bash) |

4. Verify OCI CLI works:

   ```bash
   oci iam region list
   ```

   You should see a list of OCI regions including `ca-toronto-1`. If you see an authentication error, double-check:
   - The key file path uses forward slashes
   - You copied the OCID values without extra spaces
   - The private key file is the one you downloaded in step 2.5

### 2.7 Enable Cloud Guard (Manual Console Step)

Cloud Guard is Oracle's security monitoring service. It must be enabled manually the first time.

1. In the OCI Console, click the **hamburger menu** (three horizontal lines, top-left)
2. Go to **Security → Cloud Guard**
3. Click **Enable Cloud Guard**
4. Set **Reporting Region** to `Canada Southeast (ca-toronto-1)`
5. Click **Enable**

This takes about 2 minutes. You can continue to Part 3 while it enables.

---

## Part 3 — Cloudflare Setup

FamilyShield uses Cloudflare to manage DNS for `everythingcloud.ca` and to create a secure outbound-only tunnel to the OCI VM — no firewall ports are ever opened.

> **Prerequisite:** You must own the domain `everythingcloud.ca`. If it is registered with GoDaddy, Namecheap, or another registrar, you will need to update the nameservers at your registrar to point to Cloudflare. Cloudflare's setup wizard walks you through this step by step.

### 3.1 Create a Cloudflare Account

1. Go to **cloudflare.com** and sign up for free
2. Click **Add a Site** and enter `everythingcloud.ca`
3. Select the **Free plan**
4. Cloudflare scans your existing DNS records and imports them
5. Cloudflare gives you two nameserver addresses (e.g. `adam.ns.cloudflare.com`)
6. Log in to your domain registrar (e.g. GoDaddy) and update the nameservers to the two Cloudflare values
7. Click **Done, check nameservers** in Cloudflare
8. Wait for Cloudflare to verify — this can take a few minutes to a few hours depending on your registrar. Cloudflare emails you when done and shows a green **Active** badge

### 3.2 Find Your Account ID and Zone ID

1. Log in to **dash.cloudflare.com**
2. Click on your domain **everythingcloud.ca**
3. Scroll down the right sidebar — you will see:
   - **Zone ID** — 32-character hex string
   - **Account ID** — 32-character hex string
4. Click the copy icon next to each and save them in your text file

### 3.3 Create a Cloudflare API Token

The API token allows OpenTofu to configure Cloudflare automatically during deploys.
FamilyShield requires **three** Cloudflare permissions — do NOT use a template, as templates only grant DNS access.

1. Go to **dash.cloudflare.com/profile/api-tokens**
2. Click **Create Token**
3. Click **Create Custom Token** (do NOT use a template — templates lack Tunnel and Access scopes)
4. Name the token: `familyshield-deploy`
5. Add three permissions:
   - **Zone | DNS | Edit** → Include → Specific zone → `everythingcloud.ca`
   - **Account | Cloudflare Tunnel | Edit** → Include → All accounts
   - **Account | Access: Apps and Policies | Edit** → Include → All accounts
6. Click **Continue to summary → Create Token**
7. **Copy the token now** — it is only shown once and cannot be retrieved later
8. Save it in your text file

---

## Part 4 — Supabase Setup

Supabase is the PostgreSQL database that stores all activity logs, alerts, child profiles, and parental rules.

### 4.1 Create a Supabase Account

1. Go to **supabase.com**
2. Click **Start your project**
3. Sign up using GitHub login (easier — avoids another password)

### 4.2 Create the Dev Project

1. Click **New Project**
2. Fill in:
   - **Organisation:** your personal org (created automatically)
   - **Name:** `familyshield-dev`
   - **Database Password:** choose a strong password and save it in your text file — you will need this if you ever connect directly to the database
   - **Region:** `Canada (Central)` — closest to Toronto
3. Click **Create new project**
4. Wait about 2 minutes — Supabase shows a loading screen while provisioning

### 4.3 Get Your API Credentials

1. In your project, click **Settings** (gear icon) in the left sidebar
2. Click **API**
3. Copy and save to your text file:
   - **Project URL** — looks like `https://abcdefghijklm.supabase.co`
   - **Service Role Key** — the long JWT string under "Project API keys" → `service_role` (NOT `anon public`, which is deprecated)

**Why Service Role Key?** The anon public key is no longer recommended by Supabase. The Service Role Key is more secure for server-side operations like your enrichment worker and API.

---

## Part 5 — API Keys

### 5.1 Groq API Key (free — primary AI engine)

Groq classifies the content your child visits. Free tier is 500,000 tokens/day — far more than a family needs.

1. Go to **console.groq.com**
2. Sign up for a free account
3. Click **API Keys** in the left menu
4. Click **Create API Key**
5. Name it `familyshield`
6. Copy and save the key — it starts with `gsk_`

### 5.2 Anthropic API Key (fallback — ~$0.02 CAD/month)

Anthropic is only used when Groq is unavailable (rare).

1. Go to **console.anthropic.com**
2. Sign up for an account
3. Go to **Settings → API Keys → Create Key**
4. Name it `familyshield`
5. Copy and save the key — it starts with `sk-ant-`

> You may need to add a small credit (e.g., $5 USD) to activate the API. At fallback usage levels, the monthly cost is under $0.02 CAD.

---

## Part 6 — Clone the Repository

1. Open **Git Bash**
2. Navigate to where you want to store the project, then:

   ```bash
   git clone https://github.com/Everythingcloudsolutions/FamilyShield.git
   cd FamilyShield
   ```

3. Open in VS Code:

   ```bash
   code FamilyShield.code-workspace
   ```

   Install recommended extensions when VS Code prompts you (bottom-right corner).

---

## Part 7 — Run the Bootstrap Script

You now have everything needed to run the bootstrap script. This script will:

- Verify OCI CLI is working
- Create a dedicated IAM user for GitHub Actions (`familyshield-github-actions`)
- Generate an API key pair for that user and upload the public key to OCI
- Create the Terraform state storage bucket (`familyshield-tfstate`)
- Find the correct Ubuntu 22.04 ARM64 image OCID for Toronto
- Generate an SSH key pair for VM access
- Print all the GitHub Secret values you need

Open **Git Bash**, navigate to the repo root, and run:

```bash
chmod +x scripts/bootstrap-oci.sh
bash scripts/bootstrap-oci.sh
```

The script will pause twice:

1. **"Enter your email address for the GitHub Actions service account:"** — Type the email you want to associate with the service user (e.g., your own email or `github-actions@example.com`)
2. **"Enable Cloud Guard now? (y/n, default: n)"** — Type `n` unless you already enabled Cloud Guard in part 2.7

At the end, the script prints a block like this:

```
════════════════════════════════════════════════════════
 FamilyShield OCI Bootstrap Complete!
════════════════════════════════════════════════════════

Add these as GitHub Repository Secrets:

  OCI_TENANCY_OCID    = ocid1.tenancy.oc1..aaaaaa...
  OCI_USER_OCID       = ocid1.user.oc1..aaaaaa...
  OCI_FINGERPRINT     = ab:cd:ef:12:34:56:...
  OCI_NAMESPACE       = your-namespace
  OCI_SSH_PUBLIC_KEY  = ssh-ed25519 AAAAC3Nza...
  ...
```

**Copy this entire block into your text file.** You will use these values in the next step.

---

## Part 7.1 — Generate AWS Credentials for Terraform Remote State

The Terraform state (a record of all deployed resources) needs to be stored in OCI Object Storage and persist across GitHub Actions workflow runs. To do this securely, we generate AWS-style credentials for the GitHub Actions user.

Open **Git Bash** and run:

```bash
# Replace <OCI_USER_OCID> with the OCI_USER_OCID from the bootstrap output above
oci iam customer-secret-key create \
  --user-id <OCI_USER_OCID> \
  --display-name "familyshield-github-terraform" \
  --query 'data.{access_key: key, secret_key: secret}' \
  --output table
```

You will see output like this:

```
+----------------------+----------------------------------------+
| access_key           | secret_key                             |
+----------------------+----------------------------------------+
| 1a2b3c4d5e6f7g8h9i0j | 1a2b3c4d5e6f7g8h9i0j1a2b3c4d5e6f7  |
+----------------------+----------------------------------------+
```

**Copy these two values into your text file — you will add them as GitHub secrets in the next step.**

> These are NOT the OCI API key from bootstrap-oci.sh. These are "Customer Secret Keys" used specifically for S3-compatible access to Object Storage.

---

## Part 8 — Add GitHub Secrets

Secrets are stored encrypted in GitHub and injected into workflows at deploy time. They never appear in code.

1. Go to your repo: **github.com/Everythingcloudsolutions/FamilyShield**
2. Click **Settings → Secrets and variables → Actions**
3. Click **New repository secret** for each secret below

### Secrets from the bootstrap script output

| Secret Name | Value |
|---|---|
| `OCI_TENANCY_OCID` | From bootstrap output |
| `OCI_USER_OCID` | From bootstrap output (the GitHub Actions user) |
| `OCI_FINGERPRINT` | From bootstrap output |
| `OCI_NAMESPACE` | From bootstrap output |
| `OCI_SSH_PUBLIC_KEY` | From bootstrap output |
| `OCI_PRIVATE_KEY` | Open `~/.oci/familyshield-github/private.pem` in a text editor, copy the entire file contents including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` |
| `OCI_SSH_PRIVATE_KEY` | Open `~/.ssh/familyshield` in a text editor, copy the entire file contents including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` |

> To open these files in Git Bash: `cat ~/.oci/familyshield-github/private.pem` — then select all and copy.

### Secrets from Part 7.1 (AWS Credentials for Terraform State)

| Secret Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | From Part 7.1 output — the `access_key` value |
| `AWS_SECRET_ACCESS_KEY` | From Part 7.1 output — the `secret_key` value |

> These enable GitHub Actions workflows to persist Terraform state in OCI Object Storage between runs.

### Secrets from your text file

| Secret Name | Where you saved it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Part 3.3 |
| `CLOUDFLARE_ZONE_ID` | Part 3.2 |
| `CLOUDFLARE_ACCOUNT_ID` | Part 3.2 |
| `SUPABASE_URL` | Part 4.3 |
| `SUPABASE_ANON_KEY` | Part 4.3 — use the **Service Role Key**, not the deprecated anon public key |
| `GROQ_API_KEY` | Part 5.1 |
| `ANTHROPIC_API_KEY` | Part 5.2 |
| `ADGUARD_ADMIN_PASSWORD` | Choose a strong password now (e.g. use a password manager). You will use this to log in to the AdGuard admin panel later. |

> **Supabase credential note:** The `SUPABASE_ANON_KEY` secret should contain the **Service Role Key** from Part 4.3, which is more secure than the deprecated anon public key. The secret name stays `SUPABASE_ANON_KEY` for backward compatibility with the codebase, but the value is the Service Role Key.

---

## Part 9 — Update the ARM Image OCID in Code

The bootstrap script printed a line like:

```
✅ Ubuntu 22.04 ARM image OCID: ocid1.image.oc1.ca-toronto-1.aaaaaa...
```

You need to put this value into the IaC code so OpenTofu knows which VM image to use.

1. Open `iac/variables.tf` in VS Code
2. Find the section:

   ```hcl
   variable "oci_ubuntu_arm_image_id" {
     description = "Ubuntu 22.04 ARM64 image OCID for ca-toronto-1"
     default     = "REPLACE_WITH_BOOTSTRAP_OUTPUT"
   }
   ```

3. Replace `REPLACE_WITH_BOOTSTRAP_OUTPUT` with the OCID from the bootstrap output
4. Save the file

---

## Part 10 — Configure GitHub Repository Settings

This script sets up branch protection on main, creates the dev/staging/prod deploy environments, and adds issue labels.

```bash
bash scripts/setup-github.sh
```

After it finishes, try to set up production protection:

1. Go to: **github.com/Everythingcloudsolutions/FamilyShield/settings/environments**
2. Click **prod**
3. Look for **Deployment protection rules** or **Required reviewers** section

**If you're on GitHub free tier** (no Pro):

- The "Required reviewers" feature is not available — it requires GitHub Pro
- **Workaround:** You can still manually approve prod deployments via GitHub Actions
  - When a workflow reaches the prod step, it will pause and ask for approval
  - Go to **Actions** tab → click the pending workflow → click **Approve and deploy**
- This provides the same protection without needing Pro tier

**If you're on GitHub Pro or higher:**

- The section will be visible; click it and add yourself as a required reviewer
- Code will be blocked from production until you approve via the UI

---

## Part 11 — Your First Deployment to the Cloud

You now have everything set up. This step will create the actual cloud server (VM) and all the services that run on it.

**What happens:**
1. You create a change in GitHub that includes the ARM image ID we found earlier
2. GitHub automatically checks the change (called `tofu plan`)
3. You review what will be created, then approve the change
4. GitHub automatically deploys everything to your dev environment
5. Within 5–10 minutes, your OCI cloud server is running

**Step-by-step:**

### Step 11.1 — Create a Pull Request

1. Open **GitHub Desktop** (or go to github.com/Everythingcloudsolutions/FamilyShield)

2. Click **Fetch origin** to get the latest code

3. Click **Create Branch** and name it: `feat/initial-setup`
   - Branch name doesn't matter — it's just for organizing your work

4. In the file explorer on your laptop, open:
   ```
   C:\Users\mohit.kumar.goyal\OneDrive - Accenture\Github\FamilyShield\iac\variables.tf
   ```

5. Find this line (around line 35):
   ```
   oci_ubuntu_arm_image_id = "ocid1.image.oc1.ca-toronto-1.aaaaaa...NOT_FOUND"
   ```

6. Replace `NOT_FOUND` with the image ID from your bootstrap output:
   ```
   oci_ubuntu_arm_image_id = "ocid1.image.oc1.ca-toronto-1.aaaaaaaawzbmdqqvrcLW4cvhegvnbbxtoday4bxlkdpqeowc5kcbrhpit2a"
   ```
   (Use **YOUR** ID from the bootstrap output, not this example)

7. **Save the file** (Ctrl+S)

8. Go back to **GitHub Desktop**:
   - It should show `iac/variables.tf` as changed
   - In the "Commit to" field at the bottom left, type:
     ```
     Add OCI ARM image ID for first deploy
     ```
   - Click **Commit to feat/initial-setup**

9. Click **Publish branch**

10. Click **Create Pull Request**
    - GitHub will open the pull request in your browser
    - Add a title: `Initial cloud deployment — add ARM image ID`
    - Click **Create pull request**

### Step 11.2 — Wait for GitHub to Check Your Change

1. You'll see a section that says "Checks running..." — **wait 1–2 minutes**

2. Once it finishes, you'll see a comment from **tofu-plan** that shows:
   - What will be created (OCI VM, networks, databases, etc.)
   - How many resources will be added (usually 20–30 items)
   - **This is safe to look at** — it's just a preview, nothing is deployed yet

3. Read through the changes (optional — you can skip this if you trust the setup)

### Step 11.3 — Approve and Deploy

1. Scroll down and click **Merge pull request**

2. Click **Confirm merge**

3. GitHub will now automatically start a **three-stage deployment**:

   **Stage 1 — Infrastructure (IaC):** `deploy-dev` workflow
   - Go to the **Actions** tab
   - You'll see a workflow running that says `deploy-dev`
   - **Wait 5–10 minutes** — it's creating your cloud server, networks, and storage
   - When finished, you'll see a green checkmark ✅

   **Stage 2 — Cloudflare Setup:** `deploy-cloudflare` workflow (automatic)
   - After `deploy-dev` succeeds, the `deploy-cloudflare` workflow runs automatically
   - This creates your Cloudflare tunnel, DNS records, and access applications
   - **Wait 2–3 minutes** — should complete quickly
   - When finished, you'll see a green checkmark ✅

   **Stage 3 — App Deployment:** `build-and-push` and `deploy-app-dev` workflows
   - Docker images are built and pushed to container registry
   - App containers are deployed to your cloud VM
   - **Wait 3–5 minutes** — services start
   - Smoke tests verify everything is healthy

4. **Total time:** 10–20 minutes for all three stages

5. Open the **deploy-dev** workflow details and scroll to the bottom — you'll see:
   ```
   Outputs
   vm_public_ip = 152.67.xxx.xxx
   ```
   - **Copy this IP address** — you'll use it in Part 12

> **What if deploy-cloudflare fails?**
> 
> The Cloudflare workflow can fail if:
> - The API token is missing scopes (must have Zone DNS + Tunnel + Access scopes — see Part 3.3)
> - The Cloudflare account ID or zone ID is wrong
> 
> To fix: Verify your credentials in GitHub Secrets, then re-run the `deploy-cloudflare` workflow manually from the Actions tab. No need to re-run the IaC stage.

**That's it!** Your cloud infrastructure is now live, Cloudflare is configured, and your apps are running.

---

## Part 12 — Log In to Your Cloud Server

Now your cloud server is running. This section shows you how to access it and see what's running inside.

**Why:** You need to connect to your VM to:

- Check that all services are running (AdGuard, Headscale, mitmproxy, etc.)
- View logs if something goes wrong
- Manage the system

**Two ways to access the server:**

- **Via terminal (Git Bash)** — for power users, command-line access
- **Via VS Code Remote SSH** — recommended, visual editor connected to the server

### Step 12.1 — Find Your Cloud Server's IP Address

1. Go to **github.com/Everythingcloudsolutions/FamilyShield/actions**

2. Click the **deploy-dev** workflow that just finished

3. Scroll to the bottom and look for:

   ```
   Outputs
   vm_public_ip = 152.67.xxx.xxx
   ```

4. **Copy that IP address** (e.g., `152.67.123.456`) — you'll use it in the next step

### Step 12.2 — Connect via Terminal (Git Bash)

**Easy 1-minute setup:**

1. Open **Git Bash** on your laptop

2. Copy and paste this command (replace `152.67.123.456` with YOUR IP):

   ```bash
   echo "Host familyshield-dev
     HostName 152.67.123.456
     User ubuntu
     IdentityFile ~/.ssh/familyshield
     ServerAliveInterval 60" >> ~/.ssh/config
   ```

3. Press **Enter**

4. Now test the connection:

   ```bash
   ssh familyshield-dev
   ```

5. You should see:

   ```
   Welcome to Ubuntu 22.04 LTS...
   ubuntu@familyshield-dev:~$
   ```

   **Congrats!** You're connected to your cloud server.

6. To see what's running, type:

   ```bash
   docker ps
   ```

   You'll see all 10 services: AdGuard, Headscale, mitmproxy, Redis, API, Node-RED, etc.

7. To exit, type:

   ```bash
   exit
   ```

### Step 12.3 — Connect via VS Code (Recommended for Development)

**This opens your cloud server inside VS Code — much easier to work with files:**

1. Open **VS Code** on your laptop

2. Install the **Remote - SSH** extension:
   - Click the **Extensions** icon (left sidebar)
   - Search: `Remote - SSH`
   - Click **Install**

3. Press `Ctrl+Shift+P` and type:

   ```text
   Remote-SSH: Connect to Host
   ```

4. Select **familyshield-dev** from the list
   - (If it doesn't appear, you can type: `ubuntu@152.67.123.456` and press Enter)

5. VS Code will open a new window connected to your server
   - The left sidebar shows files on your cloud server
   - You can edit, create, and manage files directly
   - **This is recommended** for development work

---

## What You Now Have

| Resource | How to access |
|---|---|
| OCI VM | `ssh familyshield-dev` in Git Bash |
| AdGuard Home (DNS admin) | `https://familyshield-dev.everythingcloud.ca/adguard` |
| Parent portal (dev) | `https://familyshield-dev.everythingcloud.ca` |
| Supabase database | supabase.com → familyshield-dev project |
| Grafana dashboards | `https://familyshield-dev.everythingcloud.ca/grafana` |
| GitHub Actions deploys | github.com/Everythingcloudsolutions/FamilyShield/actions |

All admin URLs are behind Cloudflare Zero Trust — you log in with your Cloudflare-registered email.

---

## Troubleshooting

**`oci iam region list` fails with "Could not find config file"**
→ Re-run `oci setup config`. The config file should be at `~/.oci/config`.

**`oci iam region list` fails with "authentication error" or "401"**
→ The key file path may be wrong. In Git Bash run `cat ~/.oci/config` and check the `key_file=` line. Make sure the file exists at that exact path.

**`bash scripts/bootstrap-oci.sh` says "command not found: openssl"**
→ Git Bash includes openssl. Make sure you are running in Git Bash, not Windows Command Prompt.

**GitHub Actions tofu apply fails with "OCI auth error"**
→ The `OCI_PRIVATE_KEY` secret must contain the full PEM file including the `-----BEGIN RSA PRIVATE KEY-----` header and `-----END RSA PRIVATE KEY-----` footer.

**GitHub Actions tofu apply fails with "404-NotAuthorizedOrNotFound" on compartments or policies**
→ The GitHub Actions IAM user has no tenancy-level permissions. Re-run:
  ```bash
  bash scripts/bootstrap-oci.sh
  ```
  The script will skip existing resources (user, API key, bucket) and create only the missing
  bootstrap IAM policy (Step 6).
  
  **Manual alternative** in OCI Console: Identity → Policies → Create Policy (root compartment):
  - Name: `familyshield-bootstrap-policy`
  - Statement: `Allow any-user to manage all-resources in tenancy where request.user.id = '<OCI_USER_OCID>'`
  - Replace `<OCI_USER_OCID>` with your OCI_USER_OCID GitHub secret value

**Cloudflare Authentication error (10000) during deploy-cloudflare workflow**
→ The API token is missing required scopes. The "Edit zone DNS" template is NOT sufficient.
  FamilyShield requires **three** permissions:
  - **Zone → DNS → Edit** (for CNAME records)
  - **Account → Cloudflare Tunnel → Edit** (for Argo Tunnel creation)
  - **Account → Access: Apps and Policies → Edit** (for Zero Trust access applications)

  **To fix:**
  1. Log in to **dash.cloudflare.com/profile/api-tokens**
  2. Delete the old `familyshield-deploy` token
  3. Create a new **Custom Token** (NOT a template) with all three permissions
  4. Copy the new token
  5. Update the `CLOUDFLARE_API_TOKEN` GitHub secret with the new token
  6. In GitHub Actions, re-run the `deploy-cloudflare` workflow manually
  
  See Part 3.3 for detailed token creation steps.

**deploy-cloudflare workflow never starts after deploy-dev succeeds**
→ The workflow is triggered automatically only if the previous `deploy-dev` workflow completes successfully. Check:
  1. Go to Actions tab → find the `deploy-dev` workflow that just ran
  2. Click on it and scroll to bottom — look for green ✅ checkmark
  3. If it shows ✅, wait 1–2 minutes and refresh the Actions page
  4. The `deploy-cloudflare` workflow should appear
  
  If `deploy-dev` failed or was cancelled, manually trigger `deploy-cloudflare`:
  1. Go to Actions tab → search for `Deploy → Cloudflare` workflow
  2. Click **Run workflow** → select environment (dev) and action (setup)
  3. Click **Run workflow**

**deploy-cloudflare fails with "Tunnel not found" or "DNS record already exists"**
→ This can happen if:
  - A previous deployment partially completed
  - Manual resources exist in Cloudflare
  
  **To fix:** Run the cleanup workflow first, then re-run deploy-cloudflare:
  1. Go to Actions tab → search for `Cleanup → Cloudflare` workflow
  2. Click **Run workflow** → select environment (dev)
  3. Click **Run workflow** — wait for it to complete
  4. Then re-run `deploy-cloudflare` as described above

**Portal or admin URLs not accessible after deployment**
→ Verify that the Cloudflare tunnel is running:
  1. Log in to **dash.cloudflare.com**
  2. Go to Tunnels (in the left sidebar under Access)
  3. Look for `familyshield-dev` tunnel
  4. Click it → should show **HEALTHY** status
  5. If status is **DISCONNECTED**, the mitmproxy tunnel client hasn't connected yet (VM still booting)
  6. Wait 2–3 minutes and refresh

**Supabase project shows "Project is paused"**
→ Free tier projects pause after 7 days of inactivity. Log in to supabase.com and click **Restore project**. Takes about 1 minute.

**nameservers not propagating to Cloudflare**
→ DNS propagation can take up to 48 hours. Check progress at **whatsmydns.net** — search for `everythingcloud.ca` as NS records. Cloudflare emails you when it detects the change.

---

## Next Steps After Setup

See [docs/developer-guide/README.md](docs/developer-guide/README.md) for the daily development workflow, how to enrol child devices, and how to work with each service.

---

FamilyShield · Everythingcloudsolutions · Canada · 2026
