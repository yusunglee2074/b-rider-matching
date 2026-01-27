# Proxy 모듈 구현 계획

**Last Updated:** 2026-01-23

## 목표

API Gateway에서 Core Service(3001)로 요청을 프록시하는 모듈 구현

## 기술 스택

- `@nestjs/axios` - HTTP 클라이언트
- `axios` - HTTP 요청 라이브러리

## 아키텍처

```
Client Request
    │
    ▼
┌─────────────────┐
│   JwtAuthGuard  │ ← 인증 검증
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  ProxyController│ ← /api/* 라우트 처리
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  ProxyService   │ ← Core Service로 요청 전달
└─────────────────┘
    │
    ▼
┌─────────────────┐
│  Core Service   │ (localhost:3001)
└─────────────────┘
```

## 프록시 대상 라우트

| API Gateway | Core Service | 설명 |
|-------------|--------------|------|
| `/api/riders/*` | `/riders/*` | 라이더 관리 |
| `/api/deliveries/*` | `/deliveries/*` | 배달 관리 |
| `/api/offers/*` | `/offers/*` | 배차 제안 |
| `/api/stores/*` | `/stores/*` | 가게 관리 |

## 구현 범위

### In Scope
- HTTP 메서드 전달 (GET, POST, PUT, PATCH, DELETE)
- 요청 헤더/바디 전달
- 인증 정보 전달 (JWT payload → X-User-* 헤더)
- 에러 응답 처리

### Out of Scope
- WebSocket 프록시
- 파일 업로드 (추후 구현)
- 캐싱 (추후 구현)

## 승인 상태

- [x] 계획 작성
- [ ] 사용자 승인
