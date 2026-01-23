# Location Service

## 서비스 책임

라이더 위치 관리 및 근처 라이더 검색을 담당하는 독립 마이크로서비스입니다.

- 라이더 위치 업데이트 (Redis Geohash)
- 근처 라이더 검색 (Geo Query)
- 40k TPS 처리 목표

## 포트

| Protocol | Port |
|----------|------|
| HTTP | 3003 |
| gRPC | 5003 |

## 주요 파일

```
apps/location-service/
├── src/
│   ├── main.ts                      # Hybrid 서버 (HTTP + gRPC)
│   ├── location.module.ts
│   ├── location.controller.ts       # HTTP 엔드포인트
│   ├── location.grpc.controller.ts  # gRPC 핸들러
│   └── location.service.ts          # Redis Geohash 로직
├── proto/
│   └── location.proto               # gRPC 정의 (libs/proto에서 복사)
└── test/
    └── app.e2e-spec.ts
```

## 호출하는 서비스

| Service | Protocol | 용도 |
|---------|----------|------|
| Redis | TCP (6379) | Geohash 저장/검색 |

## 호출받는 서비스

| Service | Protocol | 용도 |
|---------|----------|------|
| Rider App | HTTP (3003) | 위치 업데이트 |
| Core Service | gRPC (5003) | 근처 라이더 검색 |

## 수정 금지 영역

- `apps/api-gateway/` - API Gateway 담당
- `apps/core-service/` - Core Service 담당
- `apps/notification-worker/` - Notification Worker 담당
- `libs/proto/location.proto` - Proto 원본 (이 서비스의 proto/는 복사본)

## 개발 명령어

```bash
# 이 서비스만 실행 (hot reload)
nest start location-service --watch

# 로그 확인 (PM2 dev 모드 실행 중일 때)
pm2 logs location-service-dev --lines 100 --nostream

# 에러 로그만
pm2 logs location-service-dev --lines 100 --nostream --err

# gRPC 테스트
grpcurl -plaintext localhost:5003 list
grpcurl -plaintext localhost:5003 location.LocationService/GetNearbyRiders

# 테스트
npm run test -- apps/location-service
npm run test:e2e -- apps/location-service
```

## 구현 가이드

### Hybrid 서버 설정

```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(LocationModule);

  // gRPC 마이크로서비스 추가
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'location',
      protoPath: join(__dirname, '../proto/location.proto'),
      url: '0.0.0.0:5003',
    },
  });

  await app.startAllMicroservices();
  await app.listen(3003);
}
```

### Redis Geohash 사용

```typescript
// 위치 업데이트
await redis.geoadd('riders:locations', lng, lat, riderId);

// 근처 라이더 검색 (반경 5km)
const riders = await redis.georadius('riders:locations', lng, lat, 5, 'km');
```

### Proto 파일 동기화

Proto 파일 수정 시:
1. `libs/proto/location.proto` 수정
2. `apps/location-service/proto/location.proto`로 복사
3. gRPC 클라이언트/서버 재생성

### 주의사항

- HTTP는 라이더 앱의 위치 업데이트용
- gRPC는 Core Service의 근처 라이더 검색용
- Redis 연결 실패 시 서비스 시작 차단 (fail-fast)
