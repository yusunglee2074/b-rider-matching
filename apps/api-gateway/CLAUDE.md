# API Gateway Service

## 서비스 책임

- 클라이언트 요청의 단일 진입점 (HTTP/REST)
- JWT 인증/인가
- Rate Limiting
- Core Service로 요청 프록시

## 포트

| Protocol | Port |
|----------|------|
| HTTP | 3000 |

## 주요 파일

```
apps/api-gateway/
├── src/
│   ├── main.ts              # 애플리케이션 부트스트랩
│   ├── app.module.ts        # 루트 모듈
│   ├── app.controller.ts    # 헬스체크 등 기본 엔드포인트
│   ├── auth/                # JWT 인증 (Guard, Strategy)
│   └── proxy/               # Core Service 프록시
└── test/
    └── app.e2e-spec.ts
```

## 의존 서비스

| Service | Protocol | 용도 |
|---------|----------|------|
| Core Service | HTTP (3001) | 비즈니스 로직 위임 |

## 수정 금지 영역

- `apps/core-service/` - Core Service 담당
- `apps/location-service/` - Location Service 담당
- `apps/notification-worker/` - Notification Worker 담당
- `libs/proto/` - Proto 파일은 별도 협의 필요

## 개발 명령어

```bash
# 이 서비스만 실행 (hot reload)
nest start api-gateway --watch

# 로그 확인 (PM2 dev 모드 실행 중일 때)
pm2 logs api-gateway-dev --lines 100 --nostream

# 에러 로그만
pm2 logs api-gateway-dev --lines 100 --nostream --err

# 테스트
npm run test -- apps/api-gateway
npm run test:e2e -- apps/api-gateway
```

## 구현 가이드

### 인증 흐름

```
Client Request
    │
    ▼
┌─────────────┐
│ JWT Guard   │ → 토큰 검증 실패 시 401
└─────────────┘
    │
    ▼
┌─────────────┐
│ Rate Limit  │ → 초과 시 429
└─────────────┘
    │
    ▼
┌─────────────┐
│ Proxy       │ → Core Service (HTTP)
└─────────────┘
```

### 주의사항

- 비즈니스 로직을 이 서비스에 구현하지 않음
- 모든 비즈니스 요청은 Core Service로 프록시
- 인증/인가만 담당
