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
import { SatusehatPatientService } from './satusehat-patient.service';

type PatientHttpQuery = Record<string, string | undefined>;

const parsePositiveInteger = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

@Controller('api/patients')
@UseGuards(SessionPermissionGuard)
@ApiTags('Patients')
export class PatientsController {
  constructor(
    private readonly patients: PatientsService,
    private readonly satusehat: SatusehatPatientService,
  ) {}

  @Get()
  @RequirePermission(AccessPermission.PATIENT_READ)
  findMany(@Query() query: PatientHttpQuery) {
    return this.patients.findMany({
      search: query.search,
      page: parsePositiveInteger(query.page),
      pageSize: parsePositiveInteger(query.pageSize),
    });
  }

  @Get('satusehat/lookup')
  @RequirePermission(AccessPermission.PATIENT_READ)
  lookupSatusehat(@Query() query: PatientHttpQuery) {
    return this.satusehat.lookupForDraft(query);
  }

  @Post()
  @RequirePermission(AccessPermission.PATIENT_WRITE)
  create(@Body() body: unknown) {
    return this.patients.create(body);
  }

  @Get(':id/satusehat/preview')
  @RequirePermission(AccessPermission.PATIENT_READ)
  previewSatusehat(@Param('id') id: string) {
    return this.satusehat.previewPatient(id);
  }

  @Post(':id/satusehat/sync')
  @RequirePermission(AccessPermission.PATIENT_WRITE)
  syncSatusehat(@Param('id') id: string) {
    return this.satusehat.syncPatient(id);
  }

  @Post(':id/satusehat/link')
  @RequirePermission(AccessPermission.PATIENT_WRITE)
  linkSatusehat(@Param('id') id: string, @Body() body: unknown) {
    return this.satusehat.linkExisting(id, body);
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
