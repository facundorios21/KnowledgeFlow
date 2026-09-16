import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthMeResponseDto } from './dto/auth-me-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Get current authenticated user profile and roles',
    description:
      'Validates Keycloak JWT token, returns the mapped MongoDB user profile along with Keycloak realm/client roles.',
  })
  @ApiOkResponse({
    description: 'Current user profile successfully retrieved',
    type: AuthMeResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid, missing or expired access token' })
  getProfile(@CurrentUser() user: AuthMeResponseDto): AuthMeResponseDto {
    return user;
  }
}
