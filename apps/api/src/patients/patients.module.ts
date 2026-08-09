import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SatusehatModule } from '../satusehat/satusehat.module';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { PatientRepository } from './patient.repository';
import { PatientSyncStatusRepository } from './patient-sync-status.repository';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { SatusehatPatientService } from './satusehat-patient.service';

@Module({
  imports: [SatusehatModule],
  controllers: [PatientsController],
  providers: [
    PrismaService,
    MedicalRecordNumberGenerator,
    PatientRepository,
    PatientSyncStatusRepository,
    PatientsService,
    SatusehatPatientService,
  ],
  exports: [PatientsService],
})
export class PatientsModule {}
