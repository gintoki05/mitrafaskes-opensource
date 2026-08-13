import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { IntegrationMasterWilayahProvider } from '../integrations/integration-master-wilayah.provider';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { MasterDataReferenceController } from './master-data-reference.controller';
import { MasterWilayahService } from './master-wilayah.service';
import { MASTER_WILAYAH_PROVIDER } from './master-wilayah.provider';
import { MasterDataDatasetStatusService } from './master-data-dataset-status.service';
import { MasterMaritalStatusService } from './master-marital-status.service';
import { MasterIcd10Service } from './master-icd10.service';

@Module({
  controllers: [MasterDataController, MasterDataReferenceController],
  providers: [
    PrismaService,
    MasterDataService,
    MasterWilayahService,
    MasterMaritalStatusService,
    MasterIcd10Service,
    MasterDataDatasetStatusService,
    IntegrationMasterWilayahProvider,
    {
      provide: MASTER_WILAYAH_PROVIDER,
      useExisting: IntegrationMasterWilayahProvider,
    },
  ],
  exports: [
    MasterDataService,
    MasterWilayahService,
    MasterIcd10Service,
    PrismaService,
  ],
})
export class MasterDataModule {}
