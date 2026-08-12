import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import {
  AuthenticatedUser,
  SessionPermissionGuard,
} from '../auth/session-permission.guard';
import { RmeService } from './rme.service';

@Controller('api/rme')
@UseGuards(SessionPermissionGuard)
@ApiTags('Medical Records')
export class RmeController {
  constructor(private readonly rme: RmeService) {}

  @Get('encounter/:encounterId')
  @RequirePermission(AccessPermission.RME_READ)
  findByEncounter(
    @Param('encounterId') encounterId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.rme.findByEncounterId(encounterId, request.user);
  }

  @Post('draft')
  @RequirePermission(AccessPermission.RME_WRITE_DRAFT)
  saveDraft(
    @Body() body: unknown,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.rme.saveDraft(body, request.user);
  }

  @Post('finalize')
  @RequirePermission(AccessPermission.RME_FINALIZE)
  finalize(
    @Body() body: unknown,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.rme.finalize(body, request.user);
  }
}
