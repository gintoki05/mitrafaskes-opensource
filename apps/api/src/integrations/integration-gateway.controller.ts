import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission, evaluateAccess } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import { AuthenticatedUser } from '../auth/session-permission.guard';
import { IntegrationRegistry } from './integration-registry';
import type { IntegrationResourceHandler } from './integration.types';

type IntegrationHttpQuery = Record<string, string | undefined>;

const positiveInteger = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

type ResourceOperation =
  'search' | 'lookup' | 'import' | 'preview' | 'sync' | 'link';

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
  return callback;
}

@Controller('api/integrations')
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
  retryLog(
    @Param('provider') provider: string,
    @Param('logId') logId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.integrations.retryLog(provider, logId, {
      includePayload: evaluateAccess(
        request.user.role,
        AccessPermission.SYNC_PAYLOAD_READ,
      ).allowed,
    });
  }

  @Get(':provider/reconciliation')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  reconcile(@Param('provider') provider: string) {
    return this.integrations.reconcile(provider);
  }

  @Get(':provider/resources/:resourceType/search')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  search(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Query() query: IntegrationHttpQuery,
  ) {
    const handler = this.integrations.getResourceHandler(
      provider,
      resourceType,
    );
    return requireOperation(
      handler,
      handler.search ? 'search' : 'lookup',
    )(query);
  }

  @Get(':provider/resources/:resourceType/lookup')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  lookup(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Query() query: IntegrationHttpQuery,
  ) {
    const handler = this.integrations.getResourceHandler(
      provider,
      resourceType,
    );
    return requireOperation(
      handler,
      handler.lookup ? 'lookup' : 'search',
    )(query);
  }

  @Post(':provider/resources/:resourceType/import')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  importResource(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Body() body: unknown,
  ) {
    const handler = this.integrations.getResourceHandler(
      provider,
      resourceType,
    );
    return requireOperation(handler, 'import')(body);
  }

  @Get(':provider/resources/:resourceType/:localResourceId/preview')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  async preview(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Param('localResourceId') localResourceId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    const handler = this.integrations.getResourceHandler(
      provider,
      resourceType,
    );
    const result = await requireOperation(handler, 'preview')(localResourceId);
    return redactRawIntegrationResponse(
      result,
      evaluateAccess(request.user.role, AccessPermission.SYNC_PAYLOAD_READ)
        .allowed,
    );
  }

  @Post(':provider/resources/:resourceType/:localResourceId/sync')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  async sync(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Param('localResourceId') localResourceId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    const handler = this.integrations.getResourceHandler(
      provider,
      resourceType,
    );
    const result = await requireOperation(handler, 'sync')(localResourceId);
    return redactRawIntegrationResponse(
      result,
      evaluateAccess(request.user.role, AccessPermission.SYNC_PAYLOAD_READ)
        .allowed,
    );
  }

  @Post(':provider/resources/:resourceType/:localResourceId/link')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  link(
    @Param('provider') provider: string,
    @Param('resourceType') resourceType: string,
    @Param('localResourceId') localResourceId: string,
    @Body() body: unknown,
  ) {
    const handler = this.integrations.getResourceHandler(
      provider,
      resourceType,
    );
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

function redactRawIntegrationResponse(
  value: unknown,
  canReadPayload: boolean,
): unknown {
  if (canReadPayload || !isRecord(value)) return value;
  const safe = { ...value };
  delete safe.payload;
  delete safe.response;
  return safe;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
