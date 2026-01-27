# Offer Timeout 컨텍스트

**Last Updated**: 2026-01-27

## 핵심 파일

### 수정 대상
| 파일 | 역할 | 변경 내용 |
|------|------|----------|
| `libs/database/src/entities/offer.entity.ts` | 오퍼 엔티티 | expiresAt, attemptCount 필드 추가 |
| `apps/core-service/src/offer/offer.service.ts` | 오퍼 서비스 | 생성 시 delayed job 등록 |
| `apps/core-service/src/offer/offer.module.ts` | 오퍼 모듈 | BullMQ 큐 등록, 프로세서 추가 |
| `apps/core-service/src/offer/dto/create-offer.dto.ts` | DTO | expiresAt 필드 추가 |

### 신규 생성
| 파일 | 역할 |
|------|------|
| `apps/core-service/src/offer/offer-timeout.processor.ts` | 타임아웃 job 처리 |

### 참조 파일
| 파일 | 역할 |
|------|------|
| `apps/notification-worker/src/notification/notification.processor.ts` | BullMQ 프로세서 예시 |
| `apps/core-service/src/offer/auto-dispatch.service.ts` | 재배차 시 호출 |

## 기존 코드 분석

### Offer 엔티티 (수정 필요)
```typescript
// libs/database/src/entities/offer.entity.ts
// 현재 필드: id, deliveryId, riderId, status, createdAt, updatedAt
// 추가 필요: expiresAt, attemptCount
```

### Offer 상태 (수정 필요)
```typescript
// 현재: PENDING, ACCEPTED, REJECTED
// 추가: EXPIRED
```

### BullMQ 설정 (참조)
```typescript
// apps/notification-worker/src/notification/notification.module.ts
BullModule.registerQueue({ name: 'notification' })
```

## 설정값

```typescript
// 환경변수 또는 상수
OFFER_TIMEOUT_MS = 10000          // 10초
MAX_DISPATCH_ATTEMPTS = 5         // 최대 재배차 횟수
OFFER_QUEUE_NAME = 'offer'        // BullMQ 큐 이름
```

## 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 타임아웃 방식 | BullMQ Delayed Job | 정확한 타이밍, 기존 인프라 활용 |
| Job 취소 | 안함 (상태 체크) | 단순함, Redis 부하 감소 |
| 재배차 큐 | 동일 큐 사용 | 순서 보장 |

## 테스트 시나리오

1. 오퍼 생성 → 10초 후 PENDING → EXPIRED 전환
2. 오퍼 생성 → 5초 후 Accept → 타임아웃 job 무시됨
3. 오퍼 만료 → 다음 라이더에게 재배차
4. 5회 재배차 실패 → 배달 PENDING 유지
5. 동시 Accept/Timeout → 분산 락으로 하나만 성공
