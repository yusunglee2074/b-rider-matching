import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Header, ControlPanel, BottomPanel } from '@/components/layout';
import { KakaoMap } from '@/components/map';
import { ActivityFeed } from '@/components/feed';
import { useAppStore } from '@/stores';
import { usePolling } from '@/hooks';
import { useScenario } from '@/scenarios';
import { ridersApi, storesApi, deliveriesApi, offersApi, demoApi } from '@/api';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppContent() {
  const {
    demo,
    setRiders,
    setStores,
    setDeliveries,
    setOffers,
    setMetrics,
  } = useAppStore();
  const { runAutoScenario } = useScenario();

  // Polling for real-time updates
  const fetchData = async () => {
    try {
      const [riders, stores, deliveries, offers, metrics] = await Promise.all([
        ridersApi.getAll().catch(() => []),
        storesApi.getAll().catch(() => []),
        deliveriesApi.getAll().catch(() => []),
        offersApi.getAll().catch(() => []),
        demoApi.getMetrics().catch(() => null),
      ]);

      setRiders(riders);
      setStores(stores);
      setDeliveries(deliveries);
      setOffers(offers);
      if (metrics) setMetrics(metrics);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  usePolling(fetchData, {
    interval: 2000,
    enabled: !demo.isRunning,
  });

  // Handle auto scenario start
  useEffect(() => {
    if (demo.scenario === 'auto' && demo.isRunning && demo.step === 'idle') {
      runAutoScenario();
    }
  }, [demo.scenario, demo.isRunning, demo.step, runAutoScenario]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <ControlPanel />

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            <KakaoMap />
            <ActivityFeed />
          </div>
          <BottomPanel />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
