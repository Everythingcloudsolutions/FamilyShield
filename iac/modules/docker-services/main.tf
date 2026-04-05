###############################################################################
# Module: docker-services
# Renders docker-compose.yml from template and manages service configuration
###############################################################################

# Render docker-compose from template
resource "local_file" "docker_compose" {
  filename = "${path.root}/../docker-compose.${var.environment}.yml"
  content  = templatefile("${path.root}/templates/docker-compose.yaml.tpl", {
    environment      = var.environment
    supabase_url     = var.supabase_url
    supabase_anon_key = var.supabase_anon_key
    groq_api_key     = var.groq_api_key
    anthropic_api_key = var.anthropic_api_key
    tunnel_token     = var.tunnel_token
  })
  file_permission = "0644"
}
