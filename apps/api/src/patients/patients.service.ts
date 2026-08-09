import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Patient } from '@mitrafaskes/shared';
import {
  PatientIdentityConflictError,
  PatientRepository,
  PatientNotFoundError,
} from './patient.repository';
import {
  PatientAddressRegionValidationError,
  PatientAddressRegionValidator,
} from './patient-address-region.validator';
import { PatientSyncStatusRepository } from './patient-sync-status.repository';
import {
  PatientValidationError,
  validatePatientInput,
} from './patient.validation';

@Injectable()
export class PatientsService {
  constructor(
    private readonly repository: PatientRepository,
    private readonly addressRegions: PatientAddressRegionValidator,
    @Optional() private readonly syncStatus?: PatientSyncStatusRepository,
  ) {}

  async findMany(search?: string): Promise<Patient[]> {
    const patients = await this.repository.findMany(search);
    return this.attachSyncStatus(patients);
  }

  async findById(id: string): Promise<Patient | null> {
    const patient = await this.repository.findById(id);
    if (!patient) return null;
    return (await this.attachSyncStatus([patient]))[0];
  }

  async getPatientForSatusehat(id: string): Promise<Patient> {
    const patient = await this.repository.findById(id);
    if (!patient) throw new NotFoundException('Pasien tidak ditemukan');
    return patient;
  }

  async findByIdOrThrow(id: string): Promise<Patient> {
    const patient = await this.findById(id);
    if (!patient) throw new NotFoundException('Pasien tidak ditemukan');
    return patient;
  }

  async create(input: unknown): Promise<Patient> {
    try {
      const validated = validatePatientInput(input);
      const canonical = await this.addressRegions.canonicalize(
        validated.addresses,
        { mode: 'CREATE' },
      );
      return await this.attachSyncStatus([
        await this.repository.create({ ...validated, addresses: canonical }),
      ]).then(([patient]) => patient);
    } catch (error) {
      if (
        error instanceof PatientValidationError ||
        error instanceof PatientAddressRegionValidationError
      ) {
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

  async update(id: string, input: unknown): Promise<Patient> {
    try {
      const current = await this.repository.findById(id);
      if (!current) throw new PatientNotFoundError();
      const validated = validatePatientInput(input);
      const canonical = await this.addressRegions.canonicalize(
        validated.addresses,
        { mode: 'UPDATE', previousAddresses: current.addresses },
      );
      return await this.attachSyncStatus([
        await this.repository.update(id, { ...validated, addresses: canonical }),
      ]).then(([patient]) => patient);
    } catch (error) {
      if (
        error instanceof PatientValidationError ||
        error instanceof PatientAddressRegionValidationError
      ) {
        throw new BadRequestException({
          code: 'PATIENT_VALIDATION_FAILED',
          message: error.message,
          errors: error.issues,
        });
      }
      if (error instanceof PatientNotFoundError) {
        throw new NotFoundException('Pasien tidak ditemukan');
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

  private async attachSyncStatus(patients: Patient[]): Promise<Patient[]> {
    const syncStatus = this.syncStatus;
    if (patients.length === 0 || !syncStatus) return patients;
    const status = await syncStatus.findForList(
      patients.map((patient) => patient.id),
    );
    return patients.map((patient) => ({
      ...patient,
      satusehat: syncStatus.toLinkage(status.links.get(patient.id)),
      satusehatSync: syncStatus.toSyncSummary(status.logs.get(patient.id)),
    }));
  }
}
