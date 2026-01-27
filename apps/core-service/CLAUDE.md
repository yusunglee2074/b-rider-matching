# Core Service (Modular Monolith)

## 서비스 책임

핵심 비즈니스 로직을 담당하는 Modular Monolith입니다.

- **Rider Module**: 라이더 등록, 상태 관리
- **Delivery Module**: 배달 생성, 상태 관리
- **Offer Module**: 배차 매칭, 수락/거절 (분산 락)
- **Store Module**: 가맹점 관리

## 포트

| Protocol | Port |
|----------|------|
| HTTP | 3001 |

## 주요 파일

```
apps/core-service/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── rider/              # 라이더 모듈
│   │   ├── rider.module.ts
│   │   ├── rider.controller.ts
│   │   ├── rider.service.ts
│   │   └── entities/
│   ├── delivery/           # 배달 모듈
│   │   ├── delivery.module.ts
│   │   ├── delivery.controller.ts
│   │   ├── delivery.service.ts
│   │   └── entities/
│   ├── offer/              # 배차 모듈 (분산 락 사용)
│   │   ├── offer.module.ts
│   │   ├── offer.controller.ts
│   │   ├── offer.service.ts
│   │   └── entities/
│   ├── store/              # 가맹점 모듈
│   │   ├── store.module.ts
│   │   ├── store.controller.ts
│   │   ├── store.service.ts
│   │   └── entities/
│   └── clients/
│       ├── location.grpc-client.ts      # Location Service gRPC 클라이언트
│       └── notification.queue-producer.ts # BullMQ Producer
└── test/
```

## 의존 서비스

| Service | Protocol | 용도 |
|---------|----------|------|
| Location Service | gRPC (5003) | 근처 라이더 검색 |
| Notification Worker | BullMQ (Redis) | 푸시 알림 발송 |
| PostgreSQL | TCP (5432) | 데이터 저장 |
| Redis | TCP (6379) | 분산 락, 캐시 |

## 수정 금지 영역

- `apps/api-gateway/` - API Gateway 담당
- `apps/location-service/` - Location Service 담당
- `apps/notification-worker/` - Notification Worker 담당

## 공유 라이브러리 사용

```typescript
// libs/common 사용 예시
import { RedisLockService } from '@app/common/services/redis-lock.service';
import { CreateDeliveryDto } from '@app/common/dto';
```

## 개발 명령어

```bash
# 이 서비스만 실행 (hot reload)
nest start core-service --watch

# 로그 확인 (PM2 dev 모드 실행 중일 때)
pm2 logs core-service-dev --lines 100 --nostream

# 에러 로그만
pm2 logs core-service-dev --lines 100 --nostream --err

# 테스트
npm run test -- apps/core-service
```

## 구현 가이드

### 배차 매칭 흐름 (Offer Module)

```
Delivery Created
    │
    ▼
┌─────────────────┐
│ Location gRPC   │ → 근처 라이더 검색
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Redis Lock      │ → 중복 배차 방지
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ DB Update       │ → Offer 생성
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ BullMQ Producer │ → 푸시 알림 요청
└─────────────────┘
```

### 분산 락 사용 (필수)

```typescript
// Offer 수락 시 반드시 분산 락 사용
const lock = await this.redisLockService.acquire(`offer:${offerId}`);
if (!lock) {
  throw new ConflictException('이미 처리 중인 배차입니다');
}
try {
  // 배차 수락 로직
} finally {
  await lock.release();
}
```

### 주의사항

- 배차 관련 로직은 반드시 분산 락 사용
- Location Service 호출은 gRPC 클라이언트 사용
- 알림 발송은 BullMQ로 비동기 처리 (직접 호출 금지)
