import { Module } from '@nestjs/common';
import { SatusehatAuthService } from './satusehat-auth.service';
import { SatusehatFhirClient } from './satusehat-fhir.client';

@Module({
  providers: [SatusehatAuthService, SatusehatFhirClient],
  exports: [SatusehatAuthService, SatusehatFhirClient],
})
export class SatusehatModule {}
