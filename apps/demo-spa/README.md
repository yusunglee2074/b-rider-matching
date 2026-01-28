# B-Rider Demo SPA

면접관이 B-Rider 배달 배차 시스템을 웹에서 직접 시연하고 조작할 수 있는 SPA입니다.

## 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **상태관리**: Zustand + React Query
- **스타일링**: Tailwind CSS v4
- **지도**: Kakao Maps JavaScript API
- **실시간**: Polling (2초 간격)

## 로컬 개발

### 사전 요구사항

1. Node.js 20+
2. 백엔드 서비스 실행 중 (API Gateway, Core Service)
3. Kakao Maps API 키

### 환경 설정

`index.html`에서 Kakao Maps API 키를 설정하세요:

```html
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_APP_KEY&autoload=false"></script>
```

### 실행

```bash
# 프로젝트 루트에서
npm run demo:dev

# 또는 demo-spa 디렉토리에서
cd apps/demo-spa
npm install
npm run dev
```

http://localhost:5173 에서 접속

### 빌드

```bash
npm run demo:build
```

## 기능

### 시나리오 모드

1. **빠른 데모 (자동)**: 2분 내 전체 배달 플로우 자동 시연
   - 데이터 시드 → 배달 생성 → 자동배차 → 오퍼 수락 → 픽업 → 배달완료

2. **수동 모드**: 직접 조작
   - 가게 클릭 → 배달 생성
   - 라이더 상태 변경
   - 오퍼 수락/거절

### UI 구성

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: B-Rider 데모 | 실시간 통계                              │
├──────────────┬──────────────────────────────────────┬───────────┤
│   컨트롤     │              지도 뷰                 │  활동     │
│   패널       │   - 가게 마커 (파란색)               │  피드     │
│              │   - 라이더 마커 (상태별 색상)        │           │
│   - 시나리오 │   - 배달 경로 (점선)                 │  - 이벤트 │
│   - 빠른액션 │                                      │  - 로그   │
└──────────────┴──────────────────────────────────────┴───────────┘
│  하단 패널: 아키텍처 다이어그램 | API 로그 | Redis 상태          │
└─────────────────────────────────────────────────────────────────┘
```

## 배포

### AWS S3 + CloudFront

```bash
# Terraform으로 인프라 생성
cd infrastructure/terraform/environments/prod
terraform apply -target=module.spa

# 빌드 및 배포
npm run demo:build
aws s3 sync apps/demo-spa/dist/ s3://b-rider-demo-spa-prod --delete
```

### GitHub Actions

`main` 브랜치에 `apps/demo-spa/` 변경사항 푸시 시 자동 배포됩니다.

필요한 Secrets:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `CLOUDFRONT_DISTRIBUTION_ID`
- `KAKAO_APP_KEY`

## 프로젝트 구조

```
apps/demo-spa/
├── src/
│   ├── components/
│   │   ├── layout/      # Header, ControlPanel, BottomPanel
│   │   ├── map/         # KakaoMap
│   │   └── feed/        # ActivityFeed
│   ├── hooks/           # usePolling
│   ├── stores/          # Zustand stores
│   ├── api/             # API clients
│   ├── scenarios/       # 자동 데모 시나리오
│   ├── types/           # TypeScript 타입
│   └── lib/             # 유틸리티
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```
