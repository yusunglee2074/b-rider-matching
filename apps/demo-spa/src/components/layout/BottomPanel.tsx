import { useState } from 'react';
import { ChevronUp, ChevronDown, Server, Terminal, Database } from 'lucide-react';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';

export function BottomPanel() {
  const { showBottomPanel, toggleBottomPanel, bottomPanelTab, setBottomPanelTab } = useAppStore();

  const tabs = [
    { id: 'architecture' as const, label: '아키텍처', icon: Server },
    { id: 'api-logs' as const, label: 'API 로그', icon: Terminal },
    { id: 'redis' as const, label: 'Redis 상태', icon: Database },
  ];

  return (
    <div
      className={cn(
        'bg-white border-t border-gray-200 transition-all duration-300',
        showBottomPanel ? 'h-64' : 'h-10'
      )}
    >
      {/* Toggle bar */}
      <div
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={toggleBottomPanel}
      >
        <div className="flex items-center gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={(e) => {
                e.stopPropagation();
                setBottomPanelTab(tab.id);
                if (!showBottomPanel) toggleBottomPanel();
              }}
              className={cn(
                'flex items-center gap-1.5 text-sm transition-colors',
                bottomPanelTab === tab.id && showBottomPanel
                  ? 'text-primary-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          {showBottomPanel ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronUp className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Panel content */}
      {showBottomPanel && (
        <div className="h-[calc(100%-2.5rem)] overflow-auto p-4">
          {bottomPanelTab === 'architecture' && <ArchitectureView />}
          {bottomPanelTab === 'api-logs' && <ApiLogsView />}
          {bottomPanelTab === 'redis' && <RedisStateView />}
        </div>
      )}
    </div>
  );
}

function ArchitectureView() {
  return (
    <div className="font-mono text-xs text-gray-600 whitespace-pre leading-relaxed">
      {`
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│    API Gateway      │  │ Location Service │  │   Notification Worker   │
│    (HTTP/REST)      │  │   (gRPC + HTTP)  │  │   (BullMQ Consumer)     │
│    Port: 3000       │  │ HTTP:3003/gRPC:5003│ │                         │
└─────────────────────┘  └─────────────────┘  └─────────────────────────┘
          │                       ▲                       ▲
          │ HTTP                  │ gRPC                  │ BullMQ
          ▼                       │                       │
┌─────────────────────────────────┴───────────────────────┴───────────────┐
│                        Core Service (Modular Monolith)                   │
│                              Port: 3001                                  │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐             │
│  │  Rider   │   │ Delivery │   │  Offer   │   │  Store   │             │
│  │  Module  │   │  Module  │   │  Module  │   │  Module  │             │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘             │
└─────────────────────────────────────────────────────────────────────────┘
      `}
    </div>
  );
}

function ApiLogsView() {
  const [logs] = useState<string[]>([
    '[12:34:56] POST /api/deliveries → 201 Created (45ms)',
    '[12:34:57] GET /api/riders/nearby?lat=37.56&lng=126.97 → 200 OK (12ms)',
    '[12:34:58] POST /api/offers → 201 Created (23ms)',
    '[12:34:59] gRPC LocationService.GetNearbyRiders → OK (8ms)',
  ]);

  return (
    <div className="font-mono text-xs space-y-1">
      {logs.map((log, i) => (
        <div key={i} className="text-gray-600">
          {log}
        </div>
      ))}
      {logs.length === 0 && (
        <div className="text-gray-400">API 로그가 없습니다</div>
      )}
    </div>
  );
}

function RedisStateView() {
  const { metrics } = useAppStore();

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Connections</p>
        <p className="text-lg font-semibold text-gray-800">
          {metrics?.redisConnections ?? 0}
        </p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Lock Acquisitions</p>
        <p className="text-lg font-semibold text-gray-800">
          {metrics?.lockAcquisitions ?? 0}
        </p>
      </div>
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-1">Geo Keys</p>
        <p className="text-lg font-semibold text-gray-800">
          {metrics?.activeRiders ?? 0}
        </p>
      </div>
    </div>
  );
}
