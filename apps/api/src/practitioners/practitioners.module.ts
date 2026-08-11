import { Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';

@Module({
  controllers: [PractitionersController],
  providers: [
    PrismaService,
    PractitionersService,
  ],
  exports: [PractitionersService, PrismaService],
})
export class PractitionersModule {}
