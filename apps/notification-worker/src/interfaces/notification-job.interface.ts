export type NotificationType =
  | 'OFFER_ASSIGNED'
  | 'OFFER_TIMEOUT'
  | 'DELIVERY_COMPLETED';

export interface NotificationJobData {
  type: NotificationType;
  riderId: string;
  payload: Record<string, any>;
}
