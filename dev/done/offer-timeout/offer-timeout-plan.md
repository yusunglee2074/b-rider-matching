# Offer Timeout 시스템 구현 계획

**Last Updated**: 2026-01-27

## 개요

오퍼 생성 후 10초 내 응답 없으면 자동 만료 및 다음 라이더에게 재배차

## 현재 상태

- 오퍼 Accept/Reject: ✓ 구현됨 (분산 락 포함)
- BullMQ 인프라: ✓ 구현됨
- **오퍼 만료 시간 필드: ❌ 없음**
- **타임아웃 체크 로직: ❌ 없음**
- **재배차 로직: ❌ 없음**

## 구현 방향

### 옵션 1: BullMQ Delayed Job - **선택**
```
오퍼 생성 시:
  1. Offer 저장 (expiresAt = now + 10s)
  2. BullMQ delayed job 추가 (delay: 10000ms)
     queue.add('check-offer-timeout', {offerId}, {delay: 10000})

10초 후 워커 실행:
  1. 오퍼 상태 확인
  2. 아직 PENDING이면 → EXPIRED로 변경
  3. 다음 라이더에게 재배차 (AutoDispatchService 호출)
```

**장점**: 정확한 타이밍, BullMQ 재시도/백오프 내장
**단점**: 오퍼마다 job 생성

### 옵션 2: Cron Job (매 5초 체크)
- `@nestjs/schedule`로 주기적 체크
- `WHERE status = 'PENDING' AND expiresAt < NOW()`

**장점**: 단순함
**단점**: 최대 5초 지연, DB 부하

## 선택: 옵션 1 (BullMQ Delayed Job)

정확한 10초 타임아웃 보장, 기존 BullMQ 인프라 활용

## 구현 단계

### Phase 1: Offer 엔티티 수정
1. `expiresAt` 필드 추가
2. `attemptCount` 필드 추가 (재배차 횟수 추적)
3. `EXPIRED` 상태 추가

### Phase 2: 타임아웃 Job 프로세서
1. `apps/core-service/src/offer/offer-timeout.processor.ts` 생성
2. `check-offer-timeout` job 처리
3. PENDING → EXPIRED 전환
4. 재배차 트리거

### Phase 3: 오퍼 생성 시 Job 등록
1. `OfferService.create()` 수정
2. 오퍼 생성 후 delayed job 추가

### Phase 4: 재배차 로직
1. 만료된 라이더 제외하고 다음 라이더 선택
2. 최대 재배차 횟수 제한 (예: 5회)
3. 모든 라이더 거절/만료 시 배달 상태 처리

## 비즈니스 규칙

1. 타임아웃: 10초
2. 최대 재배차 횟수: 5회
3. 모든 라이더 실패 시: 배달 PENDING 유지, 어드민 알림
4. Accept/Reject 시 delayed job 취소 불필요 (상태 체크로 처리)

## 의존성

- `auto-dispatch` 기능 필요 (재배차 시 호출)
- `rider-availability-filter` 연계 (만료된 라이더 제외)
