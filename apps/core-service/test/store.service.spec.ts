import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreService } from '../src/store/store.service';
import { Store } from '@app/database';
import { NotFoundException } from '@nestjs/common';

describe('StoreService', () => {
  let service: StoreService;
  let repository: Repository<Store>;

  const mockStore: Partial<Store> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Test Store',
    address: '서울시 강남구',
    latitude: 37.5665,
    longitude: 126.978,
    phone: '02-1234-5678',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn().mockImplementation((dto) => ({ ...dto, id: mockStore.id })),
    save: jest.fn().mockImplementation((store) => Promise.resolve({ ...mockStore, ...store })),
    find: jest.fn().mockResolvedValue([mockStore]),
    findOne: jest.fn().mockResolvedValue(mockStore),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoreService,
        {
          provide: getRepositoryToken(Store),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<StoreService>(StoreService);
    repository = module.get<Repository<Store>>(getRepositoryToken(Store));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a store', async () => {
      const createDto = {
        name: 'Test Store',
        address: '서울시 강남구',
        latitude: 37.5665,
        longitude: 126.978,
      };

      const result = await service.create(createDto);

      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('findAll', () => {
    it('should return all active stores', async () => {
      const result = await service.findAll();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual([mockStore]);
    });
  });

  describe('findOne', () => {
    it('should return a store by id', async () => {
      const result = await service.findOne(mockStore.id!);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: mockStore.id } });
      expect(result).toEqual(mockStore);
    });

    it('should throw NotFoundException if store not found', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a store', async () => {
      const updateDto = { name: 'Updated Store' };

      const result = await service.update(mockStore.id!, updateDto);

      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('remove', () => {
    it('should soft delete a store by setting isActive to false', async () => {
      await service.remove(mockStore.id!);

      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });
  });
});
