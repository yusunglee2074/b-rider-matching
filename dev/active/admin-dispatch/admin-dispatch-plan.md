# Admin Dispatch 시스템 구현 계획

**Last Updated**: 2026-01-27

## 개요

관리자가 수동으로 배달을 특정 라이더에게 배차하거나, 기존 배차를 취소/재할당하는 기능

## 현재 상태

- 오퍼 CRUD: ✓ 구현됨
- 배달 상태 관리: ✓ 구현됨
- JWT 인증 (role 포함): ✓ 구현됨
- **어드민 전용 엔드포인트: ❌ 없음**
- **수동 배차/재할당 로직: ❌ 없음**

## 구현 방향

### 어드민 모듈 구조
```
apps/core-service/src/admin/
├── admin.module.ts
├── admin.controller.ts        # 어드민 전용 엔드포인트
├── admin.service.ts           # 수동 배차/재할당 로직
└── guards/
    └── admin.guard.ts         # role=admin 체크
```

### API 엔드포인트
```
POST   /admin/deliveries/:id/assign      # 수동 배차
POST   /admin/deliveries/:id/reassign    # 재할당 (기존 오퍼 취소 + 새 오퍼)
DELETE /admin/offers/:id                 # 오퍼 취소
GET    /admin/dashboard                  # 대시보드 데이터
```

## 구현 단계

### Phase 1: Admin Guard 생성
1. `AdminGuard` 생성 - JWT payload의 role 확인
2. `@Roles('admin')` 데코레이터 생성

### Phase 2: Admin Module 생성
1. `AdminModule` 생성
2. `AdminController` - 엔드포인트 정의
3. `AdminService` - 비즈니스 로직

### Phase 3: 수동 배차 구현
1. `POST /admin/deliveries/:id/assign`
   - 배달 ID + 라이더 ID 받음
   - 기존 PENDING 오퍼 있으면 취소
   - 새 오퍼 생성 (타임아웃 없이 또는 더 긴 타임아웃)
   - 라이더에게 알림

### Phase 4: 재할당 구현
1. `POST /admin/deliveries/:id/reassign`
   - 현재 배차된 라이더의 오퍼 취소
   - 새 라이더에게 오퍼 생성
   - 양쪽 라이더에게 알림

### Phase 5: 대시보드 API
1. `GET /admin/dashboard`
   - 활성 배달 수
   - 가용 라이더 수
   - 대기 중 오퍼 수

## 비즈니스 규칙

1. 어드민 수동 배차는 자동 배차보다 우선
2. 재할당 시 기존 오퍼는 `CANCELLED_BY_ADMIN` 상태
3. 수동 배차 오퍼는 타임아웃 없음 (또는 더 긴 시간)
4. 모든 어드민 액션은 로깅

## 의존성

- JWT 인증 시스템 (구현됨)
- 오퍼 서비스 (구현됨)
- 알림 시스템 (구현됨)
