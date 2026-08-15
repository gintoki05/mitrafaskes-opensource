import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import { PrismaService } from '../database/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfMiddleware } from './csrf.middleware';
import { CsrfService } from './csrf.service';
import { PermissionGuard } from './permission.guard';
import { PasswordService } from './password.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    PasswordService,
    SessionService,
    AuthService,
    CsrfService,
    SessionGuard,
    PermissionGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: SessionGuard,
    },
    {
      provide: APP_GUARD,
      useExisting: PermissionGuard,
    },
  ],
  exports: [AuthService, PasswordService, SessionService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(cookieParser(), CsrfMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
