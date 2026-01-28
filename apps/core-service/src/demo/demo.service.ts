import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store, Rider, Delivery, Offer, RiderStatus, DeliveryStatus, OfferStatus } from '@app/database';

// Seoul area demo coordinates
const SEOUL_CENTER = { lat: 37.5665, lng: 126.978 };

const DEMO_STORES = [
  { name: '맛있는 치킨', address: '서울시 강남구 역삼동 123', category: '치킨', phone: '02-1234-5678' },
  { name: '행복한 피자', address: '서울시 강남구 삼성동 456', category: '피자', phone: '02-2345-6789' },
  { name: '신선한 초밥', address: '서울시 서초구 서초동 789', category: '일식', phone: '02-3456-7890' },
  { name: '든든한 국밥', address: '서울시 강남구 논현동 321', category: '한식', phone: '02-4567-8901' },
  { name: '매콤한 떡볶이', address: '서울시 서초구 반포동 654', category: '분식', phone: '02-5678-9012' },
];

const DEMO_RIDERS = [
  { name: '김배달', phone: '010-1111-1111' },
  { name: '이라이더', phone: '010-2222-2222' },
  { name: '박퀵', phone: '010-3333-3333' },
  { name: '최배송', phone: '010-4444-4444' },
  { name: '정빠른', phone: '010-5555-5555' },
];

@Injectable()
export class DemoService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepository: Repository<Store>,
    @InjectRepository(Rider)
    private readonly riderRepository: Repository<Rider>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    @InjectRepository(Offer)
    private readonly offerRepository: Repository<Offer>,
  ) {}

  async seedDemoData() {
    // Clear existing demo data first
    await this.resetDemoData();

    // Create stores with random positions around Seoul center
    const stores = await Promise.all(
      DEMO_STORES.map((storeData) => {
        const store = this.storeRepository.create({
          ...storeData,
          latitude: SEOUL_CENTER.lat + (Math.random() - 0.5) * 0.02,
          longitude: SEOUL_CENTER.lng + (Math.random() - 0.5) * 0.02,
        });
        return this.storeRepository.save(store);
      }),
    );

    // Create riders with random positions and AVAILABLE status
    const riders = await Promise.all(
      DEMO_RIDERS.map((riderData) => {
        const rider = this.riderRepository.create({
          ...riderData,
          status: RiderStatus.AVAILABLE,
          latitude: SEOUL_CENTER.lat + (Math.random() - 0.5) * 0.03,
          longitude: SEOUL_CENTER.lng + (Math.random() - 0.5) * 0.03,
        });
        return this.riderRepository.save(rider);
      }),
    );

    return {
      success: true,
      message: '데모 데이터가 생성되었습니다',
      data: {
        stores: stores.length,
        riders: riders.length,
      },
    };
  }

  async seedBulkData(storeCount = 20, riderCount = 50, deliveryCount = 0) {
    // Generate bulk stores
    const storeNames = ['치킨', '피자', '초밥', '국밥', '떡볶이', '햄버거', '중식', '분식', '카페', '베이커리'];

    const stores: Store[] = [];
    for (let i = 0; i < storeCount; i++) {
      const idx = i % storeNames.length;
      const store = this.storeRepository.create({
        name: `${storeNames[idx]} ${i + 1}호점`,
        address: `서울시 강남구 테헤란로 ${100 + i}`,
        phone: `02-${String(1000 + i).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        latitude: SEOUL_CENTER.lat + (Math.random() - 0.5) * 0.04,
        longitude: SEOUL_CENTER.lng + (Math.random() - 0.5) * 0.04,
      });
      stores.push(store);
    }
    await this.storeRepository.save(stores);

    // Generate bulk riders
    const riderLastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임'];
    const riderFirstNames = ['배달', '라이더', '퀵', '배송', '빠른', '신속', '번개', '로켓', '스피드', '플래시'];

    const riders: Rider[] = [];
    for (let i = 0; i < riderCount; i++) {
      const lastName = riderLastNames[i % riderLastNames.length];
      const firstName = riderFirstNames[Math.floor(i / riderLastNames.length) % riderFirstNames.length];
      const rider = this.riderRepository.create({
        name: `${lastName}${firstName}${Math.floor(i / 100) > 0 ? Math.floor(i / 100) + 1 : ''}`,
        phone: `010-${String(1000 + i).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        status: RiderStatus.AVAILABLE,
        latitude: SEOUL_CENTER.lat + (Math.random() - 0.5) * 0.05,
        longitude: SEOUL_CENTER.lng + (Math.random() - 0.5) * 0.05,
      });
      riders.push(rider);
    }
    await this.riderRepository.save(riders);

    // Generate bulk deliveries if requested
    const deliveries: Delivery[] = [];
    if (deliveryCount > 0 && stores.length > 0) {
      for (let i = 0; i < deliveryCount; i++) {
        const store = stores[i % stores.length];
        const delivery = this.deliveryRepository.create({
          storeId: store.id,
          pickupAddress: store.address,
          pickupLatitude: store.latitude,
          pickupLongitude: store.longitude,
          dropoffAddress: `서울시 강남구 역삼동 ${100 + Math.floor(Math.random() * 500)}`,
          dropoffLatitude: SEOUL_CENTER.lat + (Math.random() - 0.5) * 0.03,
          dropoffLongitude: SEOUL_CENTER.lng + (Math.random() - 0.5) * 0.03,
          status: DeliveryStatus.PENDING,
        });
        deliveries.push(delivery);
      }
      await this.deliveryRepository.save(deliveries);
    }

    return {
      success: true,
      message: '대규모 데모 데이터가 생성되었습니다',
      data: {
        stores: stores.length,
        riders: riders.length,
        deliveries: deliveries.length,
      },
    };
  }

  async resetDemoData() {
    // Delete in order due to foreign key constraints
    // Use createQueryBuilder for bulk delete without criteria
    await this.offerRepository.createQueryBuilder().delete().execute();
    await this.deliveryRepository.createQueryBuilder().delete().execute();
    await this.riderRepository.createQueryBuilder().delete().execute();
    await this.storeRepository.createQueryBuilder().delete().execute();

    return {
      success: true,
      message: '데모 데이터가 초기화되었습니다',
    };
  }

  async getSystemMetrics() {
    const [
      activeRiders,
      pendingDeliveries,
      activeOffers,
      completedToday,
    ] = await Promise.all([
      this.riderRepository.count({ where: { status: RiderStatus.AVAILABLE } }),
      this.deliveryRepository.count({ where: { status: DeliveryStatus.PENDING } }),
      this.offerRepository.count({ where: { status: OfferStatus.PENDING } }),
      this.deliveryRepository.count({
        where: {
          status: DeliveryStatus.DELIVERED,
        },
      }),
    ]);

    return {
      activeRiders,
      pendingDeliveries,
      activeOffers,
      completedToday,
      avgDeliveryTime: 25, // Mock average in minutes
      redisConnections: 3,
      lockAcquisitions: Math.floor(Math.random() * 100) + 50,
    };
  }
}
