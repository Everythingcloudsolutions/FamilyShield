# FamilyShield — Setup Checklist

Follow these steps in order after cloning the repo.

---

## Step 1 — Open in VS Code

```
File → Open Workspace from File → FamilyShield.code-workspace
```

Install recommended extensions when prompted.

---

## Step 2 — OCI Account Bootstrap (run once)

```bash
chmod +x scripts/bootstrap-oci.sh
bash scripts/bootstrap-oci.sh
```

This generates:
- GitHub Actions IAM user + API key
- SSH key pair for VM access
- Terraform state Object Storage bucket
- Prints all GitHub Secret values

---

## Step 3 — GitHub Repository Setup (run once)

```bash
gh auth login   # if not already authenticated
bash scripts/setup-github.sh
```

Then manually add the required reviewer to the `prod` environment:
**Settings → Environments → prod → Required reviewers → add yourself**

---

## Step 4 — Add GitHub Secrets

Go to: `Settings → Secrets and variables → Actions → New repository secret`

Copy values from the bootstrap-oci.sh output. Required secrets:

| Secret | Source |
|---|---|
| `OCI_TENANCY_OCID` | bootstrap output |
| `OCI_USER_OCID` | bootstrap output |
| `OCI_FINGERPRINT` | bootstrap output |
| `OCI_PRIVATE_KEY` | `~/.oci/familyshield-github/private.pem` |
| `OCI_NAMESPACE` | bootstrap output |
| `OCI_SSH_PUBLIC_KEY` | `~/.ssh/familyshield.pub` |
| `OCI_SSH_PRIVATE_KEY` | `~/.ssh/familyshield` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard |
| `CLOUDFLARE_ZONE_ID` | Cloudflare → everythingcloud.ca |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard |
| `ADGUARD_ADMIN_PASSWORD` | Choose a strong password |
| `SUPABASE_URL` | Supabase project settings |
| `SUPABASE_ANON_KEY` | Supabase project settings |
| `GROQ_API_KEY` | console.groq.com |
| `ANTHROPIC_API_KEY` | console.anthropic.com |

---

## Step 5 — Update ARM Image OCID

Edit `iac/variables.tf` — find the `oci_ubuntu_arm_image_id` variable and replace the default with the OCID printed by bootstrap-oci.sh.

---

## Step 6 — First Deploy

```bash
git checkout -b feat/phase-1-bootstrap
git add .
git commit -m "feat: initial scaffold — Phase 1 IaC"
git push origin feat/phase-1-bootstrap
# Open PR → review tofu plan comment → merge
# GitHub Actions auto-deploys to dev
```

---

## Step 7 — Connect VS Code to OCI VM

After dev deploy succeeds, get the VM IP from the GitHub Actions output.

Add to `C:\Users\<you>\.ssh\config`:

```
Host familyshield-dev
    HostName       <VM_IP>
    User           ubuntu
    IdentityFile   ~/.ssh/familyshield
    ServerAliveInterval 60
```

Then: `Ctrl+Shift+P → Remote-SSH: Connect to Host → familyshield-dev`

---

## What's Deployed After Step 6

| Service | URL |
|---|---|
| Portal | https://familyshield-dev.everythingcloud.ca |
| AdGuard Admin | https://adguard-dev.everythingcloud.ca |
| Grafana | https://grafana-dev.everythingcloud.ca |

All admin URLs are behind Cloudflare Zero Trust — login with your email.

---

## What to Build Next (Phase 1 → Phase 2)

See [docs/developer-guide/README.md](docs/developer-guide/README.md)
