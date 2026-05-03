import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './users.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('hashes password and saves user with defaults', async () => {
      const dto = { name: 'Alice', email: 'a@b.com', password: 'secret' };
      const entity = {
        name: dto.name,
        email: dto.email,
        password_hash: 'hashed-password',
        role: UserRole.STUDENT,
        status: 'active',
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(repo.create).toHaveBeenCalledWith(entity);
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });

    it('uses provided role when set', async () => {
      const dto = {
        name: 'Bob',
        email: 'b@b.com',
        password: 'x',
        role: UserRole.TEACHER,
      };
      const entity = {
        name: dto.name,
        email: dto.email,
        password_hash: 'hashed-password',
        role: UserRole.TEACHER,
        status: 'active',
      };
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(entity);
    });
  });

  describe('findAll', () => {
    it('returns repository.find()', async () => {
      repo.find.mockResolvedValue([]);
      await expect(service.findAll()).resolves.toEqual([]);
      expect(repo.find).toHaveBeenCalled();
    });
  });
});
