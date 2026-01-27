# Notification Worker

## 서비스 책임

비동기 알림 처리를 담당하는 BullMQ Consumer입니다.

- 푸시 알림 발송 (FCM)
- SMS 발송
- 재시도/백오프 처리
- 실패 격리

## 포트

HTTP 포트 없음 (BullMQ Consumer만 동작)

## 주요 파일

```
apps/notification-worker/
├── src/
│   ├── main.ts
│   ├── notification.module.ts
│   └── processors/
│       ├── push.processor.ts    # FCM 푸시 알림
│       └── sms.processor.ts     # SMS 발송
└── test/
```

## 호출하는 서비스

| Service | Protocol | 용도 |
|---------|----------|------|
| Redis | TCP (6379) | BullMQ 큐 |
| FCM | HTTPS | 푸시 알림 |
| SMS Provider | HTTPS | SMS 발송 |

## 호출받는 서비스

| Service | Protocol | 용도 |
|---------|----------|------|
| Core Service | BullMQ (Redis) | 알림 요청 수신 |

## 수정 금지 영역

- `apps/api-gateway/` - API Gateway 담당
- `apps/core-service/` - Core Service 담당
- `apps/location-service/` - Location Service 담당

## 개발 명령어

```bash
# 이 서비스만 실행 (hot reload)
nest start notification-worker --watch

# 로그 확인 (PM2 dev 모드 실행 중일 때)
pm2 logs notification-worker-dev --lines 100 --nostream

# 에러 로그만
pm2 logs notification-worker-dev --lines 100 --nostream --err

# BullMQ 큐 상태 확인
redis-cli LLEN bull:notification:wait
redis-cli LRANGE bull:notification:failed 0 -1

# 테스트
npm run test -- apps/notification-worker
```

## 구현 가이드

### BullMQ Processor 구조

```typescript
@Processor('notification')
export class PushProcessor extends WorkerHost {
  async process(job: Job<NotificationJobData>): Promise<void> {
    if (job.name !== 'send') return;

    const { riderId, storeId, title, body, type } = job.data;
    const targetId = riderId || storeId;

    // FCM 발송
    await this.sendFcm(targetId, { title, body });
  }
}
```

### Job 데이터 구조

```typescript
interface NotificationJobData {
  type: 'OFFER_CREATED' | 'OFFER_ACCEPTED' | 'OFFER_REJECTED' | 'OFFER_EXPIRED' | 'DELIVERY_UPDATE';
  riderId?: string;
  storeId?: string;
  deliveryId?: string;
  offerId?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
```

### 재시도 설정

Core Service에서 Job 추가 시 설정:
```typescript
await this.notificationQueue.add('send', data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
});
```

### 주의사항

- 외부 API 호출 실패는 BullMQ가 자동 재시도
- 영구 실패 Job은 failed 큐에서 확인
- FCM 토큰 만료 시 DB에서 토큰 삭제 처리 필요
