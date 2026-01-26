# Location Service Setup Tasks

**Last Updated**: 2026-01-23

## Phase 1: 기반 설정

- [x] **Task 1.1**: Proto 파일 설정
  - [x] libs/proto/location.proto 확인 또는 생성
  - [x] apps/location-service/proto/ 디렉토리 생성
  - [x] Proto 파일 복사

- [x] **Task 1.2**: Redis 모듈 연결
  - [x] ioredis 패키지 설치
  - [x] Redis 모듈 생성 (apps/location-service/src/redis/)
  - [x] 환경 변수 설정

- [x] **Task 1.3**: Hybrid 서버 설정
  - [x] @nestjs/microservices, @grpc/grpc-js, @grpc/proto-loader 설치
  - [x] main.ts 수정 (HTTP 3003 + gRPC 5003)
  - [x] nest-cli.json assets 설정 (proto 파일 복사)
  - [x] 빌드 확인

## Phase 2: 핵심 기능

- [x] **Task 2.1**: 위치 업데이트 API (HTTP)
  - [x] DTO 생성 (UpdateLocationDto)
  - [x] location.controller.ts 수정 (POST /location)
  - [x] location.service.ts에 updateLocation 메서드 구현
  - [x] Redis GEOADD 연동

- [x] **Task 2.2**: 근처 라이더 검색 (gRPC)
  - [x] location.grpc.controller.ts 생성
  - [x] GetNearbyRiders 핸들러 구현
  - [x] location.service.ts에 getNearbyRiders 메서드 구현
  - [x] Redis GEORADIUS 연동

## Phase 3: 검증

- [x] **Task 3.1**: 단위 테스트
  - [x] location.service.spec.ts 작성
  - [x] location.controller.spec.ts 수정
  - [x] Redis mock 설정

- [x] **Task 3.2**: E2E 테스트
  - [x] HTTP 엔드포인트 테스트
  - [x] Redis mock으로 의존성 분리

---

## 진행 로그

| 날짜 | 완료 태스크 | 비고 |
|------|-------------|------|
| 2026-01-23 | 태스크 문서 생성 | 초기 설정 |
| 2026-01-23 | Phase 1, 2 완료 | 빌드 성공 |
| 2026-01-23 | Phase 3 완료 | 모든 테스트 통과 |
