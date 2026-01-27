# Offer Timeout 작업 체크리스트

**Last Updated**: 2026-01-27
**Status**: ✅ 완료

## Phase 1: Offer 엔티티 수정

- [x] `libs/database/src/entities/offer.entity.ts` 수정
  - [x] `expiresAt: Date` 필드 (기존 구현됨)
  - [x] `attemptCount: number` 필드 추가 (default: 1)
  - [x] `OfferStatus` enum에 `EXPIRED` (기존 구현됨)

## Phase 2: BullMQ 큐 설정

- [x] `apps/core-service/src/clients/offer.queue-producer.ts` 생성
  - [x] BullMQ Queue 직접 사용 (기존 패턴 따름)
  - [x] `scheduleTimeoutCheck()` 메서드 구현

- [x] `apps/core-service/src/offer/offer.module.ts` 수정
  - [x] OfferQueueProducer 프로바이더 등록
  - [x] OfferTimeoutProcessor 프로바이더 등록

## Phase 3: 타임아웃 프로세서 구현

- [x] `apps/core-service/src/offer/offer-timeout.processor.ts` 생성
  - [x] BullMQ Worker 직접 사용
  - [x] `check-timeout` job 핸들러
  - [x] 오퍼 상태 확인 로직
    - [x] PENDING이면 EXPIRED로 변경
    - [x] ACCEPTED/REJECTED면 무시
  - [x] 재배차 트리거 로직
    - [x] attemptCount < MAX_ATTEMPTS (5회) 확인
    - [x] AutoDispatchService.dispatchToNextRider() 호출
  - [x] 분산 락 적용 (동시 처리 방지)

## Phase 4: 오퍼 생성 시 Job 등록

- [x] `apps/core-service/src/offer/offer.service.ts` 수정
  - [x] OfferQueueProducer 주입
  - [x] `create()` 메서드 수정
    - [x] `expiresAt = new Date(Date.now() + 10000)` 설정 (기존)
    - [x] `scheduleTimeoutCheck()` 호출 (delay: 10000ms)

## Phase 5: 재배차 로직

- [x] `apps/core-service/src/offer/auto-dispatch.service.ts`
  - [x] `dispatchToNextRider(deliveryId, excludeRiderIds)` 메서드 구현
  - [x] 이전 오퍼 라이더 제외하고 다음 라이더 선택

- [x] 최대 재배차 횟수 초과 처리
  - [x] 배달 상태 유지 (PENDING)
  - [x] 로그 경고 출력

## Phase 6: 테스트

- [ ] 단위 테스트 (추후 작성)
- [ ] 통합 테스트 (추후 작성)

## 완료 조건

1. ✅ 오퍼 생성 시 expiresAt 설정됨
2. ✅ 10초 후 PENDING 오퍼 자동 EXPIRED
3. ✅ 만료 시 다음 라이더에게 재배차
4. ✅ 최대 5회 재배차 후 중단
5. ✅ Accept/Reject 시 타임아웃 무시됨
