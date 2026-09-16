import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/decorators/roles.decorator';

export class UserResponseDto {
  @ApiProperty({ description: 'Internal MongoDB ID', example: '65f123456789abcdef012345' })
  id!: string;

  @ApiProperty({ description: 'Keycloak Subject UUID', example: 'd3b07384-d113-40f4-8a4d-f9e436f45209' })
  keycloakUserId!: string;

  @ApiProperty({ description: 'User full name', example: 'Juan Pérez' })
  name!: string;

  @ApiProperty({ description: 'User email address', example: 'juan.perez@knowledgeflow.io' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ description: 'Creation date', example: '2026-09-16T10:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ description: 'Last update date', example: '2026-09-16T10:00:00.000Z' })
  updatedAt?: Date;
}
