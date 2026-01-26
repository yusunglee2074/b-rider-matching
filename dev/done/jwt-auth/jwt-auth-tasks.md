# JWT 인증 구현 태스크

**Last Updated:** 2026-01-23 21:11

## 체크리스트

### Phase 1: 기본 설정
- [x] 의존성 설치 (@nestjs/jwt, @nestjs/passport, passport-jwt, @nestjs/config)
- [x] ConfigModule 설정 (app.module.ts)

### Phase 2: 인증 모듈 구조
- [x] `auth/interfaces/jwt-payload.interface.ts` 생성
- [x] `auth/strategies/jwt.strategy.ts` 생성
- [x] `auth/guards/jwt-auth.guard.ts` 생성
- [x] `auth/auth.module.ts` 생성

### Phase 3: 데코레이터
- [x] `auth/decorators/public.decorator.ts` 생성 (@Public)
- [x] `auth/decorators/current-user.decorator.ts` 생성 (@CurrentUser)

### Phase 4: 통합
- [x] AppModule에 AuthModule import
- [x] Global Guard 등록 (APP_GUARD)
- [x] Health check 엔드포인트에 @Public 적용

### Phase 5: 테스트
- [x] 테스트용 로그인 엔드포인트 (토큰 발급)
- [x] 인증 필요 엔드포인트 테스트
- [x] 유닛 테스트 작성

## 현재 진행 상황

**현재 단계:** 완료

**검증 결과:**
- `GET /health` - 200 OK (Public)
- `GET /me` without token - 401 Unauthorized
- `POST /auth/login` - 토큰 발급 성공
- `GET /me` with token - 사용자 정보 반환
- 유닛 테스트: 9 passed

## 이슈/블로커

(없음)
