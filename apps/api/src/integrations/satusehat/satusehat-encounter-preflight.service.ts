import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SatusehatEncounterPreview } from '@mitrafaskes/shared';
import { PrismaService } from '../../database/prisma.service';
import { EncountersService } from '../../encounters/encounters.service';
import {
  DEFAULT_SATUSEHAT_ENVIRONMENT,
  CONDITION_RESOURCE_TYPE,
  ENCOUNTER_RESOURCE_TYPE,
  LOCAL_CONDITION_RESOURCE_TYPE,
  LOCAL_ENCOUNTER_RESOURCE_TYPE,
  LOCAL_LOCATION_RESOURCE_TYPE,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  LOCAL_PATIENT_RESOURCE_TYPE,
  LOCAL_PRACTITIONER_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-encounter.constants';
import { SatusehatEncounterContractError } from './satusehat-encounter.contract';
import { toSatusehatEncounterPayload } from './satusehat-encounter.mapper';

interface DependencyScope {
  name: 'Organization' | 'Location' | 'Patient' | 'Practitioner';
  resourceType: string;
  localResourceType: string;
  localResourceId: string;
}

@Injectable()
export class SatusehatEncounterPreflightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encounters: EncountersService,
  ) {}

  previewEncounter(
    localResourceId: string,
  ): Promise<SatusehatEncounterPreview> {
    return this.preparePreview(localResourceId, this.readEnvironment());
  }

  async preparePreview(
    localResourceId: string,
    environment: string,
  ): Promise<SatusehatEncounterPreview> {
    const encounter = await this.encounters.findById(localResourceId);
    if (!encounter) {
      throw new NotFoundException({
        code: 'SATUSEHAT_ENCOUNTER_NOT_FOUND',
        message: 'Encounter lokal tidak ditemukan.',
      });
    }

    const dependencyScopes: DependencyScope[] = [
      {
        name: 'Organization',
        resourceType: 'Organization',
        localResourceType: LOCAL_ORGANIZATION_RESOURCE_TYPE,
        localResourceId: encounter.organizationId,
      },
      {
        name: 'Location',
        resourceType: 'Location',
        localResourceType: LOCAL_LOCATION_RESOURCE_TYPE,
        localResourceId: encounter.locationId,
      },
      {
        name: 'Patient',
        resourceType: 'Patient',
        localResourceType: LOCAL_PATIENT_RESOURCE_TYPE,
        localResourceId: encounter.patientId,
      },
      {
        name: 'Practitioner',
        resourceType: 'Practitioner',
        localResourceType: LOCAL_PRACTITIONER_RESOURCE_TYPE,
        localResourceId: encounter.doctorId,
      },
    ];

    const [dependencyLinks, encounterLink, location] = await Promise.all([
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
        ENCOUNTER_RESOURCE_TYPE,
        LOCAL_ENCOUNTER_RESOURCE_TYPE,
        encounter.id,
        environment,
      ),
      this.prisma.location.findUnique({
        where: { id: encounter.locationId },
        select: { organizationId: true },
      }),
    ]);
    const diagnoses = await this.findLinkedConditionDiagnoses(
      encounter.id,
      environment,
    );
    const missingScopes = dependencyScopes.filter(
      (_, index) => !dependencyLinks[index],
    );
    if (missingScopes.length > 0) {
      const missingDependencies = missingScopes.map((scope) => scope.name);
      throw new ConflictException({
        code: 'SATUSEHAT_ENCOUNTER_DEPENDENCY_MISSING',
        message: `${missingDependencies.join(', ')} belum terhubung ke SATUSEHAT pada environment ${environment}.`,
        dependencies: missingDependencies,
        issues: missingScopes.map((scope) => ({
          resourceType: scope.name,
          localResourceId: scope.localResourceId,
          provider: SATUSEHAT_PROVIDER,
          environment,
          message: `${scope.name} harus dihubungkan ke SATUSEHAT terlebih dahulu.`,
        })),
      });
    }
    if (!location || location.organizationId !== encounter.organizationId) {
      throw new ConflictException({
        code: 'SATUSEHAT_ENCOUNTER_LOCATION_ORGANIZATION_MISMATCH',
        message: 'Location Encounter tidak berada pada Organization yang sama.',
        issues: [
          {
            field: 'locationId',
            message:
              'Pilih Location yang dimiliki Organization Encounter sebelum sinkronisasi.',
          },
        ],
      });
    }

    const [organizationLink, locationLink, patientLink, practitionerLink] =
      dependencyLinks;
    const externalResourceId = encounterLink?.externalResourceId;
    try {
      return {
        localResourceId,
        operation: externalResourceId ? 'UPDATE' : 'CREATE',
        ...(externalResourceId ? { externalResourceId } : {}),
        payload: toSatusehatEncounterPayload(encounter, {
          organizationExternalId: organizationLink!.externalResourceId,
          locationExternalId: locationLink!.externalResourceId,
          patientExternalId: patientLink!.externalResourceId,
          practitionerExternalId: practitionerLink!.externalResourceId,
          encounterExternalId: externalResourceId,
          ...(diagnoses.length > 0 ? { diagnoses } : {}),
        }),
      };
    } catch (error) {
      if (error instanceof SatusehatEncounterContractError) {
        throw new ConflictException({
          code: 'SATUSEHAT_ENCOUNTER_LOCAL_DATA_INVALID',
          message:
            'Identifier, period, status, atau riwayat Encounter lokal belum valid untuk SATUSEHAT.',
          issues: error.issues,
        });
      }
      throw error;
    }
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
          provider: SATUSEHAT_PROVIDER,
          environment,
          resourceType,
          localResourceType,
          localResourceId,
        },
      },
    });
  }

  private async findLinkedConditionDiagnoses(
    encounterId: string,
    environment: string,
  ): Promise<
    Array<{ externalResourceId: string; display: string; rank: number }>
  > {
    const diagnosisClient = this.prisma.diagnosis;
    const linkClient = this.prisma.externalResourceLink;
    if (
      !diagnosisClient ||
      typeof diagnosisClient.findMany !== 'function' ||
      !linkClient ||
      typeof linkClient.findMany !== 'function'
    ) {
      return [];
    }

    const diagnoses = await diagnosisClient.findMany({
      where: { medicalRecord: { encounterId } },
      select: {
        id: true,
        isPrimary: true,
        icd10Code: true,
      },
    });
    if (diagnoses.length === 0) return [];

    const catalogEntries = await this.prisma.masterIcd10.findMany({
      where: { code: { in: diagnoses.map((diagnosis) => diagnosis.icd10Code) } },
      select: { code: true, display: true },
    });
    const catalogByCode = new Map(
      catalogEntries.map((entry) => [entry.code, entry.display]),
    );

    const links = await linkClient.findMany({
      where: {
        provider: SATUSEHAT_PROVIDER,
        environment,
        resourceType: CONDITION_RESOURCE_TYPE,
        localResourceType: LOCAL_CONDITION_RESOURCE_TYPE,
        localResourceId: { in: diagnoses.map((diagnosis) => diagnosis.id) },
      },
      select: { localResourceId: true, externalResourceId: true },
    });
    const linkByDiagnosisId = new Map(
      links.map((link) => [link.localResourceId, link.externalResourceId]),
    );

    return [...diagnoses]
      .sort((left, right) => {
        if (left.isPrimary !== right.isPrimary) {
          return left.isPrimary ? -1 : 1;
        }
        return left.id.localeCompare(right.id);
      })
      .flatMap((diagnosis, index) => {
        const externalResourceId = linkByDiagnosisId.get(diagnosis.id);
        if (!externalResourceId) return [];
        return [
          {
            externalResourceId,
            display: catalogByCode.get(diagnosis.icd10Code) ?? diagnosis.icd10Code,
            rank: index + 1,
          },
        ];
      });
  }

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }
}
