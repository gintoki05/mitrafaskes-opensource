import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { MedicalRecordNumberGenerator } from './medical-record-number.generator';
import { PatientRepository } from './patient.repository';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { PatientAddressRegionValidator } from './patient-address-region.validator';

@Module({
  controllers: [PatientsController],
  providers: [
    PrismaService,
    MedicalRecordNumberGenerator,
    PatientRepository,
    PatientAddressRegionValidator,
    PatientsService,
  ],
  exports: [PatientsService],
})
export class PatientsModule {}
