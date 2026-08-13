import { Module } from '@nestjs/common';
import { EncountersModule } from '../encounters/encounters.module';
import { PrismaService } from '../database/prisma.service';
import { RmeController } from './rme.controller';
import { RmeService } from './rme.service';

@Module({
  imports: [EncountersModule],
  controllers: [RmeController],
  providers: [PrismaService, RmeService],
})
export class RmeModule {}
