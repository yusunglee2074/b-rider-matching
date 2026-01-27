import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Offer, OfferStatus, Delivery, DeliveryStatus, Rider, RiderStatus } from '@app/database';
import { RedisLockService } from '@app/common';
import { RiderService } from '../rider/rider.service';
import { DeliveryService } from '../delivery/delivery.service';
import { NotificationQueueProducer } from '../clients/notification.queue-producer';

describe('AdminService', () => {
  let service: AdminService;
  let offerRepository: jest.Mocked<Repository<Offer>>;
  let deliveryRepository: jest.Mocked<Repository<Delivery>>;
  let riderRepository: jest.Mocked<Repository<Rider>>;
  let riderService: jest.Mocked<RiderService>;
  let deliveryService: jest.Mocked<DeliveryService>;
  let redisLockService: jest.Mocked<RedisLockService>;
  let notificationProducer: jest.Mocked<NotificationQueueProducer>;

  const mockDelivery: Delivery = {
    id: 'delivery-1',
    storeId: 'store-1',
    status: DeliveryStatus.PENDING,
    pickupAddress: '123 Pickup St',
    pickupLatitude: '37.5665',
    pickupLongitude: '126.9780',
    deliveryAddress: '456 Delivery Ave',
    deliveryLatitude: '37.5700',
    deliveryLongitude: '126.9800',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Delivery;

  const mockRider: Rider = {
    id: 'rider-1',
    name: 'Test Rider',
    phone: '010-1234-5678',
    status: RiderStatus.AVAILABLE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Rider;

  const mockOffer: Offer = {
    id: 'offer-1',
    deliveryId: 'delivery-1',
    riderId: 'rider-1',
    status: OfferStatus.PENDING,
    expiresAt: new Date(Date.now() + 10000),
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Offer;

  const mockLock = {
    release: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Offer),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Delivery),
          useValue: {
            count: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Rider),
          useValue: {
            count: jest.fn(),
          },
        },
        {
          provide: RiderService,
          useValue: {
            findOne: jest.fn(),
            setAvailable: jest.fn(),
            setBusy: jest.fn(),
          },
        },
        {
          provide: DeliveryService,
          useValue: {
            findOne: jest.fn(),
            updateStatus: jest.fn(),
          },
        },
        {
          provide: RedisLockService,
          useValue: {
            acquire: jest.fn(),
          },
        },
        {
          provide: NotificationQueueProducer,
          useValue: {
            sendNotification: jest.fn(),
            sendOfferCreatedNotification: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    offerRepository = module.get(getRepositoryToken(Offer));
    deliveryRepository = module.get(getRepositoryToken(Delivery));
    riderRepository = module.get(getRepositoryToken(Rider));
    riderService = module.get(RiderService);
    deliveryService = module.get(DeliveryService);
    redisLockService = module.get(RedisLockService);
    notificationProducer = module.get(NotificationQueueProducer);
  });

  describe('assignDelivery', () => {
    it('should assign delivery to rider successfully', async () => {
      deliveryService.findOne.mockResolvedValue(mockDelivery);
      riderService.findOne.mockResolvedValue(mockRider);
      offerRepository.find.mockResolvedValue([]);
      offerRepository.create.mockReturnValue(mockOffer);
      offerRepository.save.mockResolvedValue(mockOffer);

      const result = await service.assignDelivery('delivery-1', 'rider-1', 'Test reason');

      expect(result.offer).toEqual(mockOffer);
      expect(result.message).toContain('delivery-1');
      expect(result.message).toContain('rider-1');
      expect(notificationProducer.sendOfferCreatedNotification).toHaveBeenCalledWith(
        'rider-1',
        'offer-1',
        'delivery-1',
      );
    });

    it('should throw BadRequestException if delivery is not PENDING', async () => {
      const assignedDelivery = { ...mockDelivery, status: DeliveryStatus.ASSIGNED };
      deliveryService.findOne.mockResolvedValue(assignedDelivery);

      await expect(service.assignDelivery('delivery-1', 'rider-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if rider is not AVAILABLE', async () => {
      const busyRider = { ...mockRider, status: RiderStatus.BUSY };
      deliveryService.findOne.mockResolvedValue(mockDelivery);
      riderService.findOne.mockResolvedValue(busyRider);

      await expect(service.assignDelivery('delivery-1', 'rider-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel existing pending offers before creating new one', async () => {
      const existingOffer = { ...mockOffer, id: 'existing-offer' };
      deliveryService.findOne.mockResolvedValue(mockDelivery);
      riderService.findOne.mockResolvedValue(mockRider);
      offerRepository.find.mockResolvedValue([existingOffer]);
      offerRepository.create.mockReturnValue(mockOffer);
      offerRepository.save.mockResolvedValue(mockOffer);

      await service.assignDelivery('delivery-1', 'rider-1');

      expect(offerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OfferStatus.CANCELLED_BY_ADMIN }),
      );
    });
  });

  describe('reassignDelivery', () => {
    const acceptedOffer: Offer = {
      ...mockOffer,
      status: OfferStatus.ACCEPTED,
      riderId: 'old-rider',
    };

    const newRider: Rider = {
      ...mockRider,
      id: 'new-rider',
    };

    beforeEach(() => {
      redisLockService.acquire.mockResolvedValue(mockLock as any);
    });

    it('should reassign delivery successfully', async () => {
      deliveryService.findOne.mockResolvedValue(mockDelivery);
      offerRepository.findOne.mockResolvedValue(acceptedOffer);
      riderService.findOne.mockResolvedValue(newRider);
      offerRepository.save.mockImplementation((offer) => Promise.resolve(offer as Offer));
      offerRepository.create.mockReturnValue({ ...mockOffer, riderId: 'new-rider' });

      const result = await service.reassignDelivery('delivery-1', 'new-rider', 'Test reason');

      expect(result.cancelledOffer.status).toBe(OfferStatus.CANCELLED_BY_ADMIN);
      expect(riderService.setAvailable).toHaveBeenCalledWith('old-rider');
      expect(deliveryService.updateStatus).toHaveBeenCalledWith('delivery-1', DeliveryStatus.PENDING);
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no accepted offer exists', async () => {
      deliveryService.findOne.mockResolvedValue(mockDelivery);
      offerRepository.findOne.mockResolvedValue(null);

      await expect(service.reassignDelivery('delivery-1', 'new-rider')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if new rider is not available', async () => {
      const busyRider = { ...newRider, status: RiderStatus.BUSY };
      deliveryService.findOne.mockResolvedValue(mockDelivery);
      offerRepository.findOne.mockResolvedValue(acceptedOffer);
      riderService.findOne.mockResolvedValue(busyRider);

      await expect(service.reassignDelivery('delivery-1', 'new-rider')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelOffer', () => {
    beforeEach(() => {
      redisLockService.acquire.mockResolvedValue(mockLock as any);
    });

    it('should cancel pending offer successfully', async () => {
      offerRepository.findOne.mockResolvedValue(mockOffer);
      offerRepository.save.mockImplementation((offer) => Promise.resolve(offer as Offer));

      const result = await service.cancelOffer('offer-1', 'Test reason');

      expect(result.offer.status).toBe(OfferStatus.CANCELLED_BY_ADMIN);
      expect(notificationProducer.sendNotification).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should cancel accepted offer and reset delivery/rider status', async () => {
      const acceptedOffer = { ...mockOffer, status: OfferStatus.ACCEPTED };
      offerRepository.findOne.mockResolvedValue(acceptedOffer);
      offerRepository.save.mockImplementation((offer) => Promise.resolve(offer as Offer));

      await service.cancelOffer('offer-1');

      expect(deliveryService.updateStatus).toHaveBeenCalledWith('delivery-1', DeliveryStatus.PENDING);
      expect(riderService.setAvailable).toHaveBeenCalledWith('rider-1');
    });

    it('should throw NotFoundException if offer does not exist', async () => {
      offerRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelOffer('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if offer is already completed', async () => {
      const rejectedOffer = { ...mockOffer, status: OfferStatus.REJECTED };
      offerRepository.findOne.mockResolvedValue(rejectedOffer);

      await expect(service.cancelOffer('offer-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard statistics', async () => {
      deliveryRepository.count.mockResolvedValueOnce(5); // activeDeliveries
      deliveryRepository.count.mockResolvedValueOnce(10); // pendingDeliveries
      riderRepository.count.mockResolvedValue(15);
      offerRepository.count.mockResolvedValue(3);

      const result = await service.getDashboard();

      expect(result).toEqual({
        activeDeliveries: 5,
        pendingDeliveries: 10,
        availableRiders: 15,
        pendingOffers: 3,
      });
    });
  });
});
