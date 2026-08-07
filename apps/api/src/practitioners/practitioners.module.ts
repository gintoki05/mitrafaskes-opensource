import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SatusehatModule } from '../satusehat/satusehat.module';
import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';
import { SatusehatPractitionerService } from './satusehat-practitioner.service';

@Module({
  imports: [SatusehatModule],
  controllers: [PractitionersController],
  providers: [
    PrismaService,
    PractitionersService,
    SatusehatPractitionerService,
  ],
  exports: [PractitionersService],
})
export class PractitionersModule {}
