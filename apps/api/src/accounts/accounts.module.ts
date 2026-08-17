import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccessRolesController } from './access-roles.controller';
import { AccessRolesService } from './access-roles.service';

@Module({
  imports: [AuthModule],
  controllers: [AccountsController, AccessRolesController],
  providers: [PrismaService, AccountsService, AccessRolesService],
  exports: [AccountsService, AccessRolesService],
})
export class AccountsModule {}
