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
  ENCOUNTER_RESOURCE_TYPE,
  LOCAL_ENCOUNTER_RESOURCE_TYPE,
  LOCAL_LOCATION_RESOURCE_TYPE,
  LOCAL_ORGANIZATION_RESOURCE_TYPE,
  LOCAL_PATIENT_RESOURCE_TYPE,
  LOCAL_PRACTITIONER_RESOURCE_TYPE,
  SATUSEHAT_PROVIDER,
} from './satusehat-encounter.constants';
import { toSatusehatEncounterPayload } from './satusehat-encounter.mapper';

interface DependencyScope {
  name: 'Organization' | 'Location' | 'Patient' | 'Practitioner';
  resourceType: string;
  localResourceType: string;
  localResourceId: string;
}

@Injectable()
export class SatusehatEncounterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encounters: EncountersService,
  ) {}

  async previewEncounter(
    localResourceId: string,
  ): Promise<SatusehatEncounterPreview> {
    const encounter = await this.encounters.findById(localResourceId);
    if (!encounter) {
      throw new NotFoundException({
        code: 'SATUSEHAT_ENCOUNTER_NOT_FOUND',
        message: 'Encounter lokal tidak ditemukan.',
      });
    }

    const environment = this.readEnvironment();
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

    const [dependencyLinks, encounterLink] = await Promise.all([
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
    ]);
    const missingDependencies = dependencyScopes
      .filter((_, index) => !dependencyLinks[index])
      .map((scope) => scope.name);
    if (missingDependencies.length > 0) {
      throw new ConflictException({
        code: 'SATUSEHAT_ENCOUNTER_DEPENDENCY_MISSING',
        message: `${missingDependencies.join(', ')} belum terhubung ke SATUSEHAT pada environment ${environment}.`,
        dependencies: missingDependencies,
      });
    }

    const [organizationLink, locationLink, patientLink, practitionerLink] =
      dependencyLinks;
    const externalResourceId = encounterLink?.externalResourceId;
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
      }),
    };
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

  private readEnvironment(): string {
    return (
      process.env.SATUSEHAT_ENVIRONMENT?.trim() || DEFAULT_SATUSEHAT_ENVIRONMENT
    );
  }
}
