# b-rider
배민 라이더 배차 서비스 구현




## 수평 확장 전략
rider-service에 트래픽이 몰려서 서버를 3대로 늘려야 한다고 가정해 봅시다.

Docker 빌드:
auth-service를 위한 Dockerfile을 작성할 때, 빌드 대상을 지정합니다.
nest build auth-service 명령어를 통해 dist/apps/auth-service만 빌드하여 이미지를 만듭니다.
배포 (Docker Compose / K8s):
docker-compose up --scale auth-service=3 명령어를 쓰거나, Kubernetes에서 replicas: 3으로 설정
API Gateway나 로드밸런서는 늘어난 3개의 auth-service로 요청을 분산
