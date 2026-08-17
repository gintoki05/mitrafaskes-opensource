import { Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { doubleCsrf, type DoubleCsrfUtilities } from 'csrf-csrf';
import { getAllowedWebOrigins, getAuthConfig } from './auth.config';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfService {
  private readonly utilities: DoubleCsrfUtilities;

  constructor() {
    const config = getAuthConfig();
    this.utilities = doubleCsrf({
      getSecret: () => config.csrfSecret,
      getSessionIdentifier: (request) =>
        `${request.ip || 'unknown'}|${request.get('user-agent') || 'unknown'}`,
      cookieName: 'mitrafaskes_csrf',
      cookieOptions: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.cookieSecure,
        path: '/',
      },
      getCsrfTokenFromRequest: (request) => {
        const token = request.headers['x-csrf-token'];
        return typeof token === 'string' ? token : undefined;
      },
      errorConfig: {
        statusCode: 403,
        code: 'CSRF_INVALID',
        message: 'Token CSRF tidak valid atau belum tersedia',
      },
      skipCsrfProtection: (request) => {
        if (!unsafeMethods.has(request.method)) return true;
        if (request.path === '/api/auth/token') return true;
        return request.headers.authorization?.startsWith('Bearer ') ?? false;
      },
    });
  }

  generateToken(request: Request, response: Response): string {
    return this.utilities.generateCsrfToken(request, response);
  }

  protect(request: Request, response: Response, next: () => void): void {
    const isCookieMutation =
      unsafeMethods.has(request.method) &&
      request.path !== '/api/auth/token' &&
      !request.headers.authorization?.startsWith('Bearer ');
    const origin = request.headers.origin;
    if (
      isCookieMutation &&
      origin &&
      !getAllowedWebOrigins().includes(origin)
    ) {
      response.status(403).json({
        code: 'CSRF_ORIGIN_INVALID',
        message: 'Origin tidak diizinkan untuk operasi ini',
      });
      return;
    }
    const skipProtection =
      !unsafeMethods.has(request.method) ||
      request.path === '/api/auth/token' ||
      request.headers.authorization?.startsWith('Bearer ');
    if (skipProtection || this.utilities.validateRequest(request)) {
      next();
      return;
    }
    response.status(403).json({
      code: 'CSRF_INVALID',
      message: 'Token CSRF tidak valid atau belum tersedia',
    });
  }
}
