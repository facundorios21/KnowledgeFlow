import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UserRole } from '../common/decorators/roles.decorator';
import { AuthMeResponseDto } from './dto/auth-me-response.dto';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return current user profile from request context', () => {
    const mockUser: AuthMeResponseDto = {
      id: '507f1f77bcf86cd799439011',
      keycloakUserId: 'kc-12345',
      name: 'Facundo',
      email: 'facundo@knowledgeflow.local',
      role: UserRole.USER,
      keycloakRoles: ['default-roles-knowledgeflow'],
    };

    const result = controller.getProfile(mockUser);
    expect(result).toEqual(mockUser);
    expect(result.keycloakUserId).toBe('kc-12345');
  });
});
