variable "supabase_org_id" {
  type = string
}

variable "environment" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

output "project_id" {
  value = supabase_project.familyshield.id
}

output "api_url" {
  value = "https://${supabase_project.familyshield.id}.supabase.co"
}
