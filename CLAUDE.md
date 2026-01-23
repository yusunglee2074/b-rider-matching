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

### Service Separation Rationale

| Service | Type | 분리 이유 |
|---------|------|----------|
| Location | Microservice | 40k TPS, Redis 전용, gRPC |
| Notification | Worker | 비동기, 외부 API, 실패 격리, BullMQ |
| Rider/Delivery/Offer/Store | Modular Monolith | 강한 결합, 트랜잭션 공유 |

---

## Development Commands

### Building

```bash
# Build all services
npm run build

# Build specific service
nest build api-gateway
nest build core-service
nest build location-service
nest build notification-worker
```

### Running Services

#### Docker Compose (Recommended for Local Dev)

```bash
# Start all infrastructure + services
docker-compose -f infrastructure/docker/docker-compose.yml up -d

# View logs
docker-compose logs -f api-gateway
docker-compose logs -f core-service
```

#### PM2 Process Management

```bash
# Start all services
npm run pm2:start

# View status
pm2 status

# View logs
pm2 logs api-gateway --lines 100 --nostream
pm2 logs core-service --lines 100 --nostream
pm2 logs location-service --lines 100 --nostream

# Restart
pm2 restart all
```

#### Nest CLI (Single Service Development)

```bash
nest start api-gateway --watch
nest start core-service --watch
nest start location-service --watch
```

### Code Quality

```bash
npm run lint                 # Run ESLint
npm run format              # Format with Prettier
npm run lint:fix            # Fix linting issues
```

### Testing

```bash
npm test                    # Run all unit tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests
```

---

## Service Configuration

### Port Assignments

| Service | HTTP Port | gRPC Port | Description |
|---------|-----------|-----------|-------------|
| API Gateway | 3000 | - | JWT 인증, Rate Limiting, Routing |
| Core Service | 3001 | - | Rider, Delivery, Offer, Store 모듈 |
| Location Service | 3003 | 5003 | Redis Geohash, 위치 검색 |
| Notification Worker | - | - | BullMQ Consumer, Push 알림 |

### Environment Variables

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

# Service URLs (for HTTP communication)
CORE_SERVICE_URL=http://localhost:3001
LOCATION_SERVICE_URL=http://localhost:3003
```

---

## Project Structure

```
b-rider/
├── apps/
│   ├── api-gateway/              # HTTP REST API
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── auth/             # JWT 인증
│   │   │   └── proxy/            # Core Service 프록시
│   │   └── Dockerfile
│   │
│   ├── core-service/             # Modular Monolith
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── rider/            # Rider Module
│   │   │   ├── delivery/         # Delivery Module
│   │   │   ├── offer/            # Offer Module (분산 락)
│   │   │   ├── store/            # Store Module
│   │   │   └── clients/
│   │   │       ├── location.grpc-client.ts
│   │   │       └── notification.queue-producer.ts
│   │   └── Dockerfile
│   │
│   ├── location-service/         # gRPC + HTTP Hybrid
│   │   ├── src/
│   │   │   ├── main.ts           # Hybrid (HTTP + gRPC)
│   │   │   ├── location.module.ts
│   │   │   ├── location.controller.ts      # HTTP endpoints
│   │   │   ├── location.grpc.controller.ts # gRPC handlers
│   │   │   └── location.service.ts         # Redis Geohash
│   │   ├── proto/
│   │   │   └── location.proto
│   │   └── Dockerfile
│   │
│   └── notification-worker/      # BullMQ Consumer
│       ├── src/
│       │   ├── main.ts
│       │   ├── notification.module.ts
│       │   └── processors/
│       │       ├── push.processor.ts
│       │       └── sms.processor.ts
│       └── Dockerfile
│
├── libs/
│   ├── common/                   # Shared utilities
│   │   ├── dto/
│   │   ├── decorators/
│   │   ├── filters/
│   │   └── interceptors/
│   ├── database/                 # TypeORM entities, migrations
│   └── proto/                    # Shared Proto files
│       └── location.proto
│
├── infrastructure/
│   ├── terraform/                # AWS IaC
│   │   ├── ecs/
│   │   ├── rds/
│   │   ├── elasticache/
│   │   └── msk/
│   └── docker/
│       └── docker-compose.yml    # Local development
│
├── dev/
│   ├── active/                   # Active task documentation
│   └── done/                     # Completed task documentation
│
├── docs/
│   └── adr/                      # Architecture Decision Records
│
├── ecosystem.config.js           # PM2 configuration
├── nest-cli.json
└── package.json
```

---

## Key Implementation Patterns

### 1. Location Service (gRPC + HTTP Hybrid)

```typescript
// apps/location-service/src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(LocationModule);

  // gRPC 서버 추가
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'location',
      protoPath: join(__dirname, '../proto/location.proto'),
      url: '0.0.0.0:5003',
    },
  });

  await app.startAllMicroservices();
  await app.listen(3003);
}
```

### 2. gRPC Client (Core Service)

```typescript
// apps/core-service/src/clients/location.grpc-client.ts
@Injectable()
export class LocationGrpcClient implements OnModuleInit {
  private locationService: LocationServiceClient;

  constructor(@Inject('LOCATION_PACKAGE') private client: ClientGrpc) {}

  onModuleInit() {
    this.locationService = this.client.getService('LocationService');
  }

  getNearbyRiders(lat: number, lng: number, radiusKm: number) {
    return this.locationService.getNearbyRiders({ lat, lng, radiusKm });
  }
}
```

### 3. BullMQ Producer/Consumer

```typescript
// Producer (Core Service)
@Injectable()
export class OfferService {
  constructor(@InjectQueue('notification') private notificationQueue: Queue) {}

  async assignOffer(offerId: string, riderId: string) {
    // ... business logic
    await this.notificationQueue.add('push', {
      type: 'OFFER_ASSIGNED',
      riderId,
      offerId,
    }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
}

// Consumer (Notification Worker)
@Processor('notification')
export class PushProcessor {
  @Process('push')
  async handlePush(job: Job<NotificationJobData>) {
    await this.fcmService.send(job.data.riderId, { title: '새 배차' });
  }
}
```

### 4. Distributed Lock (Redis)

```typescript
// libs/common/src/services/redis-lock.service.ts
@Injectable()
export class RedisLockService {
  async acquire(key: string, ttlMs: number = 10000): Promise<Lock | null> {
    const token = randomUUID();
    const result = await this.redis.set(`lock:${key}`, token, 'PX', ttlMs, 'NX');

    if (result !== 'OK') return null;

    return {
      release: async () => {
        // Lua script로 원자적 삭제
        await this.redis.eval(luaScript, 1, `lock:${key}`, token);
      }
    };
  }
}
```

---

## Debugging Guide

### Common Issues

#### 1. Service Won't Start

```bash
# Check port availability
lsof -i :3000
lsof -i :3001
lsof -i :3003

# Check Docker containers
docker-compose ps

# Check PM2 logs
pm2 logs <service-name> --lines 200 --err
```

#### 2. gRPC Connection Issues

```bash
# Test gRPC service
grpcurl -plaintext localhost:5003 list
grpcurl -plaintext localhost:5003 location.LocationService/GetNearbyRiders

# Check proto file sync
diff libs/proto/location.proto apps/location-service/proto/location.proto
```

#### 3. BullMQ Issues

```bash
# Check Redis connection
redis-cli ping

# Check queue status (using Bull Board or CLI)
# Install: npm install -g bull-cli
bull-cli --redis redis://localhost:6379

# Check failed jobs
redis-cli LRANGE bull:notification:failed 0 -1

# Check waiting jobs
redis-cli LLEN bull:notification:wait
```

#### 4. Redis/Distributed Lock Issues

```bash
# Check Redis
redis-cli ping

# Check locks
redis-cli GET "lock:offer:<offer_id>"
redis-cli TTL "lock:offer:<offer_id>"

# Clear stuck lock (dev only)
redis-cli DEL "lock:offer:<offer_id>"

# Test Geospatial
redis-cli GEOADD riders:locations 127.0 37.5 "rider_123"
redis-cli GEORADIUS riders:locations 127.0 37.5 5 km
```

### AI Agent Log Access

```bash
# PM2 logs (no streaming)
pm2 logs <service-name> --lines 100 --nostream

# Direct log file access
cat ~/.pm2/logs/api-gateway-out.log | tail -100
cat ~/.pm2/logs/core-service-error.log | tail -50

# Docker logs
docker-compose logs --tail=100 api-gateway
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

## Development Notes

- 프로젝트는 포트폴리오용으로 설계됨
- 면접 질문 대비: 서비스 분리 기준, 프로토콜 선택 근거 숙지 필요
- ADR(Architecture Decision Records)는 `docs/adr/` 참조
