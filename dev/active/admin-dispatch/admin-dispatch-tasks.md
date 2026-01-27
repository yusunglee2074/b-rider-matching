# Admin Dispatch 작업 체크리스트

**Last Updated**: 2026-01-27

## Phase 1: Offer 상태 확장

- [ ] `libs/database/src/entities/offer.entity.ts` 수정
  - [ ] `OfferStatus` enum에 `CANCELLED_BY_ADMIN` 추가

## Phase 2: Admin Guard 생성

- [ ] `apps/core-service/src/admin/guards/admin.guard.ts` 생성
  - [ ] `@Injectable()` Guard 클래스
  - [ ] JWT payload에서 role 확인
  - [ ] role !== 'admin'이면 ForbiddenException

- [ ] `apps/core-service/src/admin/decorators/roles.decorator.ts` 생성
  - [ ] `@Roles('admin')` 커스텀 데코레이터

## Phase 3: Admin Module 구조 생성

- [ ] `apps/core-service/src/admin/admin.module.ts` 생성
  - [ ] AdminController 등록
  - [ ] AdminService 등록
  - [ ] OfferModule, DeliveryModule, RiderModule import

- [ ] `apps/core-service/src/app.module.ts` 수정
  - [ ] AdminModule import 추가

## Phase 4: DTO 생성

- [ ] `apps/core-service/src/admin/dto/assign-delivery.dto.ts` 생성
  - [ ] riderId: string (required)
  - [ ] reason?: string (optional)

- [ ] `apps/core-service/src/admin/dto/reassign-delivery.dto.ts` 생성
  - [ ] newRiderId: string (required)
  - [ ] reason?: string (optional)

## Phase 5: Admin Service 구현

- [ ] `apps/core-service/src/admin/admin.service.ts` 생성
  - [ ] `assignDelivery(deliveryId, riderId, reason)` 메서드
    - [ ] 배달 존재 확인
    - [ ] 배달 상태 확인 (PENDING만 가능)
    - [ ] 기존 PENDING 오퍼 취소
    - [ ] 새 오퍼 생성 (타임아웃 없음)
    - [ ] 알림 발송
  - [ ] `reassignDelivery(deliveryId, newRiderId, reason)` 메서드
    - [ ] 현재 ACCEPTED 오퍼 찾기
    - [ ] 기존 오퍼 CANCELLED_BY_ADMIN으로 변경
    - [ ] 배달 상태 PENDING으로 변경
    - [ ] 새 오퍼 생성
    - [ ] 양쪽 라이더에게 알림
  - [ ] `cancelOffer(offerId, reason)` 메서드
    - [ ] 오퍼 CANCELLED_BY_ADMIN으로 변경
  - [ ] `getDashboard()` 메서드
    - [ ] 각종 카운트 집계

## Phase 6: Admin Controller 구현

- [ ] `apps/core-service/src/admin/admin.controller.ts` 생성
  - [ ] `@Controller('admin')` 설정
  - [ ] `@UseGuards(JwtAuthGuard, AdminGuard)` 적용
  - [ ] `POST /admin/deliveries/:id/assign` 엔드포인트
  - [ ] `POST /admin/deliveries/:id/reassign` 엔드포인트
  - [ ] `DELETE /admin/offers/:id` 엔드포인트
  - [ ] `GET /admin/dashboard` 엔드포인트

## Phase 7: API Gateway 프록시 설정

- [ ] `apps/api-gateway/src/proxy/proxy.controller.ts` 확인
  - [ ] `/admin/*` 경로 프록시 설정 확인/추가

## Phase 8: 테스트

- [ ] 단위 테스트
  - [ ] AdminService 각 메서드 테스트
  - [ ] AdminGuard 테스트

- [ ] 통합 테스트
  - [ ] 어드민 토큰으로 수동 배차
  - [ ] 비어드민 토큰으로 접근 시 403
  - [ ] 재할당 플로우 테스트

## 완료 조건

1. 어드민만 /admin/* 엔드포인트 접근 가능
2. 수동 배차 시 오퍼 생성 및 알림 발송
3. 재할당 시 기존 오퍼 취소 및 새 오퍼 생성
4. 대시보드에서 현황 조회 가능

## 블로커

- 없음 (독립적으로 구현 가능)
