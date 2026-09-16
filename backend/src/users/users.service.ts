import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { UserRole } from '../common/decorators/roles.decorator';
import { CustomLoggerService } from '../common/logger/custom-logger.service';

export interface KeycloakProfilePayload {
  keycloakUserId: string;
  email: string;
  name: string;
  roles?: string[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly logger: CustomLoggerService,
  ) {}

  async findOrCreateFromKeycloak(profile: KeycloakProfilePayload): Promise<UserDocument> {
    const { keycloakUserId, email, name, roles = [] } = profile;

    // Check if user exists by keycloakUserId
    let user = await this.userModel.findOne({ keycloakUserId }).exec();

    // Map roles: if roles contain 'admin' or 'ADMIN', grant UserRole.ADMIN
    const isAdmin = roles.some((r) => r.toUpperCase() === 'ADMIN');
    const mappedRole = isAdmin ? UserRole.ADMIN : UserRole.USER;

    if (!user) {
      // Check if user exists by email (e.g. pre-provisioned)
      user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();

      if (user) {
        user.keycloakUserId = keycloakUserId;
        user.name = name || user.name;
        if (isAdmin) user.role = UserRole.ADMIN;
        await user.save();
        this.logger.log(`Linked existing user email ${email} to Keycloak user ${keycloakUserId}`, 'UsersService');
      } else {
        user = await this.userModel.create({
          keycloakUserId,
          email: email.toLowerCase(),
          name: name || email.split('@')[0],
          role: mappedRole,
        });
        this.logger.log(`Created new local user profile for Keycloak user ${keycloakUserId} (${email})`, 'UsersService');
      }
    } else {
      // Synchronize name or admin role if updated
      let changed = false;
      if (name && user.name !== name) {
        user.name = name;
        changed = true;
      }
      if (isAdmin && user.role !== UserRole.ADMIN) {
        user.role = UserRole.ADMIN;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    return user;
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByKeycloakUserId(keycloakUserId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ keycloakUserId }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }
}
