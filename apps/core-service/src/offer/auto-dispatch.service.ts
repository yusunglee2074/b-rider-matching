import { Injectable, Logger } from '@nestjs/common';
import { DeliveryService } from '../delivery/delivery.service';
import { OfferService } from './offer.service';
import { LocationGrpcClient } from '../clients/location.grpc-client';

const AUTO_DISPATCH_RADIUS_KM = 3;
const AUTO_DISPATCH_MAX_RIDERS = 10;

@Injectable()
export class AutoDispatchService {
  private readonly logger = new Logger(AutoDispatchService.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly offerService: OfferService,
    private readonly locationClient: LocationGrpcClient,
  ) {}

  async dispatch(deliveryId: string): Promise<{ success: boolean; offerId?: string; error?: string }> {
    try {
      const delivery = await this.deliveryService.findOne(deliveryId);

      // Find nearby available riders
      const nearbyRiders = await this.locationClient.getNearbyRiders(
        Number(delivery.pickupLatitude),
        Number(delivery.pickupLongitude),
        AUTO_DISPATCH_RADIUS_KM,
        AUTO_DISPATCH_MAX_RIDERS,
      );

      if (nearbyRiders.length === 0) {
        this.logger.warn(`No nearby riders found for delivery ${deliveryId}`);
        return { success: false, error: 'No nearby riders available' };
      }

      // Riders are already sorted by distance from Location Service
      const closestRider = nearbyRiders[0];

      // Create offer for the closest rider
      const offer = await this.offerService.create({
        deliveryId,
        riderId: closestRider.riderId,
      });

      this.logger.log(
        `Auto-dispatched delivery ${deliveryId} to rider ${closestRider.riderId} (distance: ${closestRider.distanceKm}km)`,
      );

      return { success: true, offerId: offer.id };
    } catch (error) {
      this.logger.error(`Auto-dispatch failed for delivery ${deliveryId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async dispatchToNextRider(
    deliveryId: string,
    excludeRiderIds: string[],
  ): Promise<{ success: boolean; offerId?: string; error?: string }> {
    try {
      const delivery = await this.deliveryService.findOne(deliveryId);

      const nearbyRiders = await this.locationClient.getNearbyRiders(
        Number(delivery.pickupLatitude),
        Number(delivery.pickupLongitude),
        AUTO_DISPATCH_RADIUS_KM,
        AUTO_DISPATCH_MAX_RIDERS,
      );

      // Filter out excluded riders
      const availableRiders = nearbyRiders.filter(
        (rider) => !excludeRiderIds.includes(rider.riderId),
      );

      if (availableRiders.length === 0) {
        this.logger.warn(`No more riders available for delivery ${deliveryId}`);
        return { success: false, error: 'No more riders available' };
      }

      const nextRider = availableRiders[0];

      const offer = await this.offerService.create({
        deliveryId,
        riderId: nextRider.riderId,
      });

      this.logger.log(
        `Re-dispatched delivery ${deliveryId} to rider ${nextRider.riderId} (distance: ${nextRider.distanceKm}km)`,
      );

      return { success: true, offerId: offer.id };
    } catch (error) {
      this.logger.error(`Re-dispatch failed for delivery ${deliveryId}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
