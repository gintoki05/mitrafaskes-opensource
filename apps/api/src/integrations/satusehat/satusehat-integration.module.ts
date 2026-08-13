import { Module } from '@nestjs/common';
import { EncountersModule } from '../../encounters/encounters.module';
import { MasterDataModule } from '../../master-data/master-data.module';
import { PatientsModule } from '../../patients/patients.module';
import { PractitionersModule } from '../../practitioners/practitioners.module';
import { SatusehatAuthService } from './satusehat-auth.service';
import { SatusehatFhirClient } from './satusehat-fhir.client';
import { SatusehatPatientService } from './satusehat-patient.service';
import { SatusehatPractitionerService } from './satusehat-practitioner.service';
import { SatusehatOrganizationImportService } from './satusehat-organization-import.service';
import { SatusehatOrganizationLinkService } from './satusehat-organization-link.service';
import { SatusehatOrganizationService } from './satusehat-organization.service';
import { SatusehatLocationImportService } from './satusehat-location-import.service';
import { SatusehatLocationLinkService } from './satusehat-location-link.service';
import { SatusehatLocationService } from './satusehat-location.service';
import { SatusehatMasterWilayahAdapter } from './satusehat-master-wilayah.adapter';
import { SatusehatIntegrationPlugin } from './satusehat-integration.plugin';
import { SatusehatEncounterService } from './satusehat-encounter.service';
import { SatusehatEncounterPreflightService } from './satusehat-encounter-preflight.service';
import { SatusehatConditionService } from './satusehat-condition.service';
import { SatusehatConditionPreflightService } from './satusehat-condition-preflight.service';
import { SatusehatReconciliationService } from './satusehat-reconciliation.service';
import { SatusehatTerminologyRegistry } from './satusehat-terminology.registry';

@Module({
  imports: [
    PatientsModule,
    PractitionersModule,
    MasterDataModule,
    EncountersModule,
  ],
  providers: [
    SatusehatAuthService,
    SatusehatFhirClient,
    SatusehatPatientService,
    SatusehatPractitionerService,
    SatusehatOrganizationService,
    SatusehatOrganizationImportService,
    SatusehatOrganizationLinkService,
    SatusehatLocationService,
    SatusehatLocationImportService,
    SatusehatLocationLinkService,
    SatusehatMasterWilayahAdapter,
    SatusehatEncounterPreflightService,
    SatusehatEncounterService,
    SatusehatConditionPreflightService,
    SatusehatConditionService,
    SatusehatReconciliationService,
    SatusehatTerminologyRegistry,
    SatusehatIntegrationPlugin,
  ],
})
export class SatusehatIntegrationModule {}
