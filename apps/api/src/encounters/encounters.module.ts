import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';

@Module({
  controllers: [EncountersController],
  providers: [PrismaService, EncountersService],
  exports: [EncountersService, PrismaService],
})
export class EncountersModule {}
