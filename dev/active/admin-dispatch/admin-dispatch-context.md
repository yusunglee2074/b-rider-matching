# Admin Dispatch 컨텍스트

**Last Updated**: 2026-01-27

## 핵심 파일

### 신규 생성
| 파일 | 역할 |
|------|------|
| `apps/core-service/src/admin/admin.module.ts` | 어드민 모듈 |
| `apps/core-service/src/admin/admin.controller.ts` | 어드민 엔드포인트 |
| `apps/core-service/src/admin/admin.service.ts` | 수동 배차 로직 |
| `apps/core-service/src/admin/guards/admin.guard.ts` | 어드민 권한 체크 |
| `apps/core-service/src/admin/dto/assign-delivery.dto.ts` | 배차 요청 DTO |
| `apps/core-service/src/admin/dto/reassign-delivery.dto.ts` | 재할당 요청 DTO |

### 수정 대상
| 파일 | 역할 | 변경 내용 |
|------|------|----------|
| `apps/core-service/src/app.module.ts` | 앱 모듈 | AdminModule import |
| `libs/database/src/entities/offer.entity.ts` | 오퍼 엔티티 | CANCELLED_BY_ADMIN 상태 추가 |

### 참조 파일
| 파일 | 역할 |
|------|------|
| `apps/api-gateway/src/auth/jwt.strategy.ts` | JWT 페이로드 구조 |
| `apps/core-service/src/offer/offer.service.ts` | 오퍼 생성/취소 로직 |
| `apps/core-service/src/delivery/delivery.service.ts` | 배달 조회 |

## 기존 코드 분석

### JWT Payload (참조)
```typescript
// apps/api-gateway/src/auth/jwt.strategy.ts
// payload: { sub: userId, role: 'rider' | 'store' | 'admin' }
```

### Offer 상태 (수정 필요)
```typescript
// libs/database/src/entities/offer.entity.ts
export enum OfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  // 추가 필요:
  EXPIRED = 'EXPIRED',
  CANCELLED_BY_ADMIN = 'CANCELLED_BY_ADMIN',
}
```

## 설정값

```typescript
// 어드민 수동 배차 타임아웃 (없거나 더 긴 시간)
ADMIN_OFFER_TIMEOUT_MS = 0  // 0 = 타임아웃 없음
```

## 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 어드민 모듈 위치 | Core Service | 배달/오퍼와 밀접한 관계 |
| 권한 체크 | Guard + Decorator | NestJS 표준 패턴 |
| 수동 배차 타임아웃 | 없음 | 어드민 판단 존중 |
| 재할당 시 기존 오퍼 | CANCELLED_BY_ADMIN | 추적 가능 |

## API 스펙

### POST /admin/deliveries/:id/assign
```typescript
// Request
{
  riderId: string;
  reason?: string;  // 배차 사유 (로깅용)
}

// Response
{
  offer: Offer;
  message: string;
}
```

### POST /admin/deliveries/:id/reassign
```typescript
// Request
{
  newRiderId: string;
  reason?: string;
}

// Response
{
  cancelledOffer: Offer;
  newOffer: Offer;
  message: string;
}
```

### GET /admin/dashboard
```typescript
// Response
{
  activeDeliveries: number;
  pendingDeliveries: number;
  availableRiders: number;
  pendingOffers: number;
}
```

## 테스트 시나리오

1. 어드민 수동 배차 → 오퍼 생성됨
2. 비어드민 수동 배차 시도 → 403 Forbidden
3. 재할당 → 기존 오퍼 취소, 새 오퍼 생성
4. 이미 완료된 배달 재할당 → 400 Bad Request
5. 대시보드 조회 → 정확한 카운트 반환
