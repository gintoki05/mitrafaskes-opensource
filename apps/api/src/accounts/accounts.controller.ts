import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission, WorkProfileType } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { AccountsService } from './accounts.service';

@Controller('api/accounts')
@ApiTags('Accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @RequirePermission(AccessPermission.ACCOUNT_READ)
  list(@Query() query: Record<string, string | undefined>) {
    return this.accounts.list({
      search: query.search,
      active:
        query.active === 'true'
          ? true
          : query.active === 'false'
            ? false
            : undefined,
      accessRoleId: query.accessRoleId,
      workProfileType: Object.values(WorkProfileType).includes(
        query.workProfileType as WorkProfileType,
      )
        ? (query.workProfileType as WorkProfileType)
        : undefined,
      page: positive(query.page),
      pageSize: positive(query.pageSize),
    });
  }

  @Get(':id')
  @RequirePermission(AccessPermission.ACCOUNT_READ)
  findById(@Param('id') id: string) {
    return this.accounts.findById(id);
  }

  @Get(':id/audit')
  @RequirePermission(AccessPermission.ACCESS_AUDIT_READ)
  audit(@Param('id') id: string) {
    return this.accounts.audit(id);
  }

  @Post()
  @RequirePermission(AccessPermission.ACCOUNT_WRITE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.accounts.create(body, request.user!);
  }

  @Patch(':id')
  @RequirePermission(AccessPermission.ACCOUNT_WRITE)
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.accounts.update(id, body, request.user!);
  }

  @Post(':id/activate')
  @RequirePermission(AccessPermission.ACCOUNT_WRITE)
  activate(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.accounts.setActive(id, true, request.user!);
  }

  @Post(':id/deactivate')
  @RequirePermission(AccessPermission.ACCOUNT_WRITE)
  deactivate(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.accounts.setActive(id, false, request.user!);
  }

  @Post(':id/reset-password')
  @RequirePermission(AccessPermission.ACCOUNT_RESET_PASSWORD)
  resetPassword(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.accounts.resetPassword(id, request.user!);
  }
}

function positive(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}
