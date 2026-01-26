# Notification Worker 태스크 목록

## Phase 1: 기반 설정

- [x] 1.1 BullMQ 패키지 설치 (`@nestjs/bullmq`, `bullmq`)
- [x] 1.2 Job 데이터 인터페이스 정의 (`src/interfaces/notification-job.interface.ts`)
- [x] 1.3 NotificationModule에 BullMQ 설정 추가

## Phase 2: Processor 구현

- [x] 2.1 Push Processor 구현 (`src/processors/push.processor.ts`)
  - FCM 발송 로직 (Mock)
  - 알림 타입별 메시지 생성
- [x] 2.2 SMS Processor 구현 (`src/processors/sms.processor.ts`)
  - SMS 발송 로직 (Mock)

## Phase 3: 서비스 레이어 (선택)

- [ ] 3.1 FCM Service 분리 (`src/services/fcm.service.ts`)
- [ ] 3.2 SMS Service 분리 (`src/services/sms.service.ts`)

## Phase 4: 테스트 및 검증

- [x] 4.1 Worker 실행 테스트
- [x] 4.2 Redis 큐 연결 확인
- [x] 4.3 Unit 테스트 작성

---

## 진행 상황

| Phase | 상태 | 비고 |
|-------|------|------|
| Phase 1 | ✅ 완료 | |
| Phase 2 | ✅ 완료 | |
| Phase 3 | 🔴 대기 | 선택사항 |
| Phase 4 | ✅ 완료 | |

---

Last Updated: 2026-01-23
