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
import { AccessPermission } from '@mitrafaskes/shared';
import { Public, RequirePermission } from './auth/access-control.decorator';
import { SessionPermissionGuard } from './auth/session-permission.guard';
import { MasterIcd10Service } from './master-data/master-icd10.service';

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
  login(@Body() body: any) {
    const { username } = body;
    if (
      username === 'admin' ||
      username === 'dr_budi' ||
      username === 'perawat_ani'
    ) {
      const roleMap: Record<string, any> = {
        admin: { role: 'ADMIN', name: 'Siti Rahma (Admin)' },
        dr_budi: {
          role: 'DOKTER',
          name: 'dr. Budi Santoso, Sp.PD',
          sip: 'SIP-449/123/2023',
        },
        perawat_ani: { role: 'PERAWAT', name: 'Ani Wijaya, S.Kep' },
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
