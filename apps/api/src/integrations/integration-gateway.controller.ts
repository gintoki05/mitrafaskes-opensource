import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission, evaluateAccess } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import {
  AuthenticatedUser,
  SessionPermissionGuard,
} from '../auth/session-permission.guard';
import { IntegrationRegistry } from './integration-registry';
import type { IntegrationResourceHandler } from './integration.types';

type IntegrationHttpQuery = Record<string, string | undefined>;

const positiveInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

type ResourceOperation =
  | 'search'
  | 'lookup'
  | 'import'
  | 'preview'
  | 'sync'
  | 'link';

type IntegrationOperationCallback = (...args: unknown[]) => Promise<unknown>;

function requireOperation(
  handler: IntegrationResourceHandler,
  operation: ResourceOperation,
): IntegrationOperationCallback {
  const callback = handler[operation];
  if (!callback) {
    throw new NotFoundException({
      code: 'INTEGRATION_OPERATION_NOT_FOUND',
      message: `Operasi ${operation} tidak didukung untuk resource ${handler.resourceType}`,
    });
  }
  return callback as unknown as IntegrationOperationCallback;
}

@Controller('api/integrations')
@UseGuards(SessionPermissionGuard)
@ApiTags('Integrations')
export class IntegrationGatewayController {
  constructor(private readonly integrations: IntegrationRegistry) {}

  @Get('capabilities')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  getCapabilities() {
    return this.integrations.getCapabilities();
  }

  @Get(':provider/connection')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  getConnection(@Param('provider') provider: string) {
    return this.integrations.getConnectionStatus(provider);
  }

  @Get(':provider/logs')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  getLogs(
    @Param('provider') provider: string,
    @Query() query: IntegrationHttpQuery,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.integrations.listLogs(provider, {
      page: positiveInteger(query.page, 1),
      pageSize: Math.min(positiveInteger(query.pageSize, 25), 100),
      includePayload: evaluateAccess(
        request.user.role,
        AccessPermission.SYNC_PAYLOAD_READ,
      ).allowed,
    });
  }

  @Post(':provider/logs/:logId/retry')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  retryLog(@Param('provider') provider: string, @Param('logId') logId: string) {
    return this.integrations.retryLog(provider, logId);
  }

  @Get(':provider/resources/:resourceType/search')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  search(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Query() query: IntegrationHttpQuery,
  ) {
    const handler = this.integrations.getResourceHandler(provider, resourceType);
    return requireOperation(handler, handler.search ? 'search' : 'lookup')(query);
  }

  @Get(':provider/resources/:resourceType/lookup')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  lookup(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Query() query: IntegrationHttpQuery,
  ) {
    const handler = this.integrations.getResourceHandler(provider, resourceType);
    return requireOperation(handler, handler.lookup ? 'lookup' : 'search')(query);
  }

  @Post(':provider/resources/:resourceType/import')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  importResource(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Body() body: unknown,
  ) {
    const handler = this.integrations.getResourceHandler(provider, resourceType);
    return requireOperation(handler, 'import')(body);
  }

  @Get(':provider/resources/:resourceType/:localResourceId/preview')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  preview(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Param('localResourceId') localResourceId: string,
  ) {
    const handler = this.integrations.getResourceHandler(provider, resourceType);
    return requireOperation(handler, 'preview')(localResourceId);
  }

  @Post(':provider/resources/:resourceType/:localResourceId/sync')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  sync(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Param('localResourceId') localResourceId: string,
  ) {
    const handler = this.integrations.getResourceHandler(provider, resourceType);
    return requireOperation(handler, 'sync')(localResourceId);
  }

  @Post(':provider/resources/:resourceType/:localResourceId/link')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  link(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Param('localResourceId') localResourceId: string,
    @Body() body: unknown,
  ) {
    const handler = this.integrations.getResourceHandler(provider, resourceType);
    return requireOperation(handler, 'link')(localResourceId, body);
  }

  @Post(':provider/master-data/:domain/refresh')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  refreshMasterData(
    @Param('provider') provider: string,
    @Param('domain') domain: string,
  ) {
    return this.integrations.refreshMasterData(provider, domain);
  }
}
