import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MemoryStore, INITIAL_ICD10 } from './store/memory-store';
import { SatusehatFhirTransformer } from './satusehat/fhir-transformer';
import { AccessPermission, evaluateAccess } from '@mitrafaskes/shared';
import { Public, RequirePermission } from './auth/access-control.decorator';
import {
  AuthenticatedUser,
  SessionPermissionGuard,
} from './auth/session-permission.guard';

@Controller('api')
@UseGuards(SessionPermissionGuard)
export class AppController {
  @Get()
  @ApiTags('General')
  @Public()
  getHello(): string {
    return 'Mitra Faskes NestJS API Server Ready';
  }

  // 1. Auth Endpoint
  @Post('auth/login')
  @ApiTags('Authentication')
  @Public()
  login(@Body() body: any) {
    const { username } = body;
    if (
      username === 'admin' ||
      username === 'dr_budi' ||
      username === 'perawat_ani'
    ) {
      const roleMap: Record<string, any> = {
        admin: { role: 'ADMIN', name: 'Siti Rahma (Admin)' },
        dr_budi: {
          role: 'DOKTER',
          name: 'dr. Budi Santoso, Sp.PD',
          sip: 'SIP-449/123/2023',
        },
        perawat_ani: { role: 'PERAWAT', name: 'Ani Wijaya, S.Kep' },
      };

      const user = roleMap[username];
      return {
        accessToken: `mock-jwt-token-${username}`,
        user: {
          id: `usr-${username}`,
          username,
          fullName: user.name,
          role: user.role,
          sipNumber: user.sip,
        },
      };
    }
    throw new UnauthorizedException('Username atau password salah');
  }

  // 2. Patient Registry Endpoints
  @Get('patients')
  @ApiTags('Patients')
  @RequirePermission(AccessPermission.PATIENT_READ)
  getPatients(@Query('search') search?: string) {
    let results = MemoryStore.patients;
    if (search) {
      const query = String(search).toLowerCase();
      results = results.filter(
        (p) =>
          p.nik.includes(query) ||
          p.fullName.toLowerCase().includes(query) ||
          p.medicalRecNo.toLowerCase().includes(query),
      );
    }
    return results;
  }

  @Post('patients')
  @ApiTags('Patients')
  @RequirePermission(AccessPermission.PATIENT_WRITE)
  createPatient(@Body() body: any) {
    const { nik, fullName, birthDate, gender, address, phone } = body;
    if (!nik || !fullName) {
      throw new BadRequestException('NIK dan Nama Lengkap wajib diisi');
    }

    const newPatient = {
      id: `pat-${Date.now()}`,
      nik,
      fullName,
      birthDate,
      gender,
      address,
      phone,
      medicalRecNo: `RM-2026-${String(MemoryStore.patients.length + 1).padStart(4, '0')}`,
      satusehatId: `P${Math.floor(10000000 + Math.random() * 90000000)}-ID`,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.patients.unshift(newPatient);
    return newPatient;
  }

  // 3. Encounter & Antrean Endpoints
  @Get('encounters')
  @ApiTags('Encounters')
  @RequirePermission(AccessPermission.QUEUE_READ)
  getEncounters() {
    return MemoryStore.encounters;
  }

  @Post('encounters')
  @ApiTags('Encounters')
  @RequirePermission(AccessPermission.QUEUE_CREATE)
  createEncounter(@Body() body: any) {
    const { patientId, doctorId } = body;
    const patient = MemoryStore.patients.find((p) => p.id === patientId);
    if (!patient) {
      throw new NotFoundException('Pasien tidak ditemukan');
    }

    const newEncounter = {
      id: `enc-${Date.now()}`,
      patientId,
      doctorId: doctorId || 'doc-001',
      queueNumber: MemoryStore.encounters.length + 1,
      status: 'WAITING' as const,
      createdAt: new Date().toISOString(),
      patient: {
        nik: patient.nik,
        fullName: patient.fullName,
        medicalRecNo: patient.medicalRecNo,
      },
      doctor: {
        fullName: 'dr. Budi Santoso, Sp.PD',
        sipNumber: 'SIP-449/123/2023',
      },
    };

    MemoryStore.encounters.push(newEncounter);

    const fhirEncounter = SatusehatFhirTransformer.transformEncounter({
      satusehatPatientId: patient.satusehatId || 'SATUSEHAT-PAT-TEMP',
      patientName: patient.fullName,
      practitionerSip: 'SIP-449/123/2023',
      doctorName: 'dr. Budi Santoso, Sp.PD',
      startTime: newEncounter.createdAt,
    });

    MemoryStore.syncLogs.unshift({
      id: `sync-${Date.now()}`,
      resourceType: 'Encounter',
      resourceId: newEncounter.id,
      status: 'PENDING',
      payload: fhirEncounter,
      updatedAt: new Date().toISOString(),
    });

    return newEncounter;
  }

  @Patch('encounters/:id/status')
  @ApiTags('Encounters')
  @RequirePermission(AccessPermission.QUEUE_READ)
  updateEncounterStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Req() request: { user: AuthenticatedUser },
  ) {
    const permissionByStatus: Record<string, AccessPermission> = {
      IN_PROGRESS: AccessPermission.QUEUE_START,
      CANCELLED: AccessPermission.QUEUE_CANCEL,
    };
    const requiredPermission = permissionByStatus[status];
    if (!requiredPermission) {
      throw new BadRequestException(
        'Status antrean tidak dapat diubah melalui endpoint ini',
      );
    }
    this.ensurePermission(request.user, requiredPermission);
    const encounter = MemoryStore.encounters.find((e) => e.id === id);
    if (!encounter) {
      throw new NotFoundException('Antrean tidak ditemukan');
    }
    encounter.status = status;
    return encounter;
  }

  // 4. Master ICD-10 Search
  @Get('master/icd10')
  @ApiTags('Master Data')
  @RequirePermission(AccessPermission.RME_READ)
  getIcd10(@Query('q') q?: string) {
    if (!q) return INITIAL_ICD10;
    const query = String(q).toLowerCase();
    return INITIAL_ICD10.filter(
      (item) =>
        item.code.toLowerCase().includes(query) ||
        item.nameIndo.toLowerCase().includes(query) ||
        item.nameEng.toLowerCase().includes(query),
    );
  }

  // 5. RME Dokter Endpoints
  @Get('rme/encounter/:encounterId')
  @ApiTags('Medical Records')
  @RequirePermission(AccessPermission.RME_READ)
  getRme(@Param('encounterId') encounterId: string) {
    return MemoryStore.medicalRecords[encounterId] || null;
  }

  @Post('rme')
  @ApiTags('Medical Records')
  @RequirePermission(AccessPermission.RME_FINALIZE)
  saveRme(@Body() body: any) {
    const {
      encounterId,
      anamnesis,
      systolic,
      diastolic,
      heartRate,
      temperature,
      weight,
      height,
      diagnoses,
      prescriptions,
    } = body;
    const encounter = MemoryStore.encounters.find((e) => e.id === encounterId);
    if (!encounter) {
      throw new NotFoundException('Kunjungan / Encounter tidak ditemukan');
    }

    const formattedDiagnoses = (diagnoses || []).map(
      (d: any, index: number) => {
        const icdMeta = INITIAL_ICD10.find((i) => i.code === d.icd10Code) || {
          code: d.icd10Code,
          nameIndo: d.icd10Code,
          nameEng: d.icd10Code,
        };
        return {
          id: `diag-${Date.now()}-${index}`,
          icd10Code: d.icd10Code,
          isPrimary: d.isPrimary,
          icd10: icdMeta,
          satusehatConditionId: `COND-SATUSEHAT-${Date.now()}`,
        };
      },
    );

    const formattedPrescriptions = (prescriptions || []).map(
      (p: any, index: number) => ({
        id: `rx-${Date.now()}-${index}`,
        medicineName: p.medicineName,
        kfaCode: p.kfaCode || 'KFA-938271',
        dosage: p.dosage,
        frequency: p.frequency,
        quantity: p.quantity,
        instructions: p.instructions,
      }),
    );

    const medicalRecord = {
      id: `mr-${Date.now()}`,
      encounterId,
      anamnesis,
      systolic: systolic ? Number(systolic) : undefined,
      diastolic: diastolic ? Number(diastolic) : undefined,
      heartRate: heartRate ? Number(heartRate) : undefined,
      temperature: temperature ? Number(temperature) : undefined,
      weight: weight ? Number(weight) : undefined,
      height: height ? Number(height) : undefined,
      diagnoses: formattedDiagnoses,
      prescriptions: formattedPrescriptions,
      createdAt: new Date().toISOString(),
    };

    MemoryStore.medicalRecords[encounterId] = medicalRecord;
    encounter.status = 'COMPLETED';

    const patient = MemoryStore.patients.find(
      (p) => p.id === encounter.patientId,
    );
    if (patient) {
      formattedDiagnoses.forEach((diag: any) => {
        const conditionPayload = SatusehatFhirTransformer.transformCondition({
          satusehatPatientId: patient.satusehatId || 'SATUSEHAT-PAT-TEMP',
          patientName: patient.fullName,
          satusehatEncounterId: encounter.satusehatEncounterId || encounter.id,
          icd10Code: diag.icd10Code,
          icd10NameEng: diag.icd10.nameEng,
        });

        MemoryStore.syncLogs.unshift({
          id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          resourceType: 'Condition',
          resourceId: diag.id,
          status: 'SUCCESS',
          satusehatId: diag.satusehatConditionId,
          payload: conditionPayload,
          updatedAt: new Date().toISOString(),
        });
      });

      const observations = SatusehatFhirTransformer.transformObservation({
        satusehatPatientId: patient.satusehatId || 'SATUSEHAT-PAT-TEMP',
        satusehatEncounterId: encounter.satusehatEncounterId || encounter.id,
        systolic: medicalRecord.systolic,
        diastolic: medicalRecord.diastolic,
        temperature: medicalRecord.temperature,
      });

      observations.forEach((obs: any) => {
        MemoryStore.syncLogs.unshift({
          id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          resourceType: 'Observation',
          resourceId: medicalRecord.id,
          status: 'SUCCESS',
          satusehatId: `OBS-SATUSEHAT-${Date.now()}`,
          payload: obs,
          updatedAt: new Date().toISOString(),
        });
      });
    }

    return medicalRecord;
  }

  // 6. SATUSEHAT Logs & Sync Retry
  @Get('satusehat/logs')
  @ApiTags('SATUSEHAT')
  @RequirePermission(AccessPermission.SYNC_STATUS_READ)
  getSatusehatLogs(@Req() request: { user: AuthenticatedUser }) {
    if (this.can(request.user, AccessPermission.SYNC_PAYLOAD_READ)) {
      return MemoryStore.syncLogs;
    }
    return MemoryStore.syncLogs.map(({ payload, ...log }) => log);
  }

  @Post('satusehat/sync/:logId/retry')
  @ApiTags('SATUSEHAT')
  @RequirePermission(AccessPermission.SYNC_RETRY)
  retrySync(@Param('logId') logId: string) {
    const log = MemoryStore.syncLogs.find((l) => l.id === logId);
    if (!log) {
      throw new NotFoundException('Log sinkronisasi tidak ditemukan');
    }
    log.status = 'SUCCESS';
    log.satusehatId = `${log.resourceType.substring(0, 3).toUpperCase()}-SATUSEHAT-${Date.now()}`;
    log.errorMessage = undefined;
    log.updatedAt = new Date().toISOString();
    return {
      message: 'Sinkronisasi Ulang ke SATUSEHAT Kemenkes Berhasil',
      log,
    };
  }

  private can(user: AuthenticatedUser, permission: AccessPermission): boolean {
    return evaluateAccess(user.role, permission).allowed;
  }

  private ensurePermission(
    user: AuthenticatedUser,
    permission: AccessPermission,
  ): void {
    const decision = evaluateAccess(user.role, permission);
    if (!decision.allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Peran Anda tidak memiliki izin untuk tindakan ini',
      });
    }
  }
}
