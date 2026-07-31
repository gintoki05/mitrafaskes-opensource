import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Patient } from '@mitrafaskes/shared';
import {
  PatientIdentityConflictError,
  PatientRepository,
} from './patient.repository';
import {
  PatientValidationError,
  validatePatientInput,
} from './patient.validation';

@Injectable()
export class PatientsService {
  constructor(private readonly repository: PatientRepository) {}

  findMany(search?: string): Promise<Patient[]> {
    return this.repository.findMany(search);
  }

  findById(id: string): Promise<Patient | null> {
    return this.repository.findById(id);
  }

  async create(input: unknown): Promise<Patient> {
    try {
      const validated = validatePatientInput(input);
      return await this.repository.create(validated);
    } catch (error) {
      if (error instanceof PatientValidationError) {
        throw new BadRequestException({
          code: 'PATIENT_VALIDATION_FAILED',
          message: error.message,
          errors: error.issues,
        });
      }
      if (
        error instanceof PatientIdentityConflictError &&
        error.field === 'nik'
      ) {
        throw new ConflictException({
          code: 'NIK_ALREADY_EXISTS',
          message: 'Pasien dengan NIK tersebut sudah terdaftar',
          field: 'nik',
        });
      }
      if (
        error instanceof PatientIdentityConflictError &&
        error.field === 'medicalRecNo'
      ) {
        throw new ConflictException({
          code: 'MEDICAL_RECORD_NUMBER_CONFLICT',
          message: 'Nomor rekam medis tidak dapat dialokasikan',
          field: 'medicalRecNo',
        });
      }
      if (
        error instanceof PatientIdentityConflictError &&
        error.field === 'primaryIdentifier'
      ) {
        throw new ConflictException({
          code: 'PRIMARY_IDENTIFIER_CONFLICT',
          message:
            'Pasien hanya boleh memiliki satu identifier utama aktif untuk setiap jenis',
          field: 'identifiers',
        });
      }
      throw error;
    }
  }
}
