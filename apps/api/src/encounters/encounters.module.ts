import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncounterSyncStatusRepository } from './encounter-sync-status.repository';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';

@Module({
  controllers: [EncountersController],
  providers: [PrismaService, EncounterSyncStatusRepository, EncountersService],
  exports: [EncountersService, PrismaService],
})
export class EncountersModule {}
