# B-Rider 개발 환경 셋업 가이드

## 목차

1. [필수 요구사항](#필수-요구사항)
2. [로컬 개발 환경 (Docker)](#로컬-개발-환경-docker)
3. [AWS 개발 환경](#aws-개발-환경)
4. [환경별 구성 비교](#환경별-구성-비교)
5. [트러블슈팅](#트러블슈팅)

---

## 필수 요구사항

### 로컬 머신

| 도구 | 버전 | 설치 확인 |
|------|------|-----------|
| Node.js | 20.x LTS | `node -v` |
| npm | 10.x | `npm -v` |
| Docker | 24.x+ | `docker -v` |
| Docker Compose | 2.x+ | `docker compose version` |
| PM2 | 5.x | `pm2 -v` |
| Git | 2.x | `git -v` |

### 설치 (macOS)

```bash
# Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js (nvm 권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Docker Desktop
brew install --cask docker

# PM2
npm install -g pm2

# gRPC 디버깅 도구 (선택)
brew install grpcurl
```

---

## 로컬 개발 환경 (Docker)

### 1. 인프라 서비스 실행

```bash
# 프로젝트 루트에서
cd infrastructure/docker

# PostgreSQL + Redis 실행
docker compose up -d

# 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f
```

### 2. 환경 변수 설정

```bash
# 프로젝트 루트에서
cp .env.example .env

# .env 파일 수정 (필요시)
```

### 3. 애플리케이션 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행 (PM2 + hot reload)
npm run dev

# 상태 확인
pm2 status

# 로그 확인
npm run dev:logs
```

### 4. 서비스 접속 정보

| 서비스 | URL | 용도 |
|--------|-----|------|
| API Gateway | http://localhost:3000 | REST API 엔드포인트 |
| Core Service | http://localhost:3001 | 내부 서비스 |
| Location Service | http://localhost:3003 | HTTP 엔드포인트 |
| Location gRPC | localhost:5003 | gRPC 엔드포인트 |
| PostgreSQL | localhost:5432 | 데이터베이스 |
| Redis | localhost:6379 | 캐시/큐 |
| Redis Commander | http://localhost:8081 | Redis GUI (debug 모드) |

### 5. Redis Commander 사용 (선택)

```bash
# debug 프로필로 실행하면 Redis GUI 포함
docker compose --profile debug up -d
```

### 6. 종료

```bash
# 애플리케이션 종료
npm run dev:stop

# Docker 서비스 종료
cd infrastructure/docker
docker compose down

# 데이터 포함 완전 삭제
docker compose down -v
```

---

## AWS 개발 환경

> AWS 리소스는 비용이 발생합니다. 개발 완료 후 반드시 리소스를 정리하세요.

### 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        AWS Cloud                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   RDS       │  │ ElastiCache │  │      ECS/EC2        │  │
│  │ PostgreSQL  │  │   Redis     │  │   (App Services)    │  │
│  │  (db.t3.micro) │  │ (cache.t3.micro) │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Phase 1: 데이터베이스만 AWS 사용 (권장 시작점)

로컬에서 개발하면서 DB만 AWS RDS 사용:

#### 1-1. RDS PostgreSQL 생성

**AWS Console 방법:**

1. AWS Console → RDS → Create database
2. 설정:
   - Engine: PostgreSQL 16
   - Template: **Free tier** (db.t3.micro)
   - DB instance identifier: `brider-dev`
   - Master username: `brider`
   - Master password: (안전한 비밀번호 설정)
   - Public access: **Yes** (개발용)
   - VPC security group: 새로 생성 또는 기존 사용

3. Security Group 인바운드 규칙 추가:
   - Type: PostgreSQL
   - Port: 5432
   - Source: My IP (또는 개발 환경 IP)

**AWS CLI 방법:**

```bash
# Security Group 생성
aws ec2 create-security-group \
  --group-name brider-dev-rds-sg \
  --description "B-Rider Dev RDS Security Group"

# 인바운드 규칙 추가 (본인 IP로 변경)
aws ec2 authorize-security-group-ingress \
  --group-name brider-dev-rds-sg \
  --protocol tcp \
  --port 5432 \
  --cidr $(curl -s ifconfig.me)/32

# RDS 인스턴스 생성
aws rds create-db-instance \
  --db-instance-identifier brider-dev \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username brider \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxx
```

#### 1-2. 로컬 환경 변수 업데이트

```bash
# .env 파일 수정
DATABASE_URL=postgresql://brider:YOUR_PASSWORD@brider-dev.xxxxxxxx.ap-northeast-2.rds.amazonaws.com:5432/brider

# Redis는 로컬 유지
REDIS_URL=redis://localhost:6379
```

### Phase 2: Redis도 AWS 사용

#### 2-1. ElastiCache Redis 생성

**AWS Console 방법:**

1. AWS Console → ElastiCache → Create cluster
2. 설정:
   - Cluster engine: Redis
   - Location: AWS Cloud
   - Cluster mode: Disabled
   - Node type: **cache.t3.micro** (Free tier eligible)
   - Number of replicas: 0 (개발용)
   - Subnet group: 새로 생성
   - Security group: 새로 생성

> ⚠️ ElastiCache는 VPC 내부에서만 접근 가능합니다. 로컬에서 접근하려면 VPN 또는 Bastion Host가 필요합니다.

#### 2-2. Bastion Host를 통한 접근 (선택)

```bash
# SSH 터널링
ssh -i your-key.pem -L 6379:your-redis-endpoint:6379 ec2-user@bastion-ip

# 다른 터미널에서
redis-cli -h localhost -p 6379
```

### Phase 3: 전체 AWS 배포

> 이 단계는 프로덕션 준비 시 진행합니다.

- ECS Fargate 또는 EC2로 서비스 배포
- ALB (Application Load Balancer) 설정
- Route 53 도메인 연결
- ACM SSL 인증서

---

## 환경별 구성 비교

| 구성 요소 | 로컬 (Docker) | AWS Dev | AWS Prod |
|-----------|---------------|---------|----------|
| PostgreSQL | Docker | RDS (db.t3.micro) | RDS (db.r6g.large) |
| Redis | Docker | ElastiCache (t3.micro) | ElastiCache (r6g.large) |
| App Services | PM2 | ECS Fargate | ECS Fargate |
| 월 예상 비용 | $0 | ~$30-50 | ~$200+ |

### 비용 최적화 팁

1. **개발 시간에만 RDS 실행**: 사용하지 않을 때 RDS 중지 (최대 7일)
2. **Free Tier 활용**: 신규 계정 12개월간 db.t3.micro, cache.t3.micro 무료
3. **Spot Instance**: EC2 사용 시 Spot Instance로 70% 절감

---

## 트러블슈팅

### Docker 관련

```bash
# 포트 충돌 확인
lsof -i :5432
lsof -i :6379

# Docker 볼륨 정리
docker volume prune

# 컨테이너 재시작
docker compose restart postgres
```

### 데이터베이스 연결

```bash
# PostgreSQL 연결 테스트
psql postgresql://brider:brider_dev_password@localhost:5432/brider

# Docker 내부에서 테스트
docker exec -it brider-postgres psql -U brider -d brider
```

### Redis 연결

```bash
# Redis 연결 테스트
redis-cli -h localhost -p 6379 ping

# Redis 상태 확인
redis-cli info
```

### AWS RDS 연결 실패

1. Security Group 인바운드 규칙 확인
2. Public accessibility 설정 확인
3. 본인 IP가 변경되었는지 확인 (동적 IP인 경우)

```bash
# 현재 IP 확인
curl ifconfig.me
```

---

## 다음 단계

1. [ ] 로컬 Docker 환경 구성 완료
2. [ ] TypeORM 마이그레이션 설정
3. [ ] AWS RDS 생성 (선택)
4. [ ] CI/CD 파이프라인 구성
5. [ ] Terraform IaC 작성
