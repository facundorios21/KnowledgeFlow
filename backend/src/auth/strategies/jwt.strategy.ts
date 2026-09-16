import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { CustomLoggerService } from '../../common/logger/custom-logger.service';

export interface KeycloakJwtPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  iss?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly logger: CustomLoggerService,
  ) {
    const jwksUri = configService.get<string>(
      'keycloak.jwksUri',
      'http://localhost:8080/realms/KnowledgeFlow/protocol/openid-connect/certs',
    );
    const issuer = configService.get<string>(
      'keycloak.issuerUrl',
      'http://localhost:8080/realms/KnowledgeFlow',
    );

    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      issuer,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: KeycloakJwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload: missing sub');
    }

    const keycloakUserId = payload.sub;
    const email =
      payload.email || `${payload.preferred_username || keycloakUserId}@knowledgeflow.local`;
    const name = payload.name || payload.preferred_username || 'KnowledgeFlow User';

    // Aggregate roles from realm_access and resource_access
    const roles: string[] = [];
    if (payload.realm_access?.roles) {
      roles.push(...payload.realm_access.roles);
    }
    const backendClientId = this.configService.get<string>(
      'keycloak.backendClientId',
      'knowledgeflow-backend',
    );
    if (payload.resource_access?.[backendClientId]?.roles) {
      roles.push(...payload.resource_access[backendClientId].roles);
    }

    try {
      const user = await this.usersService.findOrCreateFromKeycloak({
        keycloakUserId,
        email,
        name,
        roles,
      });

      return {
        id: user._id.toString(),
        keycloakUserId: user.keycloakUserId,
        email: user.email,
        name: user.name,
        role: user.role,
        keycloakRoles: roles,
      };
    } catch (error) {
      this.logger.error(
        `Failed to validate user ${keycloakUserId}: ${(error as Error).message}`,
        (error as Error).stack,
        'JwtStrategy',
      );
      throw new UnauthorizedException('Could not synchronize or validate local user');
    }
  }
}
