import { Module } from '@nestjs/common';
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

@Module({
  imports: [PatientsModule, PractitionersModule, MasterDataModule],
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
    SatusehatIntegrationPlugin,
  ],
})
export class SatusehatIntegrationModule {}
