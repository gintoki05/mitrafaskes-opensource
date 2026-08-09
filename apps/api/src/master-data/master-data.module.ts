import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SatusehatModule } from '../satusehat/satusehat.module';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { SatusehatOrganizationImportService } from './satusehat-organization-import.service';
import { SatusehatOrganizationLinkService } from './satusehat-organization-link.service';
import { SatusehatOrganizationService } from './satusehat-organization.service';
import { SatusehatLocationImportService } from './satusehat-location-import.service';
import { SatusehatLocationLinkService } from './satusehat-location-link.service';
import { SatusehatLocationService } from './satusehat-location.service';
import { MasterDataReferenceController } from './master-data-reference.controller';
import { MasterWilayahService } from './master-wilayah.service';
import { MASTER_WILAYAH_PROVIDER } from './master-wilayah.provider';
import { SatusehatMasterWilayahAdapter } from './satusehat-master-wilayah.adapter';
import { MasterDataDatasetStatusService } from './master-data-dataset-status.service';

@Module({
  imports: [SatusehatModule],
  controllers: [MasterDataController, MasterDataReferenceController],
  providers: [
    PrismaService,
    MasterDataService,
    SatusehatOrganizationService,
    SatusehatOrganizationImportService,
    SatusehatOrganizationLinkService,
    SatusehatLocationImportService,
    SatusehatLocationLinkService,
    SatusehatLocationService,
    MasterWilayahService,
    MasterDataDatasetStatusService,
    SatusehatMasterWilayahAdapter,
    {
      provide: MASTER_WILAYAH_PROVIDER,
      useExisting: SatusehatMasterWilayahAdapter,
    },
  ],
})
export class MasterDataModule {}
