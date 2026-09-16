import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, MongooseHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let mongooseIndicator: jest.Mocked<MongooseHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheckService = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      }),
    };

    const mockMongooseIndicator = {
      pingCheck: jest.fn().mockResolvedValue({ database: { status: 'up' } }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: MongooseHealthIndicator, useValue: mockMongooseIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthCheckService = module.get(HealthCheckService);
    mongooseIndicator = module.get(MongooseHealthIndicator);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health status including database ping', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.details).toHaveProperty('database');
    expect(result).toHaveProperty('timestamp');
    expect(result).toHaveProperty('uptime');
    expect(healthCheckService.check).toHaveBeenCalled();
  });
});
