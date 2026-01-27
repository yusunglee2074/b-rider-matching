# JWT 인증 구현 계획

**Last Updated:** 2026-01-23

## 목표

API Gateway에 JWT 기반 인증/인가 시스템 구현

## 기술 스택

- `@nestjs/jwt` - JWT 토큰 생성/검증
- `@nestjs/passport` - 인증 전략 프레임워크
- `passport-jwt` - JWT 전략
- `@nestjs/config` - 환경변수 관리

## 아키텍처

```
Client Request (Authorization: Bearer <token>)
    │
    ▼
┌─────────────────┐
│   JwtAuthGuard  │ ← @UseGuards(JwtAuthGuard)
└─────────────────┘
    │
    ▼
┌─────────────────┐
│   JwtStrategy   │ ← 토큰 검증, payload 추출
└─────────────────┘
    │
    ▼
┌─────────────────┐
│   Controller    │ ← req.user 사용 가능
└─────────────────┘
```

## 구현 범위

### In Scope
- JWT 토큰 검증 (Guard, Strategy)
- 환경변수 설정 (ConfigModule)
- 인증 데코레이터 (@Public, @CurrentUser)
- 테스트용 로그인 엔드포인트

### Out of Scope
- 실제 사용자 DB 연동 (Core Service 담당)
- Refresh Token (추후 구현)
- Role-based Access Control (추후 구현)

## 디렉토리 구조

```
apps/api-gateway/src/
├── auth/
│   ├── auth.module.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── decorators/
│   │   ├── public.decorator.ts
│   │   └── current-user.decorator.ts
│   └── interfaces/
│       └── jwt-payload.interface.ts
├── app.module.ts (수정)
└── main.ts
```

## 승인 상태

- [x] 계획 작성
- [ ] 사용자 승인
