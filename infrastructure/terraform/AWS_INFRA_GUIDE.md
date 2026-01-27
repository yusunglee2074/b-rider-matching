# 🏗️ B-Rider AWS 인프라 가이드

> EC2와 RDS만 써본 당신을 위한 친절한 AWS 인프라 설명서

---

## 🎯 한 줄 요약

**"컨테이너로 서비스를 나누고, 알아서 늘어나고 줄어드는 서버리스 인프라"**

---

## 🏠 비유로 이해하기: 아파트 단지 건설

우리가 만들 인프라를 **아파트 단지**에 비유해볼게요.

```
┌─────────────────────────────────────────────────────────────┐
│  🏘️ VPC (아파트 단지)                                        │
│                                                             │
│  ┌──────────────────┐    ┌──────────────────┐              │
│  │ 🚪 Public Subnet  │    │ 🔒 Private Subnet │              │
│  │   (정문/로비)      │    │   (실제 거주 공간)  │              │
│  │                  │    │                  │              │
│  │  ALB (경비실)     │    │  ECS (각 세대)     │              │
│  │                  │    │  RDS (관리사무소)  │              │
│  │                  │    │  Redis (택배함)   │              │
│  └──────────────────┘    └──────────────────┘              │
│                                                             │
│  🌐 Internet Gateway (단지 정문)                              │
│  🔄 NAT Gateway (택배 수령 창구)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📚 리소스별 상세 설명

### 1️⃣ VPC (Virtual Private Cloud)

**한 줄 설명**: 나만의 가상 네트워크 공간

**비유**: 🏘️ **아파트 단지 부지**
- 외부와 격리된 나만의 공간
- 이 안에서 모든 리소스가 살아감
- CIDR: `10.0.0.0/16` = 65,536개의 IP 주소 사용 가능

```
당신의 EC2 경험: EC2를 만들면 자동으로 기본 VPC에 들어갔죠?
이번엔 우리만의 VPC를 직접 만듭니다!
```

---

### 2️⃣ Subnet (서브넷)

**한 줄 설명**: VPC를 나눈 작은 네트워크 구역

**비유**: 🏢 **아파트 동(棟)**

| 종류 | 역할 | 비유 |
|------|------|------|
| **Public Subnet** | 인터넷과 직접 통신 | 1층 로비 (외부인 출입 가능) |
| **Private Subnet** | 인터넷과 직접 통신 불가 | 거주 층 (카드키 필요) |

```
왜 나누나요?
→ 보안! DB나 내부 서비스는 인터넷에서 직접 접근 못하게 숨깁니다.
```

**우리가 만들 서브넷**:
- Public Subnet 2개 (가용영역 A, C) - ALB가 여기 살아요
- Private Subnet 2개 (가용영역 A, C) - ECS, RDS, Redis가 여기 살아요

---

### 3️⃣ Internet Gateway (IGW)

**한 줄 설명**: VPC와 인터넷을 연결하는 관문

**비유**: 🚪 **아파트 단지 정문**

```
인터넷 ←→ [Internet Gateway] ←→ Public Subnet
```

이게 없으면 VPC는 완전히 고립된 섬이 됩니다.

---

### 4️⃣ NAT Gateway

**한 줄 설명**: Private Subnet이 인터넷에 나갈 수 있게 해주는 통로

**비유**: 📦 **택배 수령 창구**

```
Private Subnet의 서버가 npm install 하려면?
→ 인터넷에 나가야 함
→ 하지만 직접 나가면 보안 위험
→ NAT Gateway를 통해 "나가기만" 가능 (들어오기는 불가)
```

**중요**: NAT Gateway는 **시간당 과금** ($0.045/시간 ≈ $32/월)

---

### 5️⃣ ALB (Application Load Balancer)

**한 줄 설명**: 들어오는 요청을 여러 서버에 분배

**비유**: 🛎️ **호텔 프론트 데스크**

```
손님(요청)이 오면:
"3001호(서버1)로 가세요"
"3002호(서버2)로 가세요"
→ 골고루 분배!
```

**EC2와의 차이점**:
```
[기존 EC2 방식]
사용자 → EC2 (IP 직접 접속)

[ALB 방식]
사용자 → ALB → ECS 컨테이너들
              → 서버가 죽어도 다른 서버로 자동 연결
              → 서버 늘어나도 자동 분배
```

**Target Group**: ALB가 요청을 보낼 대상 그룹
- 우리는 API Gateway 컨테이너들을 Target Group에 등록

---

### 6️⃣ ECS (Elastic Container Service)

**한 줄 설명**: 컨테이너를 실행하고 관리하는 서비스

**비유**: 🏨 **호텔 객실 관리 시스템**

#### EC2 vs ECS 비교

```
[EC2 방식 - 직접 서버 관리]
1. EC2 인스턴스 생성
2. SSH 접속
3. Node.js 설치
4. 코드 배포
5. PM2로 실행
6. 서버 죽으면? 직접 재시작...

[ECS 방식 - 컨테이너 관리]
1. Docker 이미지 만들기
2. ECS에 "이 이미지 실행해줘" 요청
3. 끝! (알아서 실행, 알아서 재시작, 알아서 스케일링)
```

#### ECS 구성 요소

```
┌─────────────────────────────────────────────┐
│  ECS Cluster (호텔 건물)                      │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Service (객실 타입)                   │   │
│  │  "api-gateway 서비스는 2개 실행해"     │   │
│  │                                     │   │
│  │  ┌─────────┐  ┌─────────┐          │   │
│  │  │  Task   │  │  Task   │          │   │
│  │  │ (객실1) │  │ (객실2) │          │   │
│  │  └─────────┘  └─────────┘          │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

| 용어 | 설명 | 비유 |
|------|------|------|
| **Cluster** | ECS의 논리적 그룹 | 호텔 건물 |
| **Service** | 실행할 Task 수와 설정 | "스위트룸 2개 유지해" |
| **Task** | 실제 실행 중인 컨테이너 | 실제 객실 |
| **Task Definition** | 컨테이너 실행 설정서 | 객실 설계도 |

---

### 7️⃣ Fargate

**한 줄 설명**: 서버 없이 컨테이너만 실행

**비유**: 🚗 **렌터카 vs 자가용**

```
[EC2 + ECS = 자가용]
- EC2 인스턴스(서버)를 직접 관리
- 서버 용량, 패치, 보안 업데이트 직접 해야 함

[Fargate = 렌터카]  ← 우리가 사용할 방식
- 서버? 몰라도 됨
- "CPU 0.5개, 메모리 1GB 주세요" 하면 알아서 실행
- 쓴 만큼만 과금
```

---

### 8️⃣ ECR (Elastic Container Registry)

**한 줄 설명**: Docker 이미지 저장소

**비유**: 📸 **사진 클라우드 (Google Photos)**

```
[로컬]                    [ECR]                     [ECS]
Docker 이미지 빌드 → ECR에 push → ECS가 pull해서 실행

마치 사진 찍고 → 클라우드 업로드 → 다른 기기에서 보기
```

**우리가 만들 ECR 저장소 4개**:
- `b-rider/api-gateway`
- `b-rider/core-service`
- `b-rider/location-service`
- `b-rider/notification-worker`

---

### 9️⃣ RDS (Relational Database Service)

**한 줄 설명**: 관리형 데이터베이스

**이건 아시죠?** 😄

```
[직접 EC2에 PostgreSQL 설치]
- 설치, 백업, 패치, 복제... 다 직접

[RDS 사용]
- 클릭 몇 번이면 PostgreSQL 준비 완료
- 자동 백업, 자동 패치, 쉬운 스케일링
```

**우리 설정**:
- 엔진: PostgreSQL 16
- 인스턴스: db.t3.micro (프리티어 가능!)
- 스토리지: 20GB (자동 확장)

---

### 🔟 ElastiCache (Redis)

**한 줄 설명**: 관리형 인메모리 캐시

**비유**: 📮 **아파트 택배 보관함**

```
[Redis 용도 in B-Rider]
1. 캐시: 자주 쓰는 데이터 빠르게 조회
2. 분산 락: 동시에 같은 배차 수락 방지
3. Geohash: 라이더 위치 저장 (초고속 검색)
4. BullMQ: 알림 작업 큐
```

**RDS vs Redis**:
```
RDS (PostgreSQL): 영구 저장, 복잡한 쿼리 가능, 느림
Redis: 휘발성, 단순 조회, 엄청 빠름 (메모리 기반)
```

---

### 1️⃣1️⃣ Security Group

**한 줄 설명**: 가상 방화벽

**비유**: 🚨 **아파트 출입 통제 시스템**

```
[ALB Security Group]
- 80, 443 포트만 열림 (HTTP, HTTPS)
- 전 세계 누구나 접근 가능

[ECS Security Group]
- 3000-3003 포트만 열림
- ALB에서만 접근 가능 (외부 직접 접근 불가!)

[RDS Security Group]
- 5432 포트만 열림
- ECS에서만 접근 가능

[Redis Security Group]
- 6379 포트만 열림
- ECS에서만 접근 가능
```

**핵심**: 각 리소스는 필요한 곳에서만 접근 가능!

---

### 1️⃣2️⃣ Service Discovery

**한 줄 설명**: 서비스끼리 서로 찾을 수 있게 해주는 DNS

**비유**: 📞 **사내 전화번호부**

```
[문제]
Core Service가 Location Service를 호출하려면?
→ IP 주소가 필요한데... 컨테이너는 IP가 계속 바뀜!

[해결: Service Discovery]
Core Service: "location-service.b-rider.local 연결해줘"
AWS: "아, 그거 지금 IP가 10.0.10.55야"
→ 자동으로 연결!
```

---

### 1️⃣3️⃣ CloudWatch Logs

**한 줄 설명**: 로그 수집 및 조회 서비스

**비유**: 📹 **CCTV 녹화 시스템**

```
각 컨테이너의 console.log가 여기에 저장됨
→ AWS 콘솔에서 실시간 로그 확인 가능
→ 에러 발생 시 검색해서 원인 파악
```

---

### 1️⃣4️⃣ IAM Role

**한 줄 설명**: AWS 리소스 접근 권한

**비유**: 🎫 **직원 ID 카드**

```
[ECS Task Execution Role]
- ECR에서 이미지 pull 권한
- CloudWatch에 로그 쓰기 권한

[ECS Task Role]
- 실행 중인 컨테이너가 다른 AWS 서비스 접근할 때 사용
```

---

## 🔄 전체 흐름 이해하기

```
사용자 요청이 들어오면...

1. 🌐 인터넷
      ↓
2. 🚪 Internet Gateway (VPC 진입)
      ↓
3. 🛎️ ALB (Public Subnet)
      ↓ (어떤 컨테이너로 보낼지 결정)
4. 📦 API Gateway 컨테이너 (Private Subnet, ECS Fargate)
      ↓ (Service Discovery로 찾아서)
5. 📦 Core Service 컨테이너
      ↓
6. 💾 RDS (데이터 저장/조회)
   🚀 Redis (캐시/락/위치)
```

---

## 💰 비용 구조 이해하기

| 리소스 | 과금 방식 | 예상 비용 (월) |
|--------|----------|---------------|
| **NAT Gateway** | 시간 + 데이터 전송량 | ~$32 |
| **ALB** | 시간 + 처리량 | ~$16 |
| **ECS Fargate** | vCPU 시간 + 메모리 시간 | ~$30-50 |
| **RDS** | 인스턴스 시간 + 스토리지 | ~$15 |
| **ElastiCache** | 노드 시간 | ~$12 |
| **ECR** | 스토리지 (GB당) | ~$1 |
| **CloudWatch** | 로그 저장량 | ~$1-5 |

**총합: 약 $100-130/월** (dev 환경, 최소 사양)

---

## 🎓 EC2 경험자를 위한 핵심 차이점

| 항목 | EC2 직접 배포 | ECS Fargate |
|------|-------------|-------------|
| 서버 관리 | 직접 (SSH, 패치, 보안) | AWS가 알아서 |
| 스케일링 | 수동 or Auto Scaling 설정 | desired_count만 바꾸면 끝 |
| 배포 | SSH → git pull → pm2 restart | docker push → ECS 자동 배포 |
| 장애 복구 | 직접 모니터링 & 재시작 | 자동 재시작 |
| 비용 | 24시간 켜두면 24시간 과금 | 실행 시간만 과금 |

---

## 🚀 다음 단계

Terraform으로 이 모든 것을 **코드 한 줄**로 만들 수 있습니다:

```bash
terraform apply
```

그리고 필요 없어지면:

```bash
terraform destroy
```

**Infrastructure as Code**의 힘! 🎉

---

## 📖 더 알아보기

- [AWS VPC 공식 문서](https://docs.aws.amazon.com/vpc/)
- [ECS 시작하기](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
