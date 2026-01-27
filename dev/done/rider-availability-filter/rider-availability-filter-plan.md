# Rider Availability Filter 시스템 구현 계획

**Last Updated**: 2026-01-27

## 개요

근처 라이더 검색 시 AVAILABLE 상태인 라이더만 반환하도록 필터링

## 현재 상태

- Location Service GEORADIUS: ✓ 구현됨
- Rider 상태 관리: ✓ 구현됨 (AVAILABLE/BUSY/OFFLINE)
- **가용성 필터링: ❌ 미구현** (모든 라이더 반환)

## 문제점

현재 `findNearbyRiders()`는 Redis GEORADIUS만 사용하여 위치 기반 검색만 수행.
BUSY나 OFFLINE 라이더에게도 오퍼가 생성될 수 있음.

## 구현 방향

### 옵션 1: Location Service에서 Core Service 조회 (비권장)
- Location → Core gRPC 역방향 호출
- 순환 의존성 발생 가능

### 옵션 2: Redis에 라이더 상태 저장 - **선택**
```
라이더 상태 변경 시:
  Core Service → Redis SET rider:{id}:status {status}

근처 라이더 검색 시:
  1. GEORADIUS로 위치 기반 검색
  2. 각 라이더의 status 확인 (Redis GET)
  3. AVAILABLE만 필터링하여 반환
```

**장점**: 빠른 조회, 순환 의존성 없음
**단점**: 상태 동기화 필요

### 옵션 3: Core Service에서 필터링
- Location Service는 위치만 반환
- Core Service에서 DB 조회로 필터링

**장점**: 단순함
**단점**: DB 부하, 응답 지연

## 선택: 옵션 2 (Redis 상태 저장)

성능과 아키텍처 분리 모두 만족

## 구현 단계

### Phase 1: 라이더 상태 Redis 동기화
1. `RiderService.updateStatus()` 수정
2. 상태 변경 시 Redis에도 저장

### Phase 2: Location Service 필터링
1. `findNearbyRiders()` 수정
2. GEORADIUS 후 상태 필터링

### Phase 3: 거리순 정렬
1. GEORADIUS 결과에 거리 포함
2. 가까운 순으로 정렬하여 반환

## 비즈니스 규칙

1. AVAILABLE 라이더만 배차 대상
2. BUSY: 현재 배달 중
3. OFFLINE: 앱 종료 또는 휴식 중
4. 상태 TTL: 없음 (명시적 변경만)
