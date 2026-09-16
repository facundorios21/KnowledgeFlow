import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/decorators/roles.decorator';

export class AuthMeResponseDto {
  @ApiProperty({ description: 'MongoDB internal ID', example: '65f123456789abcdef012345' })
  id!: string;

  @ApiProperty({ description: 'Keycloak Subject UUID', example: 'd3b07384-d113-40f4-8a4d-f9e436f45209' })
  keycloakUserId!: string;

  @ApiProperty({ description: 'User display name', example: 'Juan Pérez' })
  name!: string;

  @ApiProperty({ description: 'User email', example: 'juan.perez@knowledgeflow.io' })
  email!: string;

  @ApiProperty({ enum: UserRole, example: UserRole.USER })
  role!: UserRole;

  @ApiProperty({ description: 'Roles assigned in Keycloak token', example: ['default-roles-knowledgeflow', 'USER'] })
  keycloakRoles!: string[];
}
