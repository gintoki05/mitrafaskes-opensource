import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AccessPermission,
  MasterDataListQuery,
  MasterDataListSort,
  MasterDataSortDirection,
} from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import { PractitionersService } from './practitioners.service';

type PractitionerHttpQuery = Record<string, string | undefined>;

const listSorts: MasterDataListSort[] = ['name', 'active', 'createdAt'];

@Controller('api/practitioners')
@ApiTags('Practitioners')
export class PractitionersController {
  constructor(private readonly practitioners: PractitionersService) {}

  @Post()
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  create(@Body() body: unknown) {
    return this.practitioners.create(body);
  }

  @Get()
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  findMany(@Query() query: PractitionerHttpQuery) {
    return this.practitioners.findMany(this.parseListQuery(query));
  }

  @Get('roles')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  listRoleOptions() {
    return this.practitioners.listRoleOptions();
  }

  @Get(':id')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  findById(@Param('id') id: string) {
    return this.practitioners.findById(id);
  }

  @Patch(':id')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.practitioners.update(id, body);
  }

  private parseListQuery(query: PractitionerHttpQuery): MasterDataListQuery {
    const parsePositiveInteger = (value: string | undefined) => {
      if (!value) return undefined;
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
    };
    const active =
      query.active === 'true'
        ? true
        : query.active === 'false'
          ? false
          : undefined;
    const sort = listSorts.includes(query.sort as MasterDataListSort)
      ? (query.sort as MasterDataListSort)
      : undefined;
    const direction: MasterDataSortDirection | undefined =
      query.direction === 'desc' || query.direction === 'asc'
        ? query.direction
        : undefined;

    return {
      search: query.search,
      active,
      organizationId: query.organizationId,
      locationId: query.locationId,
      role:
        query.role === 'DOKTER' ||
        query.role === 'PERAWAT' ||
        query.role === 'PETUGAS_PENDAFTARAN'
          ? query.role
          : undefined,
      page: parsePositiveInteger(query.page),
      pageSize: parsePositiveInteger(query.pageSize),
      sort,
      direction,
    };
  }
}
