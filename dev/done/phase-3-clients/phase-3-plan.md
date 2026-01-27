# Phase 3: 외부 서비스 클라이언트 구현 계획

## 목표
Location Service (gRPC) 및 Notification Worker (BullMQ) 클라이언트 구현

## 작업 범위

### 3-1. LocationGrpcClient
- gRPC 클라이언트 설정
- getNearbyRiders 메서드 구현
- 타임아웃 및 에러 핸들링

### 3-2. NotificationQueueProducer
- BullMQ Queue 설정
- sendNotification 메서드 구현
- 재시도 로직 (3회, exponential backoff)

### 3-3. Offer Module 통합
- OfferService에 클라이언트 주입
- 배차 생성 시 알림 발송
- 배차 수락/거절 시 알림 발송
- 근처 라이더 검색 API 추가

## 완료 기준
- gRPC 클라이언트가 Location Service와 통신 가능
- BullMQ Producer가 notification 큐에 메시지 추가
- Offer 생성/응답 시 알림 자동 발송

Last Updated: 2026-01-23
