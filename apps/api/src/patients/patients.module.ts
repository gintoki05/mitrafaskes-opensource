import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { PatientRepository } from './patient.repository';
import { PatientsService } from './patients.service';

@Module({
  providers: [
    PrismaService,
    MedicalRecordNumberGenerator,
    PatientRepository,
    PatientsService,
  ],
  exports: [PatientsService],
})
export class PatientsModule {}
