# Notification Worker 컨텍스트

## 핵심 파일

| 파일 | 상태 | 설명 |
|------|------|------|
| `src/main.ts` | 수정 필요 | 앱 부트스트랩 |
| `src/notification.module.ts` | 수정 필요 | BullMQ 모듈 등록 |
| `src/processors/push.processor.ts` | 생성 필요 | FCM 푸시 처리 |
| `src/processors/sms.processor.ts` | 생성 필요 | SMS 발송 처리 |
| `src/interfaces/notification-job.interface.ts` | 생성 필요 | Job 데이터 타입 |

## 주요 결정 사항

### 1. Queue 이름
- `notification` (단일 큐, Job name으로 구분)

### 2. Job Types
- `push` - FCM 푸시 알림
- `sms` - SMS 발송

### 3. Job 데이터 구조
```typescript
interface NotificationJobData {
  type: 'OFFER_ASSIGNED' | 'OFFER_TIMEOUT' | 'DELIVERY_COMPLETED';
  riderId: string;
  payload: Record<string, any>;
}
```

### 4. 재시도 설정 (Core Service에서 설정)
```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 }
}
```

## 환경변수

```
REDIS_URL=redis://localhost:6379
```

---

Last Updated: 2026-01-23
