# FamilyShield — Setup Guide

> **Who this is for:** Anyone setting up FamilyShield for the first time, including people with no prior Oracle Cloud experience.
> **Time needed:** About 2 hours the first time.
> **Cost:** $0 CAD/month — this guide uses Always Free tiers throughout.
> **Last updated:** 2026-04-05

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

1. Go to **dash.cloudflare.com/profile/api-tokens**
2. Click **Create Token**
3. Click **Use template** next to **Edit zone DNS**
4. Under **Zone Resources**, change "All zones" to:
   - `Include → Specific zone → everythingcloud.ca`
5. Click **Continue to summary → Create Token**
6. **Copy the token now** — it is only shown once and cannot be retrieved later
7. Save it in your text file

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

## Part 11 — First Deploy

Everything is now configured. Create a branch, push your change, and open a pull request:

```bash
git checkout -b feat/initial-setup
git add iac/variables.tf
git commit -m "iac: set OCI ARM image OCID for ca-toronto-1"
git push --set-upstream origin feat/initial-setup
```

1. Go to **github.com/Everythingcloudsolutions/FamilyShield** and open the pull request
2. GitHub Actions will run `tofu plan` and post the planned changes as a comment on the PR — review it to see exactly what will be created
3. Merge the PR
4. GitHub Actions automatically runs `tofu apply` and deploys to dev

The deploy takes about 5–10 minutes. When it finishes, you will see the VM's IP address in the Actions log under `tofu output`.

---

## Part 12 — Connect to Your VM via SSH

1. Copy the VM's IP address from the GitHub Actions log

2. Open `C:\Users\mohit\.ssh\config` in a text editor (create it if it does not exist) and add:

   ```text
   Host familyshield-dev
     HostName       <PASTE_VM_IP_HERE>
     User           ubuntu
     IdentityFile   ~/.ssh/familyshield
     ServerAliveInterval 60
   ```

3. Test the connection in Git Bash:

   ```bash
   ssh familyshield-dev
   ```

   You should see the Ubuntu welcome message.

4. For VS Code Remote SSH access (recommended for development):
   - Press `Ctrl+Shift+P` in VS Code
   - Type: `Remote-SSH: Connect to Host`
   - Select `familyshield-dev`
   - VS Code will open a new window connected to the VM

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

**Cloudflare API error during tofu apply**
→ Check the `CLOUDFLARE_API_TOKEN` secret has "Edit zone DNS" permission scoped to `everythingcloud.ca`.

**Supabase project shows "Project is paused"**
→ Free tier projects pause after 7 days of inactivity. Log in to supabase.com and click **Restore project**. Takes about 1 minute.

**nameservers not propagating to Cloudflare**
→ DNS propagation can take up to 48 hours. Check progress at **whatsmydns.net** — search for `everythingcloud.ca` as NS records. Cloudflare emails you when it detects the change.

---

## Next Steps After Setup

See [docs/developer-guide/README.md](docs/developer-guide/README.md) for the daily development workflow, how to enrol child devices, and how to work with each service.

---

FamilyShield · Everythingcloudsolutions · Canada · 2026
