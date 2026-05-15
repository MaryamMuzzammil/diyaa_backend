import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserRole } from './users.entity';
import { Institute } from '../institute/institute.entity';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let instituteRepo: { findOne: jest.Mock };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    instituteRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repo,
        },
        {
          provide: getRepositoryToken(Institute),
          useValue: instituteRepo,
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
      repo.findOne.mockResolvedValue(null);
      const saved = {
        user_id: 1,
        name: 'Alice',
        email: 'a@b.com',
        role: UserRole.STUDENT,
        status: 'active',
        password_hash: 'hashed-password',
      };
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      const result = await service.create({
        name: 'Alice',
        email: 'a@b.com',
        password: 'secret',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10);
      expect(result.message).toBe('Account created successfully');
      expect(result.user.email).toBe('a@b.com');
      expect(result.user.role).toBe(UserRole.STUDENT);
    });

    it('uses provided role when set', async () => {
      repo.findOne.mockResolvedValue(null);
      const saved = {
        user_id: 2,
        name: 'Bob',
        email: 'b@b.com',
        role: UserRole.TEACHER,
        status: 'active',
        password_hash: 'hashed-password',
      };
      repo.create.mockReturnValue(saved);
      repo.save.mockResolvedValue(saved);

      const result = await service.create({
        name: 'Bob',
        email: 'b@b.com',
        password: 'x',
        role: UserRole.TEACHER,
      });

      expect(result.user.role).toBe(UserRole.TEACHER);
    });
  });

  describe('findAll', () => {
    it('returns public user shapes', async () => {
      repo.find.mockResolvedValue([
        {
          user_id: 1,
          name: 'Alice',
          email: 'a@b.com',
          role: UserRole.STUDENT,
          status: 'active',
          password_hash: 'secret',
        },
      ]);
      const out = await service.findAll();
      expect(repo.find).toHaveBeenCalled();
      expect(out).toHaveLength(1);
      expect(out[0]).not.toHaveProperty('password_hash');
      expect(out[0].email).toBe('a@b.com');
    });
  });
});
