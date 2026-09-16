import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { User } from './schemas/user.schema';
import { UserRole } from '../common/decorators/roles.decorator';
import { CustomLoggerService } from '../common/logger/custom-logger.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: CustomLoggerService,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateFromKeycloak', () => {
    it('should return existing user if found by keycloakUserId', async () => {
      const existingUser = {
        _id: '507f1f77bcf86cd799439011',
        keycloakUserId: 'kc-123',
        email: 'user@test.com',
        name: 'Test User',
        role: UserRole.USER,
        save: jest.fn().mockResolvedValue(true),
      };

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingUser),
      });

      const result = await service.findOrCreateFromKeycloak({
        keycloakUserId: 'kc-123',
        email: 'user@test.com',
        name: 'Test User',
      });

      expect(result.keycloakUserId).toBe('kc-123');
      expect(mockUserModel.findOne).toHaveBeenCalledWith({ keycloakUserId: 'kc-123' });
    });

    it('should create new user with USER role when not found', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const newUser = {
        _id: '507f1f77bcf86cd799439012',
        keycloakUserId: 'kc-456',
        email: 'new@test.com',
        name: 'New User',
        role: UserRole.USER,
      };

      mockUserModel.create.mockResolvedValue(newUser);

      const result = await service.findOrCreateFromKeycloak({
        keycloakUserId: 'kc-456',
        email: 'new@test.com',
        name: 'New User',
      });

      expect(result.role).toBe(UserRole.USER);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        keycloakUserId: 'kc-456',
        email: 'new@test.com',
        name: 'New User',
        role: UserRole.USER,
      });
    });

    it('should assign ADMIN role when Keycloak roles contain ADMIN', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const adminUser = {
        _id: '507f1f77bcf86cd799439013',
        keycloakUserId: 'kc-789',
        email: 'admin@test.com',
        name: 'Admin User',
        role: UserRole.ADMIN,
      };

      mockUserModel.create.mockResolvedValue(adminUser);

      const result = await service.findOrCreateFromKeycloak({
        keycloakUserId: 'kc-789',
        email: 'admin@test.com',
        name: 'Admin User',
        roles: ['default-roles', 'ADMIN'],
      });

      expect(result.role).toBe(UserRole.ADMIN);
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.ADMIN,
        }),
      );
    });
  });
});
