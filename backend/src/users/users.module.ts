import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersService } from './users.service';
import { CustomLoggerService } from '../common/logger/custom-logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersService, CustomLoggerService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
