import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CONDITION_PROVIDER,
  CONDITION_RESOURCE_TYPE,
  DEFAULT_CONDITION_ENVIRONMENT,
  LOCAL_CONDITION_RESOURCE_TYPE,
  LOCAL_ENCOUNTER_RESOURCE_TYPE,
  LOCAL_PATIENT_RESOURCE_TYPE,
  LOCAL_PRACTITIONER_RESOURCE_TYPE,
} from './satusehat-condition.constants';
import {
  SatusehatConditionContractError,
  type SatusehatConditionPreview,
} from './satusehat-condition.contract';
import {
  toSatusehatConditionPayload,
  type DiagnosisConditionSource,
} from './satusehat-condition.mapper';
import { PrismaService } from '../../database/prisma.service';

type ConditionDependencyScope = {
  name: 'Patient' | 'Encounter' | 'Practitioner';
  resourceType: string;
  localResourceType: string;
  localResourceId: string;
};

type DiagnosisWithContext = DiagnosisConditionSource & {
  medicalRecord: DiagnosisConditionSource['medicalRecord'] & {
    diagnoses?: Array<{ id: string; isPrimary: boolean }>;
  };
};

@Injectable()
export class SatusehatConditionPreflightService {
  constructor(private readonly prisma: PrismaService) {}

  previewCondition(
    localResourceId: string,
  ): Promise<SatusehatConditionPreview> {
    return this.preparePreview(localResourceId, this.readEnvironment());
  }

  async preparePreview(
    localResourceId: string,
    environment: string,
  ): Promise<SatusehatConditionPreview> {
    const diagnosis = await this.readDiagnosis(localResourceId);
    if (!diagnosis) {
      throw new NotFoundException({
        code: 'SATUSEHAT_CONDITION_NOT_FOUND',
        message: 'Diagnosis lokal tidak ditemukan.',
      });
    }

    const encounter = diagnosis.medicalRecord.encounter;
    const dependencyScopes: ConditionDependencyScope[] = [
      {
        name: 'Patient',
        resourceType: 'Patient',
        localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
        localResourceId: encounter.patient.id,
      },
      {
        name: 'Encounter',
        resourceType: 'Encounter',
        localResourceType: LOCAL_ENCOUNTER_RESOURCE_TYPE,
        localResourceId: encounter.id,
      },
      {
        name: 'Practitioner',
        resourceType: 'Practitioner',
        localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
        localResourceId: encounter.doctor.id,
      },
    ];

    const [dependencyLinks, conditionLink] = await Promise.all([
      Promise.all(
        dependencyScopes.map((scope) =>
          this.findLink(
            scope.resourceType,
            scope.localResourceType,
            scope.localResourceId,
            environment,
          ),
        ),
      ),
      this.findLink(
        CONDITION_RESOURCE_TYPE,
        LOCAL_CONDITION_RESOURCE_TYPE,
        diagnosis.id,
        environment,
      ),
    ]);
    const missingScopes = dependencyScopes.filter(
      (_, index) => !dependencyLinks[index],
    );
    if (missingScopes.length > 0) {
      const dependencies = missingScopes.map((scope) => scope.name);
      throw new ConflictException({
        code: 'SATUSEHAT_CONDITION_DEPENDENCY_MISSING',
        message: `${dependencies.join(', ')} belum terhubung ke SATUSEHAT pada environment ${environment}.`,
        dependencies,
        issues: missingScopes.map((scope) => ({
          resourceType: scope.name,
          localResourceId: scope.localResourceId,
          provider: CONDITION_PROVIDER,
          environment,
          message: `${scope.name} harus dihubungkan ke SATUSEHAT terlebih dahulu.`,
        })),
      });
    }

    this.assertTerminologyMapped(diagnosis);
    const rank = this.rankFor(diagnosis);
    try {
      const [patientLink, encounterLink, practitionerLink] = dependencyLinks;
      const externalResourceId = conditionLink?.externalResourceId;
      return {
        localResourceId,
        encounterLocalResourceId: encounter.id,
        operation: externalResourceId ? 'UPDATE' : 'CREATE',
        ...(externalResourceId ? { externalResourceId } : {}),
        rank,
        category: 'encounter-diagnosis',
        mappingStatus: 'MAPPED',
        payload: toSatusehatConditionPayload(diagnosis, {
          patientExternalId: patientLink!.externalResourceId,
          encounterExternalId: encounterLink!.externalResourceId,
          practitionerExternalId: practitionerLink!.externalResourceId,
          ...(externalResourceId
            ? { diagnosisExternalId: externalResourceId }
            : {}),
        }),
      };
    } catch (error) {
      if (error instanceof SatusehatConditionContractError) {
        throw new ConflictException({
          code: 'SATUSEHAT_CONDITION_LOCAL_DATA_INVALID',
          message:
            'Data diagnosis lokal belum valid untuk profile Condition SATUSEHAT.',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  private async readDiagnosis(
    localResourceId: string,
  ): Promise<DiagnosisWithContext | null> {
    const diagnosis = await this.prisma.diagnosis.findUnique({
      where: { id: localResourceId },
      include: {
        medicalRecord: {
          include: {
            diagnoses: { select: { id: true, isPrimary: true } },
            encounter: {
              include: {
                patient: { select: { id: true, fullName: true } },
                doctor: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    });
    if (!diagnosis) return null;
    const icd10 = await this.prisma.masterIcd10.findUnique({
      where: { code: diagnosis.icd10Code },
    });
    return { ...diagnosis, icd10 };
  }

  private assertTerminologyMapped(diagnosis: DiagnosisWithContext): void {
    const code = diagnosis.icd10Code.trim();
    const catalogCode = diagnosis.icd10?.code.trim();
    if (
      diagnosis.icd10?.active !== true ||
      !catalogCode ||
      catalogCode !== code ||
      !/^[A-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(code)
    ) {
      throw new ConflictException({
        code: 'SATUSEHAT_CONDITION_MAPPING_REQUIRED',
        message:
          'Diagnosis belum memiliki mapping ICD-10 SATUSEHAT yang valid.',
        mappingStatus: 'mapping-required',
        issues: [
          {
            field: 'icd10Code',
            localResourceId: diagnosis.id,
            message:
              'Pilih kode ICD-10 dari katalog aktif sebelum sinkronisasi.',
          },
        ],
      });
    }
  }

  private rankFor(diagnosis: DiagnosisWithContext): number {
    const siblings = diagnosis.medicalRecord.diagnoses ?? [diagnosis];
    const ordered = [...siblings].sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
      return left.id.localeCompare(right.id);
    });
    const index = ordered.findIndex((entry) => entry.id === diagnosis.id);
    return index >= 0 ? index + 1 : 1;
  }

  private findLink(
    resourceType: string,
    localResourceType: string,
    localResourceId: string,
    environment: string,
  ) {
    return this.prisma.externalResourceLink.findUnique({
      where: {
        localResourceScope: {
          provider: CONDITION_PROVIDER,
          environment,
          resourceType,
          localResourceType,
          localResourceId,
        },
      },
    });
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_CONDITION_ENVIRONMENT
    );
  }
}
