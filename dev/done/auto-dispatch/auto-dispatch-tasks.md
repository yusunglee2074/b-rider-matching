# Auto-Dispatch 작업 체크리스트

**Last Updated**: 2026-01-27
**Status**: ✅ 완료

## Phase 1: AutoDispatchService 생성

- [x] `apps/core-service/src/offer/auto-dispatch.service.ts` 생성
  - [x] LocationGrpcClient 주입
  - [x] OfferService 주입
  - [x] DeliveryService 주입
  - [x] `dispatch(deliveryId: string)` 메서드 구현
    - [x] 배달 정보 조회 (픽업 위치)
    - [x] Location Service로 근처 라이더 검색
    - [x] 가장 가까운 라이더 선택
    - [x] 오퍼 생성
    - [x] 알림은 OfferService.create()에서 자동 발송
  - [x] `dispatchToNextRider()` 메서드 구현 (재배차용)
  - [x] 에러 핸들링 (Location 장애, 라이더 없음 등)

- [x] `apps/core-service/src/offer/offer.module.ts` 수정
  - [x] AutoDispatchService 프로바이더 등록
  - [x] exports에 AutoDispatchService 추가

## Phase 2: Delivery 생성 시 트리거

- [x] `apps/core-service/src/delivery/delivery.module.ts` 수정
  - [x] OfferModule import 추가 (forwardRef로 순환 의존성 해결)

- [x] `apps/core-service/src/delivery/delivery.service.ts` 수정
  - [x] AutoDispatchService 주입 (forwardRef)
  - [x] `create()` 메서드에서 배달 생성 후 dispatch 호출
  - [x] try-catch로 dispatch 실패 시에도 배달 반환

## Phase 3: 알림 연동

- [x] 오퍼 생성 시 BullMQ 알림 작업 추가 (기존 OfferService에서 처리)
  - [x] `OFFER_CREATED` 타입 사용
  - [x] 라이더에게 푸시 알림 발송

## Phase 4: 테스트

- [ ] 단위 테스트 (추후 작성)
- [ ] 통합 테스트 (추후 작성)

## Phase 5: 문서화

- [ ] API 문서 업데이트 (추후 작성)
- [x] CLAUDE.md - 기존 문서에 플로우 설명 있음

## 완료 조건

1. ✅ 배달 생성 시 자동으로 근처 라이더에게 오퍼 생성
2. ✅ 오퍼 생성 시 라이더에게 푸시 알림 발송
3. ✅ 라이더 없어도 배달은 정상 생성
4. ⏳ 테스트 통과 (추후)
