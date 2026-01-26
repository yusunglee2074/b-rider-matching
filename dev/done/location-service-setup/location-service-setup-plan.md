# Location Service Setup Plan

**Last Updated**: 2026-01-23

## 목표

Location Service를 CLAUDE.md 요구사항에 맞게 구현:
- HTTP(3003) + gRPC(5003) Hybrid 서버
- Redis Geohash 기반 위치 저장/검색
- 40k TPS 처리 목표

## 구현 순서

### Phase 1: 기반 설정
1. Proto 파일 설정 (libs/proto → apps/location-service/proto 복사)
2. Redis 모듈 연결
3. Hybrid 서버 설정 (HTTP 3003 + gRPC 5003)

### Phase 2: 핵심 기능
4. 위치 업데이트 API (HTTP POST /location)
5. 근처 라이더 검색 (gRPC GetNearbyRiders)

### Phase 3: 검증
6. 단위 테스트
7. E2E 테스트

## 기술 결정

| 항목 | 선택 | 근거 |
|------|------|------|
| Redis Client | ioredis | Geospatial 명령어 지원, 성능 |
| gRPC | @grpc/grpc-js | NestJS 공식 지원 |
| 위치 키 | `riders:locations` | CLAUDE.md 예시 준수 |

## 의존성 패키지

```bash
npm install ioredis @nestjs/microservices @grpc/grpc-js @grpc/proto-loader
npm install -D @types/ioredis
```
