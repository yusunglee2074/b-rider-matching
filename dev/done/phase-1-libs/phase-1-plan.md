# Phase 1: 공유 라이브러리 (libs/) 구현 계획

## 목표
Core Service에서 사용할 공유 라이브러리 구현

## 작업 범위

### 1-1. @app/database: TypeORM 설정
- DatabaseModule 생성
- ConfigService 연동

### 1-2. @app/database: 엔티티 정의
- Rider: id, name, phone, status, location
- Store: id, name, address, lat, lng
- Delivery: id, storeId, status, addresses
- Offer: id, deliveryId, riderId, status, expiresAt

### 1-3. @app/common: RedisLockService
- 분산 락 acquire/release
- Lua 스크립트로 원자적 해제

### 1-4. @app/common: 공통 DTO
- CreateStoreDto, UpdateStoreDto
- CreateRiderDto, UpdateRiderDto, UpdateRiderStatusDto
- CreateDeliveryDto
- CreateOfferDto, RespondOfferDto

## 완료 기준
- 모든 엔티티가 TypeORM 데코레이터로 정의됨
- RedisLockService가 분산 락 기능 제공
- DTO에 class-validator 데코레이터 적용

Last Updated: 2026-01-23
