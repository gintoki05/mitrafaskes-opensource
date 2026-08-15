import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission } from '@mitrafaskes/shared';
import { randomUUID } from 'node:crypto';
import { RequirePermission } from '../auth/access-control.decorator';
import { AuthenticatedUser } from '../auth/session-permission.guard';
import { RmeService } from './rme.service';
import { TriageService } from './triage.service';

@Controller('api/rme')
@ApiTags('Medical Records')
export class RmeController {
  constructor(
    private readonly rme: RmeService,
    private readonly triage: TriageService,
  ) {}

  @Get('triage/encounter/:encounterId')
  @RequirePermission(AccessPermission.RME_TRIAGE_READ)
  findTriageByEncounter(
    @Param('encounterId') encounterId: string,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.triage.findByEncounterId(encounterId, request.user);
  }

  @Post('triage/draft')
  @RequirePermission(AccessPermission.RME_TRIAGE_WRITE)
  saveTriageDraft(
    @Body() body: unknown,
    @Req()
    request: {
      user: AuthenticatedUser;
      headers: Record<string, string | string[] | undefined>;
    },
  ) {
    return this.triage.saveDraft(
      body,
      request.user,
      this.requestMetadata(request.headers),
    );
  }

  @Post('triage/complete')
  @RequirePermission(AccessPermission.RME_TRIAGE_COMPLETE)
  completeTriage(
    @Body() body: unknown,
    @Req()
    request: {
      user: AuthenticatedUser;
      headers: Record<string, string | string[] | undefined>;
    },
  ) {
    return this.triage.complete(
      body,
      request.user,
      this.requestMetadata(request.headers),
    );
  }

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
    @Req()
    request: {
      user: AuthenticatedUser;
      headers: Record<string, string | string[] | undefined>;
    },
  ) {
    const requestId =
      this.header(request.headers['x-request-id']) ?? randomUUID();
    const correlationId =
      this.header(request.headers['x-correlation-id']) ?? requestId;
    return this.rme.finalize(body, request.user, { requestId, correlationId });
  }

  @Post('preflight')
  @RequirePermission(AccessPermission.RME_FINALIZE)
  preflight(
    @Body() body: unknown,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.rme.preflight(body, request.user);
  }

  private header(value: string | string[] | undefined): string | undefined {
    const candidate = Array.isArray(value) ? value[0] : value;
    return candidate?.trim().slice(0, 128) || undefined;
  }

  private requestMetadata(
    headers: Record<string, string | string[] | undefined>,
  ) {
    const requestId = this.header(headers['x-request-id']) ?? randomUUID();
    return {
      requestId,
      correlationId: this.header(headers['x-correlation-id']) ?? requestId,
    };
  }
}
