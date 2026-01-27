import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RiderService } from '../src/rider/rider.service';
import { Rider, RiderStatus } from '@app/database';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('RiderService', () => {
  let service: RiderService;
  let repository: Repository<Rider>;

  const mockRider: Partial<Rider> = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Rider',
    phone: '010-1234-5678',
    status: RiderStatus.AVAILABLE,
    latitude: 37.5665,
    longitude: 126.978,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: mockRider.id })),
    save: jest.fn().mockImplementation((rider) => Promise.resolve({ ...mockRider, ...rider })),
    find: jest.fn().mockResolvedValue([mockRider]),
    findOne: jest.fn().mockResolvedValue(mockRider),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiderService,
        {
          provide: getRepositoryToken(Rider),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RiderService>(RiderService);
    repository = module.get<Repository<Rider>>(getRepositoryToken(Rider));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a rider', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      const createDto = {
        name: 'Test Rider',
        phone: '010-1234-5678',
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(createDto.name);
    });

    it('should throw ConflictException if phone already exists', async () => {
      const createDto = {
        name: 'Test Rider',
        phone: '010-1234-5678',
      };

      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all riders', async () => {
      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockRider]);
    });
  });

  describe('findAvailable', () => {
    it('should return available riders', async () => {
      const result = await service.findAvailable();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: RiderStatus.AVAILABLE },
      });
    });
  });

  describe('findOne', () => {
    it('should return a rider by id', async () => {
      const result = await service.findOne(mockRider.id!);

      expect(result).toEqual(mockRider);
    });

    it('should throw NotFoundException if rider not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update rider status', async () => {
      const result = await service.updateStatus(mockRider.id!, { status: RiderStatus.BUSY });

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RiderStatus.BUSY }),
      );
    });
  });

  describe('setBusy', () => {
    it('should set rider status to BUSY', async () => {
      const result = await service.setBusy(mockRider.id!);

      expect(result.status).toBe(RiderStatus.BUSY);
    });
  });

  describe('setAvailable', () => {
    it('should set rider status to AVAILABLE', async () => {
      const result = await service.setAvailable(mockRider.id!);

      expect(result.status).toBe(RiderStatus.AVAILABLE);
    });
  });
});
