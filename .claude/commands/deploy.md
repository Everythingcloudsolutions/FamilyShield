# /deploy — Deploy FamilyShield Environment

Deploy a FamilyShield environment (dev / staging / prod) using OpenTofu.

## Steps

1. Ask the user which environment they want to deploy: **dev**, **staging**, or **prod**
2. Ask which action: **plan** (preview changes only) or **apply** (deploy changes)
3. For **prod** environment + **apply**: display a prominent warning and ask for explicit confirmation with the word "CONFIRM"
4. Navigate to `iac/` directory
5. Run `tofu init -backend-config=environments/{env}/backend.tfvars` if `.terraform/` doesn't exist
6. Run `tofu plan -var-file=environments/{env}/terraform.tfvars -out=/tmp/familyshield-{env}.tfplan`
7. Parse and display the plan summary (resources to add/change/destroy)
8. If action is **plan only**: stop here and show the summary
9. If action is **apply**: show the plan, ask for final confirmation, then run:
   `tofu apply /tmp/familyshield-{env}.tfplan`
10. On success: show key outputs (`vm_public_ip`, `portal_url`, `adguard_url`)
11. On failure: show the error and suggest next steps

## Safety rules

- Never skip the plan step — always show what will change
- For prod: require the word "CONFIRM" typed explicitly before applying
- If plan shows more than 5 resources being destroyed, pause and ask the user to review carefully
- Never pass `-auto-approve` unless the user explicitly asks

## Environment URLs after deploy

- dev: https://familyshield-dev.everythingcloud.ca
- staging: https://familyshield-staging.everythingcloud.ca
- prod: https://familyshield.everythingcloud.ca

## Required environment variables

Ensure these are set before running:
- `OCI_TENANCY_OCID`
- `OCI_USER_OCID`
- `OCI_FINGERPRINT`
- `OCI_PRIVATE_KEY` (path to private key file)
- `CLOUDFLARE_API_TOKEN`
- `TF_VAR_supabase_url` / `TF_VAR_supabase_anon_key`
