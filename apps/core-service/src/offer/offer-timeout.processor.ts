import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Offer, OfferStatus } from '@app/database';
import { RedisLockService } from '@app/common';
import { AutoDispatchService } from './auto-dispatch.service';
import { OfferQueueProducer, OfferTimeoutPayload } from '../clients/offer.queue-producer';

const MAX_DISPATCH_ATTEMPTS = 5;

@Injectable()
export class OfferTimeoutProcessor {
  private readonly logger = new Logger(OfferTimeoutProcessor.name);
  private worker: Worker;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Offer)
    private offerRepository: Repository<Offer>,
    private redisLockService: RedisLockService,
    private autoDispatchService: AutoDispatchService,
    private offerQueueProducer: OfferQueueProducer,
  ) {
    this.initWorker();
  }

  private initWorker() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.worker = new Worker(
      'offer',
      async (job: Job<OfferTimeoutPayload>) => {
        if (job.name === 'check-timeout') {
          await this.handleTimeoutCheck(job.data);
        }
      },
      {
        connection: {
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined,
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed: ${err.message}`);
    });
  }

  private async handleTimeoutCheck(payload: OfferTimeoutPayload): Promise<void> {
    const { offerId, deliveryId, attemptCount } = payload;

    // Acquire lock to prevent race condition with accept/reject
    const lock = await this.redisLockService.acquire(`offer:${offerId}`, 5000);
    if (!lock) {
      this.logger.warn(`Could not acquire lock for offer ${offerId}, skipping timeout check`);
      return;
    }

    try {
      const offer = await this.offerRepository.findOne({ where: { id: offerId } });

      if (!offer) {
        this.logger.warn(`Offer ${offerId} not found`);
        return;
      }

      // Only expire if still PENDING
      if (offer.status !== OfferStatus.PENDING) {
        this.logger.debug(`Offer ${offerId} is ${offer.status}, skipping timeout`);
        return;
      }

      // Mark as expired
      offer.status = OfferStatus.EXPIRED;
      await this.offerRepository.save(offer);
      this.logger.log(`Offer ${offerId} expired after timeout`);

      // Try to dispatch to next rider if under max attempts
      if (attemptCount < MAX_DISPATCH_ATTEMPTS) {
        await this.triggerRedispatch(deliveryId, offerId, attemptCount);
      } else {
        this.logger.warn(
          `Delivery ${deliveryId} reached max dispatch attempts (${MAX_DISPATCH_ATTEMPTS})`,
        );
      }
    } finally {
      await lock.release();
    }
  }

  private async triggerRedispatch(
    deliveryId: string,
    expiredOfferId: string,
    currentAttemptCount: number,
  ): Promise<void> {
    try {
      // Get all expired/rejected offers for this delivery to exclude those riders
      const previousOffers = await this.offerRepository.find({
        where: { deliveryId },
        select: ['riderId'],
      });
      const excludeRiderIds = previousOffers.map((o) => o.riderId);

      const result = await this.autoDispatchService.dispatchToNextRider(
        deliveryId,
        excludeRiderIds,
      );

      if (result.success && result.offerId) {
        // Update the new offer's attempt count
        await this.offerRepository.update(result.offerId, {
          attemptCount: currentAttemptCount + 1,
        });

        // Schedule timeout for the new offer
        await this.offerQueueProducer.scheduleTimeoutCheck(
          result.offerId,
          deliveryId,
          currentAttemptCount + 1,
        );

        this.logger.log(
          `Re-dispatched delivery ${deliveryId}, attempt ${currentAttemptCount + 1}`,
        );
      } else {
        this.logger.warn(`Failed to re-dispatch delivery ${deliveryId}: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error during re-dispatch for delivery ${deliveryId}: ${error.message}`);
    }
  }

  async onModuleDestroy() {
    await this.worker.close();
  }
}
