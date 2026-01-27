import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfferService } from '../src/offer/offer.service';
import { Offer, OfferStatus, DeliveryStatus, RiderStatus, Delivery, Rider } from '@app/database';
import { RedisLockService } from '@app/common';
import { RiderService } from '../src/rider/rider.service';
import { DeliveryService } from '../src/delivery/delivery.service';
import { LocationGrpcClient } from '../src/clients/location.grpc-client';
import { NotificationQueueProducer } from '../src/clients/notification.queue-producer';
import { ConflictException, BadRequestException } from '@nestjs/common';

describe('OfferService', () => {
  let service: OfferService;
  let offerRepository: Repository<Offer>;

  const mockDelivery: Partial<Delivery> = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    storeId: '123e4567-e89b-12d3-a456-426614174000',
    status: DeliveryStatus.PENDING,
    pickupLatitude: 37.5665,
    pickupLongitude: 126.978,
  };

  const mockRider: Partial<Rider> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    status: RiderStatus.AVAILABLE,
  };

  const mockOffer: Partial<Offer> = {
    id: '123e4567-e89b-12d3-a456-426614174003',
    deliveryId: mockDelivery.id,
    riderId: mockRider.id,
    status: OfferStatus.PENDING,
    expiresAt: new Date(Date.now() + 10000),
    delivery: mockDelivery as Delivery,
    rider: mockRider as Rider,
  };

  const mockLock = {
    release: jest.fn().mockResolvedValue(undefined),
  };

  const mockOfferRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: mockOffer.id })),
    save: jest.fn().mockImplementation((offer) => Promise.resolve({ ...mockOffer, ...offer })),
    find: jest.fn().mockResolvedValue([mockOffer]),
    findOne: jest.fn().mockResolvedValue(mockOffer),
    createQueryBuilder: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    }),
  };

  const mockRiderService = {
    findOne: jest.fn().mockResolvedValue(mockRider),
    setBusy: jest.fn().mockResolvedValue({ ...mockRider, status: RiderStatus.BUSY }),
  };

  const mockDeliveryService = {
    findOne: jest.fn().mockResolvedValue(mockDelivery),
    setAssigned: jest.fn().mockResolvedValue({ ...mockDelivery, status: DeliveryStatus.ASSIGNED }),
  };

  const mockRedisLockService = {
    acquire: jest.fn().mockResolvedValue(mockLock),
  };

  const mockLocationClient = {
    getNearbyRiders: jest.fn().mockResolvedValue([]),
  };

  const mockNotificationProducer = {
    sendOfferCreatedNotification: jest.fn().mockResolvedValue(undefined),
    sendOfferAcceptedNotification: jest.fn().mockResolvedValue(undefined),
    sendOfferRejectedNotification: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfferService,
        { provide: getRepositoryToken(Offer), useValue: mockOfferRepository },
        { provide: RiderService, useValue: mockRiderService },
        { provide: DeliveryService, useValue: mockDeliveryService },
        { provide: RedisLockService, useValue: mockRedisLockService },
        { provide: LocationGrpcClient, useValue: mockLocationClient },
        { provide: NotificationQueueProducer, useValue: mockNotificationProducer },
      ],
    }).compile();

    service = module.get<OfferService>(OfferService);
    offerRepository = module.get<Repository<Offer>>(getRepositoryToken(Offer));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an offer and send notification', async () => {
      mockOfferRepository.findOne.mockResolvedValueOnce(null);

      const createDto = {
        deliveryId: mockDelivery.id!,
        riderId: mockRider.id!,
      };

      const result = await service.create(createDto);

      expect(mockDeliveryService.findOne).toHaveBeenCalledWith(createDto.deliveryId);
      expect(mockRiderService.findOne).toHaveBeenCalledWith(createDto.riderId);
      expect(mockOfferRepository.save).toHaveBeenCalled();
      expect(mockNotificationProducer.sendOfferCreatedNotification).toHaveBeenCalled();
    });

    it('should throw BadRequestException if delivery is not pending', async () => {
      mockDeliveryService.findOne.mockResolvedValueOnce({
        ...mockDelivery,
        status: DeliveryStatus.ASSIGNED,
      });

      await expect(
        service.create({ deliveryId: mockDelivery.id!, riderId: mockRider.id! }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rider is not available', async () => {
      mockRiderService.findOne.mockResolvedValueOnce({
        ...mockRider,
        status: RiderStatus.BUSY,
      });

      await expect(
        service.create({ deliveryId: mockDelivery.id!, riderId: mockRider.id! }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if pending offer exists', async () => {
      await expect(
        service.create({ deliveryId: mockDelivery.id!, riderId: mockRider.id! }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('accept', () => {
    it('should accept an offer with distributed lock', async () => {
      const result = await service.accept(mockOffer.id!);

      expect(mockRedisLockService.acquire).toHaveBeenCalledWith(`offer:${mockOffer.id}`);
      expect(mockDeliveryService.setAssigned).toHaveBeenCalledWith(mockOffer.deliveryId);
      expect(mockRiderService.setBusy).toHaveBeenCalledWith(mockOffer.riderId);
      expect(mockNotificationProducer.sendOfferAcceptedNotification).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
    });

    it('should throw ConflictException if lock cannot be acquired', async () => {
      mockRedisLockService.acquire.mockResolvedValueOnce(null);

      await expect(service.accept(mockOffer.id!)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if offer is already processed', async () => {
      mockOfferRepository.findOne.mockResolvedValueOnce({
        ...mockOffer,
        status: OfferStatus.ACCEPTED,
      });

      await expect(service.accept(mockOffer.id!)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if offer has expired', async () => {
      mockOfferRepository.findOne.mockResolvedValueOnce({
        ...mockOffer,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.accept(mockOffer.id!)).rejects.toThrow(BadRequestException);
    });
  });

  describe('reject', () => {
    it('should reject an offer', async () => {
      const freshOffer = {
        ...mockOffer,
        status: OfferStatus.PENDING,
        expiresAt: new Date(Date.now() + 10000),
      };
      mockOfferRepository.findOne.mockResolvedValueOnce(freshOffer);

      const result = await service.reject(mockOffer.id!);

      expect(mockRedisLockService.acquire).toHaveBeenCalledWith(`offer:${mockOffer.id}`);
      expect(mockNotificationProducer.sendOfferRejectedNotification).toHaveBeenCalled();
      expect(mockLock.release).toHaveBeenCalled();
    });
  });

  describe('findNearbyRidersForDelivery', () => {
    it('should call location client with delivery coordinates', async () => {
      await service.findNearbyRidersForDelivery(mockDelivery.id!);

      expect(mockDeliveryService.findOne).toHaveBeenCalledWith(mockDelivery.id);
      expect(mockLocationClient.getNearbyRiders).toHaveBeenCalledWith(
        mockDelivery.pickupLatitude,
        mockDelivery.pickupLongitude,
        5,
        10,
      );
    });
  });
});
