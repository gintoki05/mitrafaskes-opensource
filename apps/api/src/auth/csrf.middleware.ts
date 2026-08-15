import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { CsrfService } from './csrf.service';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly csrf: CsrfService) {}

  use(request: Request, response: Response, next: NextFunction): void {
    this.csrf.protect(request, response, next);
  }
}
