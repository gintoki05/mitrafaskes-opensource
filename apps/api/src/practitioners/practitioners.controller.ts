import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  AccessPermission,
  MasterDataListQuery,
  MasterDataListSort,
  MasterDataSortDirection,
} from '@mitrafaskes/shared';
import { SessionPermissionGuard } from '../auth/session-permission.guard';
import { RequirePermission } from '../auth/access-control.decorator';
import { PractitionersService } from './practitioners.service';
import { SatusehatPractitionerService } from './satusehat-practitioner.service';

type PractitionerHttpQuery = Record<string, string | undefined>;

const listSorts: MasterDataListSort[] = ['name', 'active', 'createdAt'];

@Controller('api/practitioners')
@UseGuards(SessionPermissionGuard)
@ApiTags('Practitioners')
export class PractitionersController {
  constructor(
    private readonly practitioners: PractitionersService,
    private readonly satusehat: SatusehatPractitionerService,
  ) {}

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

  @Get('satusehat/lookup')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  lookupSatusehat(@Query() query: PractitionerHttpQuery) {
    return this.satusehat.lookupForDraft(query);
  }

  @Get(':id/satusehat/search')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  searchSatusehat(@Param('id') id: string) {
    return this.satusehat.searchForLocal(id);
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

  @Post(':id/satusehat/link')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  linkSatusehat(@Param('id') id: string, @Body() body: unknown) {
    return this.satusehat.linkExisting(id, body);
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
      page: parsePositiveInteger(query.page),
      pageSize: parsePositiveInteger(query.pageSize),
      sort,
      direction,
    };
  }
}
