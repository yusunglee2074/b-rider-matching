# Rider Availability Filter 컨텍스트

**Last Updated**: 2026-01-27

## 핵심 파일

### 수정 대상
| 파일 | 역할 | 변경 내용 |
|------|------|----------|
| `apps/core-service/src/rider/rider.service.ts` | 라이더 서비스 | 상태 변경 시 Redis 동기화 |
| `apps/core-service/src/rider/rider.module.ts` | 라이더 모듈 | Redis 모듈 import |
| `apps/location-service/src/location/location.service.ts` | 위치 서비스 | 가용성 필터링 추가 |

### 참조 파일
| 파일 | 역할 |
|------|------|
| `libs/database/src/entities/rider.entity.ts` | 라이더 엔티티, 상태 enum |
| `apps/location-service/src/location/location.proto` | gRPC 정의 |
| `apps/core-service/src/offer/auto-dispatch.service.ts` | 필터링 결과 사용처 |

## 기존 코드 분석

### Rider 상태 Enum
```typescript
// libs/database/src/entities/rider.entity.ts
export enum RiderStatus {
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}
```

### 현재 findNearbyRiders (수정 필요)
```typescript
// apps/location-service/src/location/location.service.ts
async findNearbyRiders(latitude: number, longitude: number, radiusKm: number) {
  const results = await this.redis.georadius(
    'rider:locations',
    longitude,
    latitude,
    radiusKm,
    'km',
  );
  return results;  // 모든 라이더 반환 (상태 무관)
}
```

### 현재 updateStatus (수정 필요)
```typescript
// apps/core-service/src/rider/rider.service.ts
async updateStatus(id: string, status: RiderStatus): Promise<Rider> {
  const rider = await this.findOne(id);
  rider.status = status;
  return this.riderRepository.save(rider);
  // Redis 동기화 없음
}
```

## Redis 키 설계

```
# 라이더 상태
rider:{riderId}:status = "AVAILABLE" | "BUSY" | "OFFLINE"

# 라이더 위치 (기존)
rider:locations = GEOADD key (sorted set)
```

## 설정값

```typescript
// 상태 조회 시 기본값 (Redis에 없을 때)
DEFAULT_RIDER_STATUS = 'OFFLINE'  // 안전한 기본값
```

## 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 상태 저장 위치 | Redis | 빠른 조회, Location Service 접근 가능 |
| 상태 TTL | 없음 | 명시적 변경만 허용 |
| 상태 없는 라이더 | 제외 | 안전 우선 |
| 정렬 기준 | 거리 오름차순 | 가까운 라이더 우선 배차 |

## 데이터 흐름

```
라이더 상태 변경:
  PATCH /riders/:id/status
       ↓
  RiderService.updateStatus()
       ↓
  1. DB 업데이트
  2. Redis SET rider:{id}:status

근처 라이더 검색:
  Location gRPC findNearbyRiders()
       ↓
  1. GEORADIUS rider:locations
       ↓
  2. 각 riderId에 대해 GET rider:{id}:status
       ↓
  3. AVAILABLE만 필터링
       ↓
  4. 거리순 정렬 후 반환
```

## 테스트 시나리오

1. AVAILABLE 라이더 3명 → 3명 모두 반환
2. AVAILABLE 2명 + BUSY 1명 → 2명만 반환
3. 모두 OFFLINE → 빈 배열 반환
4. Redis에 상태 없는 라이더 → 제외
5. 거리 1km, 2km, 3km → 1km, 2km, 3km 순서로 반환
