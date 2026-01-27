# Auto-Dispatch 시스템 구현 계획

**Last Updated**: 2026-01-27

## 개요

배달 생성 시 자동으로 근처 라이더를 검색하고 오퍼를 생성하는 핵심 비즈니스 로직 구현

## 현재 상태

- 배달 CRUD: ✓ 구현됨
- 오퍼 수동 생성: ✓ 구현됨
- Location Service gRPC 연동: ✓ 구현됨
- **자동 배차 트리거: ❌ 미구현**

## 구현 방향

### 옵션 1: 동기식 (Delivery 생성 시 즉시 실행) - **선택**
```
POST /deliveries → DeliveryService.create()
                        ↓
                   AutoDispatchService.dispatch()
                        ↓
                   Location gRPC → 근처 라이더 조회
                        ↓
                   OfferService.create() → 오퍼 생성
                        ↓
                   NotificationQueue.add() → 푸시 알림
```

**장점**: 단순함, 즉각적인 응답
**단점**: 배달 생성 API 응답 시간 증가

### 옵션 2: 비동기식 (이벤트 기반)
- 배달 생성 후 BullMQ에 `dispatch-delivery` 작업 추가
- 별도 워커에서 처리

**장점**: API 응답 빠름, 확장성
**단점**: 복잡도 증가, 배달 생성 직후 오퍼 상태 불확실

## 선택: 옵션 1 (동기식)

포트폴리오 프로젝트 특성상 단순함 우선. 추후 비동기로 전환 가능.

## 구현 단계

### Phase 1: AutoDispatchService 생성
1. `apps/core-service/src/offer/auto-dispatch.service.ts` 생성
2. Location Service gRPC 클라이언트 주입
3. `dispatch(deliveryId)` 메서드 구현

### Phase 2: Delivery 생성 시 트리거
1. `DeliveryService.create()` 수정
2. 배달 생성 후 `AutoDispatchService.dispatch()` 호출
3. 실패 시에도 배달은 생성되도록 처리 (오퍼 생성 실패 ≠ 배달 생성 실패)

### Phase 3: 알림 연동
1. 오퍼 생성 후 BullMQ `notification` 큐에 작업 추가
2. `offer-created` 타입으로 라이더에게 푸시

## 비즈니스 규칙

1. 근처 라이더 검색 반경: 3km (설정 가능)
2. 최대 검색 라이더 수: 10명
3. 가장 가까운 라이더 1명에게만 오퍼 생성 (순차 배차)
4. 라이더가 없으면 배달은 PENDING 상태 유지

## 의존성

- `offer-timeout` 기능과 연계 필요 (오퍼 만료 시 다음 라이더에게 재배차)
- `rider-availability-filter` 기능과 연계 필요 (AVAILABLE 라이더만 대상)

## 예상 소요

- AutoDispatchService 구현: 핵심 로직
- DeliveryService 수정: 트리거 추가
- 테스트 작성: 단위/통합 테스트
