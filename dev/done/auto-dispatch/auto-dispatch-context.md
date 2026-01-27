# Auto-Dispatch 컨텍스트

**Last Updated**: 2026-01-27

## 핵심 파일

### 수정 대상
| 파일 | 역할 | 변경 내용 |
|------|------|----------|
| `apps/core-service/src/delivery/delivery.service.ts` | 배달 서비스 | create() 후 auto-dispatch 호출 |
| `apps/core-service/src/delivery/delivery.module.ts` | 배달 모듈 | AutoDispatchService 의존성 추가 |

### 신규 생성
| 파일 | 역할 |
|------|------|
| `apps/core-service/src/offer/auto-dispatch.service.ts` | 자동 배차 로직 |

### 참조 파일
| 파일 | 역할 |
|------|------|
| `apps/core-service/src/offer/offer.service.ts` | 오퍼 생성 로직 |
| `apps/core-service/src/offer/location-grpc.client.ts` | gRPC 클라이언트 |
| `apps/core-service/src/offer/offer.module.ts` | 오퍼 모듈 구조 |
| `libs/database/src/entities/delivery.entity.ts` | 배달 엔티티 |
| `libs/database/src/entities/offer.entity.ts` | 오퍼 엔티티 |

## 기존 코드 분석

### Location gRPC 클라이언트 (이미 구현됨)
```typescript
// apps/core-service/src/offer/location-grpc.client.ts
@Injectable()
export class LocationGrpcClient implements OnModuleInit {
  async findNearbyRiders(latitude: number, longitude: number, radiusKm: number)
}
```

### OfferService.create() (이미 구현됨)
```typescript
// apps/core-service/src/offer/offer.service.ts
async create(createOfferDto: CreateOfferDto): Promise<Offer>
```

### DeliveryService.create() (수정 필요)
```typescript
// apps/core-service/src/delivery/delivery.service.ts
async create(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
  // 현재: 배달만 생성
  // 변경: 배달 생성 후 auto-dispatch 호출
}
```

## 설정값

```typescript
// 환경변수 또는 상수
AUTO_DISPATCH_RADIUS_KM = 3        // 검색 반경
AUTO_DISPATCH_MAX_RIDERS = 10     // 최대 검색 수
```

## 결정 사항

| 결정 | 선택 | 근거 |
|------|------|------|
| 동기/비동기 | 동기식 | 단순함, 포트폴리오 목적 |
| 오퍼 생성 수 | 1명 (순차) | 중복 배차 방지, 타임아웃 후 재배차 |
| 실패 처리 | 배달은 생성, 오퍼 실패 로깅 | 배달 생성이 더 중요 |

## 관련 ADR

- `docs/adr/` - 하이브리드 아키텍처 결정
- gRPC 선택 이유: 고빈도 호출, 저지연

## 테스트 시나리오

1. 배달 생성 → 근처 라이더 있음 → 오퍼 생성됨
2. 배달 생성 → 근처 라이더 없음 → 배달만 생성, 오퍼 없음
3. 배달 생성 → Location Service 장애 → 배달 생성, 오퍼 실패 로깅
4. 배달 생성 → 라이더 모두 BUSY → 오퍼 생성 안됨 (availability filter 연계)
