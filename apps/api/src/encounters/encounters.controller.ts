import {
  BadRequestException,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Body,
  Query,
  Req,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AccessPermission, evaluateAccess } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import { AuthenticatedUser } from '../auth/session-permission.guard';
import {
  EncounterConflictError,
  EncounterContextError,
  EncounterNotFoundError,
  EncounterTransitionError,
  EncounterValidationError,
} from './encounter.errors';
import { EncountersService } from './encounters.service';
import {
  parseEncounterStatus,
  parseEncounterStatuses,
  parsePositiveInteger,
} from './encounter.validation';

type EncounterHttpQuery = Record<string, string | undefined>;

@Controller('api/encounters')
@ApiTags('Encounters')
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get('history')
  @RequirePermission(AccessPermission.QUEUE_READ)
  async findHistory(
    @Query() query: EncounterHttpQuery,
    @Req() request: { user: AuthenticatedUser },
  ) {
    try {
      return await this.encounters.findHistory(
        {
          page: parsePositiveInteger(query.page, 1),
          pageSize: parsePositiveInteger(query.pageSize, 25),
          fromDate: query.fromDate,
          toDate: query.toDate,
          search: query.search,
          status: parseEncounterStatus(query.status),
        },
        request.user,
      );
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  @Get()
  @RequirePermission(AccessPermission.QUEUE_READ)
  async findMany(
    @Query() query: EncounterHttpQuery,
    @Req() request: { user: AuthenticatedUser },
  ) {
    try {
      return await this.encounters.findMany(
        {
          page: parsePositiveInteger(query.page, 1),
          pageSize: parsePositiveInteger(query.pageSize, 25),
          queueDate: query.queueDate,
          locationId: query.locationId,
          status: parseEncounterStatus(query.status),
          statuses: parseEncounterStatuses(query.statuses),
        },
        request.user,
      );
    } catch (error) {
      this.throwHttpError(error);
    }
  }

  @Post()
  @RequirePermission(AccessPermission.QUEUE_CREATE)
  create(@Body() body: unknown, @Req() request: { user: AuthenticatedUser }) {
    return this.encounters.create(body, request.user).catch((error) => {
      this.throwHttpError(error);
    });
  }

  @Patch(':id/status')
  @RequirePermission(AccessPermission.QUEUE_READ)
  updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: { user: AuthenticatedUser },
  ) {
    const status =
      typeof body === 'object' && body !== null
        ? (body as { status?: string }).status
        : undefined;
    const requiredPermission =
      status === 'IN_PROGRESS'
        ? AccessPermission.QUEUE_START
        : status === 'CANCELLED'
          ? AccessPermission.QUEUE_CANCEL
          : undefined;
    if (!requiredPermission) {
      throw new BadRequestException({
        code: 'INVALID_ENCOUNTER_STATUS',
        message: 'Status antrean tidak dapat diubah melalui endpoint ini',
      });
    }
    const decision = evaluateAccess(request.user.role, requiredPermission);
    if (!decision.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Peran Anda tidak memiliki izin untuk tindakan ini',
      });
    }
    return this.encounters
      .updateStatus(id, body, request.user)
      .catch((error) => {
        this.throwHttpError(error);
      });
  }

  private throwHttpError(error: unknown): never {
    if (error instanceof EncounterValidationError) {
      throw new BadRequestException({
        code: 'ENCOUNTER_VALIDATION_FAILED',
        message: error.message,
        errors: error.issues,
      });
    }
    if (error instanceof EncounterNotFoundError) {
      throw new NotFoundException(error.message);
    }
    if (error instanceof EncounterContextError) {
      const status =
        error.code === 'PATIENT_NOT_FOUND' ||
        error.code === 'LOCATION_NOT_FOUND' ||
        error.code === 'ORGANIZATION_NOT_FOUND' ||
        error.code === 'PRACTITIONER_NOT_FOUND'
          ? 404
          : 409;
      const exception = status === 404 ? NotFoundException : ConflictException;
      throw new exception({ code: error.code, message: error.message });
    }
    if (error instanceof EncounterConflictError) {
      throw new ConflictException({ code: error.code, message: error.message });
    }
    if (error instanceof EncounterTransitionError) {
      throw new ConflictException({ code: error.code, message: error.message });
    }
    throw error;
  }
}
