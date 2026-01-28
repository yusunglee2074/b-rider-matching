// Rider types
export type RiderStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface Rider {
  id: string;
  name: string;
  phone: string;
  status: RiderStatus;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

// Store types
export interface Store {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  category: string;
  createdAt: string;
}

// Delivery types
export type DeliveryStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'CANCELLED';

export interface Delivery {
  id: string;
  storeId: string;
  store?: Store;
  riderId?: string;
  rider?: Rider;
  status: DeliveryStatus;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  customerPhone?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

// Offer types
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Offer {
  id: string;
  deliveryId: string;
  delivery?: Delivery;
  riderId: string;
  rider?: Rider;
  status: OfferStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
}

// Event types for activity feed
export type EventType =
  | 'DELIVERY_CREATED'
  | 'OFFER_SENT'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_EXPIRED'
  | 'RIDER_PICKED_UP'
  | 'DELIVERY_COMPLETED'
  | 'DELIVERY_CANCELLED'
  | 'RIDER_LOCATION_UPDATED'
  | 'LOCK_ACQUIRED'
  | 'LOCK_RELEASED';

export interface ActivityEvent {
  id: string;
  type: EventType;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// System metrics
export interface SystemMetrics {
  activeRiders: number;
  pendingDeliveries: number;
  activeOffers: number;
  completedToday: number;
  avgDeliveryTime: number;
  redisConnections: number;
  lockAcquisitions: number;
}

// Demo state
export type ScenarioType = 'auto' | 'manual';
export type ScenarioStep =
  | 'idle'
  | 'seeding'
  | 'creating_delivery'
  | 'matching'
  | 'offer_sent'
  | 'offer_accepted'
  | 'picking_up'
  | 'delivering'
  | 'completed';

export interface DemoState {
  scenario: ScenarioType;
  step: ScenarioStep;
  isRunning: boolean;
  progress: number;
}

// Map types
export interface MapBounds {
  sw: { lat: number; lng: number };
  ne: { lat: number; lng: number };
}

export interface MarkerPosition {
  lat: number;
  lng: number;
}
