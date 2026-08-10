import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UnauthorizedException,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MemoryStore } from './store/memory-store';
import {
  AccessPermission,
  PaginatedListResponse,
  evaluateAccess,
} from '@mitrafaskes/shared';
import { Public, RequirePermission } from './auth/access-control.decorator';
import {
  AuthenticatedUser,
  SessionPermissionGuard,
} from './auth/session-permission.guard';
import { SatusehatAuthService } from './satusehat/satusehat-auth.service';
import { MasterIcd10Service } from './master-data/master-icd10.service';

const DEFAULT_LIST_PAGE = 1;
const DEFAULT_LIST_PAGE_SIZE = 25;
const MAX_LIST_PAGE_SIZE = 100;

const normalizePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const paginate = <T>(
  items: readonly T[],
  pageInput?: string,
  pageSizeInput?: string,
): PaginatedListResponse<T> => {
  const page = normalizePositiveInteger(pageInput, DEFAULT_LIST_PAGE);
  const pageSize = Math.min(
    normalizePositiveInteger(pageSizeInput, DEFAULT_LIST_PAGE_SIZE),
    MAX_LIST_PAGE_SIZE,
  );
  const total = items.length;

  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    meta: { page, pageSize, total },
  };
};

@Controller('api')
@UseGuards(SessionPermissionGuard)
export class AppController {
  constructor(
    private readonly satusehatAuth: SatusehatAuthService,
    private readonly icd10: MasterIcd10Service,
  ) {}

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

  // 3. SATUSEHAT Logs & Sync Retry
  @Get('satusehat/logs')
  @ApiTags('SATUSEHAT')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  getSatusehatLogs(
    @Req() request: { user: AuthenticatedUser },
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const logs = this.can(request.user, AccessPermission.SYNC_PAYLOAD_READ)
      ? MemoryStore.syncLogs
      : MemoryStore.syncLogs.map(({ payload, ...log }) => log);
    return paginate(logs, page, pageSize);
  }

  @Get('satusehat/auth/status')
  @ApiTags('SATUSEHAT')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  getSatusehatAuthStatus() {
    return this.satusehatAuth.getConnectionStatus();
  }

  @Post('satusehat/sync/:logId/retry')
  @ApiTags('SATUSEHAT')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  retrySync(@Param('logId') logId: string) {
    const log = MemoryStore.syncLogs.find((l) => l.id === logId);
    if (!log) {
      throw new NotFoundException('Log sinkronisasi tidak ditemukan');
    }
    log.status = 'SUCCESS';
    log.satusehatId = `${log.resourceType.substring(0, 3).toUpperCase()}-SATUSEHAT-${Date.now()}`;
    log.errorMessage = undefined;
    log.updatedAt = new Date().toISOString();
    return {
      message: 'Sinkronisasi Ulang ke SATUSEHAT Kemenkes Berhasil',
      log,
    };
  }

  private can(user: AuthenticatedUser, permission: AccessPermission): boolean {
    return evaluateAccess(user.role, permission).allowed;
  }

}
