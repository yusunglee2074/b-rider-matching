import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Rider status
    AVAILABLE: 'bg-green-500',
    BUSY: 'bg-amber-500',
    OFFLINE: 'bg-gray-400',
    // Delivery status
    PENDING: 'bg-violet-500',
    ASSIGNED: 'bg-blue-500',
    PICKED_UP: 'bg-amber-500',
    DELIVERED: 'bg-green-500',
    CANCELLED: 'bg-red-500',
    // Offer status
    ACCEPTED: 'bg-green-500',
    REJECTED: 'bg-red-500',
    EXPIRED: 'bg-gray-500',
  };
  return colors[status] || 'bg-gray-400';
}

export function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    AVAILABLE: '대기중',
    BUSY: '배달중',
    OFFLINE: '오프라인',
    PENDING: '대기',
    ASSIGNED: '배차됨',
    PICKED_UP: '픽업완료',
    DELIVERED: '배달완료',
    CANCELLED: '취소됨',
    ACCEPTED: '수락',
    REJECTED: '거절',
    EXPIRED: '만료',
  };
  return texts[status] || status;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Seoul area coordinates for demo
export const SEOUL_CENTER = {
  lat: 37.5665,
  lng: 126.978,
};

export const DEMO_BOUNDS = {
  sw: { lat: 37.54, lng: 126.95 },
  ne: { lat: 37.59, lng: 127.01 },
};
