# Phase 1: 컨텍스트

## 핵심 파일

### Database
- `libs/database/src/database.module.ts` - TypeORM 설정
- `libs/database/src/entities/rider.entity.ts` - 라이더 엔티티
- `libs/database/src/entities/store.entity.ts` - 가맹점 엔티티
- `libs/database/src/entities/delivery.entity.ts` - 배달 엔티티
- `libs/database/src/entities/offer.entity.ts` - 배차 엔티티
- `libs/database/src/entities/index.ts` - 엔티티 export
- `libs/database/src/index.ts` - 라이브러리 진입점

### Common
- `libs/common/src/services/redis-lock.service.ts` - 분산 락 서비스
- `libs/common/src/dto/*.dto.ts` - 공통 DTO
- `libs/common/src/index.ts` - 라이브러리 진입점

## 결정 사항

1. **엔티티 ID**: UUID 사용 (PrimaryGeneratedColumn('uuid'))
2. **좌표 타입**: decimal(10, 7) - 소수점 7자리 정밀도
3. **Enum 저장**: PostgreSQL enum 타입 사용
4. **락 TTL**: 기본 10초 (배차 수락 제한 시간과 동일)
5. **모듈 시스템**: ESM (.js 확장자 사용)

## 의존성
- @nestjs/typeorm, typeorm, pg
- ioredis
- class-validator, class-transformer

Last Updated: 2026-01-23
