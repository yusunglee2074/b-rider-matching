# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

B-Rider는 배민 라이더 배차 서비스로, **하이브리드 아키텍처**를 채택한 5년차 백엔드 개발자 포트폴리오 프로젝트입니다.

**아키텍처 전략:**
- Modular Monolith + 선택적 Microservice 분리
- 강한 결합 도메인(Rider, Delivery, Offer, Store) → Core Service로 통합
- 독립 스케일링 필요 서비스(Location, Notification) → 별도 분리

**Core Technical Challenges:**
- 40k TPS 위치 업데이트 (Redis Geohashing)
- 중복 배차 방지 (Distributed Lock)
- 비동기 알림 처리 (BullMQ + Redis)
- 고성능 내부 통신 (gRPC)

---

## Service-Specific Documentation

각 서비스별 상세 가이드는 해당 디렉토리의 CLAUDE.md를 참조하세요:

| Service | Path | 책임 |
|---------|------|------|
| API Gateway | `apps/api-gateway/CLAUDE.md` | JWT 인증, Rate Limiting, 프록시 |
| Core Service | `apps/core-service/CLAUDE.md` | Rider, Delivery, Offer, Store 모듈 |
| Location Service | `apps/location-service/CLAUDE.md` | 위치 업데이트, 근처 라이더 검색 |
| Notification Worker | `apps/notification-worker/CLAUDE.md` | 푸시 알림, SMS 발송 |

**병렬 개발 시**: 각 서비스 디렉토리에서 Claude Code를 실행하면 해당 서비스의 CLAUDE.md가 우선 적용됩니다.

---

## Architecture

### Service Overview

```
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│    API Gateway      │  │ Location Service │  │   Notification Worker   │
│    (HTTP/REST)      │  │   (gRPC + HTTP)  │  │   (BullMQ Consumer)     │
│    Port: 3000       │  │ HTTP:3003/gRPC:5003│ │                         │
└─────────────────────┘  └─────────────────┘  └─────────────────────────┘
          │                       ▲                       ▲
          │ HTTP                  │ gRPC                  │ BullMQ
          ▼                       │                       │
┌─────────────────────────────────┴───────────────────────┴───────────────┐
│                        Core Service (Modular Monolith)                   │
│                              Port: 3001                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐             │
│  │  Rider   │   │ Delivery │   │  Offer   │   │  Store   │             │
│  │  Module  │   │  Module  │   │  Module  │   │  Module  │             │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Communication Protocols

| Route | Protocol | Rationale |
|-------|----------|-----------|
| Client → API Gateway | HTTP/REST | 클라이언트 호환성 |
| API Gateway → Core Service | HTTP | 단순함, 디버깅 용이 |
| Core Service → Location | **gRPC** | 고빈도 호출, 저지연 |
| Rider App → Location | HTTP | 위치 업데이트 (단방향) |
| Core Service → Notification | **BullMQ** | 비동기, 재시도/백오프 내장, Redis 통합 |

### Port Assignments

| Service | HTTP Port | gRPC Port |
|---------|-----------|-----------|
| API Gateway | 3000 | - |
| Core Service | 3001 | - |
| Location Service | 3003 | 5003 |
| Notification Worker | - | - |

---

## Development Commands

### Quick Start (Development)

```bash
# 전체 서비스 실행 (hot reload)
npm run dev

# 상태 확인
pm2 status

# 로그 확인
npm run dev:logs

# 종료
npm run dev:stop
```

### Building

```bash
npm run build:all                    # 전체 빌드
nest build api-gateway               # 개별 빌드
```

### Testing

```bash
npm test                             # 전체 테스트
npm run test -- apps/core-service    # 서비스별 테스트
npm run test:e2e                     # E2E 테스트
```

### Code Quality

```bash
npm run lint
npm run format
```

### Production (PM2)

```bash
npm run build:all && npm run pm2:start
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/brider

# Redis (Cache, Lock, Geohash, BullMQ)
REDIS_URL=redis://localhost:6379

# gRPC
LOCATION_GRPC_URL=localhost:5003

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=3600

# Service URLs
CORE_SERVICE_URL=http://localhost:3001
LOCATION_SERVICE_URL=http://localhost:3003
```

---

## Project Structure

```
b-rider/
├── apps/
│   ├── api-gateway/              # HTTP REST API (CLAUDE.md 포함)
│   ├── core-service/             # Modular Monolith (CLAUDE.md 포함)
│   ├── location-service/         # gRPC + HTTP (CLAUDE.md 포함)
│   └── notification-worker/      # BullMQ Consumer (CLAUDE.md 포함)
│
├── libs/
│   ├── common/                   # 공유 유틸리티, DTO, 데코레이터
│   ├── database/                 # TypeORM entities, migrations
│   └── proto/                    # 공유 Proto 파일 (원본)
│
├── infrastructure/
│   ├── terraform/                # AWS IaC
│   └── docker/
│       └── docker-compose.yml
│
├── dev/
│   ├── active/                   # 진행 중인 태스크 문서
│   └── done/                     # 완료된 태스크 문서
│
├── docs/
│   └── adr/                      # Architecture Decision Records
│
├── ecosystem.config.js           # PM2 production
├── ecosystem.dev.config.js       # PM2 development (hot reload)
└── package.json
```

---

## Data Flow

### 1. Rider Location Update

```
Rider App → API Gateway → Location Service → Redis GEOADD
                              (HTTP)           (Geohash)
```

### 2. Auto Dispatch Matching

```
Delivery Created → Core Service (Offer Module)
                        │
                        ├──→ Location Service (gRPC) → 근처 라이더 검색
                        │
                        ├──→ Redis Lock → 중복 배차 방지
                        │
                        └──→ BullMQ add('notification')
                                    │
                                    ▼
                        Notification Worker → FCM Push
```

### 3. Offer Accept/Reject

```
Rider App → API Gateway → Core Service (Offer Module)
                               │
                               ├──→ Redis Lock 확인
                               │
                               ├──→ DB 상태 업데이트
                               │
                               └──→ BullMQ add('notification')
```

---

## Debugging Guide

### AI Agent Log Access

```bash
# PM2 dev mode logs (recommended)
pm2 logs api-gateway-dev --lines 100 --nostream
pm2 logs core-service-dev --lines 100 --nostream
pm2 logs location-service-dev --lines 100 --nostream
pm2 logs notification-worker-dev --lines 100 --nostream

# Error logs only
pm2 logs <service>-dev --lines 100 --nostream --err

# Direct log file access
cat ~/.pm2/logs/<service>-dev-out.log | tail -100
```

### Common Issues

```bash
# Port 충돌 확인
lsof -i :3000 && lsof -i :3001 && lsof -i :3003

# Redis 연결 확인
redis-cli ping

# gRPC 서비스 확인
grpcurl -plaintext localhost:5003 list

# BullMQ 큐 상태
redis-cli LLEN bull:notification:wait
```

---

## Important Constraints

1. **Hybrid Architecture**: Core Service는 Modular Monolith, Location/Notification은 별도 서비스

2. **Communication**:
   - 외부 → 내부: HTTP
   - Core → Location: gRPC
   - Core → Notification: BullMQ (Redis)

3. **Consistency**: 배차 매칭은 분산 락 필수 (중복 배차 방지)

4. **Proto Files**: `libs/proto/`에서 관리, 각 서비스로 복사

5. **Functional Requirements**:
   - 라이더 배차 수락/거절: 10초 제한
   - 라이더 픽업 전 취소 가능
   - 어드민 수동 배차 취소/재할당

6. **Non-Functional Requirements**:
   - 배차 매칭: 강한 일관성
   - 기타 기능: 가용성 우선
   - Stateless: 상태는 Redis/PostgreSQL에 저장

---

## Task Management (Dev Docs)

대규모 기능 개발 시 컨텍스트 유지를 위한 문서화 시스템입니다.

### Starting Large Tasks

```bash
mkdir -p dev/active/[task-name]/
```

Create:
- `[task-name]-plan.md` - 승인된 계획
- `[task-name]-context.md` - 핵심 파일, 결정 사항
- `[task-name]-tasks.md` - 작업 체크리스트

### Continuing Tasks

- `dev/active/` 디렉토리에서 기존 태스크 확인
- 작업 전 세 파일 모두 읽기
- "Last Updated" 타임스탬프 갱신

---

## Development Notes

- 프로젝트는 포트폴리오용으로 설계됨
- 면접 질문 대비: 서비스 분리 기준, 프로토콜 선택 근거 숙지 필요
- ADR(Architecture Decision Records)는 `docs/adr/` 참조
