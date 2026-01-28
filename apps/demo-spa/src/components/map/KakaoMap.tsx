import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores';
import { SEOUL_CENTER, getStatusText } from '@/lib/utils';
import type { Rider, Store } from '@/types';

declare global {
  interface Window {
    kakao: any;
  }
}

export function KakaoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const { riders, stores, deliveries } = useAppStore();

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = () => {
      try {
        const options = {
          center: new window.kakao.maps.LatLng(SEOUL_CENTER.lat, SEOUL_CENTER.lng),
          level: 5,
        };

        mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
        setIsLoaded(true);
        console.log('Kakao Map initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Kakao Map:', error);
      }
    };

    // Check if kakao object exists (script loaded)
    if (window.kakao && window.kakao.maps) {
      console.log('Kakao SDK found, loading maps...');
      window.kakao.maps.load(() => {
        initMap();
        return undefined; // 명시적 반환 필요
      });
    } else {
      console.log('Waiting for Kakao SDK to load...');
      // Script not loaded yet, wait for it
      const checkKakao = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          console.log('Kakao SDK loaded, initializing...');
          clearInterval(checkKakao);
          window.kakao.maps.load(() => {
            initMap();
            return undefined;
          });
        }
      }, 100);

      // Timeout after 10 seconds
      const timeout = setTimeout(() => {
        clearInterval(checkKakao);
        console.error('Kakao Maps SDK failed to load - check API key and domain settings');
      }, 10000);

      return () => {
        clearInterval(checkKakao);
        clearTimeout(timeout);
      };
    }
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    // Clear existing overlays
    overlaysRef.current.forEach(overlay => overlay.setMap(null));
    overlaysRef.current = [];

    // Store markers (blue)
    stores.forEach((store) => {
      const position = new window.kakao.maps.LatLng(store.latitude, store.longitude);

      const markerDiv = document.createElement('div');
      markerDiv.innerHTML = `
        <div class="store-marker" style="
          width: 32px;
          height: 32px;
          background: #3b82f6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          </svg>
        </div>
      `;
      markerDiv.onclick = () => {
        setSelectedStore(store);
        setSelectedRider(null);
      };

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: markerDiv,
        yAnchor: 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    // Rider markers (status-based colors)
    riders.forEach((rider) => {
      if (!rider.latitude || !rider.longitude) return;

      const position = new window.kakao.maps.LatLng(
        rider.latitude,
        rider.longitude
      );

      const statusColors: Record<string, string> = {
        AVAILABLE: '#22c55e',
        BUSY: '#f59e0b',
        OFFLINE: '#6b7280',
      };

      const color = statusColors[rider.status] || '#6b7280';

      const markerDiv = document.createElement('div');
      markerDiv.innerHTML = `
        <div class="rider-marker" style="
          width: 28px;
          height: 28px;
          background: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        </div>
      `;
      markerDiv.onclick = () => {
        setSelectedRider(rider);
        setSelectedStore(null);
      };

      const overlay = new window.kakao.maps.CustomOverlay({
        position,
        content: markerDiv,
        yAnchor: 1,
      });
      overlay.setMap(map);
      overlaysRef.current.push(overlay);
    });

    // Delivery routes (dashed lines)
    deliveries
      .filter((d) => d.status !== 'DELIVERED' && d.status !== 'CANCELLED')
      .forEach((delivery) => {
        const path = [
          new window.kakao.maps.LatLng(delivery.pickupLatitude, delivery.pickupLongitude),
          new window.kakao.maps.LatLng(delivery.dropoffLatitude, delivery.dropoffLongitude),
        ];

        const polyline = new window.kakao.maps.Polyline({
          path,
          strokeWeight: 3,
          strokeColor: '#8b5cf6',
          strokeOpacity: 0.7,
          strokeStyle: 'dashed',
        });
        polyline.setMap(map);
        overlaysRef.current.push(polyline);

        // Delivery destination marker
        const destDiv = document.createElement('div');
        destDiv.innerHTML = `
          <div style="
            width: 24px;
            height: 24px;
            background: #ef4444;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          "></div>
        `;

        const destOverlay = new window.kakao.maps.CustomOverlay({
          position: new window.kakao.maps.LatLng(delivery.dropoffLatitude, delivery.dropoffLongitude),
          content: destDiv,
          yAnchor: 1,
        });
        destOverlay.setMap(map);
        overlaysRef.current.push(destOverlay);
      });
  }, [isLoaded, riders, stores, deliveries]);

  return (
    <div className="flex-1 relative bg-gray-100">
      <div ref={mapRef} className="kakao-map-container w-full h-full" />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-500">지도 로딩중...</p>
          </div>
        </div>
      )}

      {/* Selected Rider Info */}
      {selectedRider && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px] z-10">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-800">{selectedRider.name}</h4>
            <button
              onClick={() => setSelectedRider(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">상태:</span>{' '}
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                selectedRider.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' :
                selectedRider.status === 'BUSY' ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {getStatusText(selectedRider.status)}
              </span>
            </p>
            <p className="text-gray-600">
              <span className="font-medium">전화:</span> {selectedRider.phone}
            </p>
            <p className="text-gray-500 text-xs">
              위치: {Number(selectedRider.latitude).toFixed(5)}, {Number(selectedRider.longitude).toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {/* Selected Store Info */}
      {selectedStore && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 min-w-[200px] z-10">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-gray-800">{selectedStore.name}</h4>
            <button
              onClick={() => setSelectedStore(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-gray-600">
              <span className="font-medium">주소:</span> {selectedStore.address}
            </p>
            <p className="text-gray-600">
              <span className="font-medium">전화:</span> {selectedStore.phone || '-'}
            </p>
            <p className="text-gray-500 text-xs">
              위치: {Number(selectedStore.latitude).toFixed(5)}, {Number(selectedStore.longitude).toFixed(5)}
            </p>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs">
        <p className="font-medium text-gray-700 mb-2">범례</p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">가게</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-gray-600">대기 라이더</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-gray-600">배달중 라이더</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-600">배달 목적지</span>
          </div>
        </div>
      </div>
    </div>
  );
}
