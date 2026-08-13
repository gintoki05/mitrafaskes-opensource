import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionPermissionGuard } from './auth/session-permission.guard';
import { IntegrationCoreModule } from './integrations/integration-core.module';
import { PatientsModule } from './patients/patients.module';
import { MasterDataModule } from './master-data/master-data.module';
import { PractitionersModule } from './practitioners/practitioners.module';
import { EncountersModule } from './encounters/encounters.module';
import { RmeModule } from './rme/rme.module';
import { SatusehatIntegrationModule } from './integrations/satusehat/satusehat-integration.module';

const satusehatEnabled =
  process.env.INTEGRATION_SATUSEHAT_ENABLED === 'true';

@Module({
  imports: [
    IntegrationCoreModule.register({
      masterDataProvider: { provider: 'SATUSEHAT', domain: 'WILAYAH' },
      providers: [
        {
          provider: 'SATUSEHAT',
          displayName: 'SATUSEHAT',
          environment: process.env.SATUSEHAT_ENVIRONMENT?.trim() || 'sandbox',
          resources: [
            'Organization',
            'Location',
            'Practitioner',
            'Patient',
            'Encounter',
          ],
          operations: [
            'search',
            'import',
            'preview',
            'sync',
            'link',
            'logs',
            'reconcile',
          ],
        },
      ],
    }),
    PatientsModule,
    MasterDataModule,
    PractitionersModule,
    EncountersModule,
    RmeModule,
    ...(satusehatEnabled ? [SatusehatIntegrationModule] : []),
  ],
  controllers: [AppController],
  providers: [AppService, SessionPermissionGuard],
})
export class AppModule {}
