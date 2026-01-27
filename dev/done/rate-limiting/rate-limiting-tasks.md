# Rate Limiting 구현 태스크

**Last Updated:** 2026-01-27

## 체크리스트

- [x] 의존성 설치 (@nestjs/throttler)
- [x] ThrottlerModule 설정
- [x] ThrottlerGuard 글로벌 등록
- [x] 동작 테스트

## 현재 진행 상황

**현재 단계:** 완료

**설정:**
- short: 10 requests / 1 second
- long: 100 requests / 60 seconds

**검증 결과:**
- 10번째 요청까지 HTTP 200
- 11번째 요청부터 HTTP 429 (Too Many Requests)

## 이슈/블로커

(없음)
