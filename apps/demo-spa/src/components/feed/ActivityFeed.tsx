import { useAppStore } from '@/stores';
import { cn, formatTime } from '@/lib/utils';
import {
  Package,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Lock,
  Unlock,
  Truck,
} from 'lucide-react';
import type { EventType } from '@/types';

export function ActivityFeed() {
  const { events } = useAppStore();

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-100">
        <h3 className="panel-title">활동 피드</h3>
        <p className="text-xs text-gray-500">실시간 이벤트 로그</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="p-4 text-center text-gray-400 text-sm">
            아직 이벤트가 없습니다
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((event) => (
              <EventItem key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventItem({ event }: { event: { id: string; type: EventType; message: string; timestamp: string } }) {
  const { icon, color } = getEventStyle(event.type);

  return (
    <div className="p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
            color
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 leading-snug">{event.message}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTime(event.timestamp)}
          </p>
        </div>
      </div>
    </div>
  );
}

function getEventStyle(type: EventType): { icon: React.ReactNode; color: string } {
  const styles: Record<EventType, { icon: React.ReactNode; color: string }> = {
    DELIVERY_CREATED: {
      icon: <Package className="w-3.5 h-3.5 text-violet-600" />,
      color: 'bg-violet-100',
    },
    OFFER_SENT: {
      icon: <Send className="w-3.5 h-3.5 text-blue-600" />,
      color: 'bg-blue-100',
    },
    OFFER_ACCEPTED: {
      icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
      color: 'bg-green-100',
    },
    OFFER_REJECTED: {
      icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
      color: 'bg-red-100',
    },
    OFFER_EXPIRED: {
      icon: <Clock className="w-3.5 h-3.5 text-gray-600" />,
      color: 'bg-gray-100',
    },
    RIDER_PICKED_UP: {
      icon: <Truck className="w-3.5 h-3.5 text-amber-600" />,
      color: 'bg-amber-100',
    },
    DELIVERY_COMPLETED: {
      icon: <CheckCircle className="w-3.5 h-3.5 text-green-600" />,
      color: 'bg-green-100',
    },
    DELIVERY_CANCELLED: {
      icon: <XCircle className="w-3.5 h-3.5 text-red-600" />,
      color: 'bg-red-100',
    },
    RIDER_LOCATION_UPDATED: {
      icon: <MapPin className="w-3.5 h-3.5 text-blue-600" />,
      color: 'bg-blue-100',
    },
    LOCK_ACQUIRED: {
      icon: <Lock className="w-3.5 h-3.5 text-purple-600" />,
      color: 'bg-purple-100',
    },
    LOCK_RELEASED: {
      icon: <Unlock className="w-3.5 h-3.5 text-purple-600" />,
      color: 'bg-purple-100',
    },
  };

  return styles[type] || { icon: <Package className="w-3.5 h-3.5" />, color: 'bg-gray-100' };
}
