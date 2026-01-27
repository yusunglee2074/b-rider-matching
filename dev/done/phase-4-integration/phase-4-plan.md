# Phase 4: 통합 및 테스트 계획

## 목표
Core Service 통합 검증 및 단위 테스트 작성

## 작업 범위

### 4-1. 서비스 실행 검증
- PM2로 서비스 시작
- Health check 확인
- 로그 확인

### 4-2. 단위 테스트
- StoreService 테스트
- RiderService 테스트
- DeliveryService 테스트
- OfferService 테스트 (분산 락 모킹)

### 4-3. E2E 테스트
- 배차 플로우 테스트
- API 엔드포인트 테스트

## 완료 기준
- 서비스가 정상 시작됨
- 단위 테스트 통과
- 주요 API 엔드포인트 동작 확인

Last Updated: 2026-01-23
