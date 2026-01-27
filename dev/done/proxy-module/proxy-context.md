# Proxy 모듈 컨텍스트

**Last Updated:** 2026-01-23

## 핵심 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `apps/api-gateway/src/proxy/proxy.module.ts` | 프록시 모듈 | 신규 생성 |
| `apps/api-gateway/src/proxy/proxy.controller.ts` | 라우트 핸들러 | 신규 생성 |
| `apps/api-gateway/src/proxy/proxy.service.ts` | HTTP 프록시 로직 | 신규 생성 |
| `apps/api-gateway/src/app.module.ts` | ProxyModule import | 수정 필요 |

## 환경변수

```bash
# .env.example에 이미 정의됨
CORE_SERVICE_URL=http://localhost:3001
```

## 헤더 전달 규칙

### 요청 시 추가할 헤더
```
X-User-Id: {jwt.sub}
X-User-Email: {jwt.email}
X-User-Role: {jwt.role}
X-Forwarded-For: {client IP}
```

### 제외할 헤더
- `host` (Core Service 호스트로 대체)
- `content-length` (axios가 재계산)

## 에러 처리

| Core Service 응답 | API Gateway 응답 |
|-------------------|------------------|
| 2xx | 그대로 전달 |
| 4xx | 그대로 전달 |
| 5xx | 502 Bad Gateway |
| 연결 실패 | 503 Service Unavailable |

## 참고 문서

- [NestJS HTTP Module](https://docs.nestjs.com/techniques/http-module)
