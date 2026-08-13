import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LOCAL_OBSERVATION_CODE_SYSTEM,
  OBSERVATION_MAPPINGS,
  OBSERVATION_LOINC_SYSTEM,
  OBSERVATION_PROVIDER,
  OBSERVATION_RESOURCE_TYPE,
  DEFAULT_OBSERVATION_ENVIRONMENT,
  LOCAL_OBSERVATION_RESOURCE_TYPE,
} from './satusehat-observation.constants';
import {
  SatusehatObservationContractError,
  type SatusehatObservationPreview,
} from './satusehat-observation.contract';
import {
  toSatusehatObservationPayload,
  type ClinicalObservationSource,
  type SatusehatObservationMapping,
} from './satusehat-observation.mapper';
import { PrismaService } from '../../database/prisma.service';

type ObservationDependencyScope = {
  name: 'Patient' | 'Encounter' | 'Practitioner';
  resourceType: string;
  localResourceType: string;
  localResourceId: string;
};

type ObservationWithContext = ClinicalObservationSource & {
  medicalRecord: ClinicalObservationSource['medicalRecord'];
  performer: ClinicalObservationSource['performer'];
};

@Injectable()
export class SatusehatObservationPreflightService {
  constructor(private readonly prisma: PrismaService) {}

  previewObservation(
    localResourceId: string,
  ): Promise<SatusehatObservationPreview> {
    return this.preparePreview(localResourceId, this.readEnvironment());
  }

  async preparePreview(
    localResourceId: string,
    environment: string,
  ): Promise<SatusehatObservationPreview> {
    const observation = await this.readObservation(localResourceId);
    if (!observation) {
      throw new NotFoundException({
        code: 'SATUSEHAT_OBSERVATION_NOT_FOUND',
        message: 'Observation klinis lokal tidak ditemukan.',
      });
    }

    if (!observation.performerId) {
      throw this.missingDependency(
        [
          {
            name: 'Practitioner',
            resourceType: 'Practitioner',
            localResourceType: 'User',
            localResourceId: '',
          },
        ],
        environment,
        'Observation belum memiliki performer Practitioner lokal.',
      );
    }

    const encounter = observation.medicalRecord.encounter;
    const dependencyScopes: ObservationDependencyScope[] = [
      {
        name: 'Patient',
        resourceType: 'Patient',
        localResourceType: 'Patient',
        localResourceId: encounter.patient.id,
      },
      {
        name: 'Encounter',
        resourceType: 'Encounter',
        localResourceType: 'Encounter',
        localResourceId: encounter.id,
      },
      {
        name: 'Practitioner',
        resourceType: 'Practitioner',
        localResourceType: 'User',
        localResourceId: observation.performerId,
      },
    ];

    const [dependencyLinks, observationLink] = await Promise.all([
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
        OBSERVATION_RESOURCE_TYPE,
        LOCAL_OBSERVATION_RESOURCE_TYPE,
        observation.id,
        environment,
      ),
    ]);
    const missingScopes = dependencyScopes.filter(
      (_, index) => !dependencyLinks[index],
    );
    if (missingScopes.length > 0) {
      throw this.missingDependency(missingScopes, environment);
    }

    const mapping = this.resolveMapping(observation);
    const sourceLinks = await this.readDerivedSourceLinks(
      observation,
      environment,
    );
    const externalResourceId = observationLink?.externalResourceId;
    try {
      const [patientLink, encounterLink, practitionerLink] = dependencyLinks;
      return {
        localResourceId,
        encounterLocalResourceId: encounter.id,
        operation: externalResourceId ? 'UPDATE' : 'CREATE',
        ...(externalResourceId ? { externalResourceId } : {}),
        mappingStatus: 'MAPPED',
        provenance: observation.provenance as 'original' | 'derived',
        valueType: observation.valueType as
          'quantity' | 'code' | 'boolean' | 'string',
        payload: toSatusehatObservationPayload(
          observation,
          {
            patientExternalId: patientLink!.externalResourceId,
            encounterExternalId: encounterLink!.externalResourceId,
            practitionerExternalId: practitionerLink!.externalResourceId,
            ...(externalResourceId
              ? { observationExternalId: externalResourceId }
              : {}),
            ...(sourceLinks.length > 0
              ? { derivedFromExternalIds: sourceLinks }
              : {}),
          },
          mapping,
        ),
      };
    } catch (error) {
      if (error instanceof SatusehatObservationContractError) {
        throw new ConflictException({
          code: 'SATUSEHAT_OBSERVATION_LOCAL_DATA_INVALID',
          message:
            'Data Observation lokal belum valid untuk profile Observation SATUSEHAT.',
          issues: error.issues,
        });
      }
      throw error;
    }
  }

  private async readObservation(
    localResourceId: string,
  ): Promise<ObservationWithContext | null> {
    const delegate = this.prisma.clinicalObservation;
    if (!delegate || typeof delegate.findUnique !== 'function') return null;
    return delegate.findUnique({
      where: { id: localResourceId },
      include: {
        performer: { select: { id: true, fullName: true } },
        medicalRecord: {
          include: {
            encounter: {
              include: {
                patient: { select: { id: true, fullName: true } },
              },
            },
          },
        },
      },
    });
  }

  private resolveMapping(
    observation: ObservationWithContext,
  ): SatusehatObservationMapping {
    const codeSystem = observation.codeSystem?.trim();
    if (
      codeSystem &&
      codeSystem !== OBSERVATION_LOINC_SYSTEM &&
      codeSystem !== LOCAL_OBSERVATION_CODE_SYSTEM
    ) {
      throw this.mappingRequired(
        observation,
        'Code system Observation belum memiliki mapping SATUSEHAT.',
      );
    }
    const mapping = OBSERVATION_MAPPINGS.find(
      (candidate) =>
        candidate.loincCode === observation.code ||
        candidate.localCodes.some((code) => code === observation.code),
    );
    if (!mapping || observation.category !== 'vital-signs') {
      throw this.mappingRequired(
        observation,
        'Kode Observation belum memiliki mapping LOINC SATUSEHAT yang aktif.',
      );
    }
    if (observation.valueType !== 'quantity') {
      throw this.mappingRequired(
        observation,
        'Value Observation belum memiliki mapping typed yang didukung profile.',
      );
    }
    const value = observation.valueQuantityValue;
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw this.mappingRequired(
        observation,
        'Nilai kuantitas Observation harus berupa angka finite.',
      );
    }
    const unit = observation.valueQuantityUnit?.trim();
    const unitCode = observation.valueQuantityCode?.trim();
    const unitSystem = observation.valueQuantitySystem?.trim();
    if (
      !unit ||
      !mapping.acceptedUnits.some((acceptedUnit) => acceptedUnit === unit) ||
      (unitCode && unitCode !== mapping.ucumCode) ||
      (unitSystem && unitSystem !== 'http://unitsofmeasure.org')
    ) {
      throw this.mappingRequired(
        observation,
        'Unit Observation belum memiliki mapping UCUM SATUSEHAT yang valid.',
      );
    }
    return mapping;
  }

  private async readDerivedSourceLinks(
    observation: ObservationWithContext,
    environment: string,
  ): Promise<string[]> {
    const ids = observation.derivedFromObservationIds ?? [];
    if (observation.provenance !== 'derived' && ids.length === 0) return [];
    if (ids.length === 0) {
      throw new ConflictException({
        code: 'SATUSEHAT_OBSERVATION_DERIVED_SOURCE_MISSING',
        message:
          'Observation derived wajib memiliki referensi source Observation lokal.',
        dependencies: ['Observation'],
      });
    }
    const links = await Promise.all(
      ids.map((id) =>
        this.findLink(
          OBSERVATION_RESOURCE_TYPE,
          LOCAL_OBSERVATION_RESOURCE_TYPE,
          id,
          environment,
        ),
      ),
    );
    const missing = ids.filter((_, index) => !links[index]);
    if (missing.length > 0) {
      throw new ConflictException({
        code: 'SATUSEHAT_OBSERVATION_DERIVED_SOURCE_MISSING',
        message:
          'Observation derived belum dapat dikirim karena source Observation belum terhubung.',
        dependencies: ['Observation'],
        sourceObservationIds: missing,
      });
    }
    return links.map((link) => link!.externalResourceId);
  }

  private missingDependency(
    scopes: readonly ObservationDependencyScope[],
    environment: string,
    message?: string,
  ): ConflictException {
    const dependencies = scopes.map((scope) => scope.name);
    return new ConflictException({
      code: 'SATUSEHAT_OBSERVATION_DEPENDENCY_MISSING',
      message:
        message ??
        `${dependencies.join(', ')} belum terhubung ke SATUSEHAT pada environment ${environment}.`,
      dependencies,
      issues: scopes.map((scope) => ({
        resourceType: scope.name,
        localResourceId: scope.localResourceId,
        provider: OBSERVATION_PROVIDER,
        environment,
        message: `${scope.name} harus dihubungkan ke SATUSEHAT terlebih dahulu.`,
      })),
    });
  }

  private mappingRequired(
    observation: ObservationWithContext,
    message: string,
  ): ConflictException {
    return new ConflictException({
      code: 'SATUSEHAT_OBSERVATION_MAPPING_REQUIRED',
      message,
      mappingStatus: 'mapping-required',
      issues: [
        {
          field: 'code',
          localResourceId: observation.id,
          message,
        },
      ],
    });
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
          provider: OBSERVATION_PROVIDER,
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
      process.env.SATUSEHAT_ENVIRONMENT?.trim() ||
      DEFAULT_OBSERVATION_ENVIRONMENT
    );
  }
}
