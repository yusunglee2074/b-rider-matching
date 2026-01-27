# Phase 2: Core Service 모듈 구현 계획

## 목표
Core Service의 4개 비즈니스 모듈 구현

## 구현 순서 (단순 → 복잡)

### 2-A. Store Module (가장 단순)
- StoreModule, StoreController, StoreService
- CRUD API: POST/GET/PATCH/DELETE /stores

### 2-B. Rider Module
- RiderModule, RiderController, RiderService
- 라이더 등록, 상태 변경 API

### 2-C. Delivery Module
- DeliveryModule, DeliveryController, DeliveryService
- 배달 생성, 상태 조회 API
- Store 의존성

### 2-D. Offer Module (가장 복잡)
- OfferModule, OfferController, OfferService
- 배차 생성 (분산 락 적용)
- 배차 수락/거절 (10초 제한)
- Rider, Delivery 의존성
- Location gRPC, Notification BullMQ 클라이언트 연동

## 완료 기준
- 모든 모듈이 AppModule에 통합됨
- API 엔드포인트가 정상 동작
- 분산 락이 Offer 로직에 적용됨

Last Updated: 2026-01-23
