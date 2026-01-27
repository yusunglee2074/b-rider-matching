output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "alb_dns_name" {
  description = "ALB DNS name"
  value       = module.alb.alb_dns_name
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.elasticache.endpoint
}

output "ecr_repository_urls" {
  description = "ECR repository URLs"
  value = {
    api_gateway         = module.ecs.ecr_urls["api-gateway"]
    core_service        = module.ecs.ecr_urls["core-service"]
    location_service    = module.ecs.ecr_urls["location-service"]
    notification_worker = module.ecs.ecr_urls["notification-worker"]
  }
}
