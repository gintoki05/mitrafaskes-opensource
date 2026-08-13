import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission, UserRole } from '@mitrafaskes/shared';
import { Public, RequirePermission } from './auth/access-control.decorator';
import { SessionPermissionGuard } from './auth/session-permission.guard';
import { MasterIcd10Service } from './master-data/master-icd10.service';

type LoginBody = {
  username?: unknown;
};

type MockLoginUser = {
  role: UserRole;
  name: string;
  sip?: string;
};

@Controller('api')
@UseGuards(SessionPermissionGuard)
export class AppController {
  constructor(private readonly icd10: MasterIcd10Service) {}

  @Get()
  @ApiTags('General')
  @Public()
  getHello(): string {
    return 'Mitra Faskes NestJS API Server Ready';
  }

  // 1. Auth Endpoint
  @Post('auth/login')
  @ApiTags('Authentication')
  @Public()
  login(@Body() body: LoginBody) {
    const username = typeof body.username === 'string' ? body.username : '';
    if (
      username === 'admin' ||
      username === 'dr_budi' ||
      username === 'perawat_ani'
    ) {
      const roleMap: Record<string, MockLoginUser> = {
        admin: { role: UserRole.ADMIN, name: 'Siti Rahma (Admin)' },
        dr_budi: {
          role: UserRole.DOKTER,
          name: 'dr. Budi Santoso, Sp.PD',
          sip: 'SIP-449/123/2023',
        },
        perawat_ani: { role: UserRole.PERAWAT, name: 'Ani Wijaya, S.Kep' },
      };

      const user = roleMap[username];
      return {
        accessToken: `mock-jwt-token-${username}`,
        user: {
          id: `usr-${username}`,
          username,
          fullName: user.name,
          role: user.role,
          sipNumber: user.sip,
        },
      };
    }
    throw new UnauthorizedException('Username atau password salah');
  }

  // 2. Master ICD-10 Search
  @Get('master/icd10')
  @ApiTags('Master Data')
  @RequirePermission(AccessPermission.RME_READ)
  async getIcd10(@Query('q') q?: string) {
    const results = await this.icd10.list({
      search: q,
      page: 1,
      pageSize: 50,
    });
    return results.items.map(({ code, display, nameIndo, nameEng }) => ({
      code,
      display,
      nameIndo: nameIndo ?? display,
      nameEng,
    }));
  }
}
