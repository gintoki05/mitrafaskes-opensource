import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission, UserRole } from '@mitrafaskes/shared';
import { Request } from 'express';
import { RequirePermission } from '../auth/access-control.decorator';
import { AuthenticatedUser } from '../auth/session-permission.guard';
import { MasterWilayahService } from './master-wilayah.service';
import { MasterMaritalStatusService } from './master-marital-status.service';
import { MasterIcd10Service } from './master-icd10.service';
import { parseRegionLevel } from './master-wilayah.validation';

type MasterDataRequest = Request & { user: AuthenticatedUser };
type RegionQuery = Record<string, string | undefined>;

const parsePositiveInteger = (
  value: string | undefined,
  fallback: number,
  max?: number,
): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || (max && parsed > max)) {
    throw new BadRequestException('Parameter pagination tidak valid');
  }
  return parsed;
};

@Controller('api/master-data')
@ApiTags('Master Data')
export class MasterDataReferenceController {
  constructor(
    private readonly masterWilayah: MasterWilayahService,
    private readonly maritalStatuses: MasterMaritalStatusService,
    private readonly icd10: MasterIcd10Service,
  ) {}

  @Get('datasets')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  listDatasets(@Req() request: MasterDataRequest) {
    return this.masterWilayah.listDatasets(
      request.user.role === UserRole.ADMIN,
    );
  }

  @Get('marital-status')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  listMaritalStatuses() {
    return this.maritalStatuses.list();
  }

  @Get('icd10')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  listIcd10(@Query() query: RegionQuery) {
    return this.icd10.list({
      search: query.q?.trim() || undefined,
      page: parsePositiveInteger(query.page, 1),
      pageSize: parsePositiveInteger(query.pageSize, 50, 200),
    });
  }

  @Get('regions')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  listRegions(@Query() query: RegionQuery) {
    let level: ReturnType<typeof parseRegionLevel>;
    try {
      level = parseRegionLevel(query.level || 'PROVINCE');
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Level wilayah tidak valid',
      );
    }

    return this.masterWilayah.listRegions({
      level,
      parentCode: query.parentCode?.trim() || undefined,
      search: query.search?.trim() || undefined,
      page: parsePositiveInteger(query.page, 1),
      pageSize: parsePositiveInteger(query.pageSize, 50, 200),
    });
  }

  @Get('regions/:level/:code')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  getRegion(@Param('level') level: string, @Param('code') code: string) {
    try {
      parseRegionLevel(level);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Level wilayah tidak valid',
      );
    }
    return this.masterWilayah.getRegion(level, code);
  }

  @Post('regions/refresh')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  refreshRegions() {
    return this.masterWilayah.refresh();
  }
}
