import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { LoginRequest } from '@mitrafaskes/shared';
import { Public } from './access-control.decorator';
import { AuthService, ChangePasswordRequest } from './auth.service';
import { CsrfService } from './csrf.service';
import type { AuthenticatedRequest } from './session.guard';
import { SessionService } from './session.service';
import { AUTH_LOGIN_THROTTLE } from './auth.throttle';

function loginRequest(body: unknown): LoginRequest {
  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as { username?: unknown }).username !== 'string' ||
    typeof (body as { password?: unknown }).password !== 'string'
  ) {
    throw new BadRequestException({
      code: 'INVALID_LOGIN_PAYLOAD',
      message: 'Username dan password wajib diisi',
    });
  }

  return {
    username: (body as { username: string }).username,
    password: (body as { password: string }).password,
  };
}

function changePasswordRequest(body: unknown): ChangePasswordRequest {
  if (
    !body ||
    typeof body !== 'object' ||
    typeof (body as { currentPassword?: unknown }).currentPassword !==
      'string' ||
    typeof (body as { newPassword?: unknown }).newPassword !== 'string'
  ) {
    throw new BadRequestException({
      code: 'INVALID_PASSWORD_PAYLOAD',
      message: 'Password saat ini dan password baru wajib diisi',
    });
  }

  return {
    currentPassword: (body as { currentPassword: string }).currentPassword,
    newPassword: (body as { newPassword: string }).newPassword,
  };
}

function sessionMetadata(request: Request) {
  return {
    userAgent: request.get('user-agent') || undefined,
    ipAddress: request.ip || undefined,
  };
}

@Controller('api/auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly csrf: CsrfService,
  ) {}

  @Get('csrf')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  getCsrf(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return { csrfToken: this.csrf.generateToken(request, response) };
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_LOGIN_THROTTLE })
  async login(
    @Body() body: unknown,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.loginWithCookie(
      loginRequest(body),
      sessionMetadata(request),
    );
    this.sessions.setCookie(response, result.token);
    return result.response;
  }

  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_LOGIN_THROTTLE })
  async token(@Body() body: unknown, @Req() request: Request) {
    return (await this.auth.login(loginRequest(body), sessionMetadata(request)))
      .response;
  }

  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.sessions.revoke(request.authToken, 'LOGOUT');
    this.sessions.clearCookie(response);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    if (request.user) {
      await this.sessions.revokeAllForUser(request.user.id, 'LOGOUT_ALL');
    }
    this.sessions.clearCookie(response);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    if (!request.user) {
      throw new BadRequestException({
        code: 'UNAUTHENTICATED',
        message: 'Sesi tidak tersedia',
      });
    }
    return this.auth.changePassword(
      request.user.id,
      changePasswordRequest(body),
      request.authSessionId,
    );
  }
}
