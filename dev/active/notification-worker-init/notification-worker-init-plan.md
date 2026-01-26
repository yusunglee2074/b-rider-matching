# Notification Worker 초기 구현 계획

## 목표

BullMQ 기반 비동기 알림 처리 Worker 구현

## 아키텍처 결정

- **Queue**: BullMQ (Redis 기반)
- **알림 채널**: FCM Push, SMS
- **재시도 전략**: Exponential backoff (Core Service에서 설정)

## 구현 범위

### In Scope
- BullMQ Consumer 설정
- Push Processor (FCM)
- SMS Processor
- Job 데이터 타입 정의

### Out of Scope
- FCM/SMS 실제 외부 API 연동 (Mock 처리)
- Core Service의 Producer 구현

## 의존성

- `@nestjs/bullmq`
- `bullmq`
- Redis 연결 (REDIS_URL 환경변수)

## 참고

- Core Service에서 `notification` 큐에 Job 추가
- Job 타입: `push`, `sms`

---

Last Updated: 2026-01-23
