import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SatusehatModule } from '../satusehat/satusehat.module';
import { MasterDataController } from './master-data.controller';
import { MasterDataService } from './master-data.service';
import { SatusehatOrganizationImportService } from './satusehat-organization-import.service';
import { SatusehatOrganizationLinkService } from './satusehat-organization-link.service';
import { SatusehatOrganizationService } from './satusehat-organization.service';

@Module({
  imports: [SatusehatModule],
  controllers: [MasterDataController],
  providers: [
    PrismaService,
    MasterDataService,
    SatusehatOrganizationService,
    SatusehatOrganizationImportService,
    SatusehatOrganizationLinkService,
  ],
})
export class MasterDataModule {}
