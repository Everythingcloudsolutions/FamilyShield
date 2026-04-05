###############################################################################
# Module: supabase
# Creates Supabase project and applies SQL migrations
# Note: Supabase Terraform provider manages project-level resources
# Schema migrations are applied via the supabase CLI in CI/CD
###############################################################################

terraform {
  required_providers {
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

# Supabase project (one per environment)
resource "supabase_project" "familyshield" {
  organization_id   = var.supabase_org_id
  name              = "familyshield-${var.environment}"
  database_password = var.db_password
  region            = "ca-central-1" # Closest Supabase region to Toronto

  lifecycle {
    # Prevent accidental deletion — Supabase projects are hard to restore
    prevent_destroy = true
  }
}
