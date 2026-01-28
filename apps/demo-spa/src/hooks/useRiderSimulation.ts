import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores';
import { ridersApi } from '@/api';

const SIMULATION_INTERVAL = 3000; // Move riders every 3 seconds
const MOVE_DISTANCE = 0.001; // ~100m movement per tick

export function useRiderSimulation(enabled: boolean = false) {
  const { riders, setRiders, addEvent } = useAppStore();
  const intervalRef = useRef<number | null>(null);

  const moveRiders = useCallback(async () => {
    if (riders.length === 0) return;

    const updatedRiders = await Promise.all(
      riders.map(async (rider) => {
        if (!rider.latitude || !rider.longitude) return rider;
        if (rider.status === 'OFFLINE') return rider;

        // Random movement direction
        const angle = Math.random() * 2 * Math.PI;
        const newLat = parseFloat(String(rider.latitude)) + Math.cos(angle) * MOVE_DISTANCE;
        const newLng = parseFloat(String(rider.longitude)) + Math.sin(angle) * MOVE_DISTANCE;

        try {
          // Update location via API
          await ridersApi.updateLocation(rider.id, newLat, newLng);

          return {
            ...rider,
            latitude: newLat,
            longitude: newLng,
          };
        } catch (error) {
          console.error(`Failed to update rider ${rider.id} location:`, error);
          return rider;
        }
      })
    );

    setRiders(updatedRiders);
  }, [riders, setRiders]);

  useEffect(() => {
    if (enabled && riders.length > 0) {
      // Start simulation
      intervalRef.current = window.setInterval(moveRiders, SIMULATION_INTERVAL);
      addEvent('RIDER_LOCATION_UPDATED', '라이더 위치 시뮬레이션 시작');

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    } else {
      // Stop simulation
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [enabled, riders.length > 0, moveRiders, addEvent]);

  const startSimulation = useCallback(() => {
    if (!intervalRef.current && riders.length > 0) {
      intervalRef.current = window.setInterval(moveRiders, SIMULATION_INTERVAL);
      addEvent('RIDER_LOCATION_UPDATED', '라이더 위치 시뮬레이션 시작');
    }
  }, [riders.length, moveRiders, addEvent]);

  const stopSimulation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      addEvent('RIDER_LOCATION_UPDATED', '라이더 위치 시뮬레이션 중지');
    }
  }, [addEvent]);

  return { startSimulation, stopSimulation, isRunning: !!intervalRef.current };
}
