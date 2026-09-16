import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongooseIndicator: MongooseHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Service health and dependency status',
    description: 'Returns operational status of the NestJS application and its MongoDB database connection.',
  })
  @ApiOkResponse({
    description: 'System is healthy and operational',
    schema: {
      example: {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
        timestamp: '2026-09-16T12:00:00.000Z',
        uptime: 120.45,
      },
    },
  })
  async check() {
    const result = await this.health.check([
      () => this.mongooseIndicator.pingCheck('database'),
    ]);

    return {
      ...result,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
