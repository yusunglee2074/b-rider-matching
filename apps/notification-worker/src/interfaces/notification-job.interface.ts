export type NotificationType =
  | 'OFFER_CREATED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_REJECTED'
  | 'OFFER_EXPIRED'
  | 'DELIVERY_UPDATE';

export interface NotificationJobData {
  type: NotificationType;
  riderId?: string;
  storeId?: string;
  deliveryId?: string;
  offerId?: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}
