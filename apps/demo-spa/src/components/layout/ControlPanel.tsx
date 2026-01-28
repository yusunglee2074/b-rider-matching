import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Zap, Hand, Settings, Database, Truck, Users, Store as StoreIcon } from 'lucide-react';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';
import type { ScenarioType } from '@/types';
import { demoApi, deliveriesApi, offersApi, ridersApi, storesApi } from '@/api';

export function ControlPanel() {
  const { demo, setScenario, setDemoRunning, resetDemo } = useAppStore();

  const handleScenarioChange = (scenario: ScenarioType) => {
    setScenario(scenario);
  };

  const handlePlayPause = () => {
    setDemoRunning(!demo.isRunning);
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Scenario Selection */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="panel-title">시나리오</h3>
        <div className="space-y-2">
          <ScenarioButton
            icon={<Zap className="w-4 h-4" />}
            label="빠른 데모"
            description="자동 실행 (2분)"
            active={demo.scenario === 'auto'}
            onClick={() => handleScenarioChange('auto')}
          />
          <ScenarioButton
            icon={<Hand className="w-4 h-4" />}
            label="수동 모드"
            description="직접 조작"
            active={demo.scenario === 'manual'}
            onClick={() => handleScenarioChange('manual')}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="panel-title">컨트롤</h3>
        <div className="flex gap-2">
          <button
            onClick={handlePlayPause}
            disabled={demo.scenario === 'manual'}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors',
              demo.isRunning
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-primary-600 text-white hover:bg-primary-700',
              demo.scenario === 'manual' && 'opacity-50 cursor-not-allowed'
            )}
          >
            {demo.isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                일시정지
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                시작
              </>
            )}
          </button>
          <button
            onClick={resetDemo}
            className="p-2.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar for auto mode */}
        {demo.scenario === 'auto' && demo.isRunning && (
          <div className="mt-3">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${demo.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1.5 text-center">
              {getStepLabel(demo.step)}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-gray-100 flex-1">
        <h3 className="panel-title">빠른 액션</h3>
        <QuickActions />
      </div>

      {/* Settings */}
      <div className="p-4">
        <button className="w-full flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <Settings className="w-4 h-4" />
          설정
        </button>
      </div>
    </div>
  );
}

function ScenarioButton({
  icon,
  label,
  description,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
        active
          ? 'border-primary-500 bg-primary-50'
          : 'border-gray-100 hover:border-gray-200 bg-white'
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          active ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
        )}
      >
        {icon}
      </div>
      <div>
        <p className={cn('font-medium text-sm', active ? 'text-primary-700' : 'text-gray-700')}>
          {label}
        </p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
    </button>
  );
}

function QuickActions() {
  const { demo, stores, riders, deliveries, addEvent, setDeliveries, setRiders, setStores, setMetrics } = useAppStore();

  // Bulk seed settings
  const [showBulkSettings, setShowBulkSettings] = useState(false);
  const [bulkStoreCount, setBulkStoreCount] = useState(20);
  const [bulkRiderCount, setBulkRiderCount] = useState(50);
  const [bulkDeliveryCount, setBulkDeliveryCount] = useState(30);

  // Automation toggles
  const [autoDispatch, setAutoDispatch] = useState(false);
  const [autoAcceptOffer, setAutoAcceptOffer] = useState(false);
  const autoDispatchRef = useRef<boolean>(false);
  const autoAcceptRef = useRef<boolean>(false);

  // Auto rider movement for BUSY riders (always running)
  useEffect(() => {
    const moveDeliveryRiders = async () => {
      const state = useAppStore.getState();
      const currentRiders = state.riders;
      const currentDeliveries = state.deliveries;

      // Find BUSY riders with assigned deliveries
      const busyRiders = currentRiders.filter(r => r.status === 'BUSY');
      if (busyRiders.length === 0) return;

      // Get offers to match riders to deliveries
      let offers: { riderId: string; deliveryId: string; status: string }[] = [];
      try {
        offers = await offersApi.getAll();
      } catch (e) {
        console.error('Failed to fetch offers:', e);
        return;
      }

      for (const rider of busyRiders) {
        if (!rider.latitude || !rider.longitude) continue;

        const riderLat = parseFloat(String(rider.latitude));
        const riderLng = parseFloat(String(rider.longitude));

        // Find accepted offer for this rider
        const acceptedOffer = offers.find(
          o => o.riderId === rider.id && o.status === 'ACCEPTED'
        );

        if (!acceptedOffer) continue;

        // Find the delivery for this offer
        const assignedDelivery = currentDeliveries.find(
          d => d.id === acceptedOffer.deliveryId && (d.status === 'ASSIGNED' || d.status === 'PICKED_UP')
        );

        if (!assignedDelivery) continue;

        let targetLat: number;
        let targetLng: number;

        if (assignedDelivery.status === 'ASSIGNED') {
          // Move towards pickup (store)
          targetLat = parseFloat(String(assignedDelivery.pickupLatitude));
          targetLng = parseFloat(String(assignedDelivery.pickupLongitude));

          const distToPickup = Math.sqrt(
            Math.pow(riderLat - targetLat, 2) + Math.pow(riderLng - targetLng, 2)
          );

          if (distToPickup < 0.001) {
            // Arrived at store - pickup
            try {
              await deliveriesApi.pickup(assignedDelivery.id);
              state.addEvent('RIDER_PICKED_UP', `${rider.name} 라이더가 음식을 픽업했습니다`);
              const newDeliveries = await deliveriesApi.getAll();
              state.setDeliveries(newDeliveries);
            } catch (e) {
              console.error('Pickup failed:', e);
            }
            continue;
          }
        } else {
          // Move towards dropoff
          targetLat = parseFloat(String(assignedDelivery.dropoffLatitude));
          targetLng = parseFloat(String(assignedDelivery.dropoffLongitude));

          const distToDropoff = Math.sqrt(
            Math.pow(riderLat - targetLat, 2) + Math.pow(riderLng - targetLng, 2)
          );

          if (distToDropoff < 0.001) {
            // Arrived at destination - complete delivery
            try {
              await deliveriesApi.deliver(assignedDelivery.id);
              state.addEvent('DELIVERY_COMPLETED', `${rider.name} 라이더가 배달을 완료했습니다!`);

              // Refresh deliveries only
              const newDeliveries = await deliveriesApi.getAll();
              state.setDeliveries(newDeliveries);

              // Update rider status locally to AVAILABLE using updateRider
              state.updateRider(rider.id, { status: 'AVAILABLE' as const });
            } catch (e) {
              console.error('Delivery completion failed:', e);
            }
            continue;
          }
        }

        // Move towards target
        const dx = targetLat - riderLat;
        const dy = targetLng - riderLng;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = 0.002; // Faster movement

        let newLat: number;
        let newLng: number;

        if (dist > speed) {
          newLat = riderLat + (dx / dist) * speed;
          newLng = riderLng + (dy / dist) * speed;
        } else {
          newLat = targetLat;
          newLng = targetLng;
        }

        try {
          await ridersApi.updateLocation(rider.id, newLat, newLng);
          // Update local state using updateRider (not setRiders which preserves old positions)
          state.updateRider(rider.id, { latitude: newLat, longitude: newLng });
        } catch (e) {
          console.error('Location update failed:', e);
        }
      }
    };

    const intervalId = window.setInterval(moveDeliveryRiders, 500);
    return () => clearInterval(intervalId);
  }, []);

  // Auto dispatch effect - match pending deliveries to available riders
  useEffect(() => {
    autoDispatchRef.current = autoDispatch;

    const runAutoDispatch = async () => {
      while (autoDispatchRef.current) {
        const state = useAppStore.getState();
        const currentDeliveries = state.deliveries;
        const currentRiders = state.riders;

        // Get current offers to check which deliveries already have pending offers
        let currentOffers: { deliveryId: string; status: string }[] = [];
        try {
          currentOffers = await offersApi.getAll();
        } catch (e) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }

        // Find deliveries without pending offers
        const deliveriesWithPendingOffers = new Set(
          currentOffers.filter(o => o.status === 'PENDING').map(o => o.deliveryId)
        );

        const pendingDelivery = currentDeliveries.find(
          d => d.status === 'PENDING' && !deliveriesWithPendingOffers.has(d.id)
        );

        // Find truly available riders (not already assigned to pending offers)
        const ridersWithPendingOffers = new Set(
          currentOffers.filter(o => o.status === 'PENDING').map(o => (o as any).riderId)
        );

        const availableRider = currentRiders.find(
          r => r.status === 'AVAILABLE' && !ridersWithPendingOffers.has(r.id)
        );

        if (pendingDelivery && availableRider) {
          try {
            state.addEvent('LOCK_ACQUIRED', '분산락 획득: 자동 배차 시작');
            await offersApi.createManual(pendingDelivery.id, availableRider.id);
            state.addEvent('OFFER_SENT', `${availableRider.name} 라이더에게 자동 오퍼 전송됨`);
            state.addEvent('LOCK_RELEASED', '분산락 해제');

            // Refresh deliveries only (not riders - to preserve local position updates)
            const newDeliveries = await deliveriesApi.getAll();
            state.setDeliveries(newDeliveries);
          } catch (error: any) {
            // Ignore 409 Conflict (already has offer) and 400 Bad Request (rider not available)
            if (error?.response?.status !== 409 && error?.response?.status !== 400) {
              console.error('Auto dispatch failed:', error);
            }
            await new Promise(r => setTimeout(r, 200));
          }
        } else {
          await new Promise(r => setTimeout(r, 300)); // Wait if nothing to process
        }
      }
    };

    if (autoDispatch) {
      runAutoDispatch();
    }
  }, [autoDispatch]);

  // Auto offer accept effect
  useEffect(() => {
    autoAcceptRef.current = autoAcceptOffer;

    const runAutoAccept = async () => {
      while (autoAcceptRef.current) {
        try {
          const offers = await offersApi.getAll();
          const pendingOffer = offers.find(o => o.status === 'PENDING');

          if (pendingOffer) {
            const state = useAppStore.getState();
            state.addEvent('LOCK_ACQUIRED', '분산락 획득: 자동 오퍼 수락');
            await offersApi.accept(pendingOffer.id);
            state.addEvent('OFFER_ACCEPTED', '자동으로 오퍼를 수락했습니다');
            state.addEvent('LOCK_RELEASED', '분산락 해제');

            // Refresh deliveries only (not riders - to preserve local position updates)
            const newDeliveries = await deliveriesApi.getAll();
            state.setDeliveries(newDeliveries);

            // Update rider status locally to BUSY using updateRider
            state.updateRider((pendingOffer as any).riderId, { status: 'BUSY' as const });
          } else {
            await new Promise(r => setTimeout(r, 300)); // Wait if no pending offers
          }
        } catch (error: any) {
          // Ignore 400 Bad Request (offer already accepted/expired)
          if (error?.response?.status !== 400) {
            console.error('Auto offer accept failed:', error);
          }
          await new Promise(r => setTimeout(r, 200));
        }
      }
    };

    if (autoAcceptOffer) {
      runAutoAccept();
    }
  }, [autoAcceptOffer]);

  const handleSeedData = async () => {
    try {
      addEvent('DELIVERY_CREATED', '데모 데이터 생성 중...');
      const result = await demoApi.seed();
      addEvent('DELIVERY_CREATED', `${result.data.stores}개 가게, ${result.data.riders}명 라이더 생성됨`);

      // Refresh data after seeding
      const [newStores, newRiders, metrics] = await Promise.all([
        storesApi.getAll(),
        ridersApi.getAll(),
        demoApi.getMetrics(),
      ]);
      setStores(newStores);
      setRiders(newRiders);
      setMetrics(metrics);
    } catch (error) {
      addEvent('DELIVERY_CANCELLED', '데이터 생성 실패');
    }
  };

  const handleBulkSeed = async () => {
    try {
      addEvent('DELIVERY_CREATED', `대규모 데이터 생성 중... (가게 ${bulkStoreCount}, 라이더 ${bulkRiderCount}, 배달 ${bulkDeliveryCount})`);
      const result = await demoApi.seedBulk(bulkStoreCount, bulkRiderCount, bulkDeliveryCount);
      addEvent('DELIVERY_CREATED', `${result.data.stores}개 가게, ${result.data.riders}명 라이더, ${result.data.deliveries}개 배달 생성됨`);

      // Refresh data after seeding
      const [newStores, newRiders, newDeliveries, metrics] = await Promise.all([
        storesApi.getAll(),
        ridersApi.getAll(),
        deliveriesApi.getAll(),
        demoApi.getMetrics(),
      ]);
      setStores(newStores);
      setRiders(newRiders);
      setDeliveries(newDeliveries);
      setMetrics(metrics);
      setShowBulkSettings(false);
    } catch (error) {
      addEvent('DELIVERY_CANCELLED', '대규모 데이터 생성 실패');
    }
  };

  const handleCreateDelivery = async () => {
    if (stores.length === 0) {
      addEvent('DELIVERY_CANCELLED', '먼저 데이터를 생성해주세요');
      return;
    }
    try {
      const store = stores[Math.floor(Math.random() * stores.length)];
      const delivery = await deliveriesApi.create({
        storeId: store.id,
        pickupAddress: store.address,
        pickupLatitude: parseFloat(String(store.latitude)),
        pickupLongitude: parseFloat(String(store.longitude)),
        dropoffAddress: '서울시 강남구 테헤란로 ' + Math.floor(Math.random() * 500),
        dropoffLatitude: 37.5665 + (Math.random() - 0.5) * 0.02,
        dropoffLongitude: 126.978 + (Math.random() - 0.5) * 0.02,
      });
      addEvent('DELIVERY_CREATED', `새 배달 생성: ${store.name}`);
      setDeliveries([...deliveries, delivery]);
    } catch (error) {
      addEvent('DELIVERY_CANCELLED', '배달 생성 실패');
    }
  };

  const handleManualAssign = async () => {
    const pendingDelivery = deliveries.find(d => d.status === 'PENDING');
    const availableRider = riders.find(r => r.status === 'AVAILABLE');

    if (!pendingDelivery) {
      addEvent('DELIVERY_CANCELLED', '대기 중인 배달이 없습니다');
      return;
    }
    if (!availableRider) {
      addEvent('DELIVERY_CANCELLED', '가용 라이더가 없습니다');
      return;
    }

    try {
      addEvent('LOCK_ACQUIRED', '분산락 획득: 수동 배차 시작');
      await offersApi.createManual(pendingDelivery.id, availableRider.id);
      addEvent('OFFER_SENT', `${availableRider.name} 라이더에게 오퍼 전송됨`);
      addEvent('LOCK_RELEASED', '분산락 해제');
    } catch (error) {
      addEvent('DELIVERY_CANCELLED', '수동 배차 실패');
    }
  };

  const handleTestLock = async () => {
    addEvent('LOCK_ACQUIRED', '분산락 테스트: 동시 배차 시도 시뮬레이션');
    await new Promise(resolve => setTimeout(resolve, 500));
    addEvent('LOCK_RELEASED', '첫 번째 요청 락 획득 성공');
    await new Promise(resolve => setTimeout(resolve, 300));
    addEvent('DELIVERY_CANCELLED', '두 번째 요청 락 획득 실패 (중복 방지)');
    await new Promise(resolve => setTimeout(resolve, 300));
    addEvent('LOCK_RELEASED', '분산락 테스트 완료');
  };

  const handleAcceptOffer = async () => {
    try {
      const offers = await offersApi.getAll();
      const pendingOffer = offers.find(o => o.status === 'PENDING');

      if (!pendingOffer) {
        addEvent('DELIVERY_CANCELLED', '대기 중인 오퍼가 없습니다');
        return;
      }

      addEvent('LOCK_ACQUIRED', '분산락 획득: 오퍼 수락 처리');
      await offersApi.accept(pendingOffer.id);
      addEvent('OFFER_ACCEPTED', '라이더가 오퍼를 수락했습니다');
      addEvent('LOCK_RELEASED', '분산락 해제');
    } catch (error) {
      addEvent('DELIVERY_CANCELLED', '오퍼 수락 실패');
    }
  };

  const handleRejectOffer = async () => {
    try {
      const offers = await offersApi.getAll();
      const pendingOffer = offers.find(o => o.status === 'PENDING');

      if (!pendingOffer) {
        addEvent('DELIVERY_CANCELLED', '대기 중인 오퍼가 없습니다');
        return;
      }

      await offersApi.reject(pendingOffer.id);
      addEvent('OFFER_REJECTED', '라이더가 오퍼를 거절했습니다');
    } catch (error) {
      addEvent('DELIVERY_CANCELLED', '오퍼 거절 실패');
    }
  };

  const actions = [
    { label: '데이터 시드 (5개)', action: handleSeedData, disabled: demo.isRunning },
    { label: '배달 생성', action: handleCreateDelivery, disabled: demo.isRunning },
    { label: '수동 배차', action: handleManualAssign, disabled: demo.isRunning },
    { label: '오퍼 수락', action: handleAcceptOffer, disabled: demo.isRunning },
    { label: '오퍼 거절', action: handleRejectOffer, disabled: demo.isRunning },
    { label: '분산락 테스트', action: handleTestLock, disabled: demo.isRunning },
  ];

  return (
    <div className="space-y-3">
      {/* Bulk Seed Section */}
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <button
          onClick={() => setShowBulkSettings(!showBulkSettings)}
          className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
        >
          <span className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            대규모 데이터 생성
          </span>
          <span className="text-xs text-gray-500">{showBulkSettings ? '▲' : '▼'}</span>
        </button>

        {showBulkSettings && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <StoreIcon className="w-4 h-4 text-blue-500" />
              <label className="text-xs text-gray-600 w-12">가게</label>
              <input
                type="number"
                value={bulkStoreCount}
                onChange={(e) => setBulkStoreCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                min="1"
                max="100"
              />
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              <label className="text-xs text-gray-600 w-12">라이더</label>
              <input
                type="number"
                value={bulkRiderCount}
                onChange={(e) => setBulkRiderCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                min="1"
                max="200"
              />
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-purple-500" />
              <label className="text-xs text-gray-600 w-12">배달</label>
              <input
                type="number"
                value={bulkDeliveryCount}
                onChange={(e) => setBulkDeliveryCount(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded"
                min="0"
                max="100"
              />
            </div>
            <button
              onClick={handleBulkSeed}
              disabled={demo.isRunning}
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
            >
              대규모 생성 실행
            </button>
          </div>
        )}
      </div>

      {/* Automation Toggles */}
      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
        <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          자동화 설정
        </p>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-gray-600">자동 배차</span>
            <div
              onClick={() => setAutoDispatch(!autoDispatch)}
              className={cn(
                'w-10 h-5 rounded-full transition-colors relative',
                autoDispatch ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
                  autoDispatch ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs text-gray-600">자동 오퍼 수락</span>
            <div
              onClick={() => setAutoAcceptOffer(!autoAcceptOffer)}
              className={cn(
                'w-10 h-5 rounded-full transition-colors relative',
                autoAcceptOffer ? 'bg-green-500' : 'bg-gray-300'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow',
                  autoAcceptOffer ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-1">
        {actions.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            disabled={item.disabled}
            className="w-full text-left px-3 py-2 text-sm rounded-lg bg-gray-50 hover:bg-gray-100
                       text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function getStepLabel(step: string): string {
  const labels: Record<string, string> = {
    idle: '대기중',
    seeding: '데이터 생성중...',
    creating_delivery: '배달 생성중...',
    matching: '라이더 매칭중...',
    offer_sent: '오퍼 전송됨',
    offer_accepted: '오퍼 수락됨',
    picking_up: '픽업중...',
    delivering: '배달중...',
    completed: '완료!',
  };
  return labels[step] || step;
}
