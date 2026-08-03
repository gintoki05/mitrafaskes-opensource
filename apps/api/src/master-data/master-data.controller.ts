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
import { MasterDataService } from './master-data.service';
import { SatusehatOrganizationImportService } from './satusehat-organization-import.service';
import { SatusehatOrganizationLinkService } from './satusehat-organization-link.service';
import { SatusehatOrganizationService } from './satusehat-organization.service';

type MasterDataListHttpQuery = Record<string, string | undefined>;
type SatusehatOrganizationHttpQuery = Record<string, string | undefined>;

const listSorts: MasterDataListSort[] = ['code', 'name', 'active', 'createdAt'];

const parseListQuery = (
  query: MasterDataListHttpQuery,
): MasterDataListQuery => {
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
    type: query.type,
    status: query.status,
    organizationId: query.organizationId,
    serviceUnitId: query.serviceUnitId,
    page: parsePositiveInteger(query.page),
    pageSize: parsePositiveInteger(query.pageSize),
    sort,
    direction,
  };
};

@Controller('api/master')
@UseGuards(SessionPermissionGuard)
@ApiTags('Master Faskes')
export class MasterDataController {
  constructor(
    private readonly masterData: MasterDataService,
    private readonly satusehatOrganizations: SatusehatOrganizationService,
    private readonly satusehatOrganizationImport: SatusehatOrganizationImportService,
    private readonly satusehatOrganizationLink: SatusehatOrganizationLinkService,
  ) {}

  @Get('faskes')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  findAll() {
    return this.masterData.findAll();
  }

  @Get('organizations')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  findOrganizations(@Query() query: MasterDataListHttpQuery) {
    return this.masterData.findOrganizations(parseListQuery(query));
  }

  @Get('service-units')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  findServiceUnits(@Query() query: MasterDataListHttpQuery) {
    return this.masterData.findServiceUnits(parseListQuery(query));
  }

  @Get('locations')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  findLocations(@Query() query: MasterDataListHttpQuery) {
    return this.masterData.findLocations(parseListQuery(query));
  }

  @Post('organizations')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  createOrganization(@Body() body: unknown) {
    return this.masterData.createOrganization(body);
  }

  @Patch('organizations/:id')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  updateOrganization(@Param('id') id: string, @Body() body: unknown) {
    return this.masterData.updateOrganization(id, body);
  }

  @Get('organizations/satusehat/search')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  searchSatusehatOrganizations(@Query() query: SatusehatOrganizationHttpQuery) {
    return this.satusehatOrganizationImport.searchOrganizations({
      id: query.id,
      name: query.name,
      partOf: query.partOf ?? query.partof,
      parentLocalId: query.parentLocalId,
    });
  }

  @Post('organizations/satusehat/import')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  importSatusehatOrganization(@Body() body: unknown) {
    return this.satusehatOrganizationImport.importOrganization(body);
  }

  @Get('organizations/:id/satusehat/preview')
  @RequirePermission(AccessPermission.MASTER_DATA_READ)
  previewSatusehatOrganization(@Param('id') id: string) {
    return this.satusehatOrganizations.previewOrganization(id);
  }

  @Post('organizations/:id/satusehat/sync')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  syncSatusehatOrganization(@Param('id') id: string) {
    return this.satusehatOrganizations.syncOrganization(id);
  }

  @Post('organizations/:id/satusehat/link')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  linkSatusehatOrganization(@Param('id') id: string, @Body() body: unknown) {
    return this.satusehatOrganizationLink.linkExistingOrganization(id, body);
  }

  @Post('service-units')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  createServiceUnit(@Body() body: unknown) {
    return this.masterData.createServiceUnit(body);
  }

  @Patch('service-units/:id')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  updateServiceUnit(@Param('id') id: string, @Body() body: unknown) {
    return this.masterData.updateServiceUnit(id, body);
  }

  @Post('locations')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  createLocation(@Body() body: unknown) {
    return this.masterData.createLocation(body);
  }

  @Patch('locations/:id')
  @RequirePermission(AccessPermission.MASTER_DATA_WRITE)
  updateLocation(@Param('id') id: string, @Body() body: unknown) {
    return this.masterData.updateLocation(id, body);
  }
}
