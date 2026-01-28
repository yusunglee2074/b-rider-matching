import { create } from 'zustand';
import type {
  Rider,
  Store,
  Delivery,
  Offer,
  ActivityEvent,
  SystemMetrics,
  DemoState,
  ScenarioType,
  ScenarioStep,
} from '@/types';
import { generateId } from '@/lib/utils';

interface AppState {
  // Data
  riders: Rider[];
  stores: Store[];
  deliveries: Delivery[];
  offers: Offer[];
  events: ActivityEvent[];
  metrics: SystemMetrics | null;

  // Demo state
  demo: DemoState;

  // UI state
  selectedRiderId: string | null;
  selectedStoreId: string | null;
  selectedDeliveryId: string | null;
  showBottomPanel: boolean;
  bottomPanelTab: 'architecture' | 'api-logs' | 'redis';

  // Actions - Data
  setRiders: (riders: Rider[]) => void;
  setStores: (stores: Store[]) => void;
  setDeliveries: (deliveries: Delivery[]) => void;
  setOffers: (offers: Offer[]) => void;
  setMetrics: (metrics: SystemMetrics) => void;
  updateRider: (id: string, updates: Partial<Rider>) => void;
  updateDelivery: (id: string, updates: Partial<Delivery>) => void;
  updateOffer: (id: string, updates: Partial<Offer>) => void;

  // Actions - Events
  addEvent: (type: ActivityEvent['type'], message: string, metadata?: Record<string, unknown>) => void;
  clearEvents: () => void;

  // Actions - Demo
  setScenario: (scenario: ScenarioType) => void;
  setDemoStep: (step: ScenarioStep) => void;
  setDemoRunning: (running: boolean) => void;
  setDemoProgress: (progress: number) => void;
  resetDemo: () => void;

  // Actions - UI
  selectRider: (id: string | null) => void;
  selectStore: (id: string | null) => void;
  selectDelivery: (id: string | null) => void;
  toggleBottomPanel: () => void;
  setBottomPanelTab: (tab: 'architecture' | 'api-logs' | 'redis') => void;
}

const initialDemoState: DemoState = {
  scenario: 'manual',
  step: 'idle',
  isRunning: false,
  progress: 0,
};

export const useAppStore = create<AppState>((set) => ({
  // Initial data
  riders: [],
  stores: [],
  deliveries: [],
  offers: [],
  events: [],
  metrics: null,

  // Initial demo state
  demo: initialDemoState,

  // Initial UI state
  selectedRiderId: null,
  selectedStoreId: null,
  selectedDeliveryId: null,
  showBottomPanel: false,
  bottomPanelTab: 'architecture',

  // Data actions
  setRiders: (riders) => set({ riders }),
  setStores: (stores) => set({ stores }),
  setDeliveries: (deliveries) => set({ deliveries }),
  setOffers: (offers) => set({ offers }),
  setMetrics: (metrics) => set({ metrics }),

  updateRider: (id, updates) =>
    set((state) => ({
      riders: state.riders.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  updateDelivery: (id, updates) =>
    set((state) => ({
      deliveries: state.deliveries.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),

  updateOffer: (id, updates) =>
    set((state) => ({
      offers: state.offers.map((o) =>
        o.id === id ? { ...o, ...updates } : o
      ),
    })),

  // Event actions
  addEvent: (type, message, metadata) =>
    set((state) => ({
      events: [
        {
          id: generateId(),
          type,
          message,
          timestamp: new Date().toISOString(),
          metadata,
        },
        ...state.events.slice(0, 49), // Keep last 50 events
      ],
    })),

  clearEvents: () => set({ events: [] }),

  // Demo actions
  setScenario: (scenario) =>
    set((state) => ({
      demo: { ...state.demo, scenario },
    })),

  setDemoStep: (step) =>
    set((state) => ({
      demo: { ...state.demo, step },
    })),

  setDemoRunning: (isRunning) =>
    set((state) => ({
      demo: { ...state.demo, isRunning },
    })),

  setDemoProgress: (progress) =>
    set((state) => ({
      demo: { ...state.demo, progress },
    })),

  resetDemo: () =>
    set({
      demo: initialDemoState,
      events: [],
      selectedRiderId: null,
      selectedStoreId: null,
      selectedDeliveryId: null,
    }),

  // UI actions
  selectRider: (id) => set({ selectedRiderId: id }),
  selectStore: (id) => set({ selectedStoreId: id }),
  selectDelivery: (id) => set({ selectedDeliveryId: id }),
  toggleBottomPanel: () =>
    set((state) => ({ showBottomPanel: !state.showBottomPanel })),
  setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
}));
