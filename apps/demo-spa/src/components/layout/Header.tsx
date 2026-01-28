import { Bike, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/stores';
import { cn } from '@/lib/utils';

export function Header() {
  const { demo, metrics, resetDemo } = useAppStore();

  return (
    <header className="h-14 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Bike className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">B-Rider</span>
          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
            Demo
          </span>
        </div>

        {demo.isRunning && (
          <div className="flex items-center gap-2 ml-4">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-600">
              시나리오 실행중... {Math.round(demo.progress)}%
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Real-time stats */}
        <div className="flex items-center gap-4 text-sm">
          <StatBadge
            label="라이더"
            value={metrics?.activeRiders ?? 0}
            color="green"
          />
          <StatBadge
            label="대기 배달"
            value={metrics?.pendingDeliveries ?? 0}
            color="amber"
          />
          <StatBadge
            label="오늘 완료"
            value={metrics?.completedToday ?? 0}
            color="blue"
          />
        </div>

        <div className="h-6 w-px bg-gray-200" />

        <button
          onClick={resetDemo}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          리셋
        </button>

        <a
          href="https://github.com/your-repo/b-rider"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'green' | 'amber' | 'blue';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className={cn('px-2.5 py-1 rounded-lg', colorClasses[color])}>
      <span className="font-medium">{value}</span>
      <span className="ml-1 text-xs opacity-75">{label}</span>
    </div>
  );
}
