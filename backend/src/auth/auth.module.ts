import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { CustomLoggerService } from '../common/logger/custom-logger.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [JwtStrategy, JwtAuthGuard, CustomLoggerService],
  exports: [JwtAuthGuard, PassportModule],
})
export class AuthModule {}
