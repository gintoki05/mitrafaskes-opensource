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
import { AccessPermission } from '@mitrafaskes/shared';
import { RequirePermission } from '../auth/access-control.decorator';
import { SessionPermissionGuard } from '../auth/session-permission.guard';
import { PatientsService } from './patients.service';

type PatientHttpQuery = Record<string, string | undefined>;

const parsePositiveInteger = (
  value: string | undefined,
): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const parseOptionalBoolean = (
  value: string | undefined,
): boolean | undefined => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

@Controller('api/patients')
@UseGuards(SessionPermissionGuard)
@ApiTags('Patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @RequirePermission(AccessPermission.PATIENT_READ)
  findMany(@Query() query: PatientHttpQuery) {
    return this.patients.findMany({
      search: query.search,
      page: parsePositiveInteger(query.page),
      pageSize: parsePositiveInteger(query.pageSize),
      active: parseOptionalBoolean(query.active),
    });
  }

  @Post()
  @RequirePermission(AccessPermission.PATIENT_WRITE)
  create(@Body() body: unknown) {
    return this.patients.create(body);
  }

  @Get(':id')
  @RequirePermission(AccessPermission.PATIENT_READ)
  findById(@Param('id') id: string) {
    return this.patients.findByIdOrThrow(id);
  }

  @Patch(':id')
  @RequirePermission(AccessPermission.PATIENT_WRITE)
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.patients.update(id, body);
  }
}
