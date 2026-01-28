# B-Rider Infrastructure - Terraform

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment after creating S3 bucket for state
  # backend "s3" {
  #   bucket         = "b-rider-terraform-state"
  #   key            = "dev/terraform.tfstate"
  #   region         = "ap-northeast-2"
  #   encrypt        = true
  #   dynamodb_table = "b-rider-terraform-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module
module "vpc" {
  source = "./modules/vpc"

  vpc_cidr     = var.vpc_cidr
  environment  = var.environment
  project_name = var.project_name
}

# ALB Module
module "alb" {
  source = "./modules/alb"

  vpc_id            = module.vpc.vpc_id
  public_subnet_ids = module.vpc.public_subnet_ids
  environment       = var.environment
  project_name      = var.project_name
}

# ECS Module
module "ecs" {
  source = "./modules/ecs"

  vpc_id                       = module.vpc.vpc_id
  private_subnet_ids           = module.vpc.private_subnet_ids
  environment                  = var.environment
  project_name                 = var.project_name
  alb_security_group_id        = module.alb.alb_security_group_id
  api_gateway_target_group_arn = module.alb.api_gateway_target_group_arn
  database_url                 = "postgresql://${var.db_username}:${var.db_password}@${module.rds.endpoint}/${module.rds.database_name}?sslmode=require"
  redis_url                    = module.elasticache.redis_url
  jwt_secret                   = var.jwt_secret
}

# RDS Module
module "rds" {
  source = "./modules/rds"

  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  environment           = var.environment
  project_name          = var.project_name
  db_username           = var.db_username
  db_password           = var.db_password
  ecs_security_group_id = module.ecs.ecs_security_group_id
}

# ElastiCache Module
module "elasticache" {
  source = "./modules/elasticache"

  vpc_id                = module.vpc.vpc_id
  private_subnet_ids    = module.vpc.private_subnet_ids
  environment           = var.environment
  project_name          = var.project_name
  ecs_security_group_id = module.ecs.ecs_security_group_id
}

# SPA Module (Demo Web)
module "spa" {
  source = "./modules/spa"

  project_name    = var.project_name
  environment     = var.environment
  api_domain_name = module.alb.alb_dns_name
}
