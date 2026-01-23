# b-rider
배민 라이더 배차 서비스 구현
본 프로젝트는 배달의 민족과 같은 배달앱에 주문과 라이더를 매칭하는 배차 시스템입니다.

- 강한 결합이 필요한 도메인(Rider, Delivery, Offer, Store)은 **Modular Monolith**로 통합
- 독립적 스케일링이 필요한 서비스(Location, Notification)는 **별도 서비스**로 분리
- 서비스 간 통신은 **HTTP, gRPC, BullMQ**를 목적에 맞게 혼용

* **핵심 기술 스택:** Nest.js (Backend), Redis (Geospatial & Locking), PostgreSQL, AWS API Gateway, AWS ECS, ECR, gRPC
* **개발 목표:**  
* 초당 수십만 건의 라이더 위치 업데이트 트래픽 처리.  
* 중복 배차 방지 및 동시성 제어.
* 어드민 수동 배차 조정 기능 구현
* 매칭 알고리즘의 구체 기준/가중치(거리, 가용성, 선호, 평점 등)는 “정교한 알고리즘(추상화)”로 처리, MVP에서는 룰 기반 스코어링으로 시작하는 식의 정의가 필요


## 1. 요구사항

### 기능적 요구사항
- 라이더는 출근 버튼을 눌러서 자동 배차를 받을 수 있다. 이는 10초 내 수락/거절을 할 수 있다.
- 라이더는 자동배차를 수락하고 픽업전 취소 요청 할 수 있다.
- 어드민은 수동으로 특정 배차를 취소 할 수 있다.
- 어드민은 특정 배차를 특정 라이더에게 할당 할 수 있다.
- 라이더 위치를 볼 수 있다.
### 비기능적 요구사항
- 특정 주문은 한명의 라이더에게 매칭 되도록 일관성을 고려한다.
- 매칭을 제외한 기능들은 가용성을 우선으로 개발한다.
- 피크 시간대 튀는 트래픽을 수용할 수 있도록 스케일링을 적용한다.

## 2. 핵심 Entities
- Rider
  - id
  - name
  - status: "배달중" | "오프라인" | "대기중" ...
  - metadata...

- Delivery
  - id
  - store_id
  - pickup_lat
  - pickup_long
  - dest_lat
  - dest_long
  - ETA
  - status: "대기" | "완료" | "배달중" | "매칭중"
  - created_at
- Location
  - lat
  - long
- Store
  - id
  - name
  - lat
  - long
  - metadata...
- DeliveryOffer
  - id
  - rider_id
  - delivery_id
  - status: "응답대기" | "거절" | "승락"
  - offered_at
  - reject_at
  - 
  

- Customer
  - id
  - name
  - metadata...
- Orders
  - id
  - customer_id
  - weight
  - etc...

## 3. 핵심 API
### 핵심 API 명세 요약

**가게(Store)**
- `PATCH /stores/deliveries/{delivery_id}`
  - Body: `{ estimate_mins_cook_done }`

**라이더(Rider)**
- `POST /rider/start-work` (Header: JWT token)
- `PATCH /locations` -> 200
  - Body: `{ lat, long }`
- `PATCH /delivery-offers/{offer_id}/accept` -> 200
  - Body: `{ accept: true or false }`
- `GET /delivery-offers` -> Offer[]
- `PATCH /delivery-offers/{offer_id}` -> Offer
  - Body: `{ status: "픽업완료" | "배달완료" }`

**어드민(Admin)**
- `PATCH /admin/delivery-offers/{offer_id}/cancel`
- `PATCH /admin/delivery-offers/{offer_id}/assign`
  - Body: `{ rider_id }`


## 4. High 레벨 디자인
```mermaid
flowchart LR
    %% 스타일 정의
    classDef client fill:#fff,stroke:#333,stroke-width:2px,rx:10,ry:10
    classDef gateway fill:#fff,stroke:#333,stroke-width:2px,rx:10,ry:10
    classDef service fill:#fff,stroke:#333,stroke-width:2px,rx:10,ry:10
    classDef database fill:#fff,stroke:#333,stroke-width:2px,shape:cylinder
    classDef external fill:#fff,stroke:#333,stroke-width:2px,rx:10,ry:10

    %% 1. 사용자/클라이언트 (좌측)
    subgraph Clients [Clients]
        direction TB
        Rider[라이더]:::client
        Customer[고객]:::client
        Store[스토어]:::client
        Admin[어드민]:::client
    end

    %% 2. 외부 알림 서비스 (하단)
    ExtNotif[외부 알림 서비스<br/>FCM, APN, 문자...]:::external

    %% 3. AWS API 게이트웨이
    AWS_Gateway[AWS<br/>API 게이트웨이<br/>로드밸런싱<br/>SSL 터미네이션<br/>Authentication]:::gateway

    %% 4. Nest.js 게이트웨이
    Nest_Gateway[Nest.js 게이트웨이<br/>Authorization<br/>Data aggregation]:::gateway

    %% 5. 마이크로서비스 (중앙)
    subgraph Services [Microservices]
        direction TB
        DeliverySvc[배달경로 Delivery 서비스]:::service
        RiderSvc[라이더 서비스]:::service
        LocSvc[위치 서비스]:::service
        OfferSvc[배달 오퍼 매칭 서비스]:::service
        StoreSvc[스토어 서비스]:::service
        AdminSvc[어드민 서비스]:::service
        NotifSvc[알림 서비스]:::service
    end

    %% 6. Mock 서비스 (상단)
    MockOrder[Mock 주문 서비스]:::external
    MockRoute[Mock 외부 길찾기 서비스]:::external

    %% 7. 데이터베이스 (우측)
    Postgres[(PostgreSQL)]:::database
    Redis[(Redis)]:::database
    LocDB[(Location DB<br/>Redis cluster)]:::database

    %% 8. 주석 (우측 하단)
    NoteRight[동시 20만명 라이더<br/>5초마다 업데이트<br/>TPS= 200k / 5 = 40k]:::text
    LocDB -.- NoteRight

    %% --- 연결 관계 (Relationships) ---

    %% 클라이언트 <-> AWS 게이트웨이
    Rider <--> AWS_Gateway
    Customer <--> AWS_Gateway
    Store <--> AWS_Gateway
    Admin <--> AWS_Gateway

    %% AWS 게이트웨이 <-> Nest 게이트웨이
    AWS_Gateway <--> Nest_Gateway

    %% Nest 게이트웨이 <-> 서비스들
    Nest_Gateway -->|자동 매칭 수락/거절<br/>일반 배달경로 조회| DeliverySvc
    Nest_Gateway <-->|출근/퇴근| RiderSvc
    Nest_Gateway -->|위치 업데이트| LocSvc
    Nest_Gateway -->|조리완료예정 업데이트| StoreSvc
    Nest_Gateway -->|배차 수동 수정| AdminSvc
    
    %% Mock 서비스 연결
    MockOrder --> DeliverySvc
    MockRoute <--> DeliverySvc

    %% 서비스 간 연결 및 DB 연결
    DeliverySvc --> Postgres
    DeliverySvc -->|경로 or 경로묶음 + 라이더 매칭 요청| OfferSvc
    
    RiderSvc --> Postgres

    LocSvc -->|SET rider_id, true expire 10s, 매칭 수락 여부<br/>OR dynamodb for ttl driver_lock collection| Redis
    LocSvc --> LocDB

    OfferSvc --> Redis
    OfferSvc -->|라이더 위치 조회| LocDB
    OfferSvc -->|자동매칭 알림| NotifSvc

    %% 알림 서비스 -> 외부 알림 -> 클라이언트 (피드백 루프)
    NotifSvc --> ExtNotif
    ExtNotif --> Rider
    ExtNotif --> Customer
    ExtNotif --> Store
    ExtNotif --> Admin
```
## 5. low 레벨 디자인
### location DB 선택
| **비교 항목** | **1. RDBMS (Naive)**                           | **2. PostGIS (Spatial DB)**                     | **3. Redis (In-Memory)**                           |
| --------- | ---------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| **기술 스택** | PostgreSQL + B-Tree                            | PostgreSQL + GIST(R-Tree)                       | **Redis + Geohash**                                |
| **작동 원리** | `lat`, `lon` 컬럼에 각각 인덱스 생성 후 범위 검색 (`BETWEEN`) | 공간 데이터를 위한 특수 자료구조(R-Tree) 사용하여 2차원 검색 최적화      | 위도/경도를 문자열(Geohash)로 변환하여 **ZSET(Sorted Set)**에 저장 |
| **장점**    | 구현이 매우 단순함. 별도 확장이 필요 없음.                      | 복잡한 지리 연산(다각형 포함 여부 등)에 최적화됨. 데이터 영속성 보장.       | **압도적인 쓰기/읽기 속도.** 구현이 간편하며 TTL 설정 용이.             |
| **단점**    | **성능 최악.** 두 인덱스의 교집합(Intersection) 연산 비용이 큼.  | **업데이트 비용이 매우 비쌈.** 잦은 위치 변경 시 인덱스 재구성 오버헤드 발생. | 메모리 비용 발생. 서버 다운 시 일부 데이터 휘발 가능성 (AOF로 보완).        |










## MVP 외 추가 기능

### 시스템 회복 탄력성, 서킷 브레이커(Circuit Breaker) 및 데드 레터 큐(DLQ)를 활용한 장애 격리.

### 지역 기반 인스턴스 복제 배포

### 알뜰 배달
* 한집 배달, 알뜰 배달(구간 배달) 구분 구현
* 자동 알뜰 배달 묶음 기능
* 가게 조리 완료 시간 고려
* 라이더는 배차들 목록 중에서 선택해서 일반 배차 기능을 사용 할 수 있다.



### 수평 확장 전략
* **Stateless Architecture:** 각 서비스들은 상태를 로컬 메모리에 저장하지 않고 Redis와 DB로 위임하여, 트래픽 급증 시 즉각적인 오토 스케일링이 가능하도록 설계
* **Event-Driven Communication:** 서비스 간 통신은 Kafka를 통해 비동기로 처리하여, 주문 폭주 시에도 시스템 전체가 셧다운되지 않고 큐(Queue)에 쌓아두어 처리량을 조절


## 기타 다이어그램

![version2 high-level-design](public/v2-high-level-design.png)
