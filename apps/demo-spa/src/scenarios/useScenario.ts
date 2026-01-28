import { useCallback } from 'react';
import { useAppStore } from '@/stores';
import { demoApi, ridersApi, storesApi, deliveriesApi, offersApi } from '@/api';

const DEMO_DELAY = 3000; // 3 seconds between steps

export function useScenario() {
  const {
    setDemoStep,
    setDemoProgress,
    setDemoRunning,
    addEvent,
    setRiders,
    setStores,
    setDeliveries,
    setOffers,
  } = useAppStore();

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runAutoScenario = useCallback(async () => {
    try {
      setDemoRunning(true);

      // Step 1: Seed data
      setDemoStep('seeding');
      setDemoProgress(10);
      addEvent('DELIVERY_CREATED', '데모 데이터 생성 시작...');

      await demoApi.seed();
      await delay(DEMO_DELAY);

      // Fetch initial data
      const [riders, stores] = await Promise.all([
        ridersApi.getAll(),
        storesApi.getAll(),
      ]);
      setRiders(riders);
      setStores(stores);
      addEvent('DELIVERY_CREATED', `${stores.length}개 가게, ${riders.length}명 라이더 생성됨`);

      // Step 2: Create delivery
      setDemoStep('creating_delivery');
      setDemoProgress(25);

      const store = stores[0];
      if (!store) throw new Error('No stores available');

      const delivery = await deliveriesApi.create({
        storeId: store.id,
        pickupAddress: store.address,
        pickupLatitude: parseFloat(String(store.latitude)),
        pickupLongitude: parseFloat(String(store.longitude)),
        dropoffAddress: '서울시 강남구 테헤란로 123',
        dropoffLatitude: 37.5665 + (Math.random() - 0.5) * 0.02,
        dropoffLongitude: 126.978 + (Math.random() - 0.5) * 0.02,
      });

      addEvent('DELIVERY_CREATED', `새 배달 생성: ${store.name} → 강남구`);
      setDeliveries([delivery]);
      await delay(DEMO_DELAY);

      // Step 3: Matching (auto-dispatch)
      setDemoStep('matching');
      setDemoProgress(40);
      addEvent('LOCK_ACQUIRED', '분산락 획득: 배차 매칭 시작');
      await delay(1500);

      // Fetch offers (auto-created by backend)
      const offers = await offersApi.getAll();
      setOffers(offers);

      if (offers.length > 0) {
        setDemoStep('offer_sent');
        setDemoProgress(50);
        addEvent('OFFER_SENT', `라이더에게 오퍼 전송됨 (10초 제한)`);
        addEvent('LOCK_RELEASED', '분산락 해제');
        await delay(DEMO_DELAY);

        // Step 4: Accept offer
        const offer = offers[0];
        await offersApi.accept(offer.id);

        setDemoStep('offer_accepted');
        setDemoProgress(60);
        addEvent('OFFER_ACCEPTED', '라이더가 오퍼를 수락했습니다');
        await delay(DEMO_DELAY);

        // Step 5: Pickup
        setDemoStep('picking_up');
        setDemoProgress(75);

        // Simulate rider moving to store
        const rider = riders.find((r) => r.id === offer.riderId);
        if (rider) {
          addEvent('RIDER_LOCATION_UPDATED', `${rider.name} 라이더가 가게로 이동중...`);
        }
        await delay(DEMO_DELAY);

        await deliveriesApi.pickup(delivery.id);
        addEvent('RIDER_PICKED_UP', '음식 픽업 완료!');
        await delay(DEMO_DELAY);

        // Step 6: Delivering
        setDemoStep('delivering');
        setDemoProgress(90);
        addEvent('RIDER_LOCATION_UPDATED', '배달 목적지로 이동중...');
        await delay(DEMO_DELAY);

        // Step 7: Complete
        await deliveriesApi.deliver(delivery.id);
        setDemoStep('completed');
        setDemoProgress(100);
        addEvent('DELIVERY_COMPLETED', '배달 완료! 고객에게 전달되었습니다');
      }

      // Refresh all data
      const [finalRiders, finalDeliveries, finalOffers] = await Promise.all([
        ridersApi.getAll(),
        deliveriesApi.getAll(),
        offersApi.getAll(),
      ]);
      setRiders(finalRiders);
      setDeliveries(finalDeliveries);
      setOffers(finalOffers);

    } catch (error) {
      console.error('Scenario error:', error);
      addEvent('DELIVERY_CANCELLED', `오류 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setDemoRunning(false);
    }
  }, [
    setDemoStep,
    setDemoProgress,
    setDemoRunning,
    addEvent,
    setRiders,
    setStores,
    setDeliveries,
    setOffers,
  ]);

  return { runAutoScenario };
}
