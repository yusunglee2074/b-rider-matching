# JWT 인증 구현 컨텍스트

**Last Updated:** 2026-01-23

## 핵심 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `apps/api-gateway/src/app.module.ts` | 루트 모듈, AuthModule import | 수정 필요 |
| `apps/api-gateway/src/auth/auth.module.ts` | 인증 모듈 | 신규 생성 |
| `apps/api-gateway/src/auth/strategies/jwt.strategy.ts` | JWT 검증 전략 | 신규 생성 |
| `apps/api-gateway/src/auth/guards/jwt-auth.guard.ts` | 인증 가드 | 신규 생성 |

## 환경변수

```bash
# .env.example에 이미 정의됨
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=3600
```

## JWT Payload 구조

```typescript
interface JwtPayload {
  sub: string;      // 사용자 ID
  email: string;    // 이메일
  role: string;     // 역할 (rider, store, admin)
  iat?: number;     // 발급 시간
  exp?: number;     // 만료 시간
}
```

## 의존성 (설치 완료)

```json
{
  "@nestjs/jwt": "latest",
  "@nestjs/passport": "latest",
  "@nestjs/config": "latest",
  "passport": "latest",
  "passport-jwt": "latest",
  "@types/passport-jwt": "latest (dev)"
}
```

## 결정 사항

1. **Global Guard 사용**: 모든 라우트에 기본 인증 적용, `@Public()` 데코레이터로 예외 처리
2. **토큰 위치**: Authorization 헤더 (Bearer scheme)
3. **에러 응답**: 401 Unauthorized (토큰 없음/만료), 403 Forbidden (권한 없음)

## 참고 문서

- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [Passport JWT Strategy](https://www.passportjs.org/packages/passport-jwt/)
