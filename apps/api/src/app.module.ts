import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SessionPermissionGuard } from './auth/session-permission.guard';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [PatientsModule],
  controllers: [AppController],
  providers: [AppService, SessionPermissionGuard],
})
export class AppModule {}
