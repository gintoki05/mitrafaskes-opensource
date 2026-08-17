import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import { PrismaService } from '../database/prisma.service';
import { RmeController } from './rme.controller';
import { RmeService } from './rme.service';
import { TriageService } from './triage.service';

@Module({
  imports: [EncountersModule],
  controllers: [RmeController],
  providers: [PrismaService, RmeService, TriageService],
})
export class RmeModule {}
