import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  Patient,
  PatientListQuery,
  PatientListResponse,
} from '@mitrafaskes/shared';
import type { ResourceIntegrationSummary } from '@mitrafaskes/shared';
import { IntegrationRegistry } from '../integrations/integration-registry';
import {
  PatientIdentityConflictError,
  PatientRepository,
  PatientNotFoundError,
} from './patient.repository';
import {
  PatientAddressRegionValidationError,
  PatientAddressRegionValidator,
} from './patient-address-region.validator';
import {
  PatientValidationError,
  validatePatientInput,
} from './patient.validation';

@Injectable()
export class PatientsService {
  constructor(
    private readonly repository: PatientRepository,
    private readonly addressRegions: PatientAddressRegionValidator,
    @Optional() private readonly integrations?: IntegrationRegistry,
  ) {}

  async findMany(input: PatientListQuery = {}): Promise<PatientListResponse> {
    const result = await this.repository.findMany(input);
    return {
      ...result,
      items: await this.attachIntegrations(result.items),
    };
  }

  async findById(id: string): Promise<Patient | null> {
    const patient = await this.repository.findById(id);
    if (!patient) return null;
    return (await this.attachIntegrations([patient]))[0];
  }

  async getPatientForExternalIntegration(id: string): Promise<Patient> {
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
      return await this.attachIntegrations([
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
      return await this.attachIntegrations([
        await this.repository.update(id, {
          ...validated,
          addresses: canonical,
        }),
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

  private async attachIntegrations(patients: Patient[]): Promise<Patient[]> {
    if (patients.length === 0) return patients;
    const summaries = this.integrations
      ? await this.integrations.findResourceSummaries(
          'Patient',
          patients.map((patient) => patient.id),
        )
      : new Map<string, ResourceIntegrationSummary[]>();
    return patients.map((patient) => ({
      ...patient,
      integrations: summaries.get(patient.id) ?? [],
    }));
  }
}
