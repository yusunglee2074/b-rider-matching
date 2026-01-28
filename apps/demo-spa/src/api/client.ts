import axios from 'axios';
import type {
  Rider,
  Store,
  Delivery,
  Offer,
  SystemMetrics,
} from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Riders API
export const ridersApi = {
  getAll: () => api.get<Rider[]>('/riders').then((res) => res.data),
  getById: (id: string) => api.get<Rider>(`/riders/${id}`).then((res) => res.data),
  updateStatus: (id: string, status: string) =>
    api.patch<Rider>(`/riders/${id}/status`, { status }).then((res) => res.data),
  updateLocation: (riderId: string, latitude: number, longitude: number) =>
    api.post('/location', { riderId, latitude, longitude }).then((res) => res.data),
};

// Stores API
export const storesApi = {
  getAll: () => api.get<Store[]>('/stores').then((res) => res.data),
  getById: (id: string) => api.get<Store>(`/stores/${id}`).then((res) => res.data),
};

// Deliveries API
export const deliveriesApi = {
  getAll: () => api.get<Delivery[]>('/deliveries').then((res) => res.data),
  getById: (id: string) => api.get<Delivery>(`/deliveries/${id}`).then((res) => res.data),
  create: (data: {
    storeId: string;
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
  }) => api.post<Delivery>('/deliveries', data).then((res) => res.data),
  cancel: (id: string) =>
    api.patch<Delivery>(`/deliveries/${id}/cancel`).then((res) => res.data),
  pickup: (id: string) =>
    api.patch<Delivery>(`/deliveries/${id}/pickup`).then((res) => res.data),
  deliver: (id: string) =>
    api.patch<Delivery>(`/deliveries/${id}/deliver`).then((res) => res.data),
};

// Offers API
export const offersApi = {
  getAll: () => api.get<Offer[]>('/offers').then((res) => res.data),
  getById: (id: string) => api.get<Offer>(`/offers/${id}`).then((res) => res.data),
  accept: (id: string) =>
    api.patch<Offer>(`/offers/${id}/accept`).then((res) => res.data),
  reject: (id: string) =>
    api.patch<Offer>(`/offers/${id}/reject`).then((res) => res.data),
  createManual: (deliveryId: string, riderId: string) =>
    api.post<Offer>('/offers/manual', { deliveryId, riderId }).then((res) => res.data),
};

// Demo API
export const demoApi = {
  seed: () => api.post('/demo/seed').then((res) => res.data),
  seedBulk: (storeCount: number, riderCount: number, deliveryCount: number) =>
    api.post('/demo/seed/bulk', { storeCount, riderCount, deliveryCount }).then((res) => res.data),
  reset: () => api.post('/demo/reset').then((res) => res.data),
  getMetrics: () => api.get<SystemMetrics>('/demo/metrics').then((res) => res.data),
};

export default api;
