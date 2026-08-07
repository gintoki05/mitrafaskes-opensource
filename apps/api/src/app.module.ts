import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionPermissionGuard } from './auth/session-permission.guard';
import { PatientsModule } from './patients/patients.module';
import { MasterDataModule } from './master-data/master-data.module';
import { SatusehatModule } from './satusehat/satusehat.module';
import { PractitionersModule } from './practitioners/practitioners.module';

@Module({
  imports: [
    PatientsModule,
    MasterDataModule,
    SatusehatModule,
    PractitionersModule,
  ],
  controllers: [AppController],
  providers: [AppService, SessionPermissionGuard],
})
export class AppModule {}
