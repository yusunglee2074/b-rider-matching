# Rider Availability Filter 작업 체크리스트

**Last Updated**: 2026-01-27
**Status**: ✅ 완료

## Phase 1: Redis 상태 키 설계

- [x] 키 패턴 결정: `rider:status:{riderId}`
- [x] 값: `AVAILABLE` | `BUSY` | `OFFLINE`

## Phase 2: Core Service - 상태 동기화

- [x] `libs/common/src/services/rider-status.service.ts` 생성
  - [x] Redis 클라이언트 주입
  - [x] `setStatus()`, `getStatus()`, `getStatuses()` 메서드 구현

- [x] `apps/core-service/src/rider/rider.service.ts` 수정
  - [x] RiderStatusService 주입
  - [x] `updateStatus()` 메서드 수정 - DB 업데이트 후 Redis 동기화
  - [x] `create()` 메서드 수정 - 라이더 생성 시 Redis에 초기 상태 저장

- [x] `apps/core-service/src/rider/rider.module.ts` 수정
  - [x] RiderStatusService 프로바이더 등록

## Phase 3: Location Service - 필터링 구현

- [x] `apps/location-service/src/redis/redis.service.ts` 수정
  - [x] `getRiderStatuses()` 메서드 추가

- [x] `apps/location-service/src/location/location.service.ts` 수정
  - [x] `getNearbyRiders()` 메서드 수정
    - [x] GEORADIUS 결과 가져오기
    - [x] 각 라이더 상태 Redis에서 조회
    - [x] AVAILABLE만 필터링
    - [x] 거리순 정렬

## Phase 4: 거리순 정렬

- [x] GEORADIUS 옵션에 `WITHDIST` 추가 (기존 구현됨)
- [x] 결과를 거리 오름차순 정렬
- [x] 응답에 거리 정보 포함

## Phase 5: 엣지 케이스 처리

- [x] Redis에 상태 없는 라이더 처리 - 제외 (안전)
- [x] 상태 불일치 처리 - Redis 우선 (성능)

## Phase 6: 테스트

- [ ] 단위 테스트 (추후 작성)
- [ ] 통합 테스트 (추후 작성)

## 완료 조건

1. ✅ 라이더 상태 변경 시 Redis 동기화
2. ✅ 근처 라이더 검색 시 AVAILABLE만 반환
3. ✅ 결과가 거리순 정렬됨
4. ✅ 자동 배차에서 BUSY/OFFLINE 라이더 제외
