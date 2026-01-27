# Location Service Setup Context

**Last Updated**: 2026-01-23

## 핵심 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `apps/location-service/src/main.ts` | Hybrid 서버 부트스트랩 | 수정 필요 |
| `apps/location-service/src/location.module.ts` | 모듈 정의 | 수정 필요 |
| `apps/location-service/src/location.service.ts` | Redis Geohash 로직 | 수정 필요 |
| `apps/location-service/src/location.controller.ts` | HTTP 엔드포인트 | 수정 필요 |
| `apps/location-service/src/location.grpc.controller.ts` | gRPC 핸들러 | 신규 생성 |
| `apps/location-service/proto/location.proto` | gRPC 정의 | 신규 생성 |
| `libs/proto/location.proto` | Proto 원본 | 확인 필요 |

## 포트 설정

- HTTP: 3003
- gRPC: 5003

## Redis 키 구조

```
riders:locations  # GEOADD/GEORADIUS용 Sorted Set
```

## API 설계

### HTTP (라이더 앱 → Location Service)

```
POST /location
Body: { riderId: string, latitude: number, longitude: number }
Response: { success: boolean }
```

### gRPC (Core Service → Location Service)

```protobuf
service LocationService {
  rpc UpdateLocation(UpdateLocationRequest) returns (UpdateLocationResponse);
  rpc GetNearbyRiders(GetNearbyRidersRequest) returns (GetNearbyRidersResponse);
}
```

## 환경 변수

```
REDIS_URL=redis://localhost:6379
HTTP_PORT=3003
GRPC_PORT=5003
```
