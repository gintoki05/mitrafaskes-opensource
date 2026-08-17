import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import type { AuthenticatedRequest } from '../auth/session.guard';
import { AccessRolesService } from './access-roles.service';

@Controller('api/access-roles')
@ApiTags('Access roles')
export class AccessRolesController {
  constructor(private readonly roles: AccessRolesService) {}

  @Get()
  @RequirePermission(AccessPermission.ROLE_READ)
  list() {
    return this.roles.list();
  }

  @Get('permissions')
  @RequirePermission(AccessPermission.ROLE_READ)
  permissions() {
    return this.roles.permissions();
  }

  @Get(':id/audit')
  @RequirePermission(AccessPermission.ACCESS_AUDIT_READ)
  audit(@Param('id') id: string) {
    return this.roles.audit(id);
  }

  @Post()
  @RequirePermission(AccessPermission.ROLE_WRITE)
  create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.roles.create(body, request.user!);
  }

  @Patch(':id')
  @RequirePermission(AccessPermission.ROLE_WRITE)
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.roles.update(id, body, request.user!);
  }
}
