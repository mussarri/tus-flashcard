import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AdminAuthService } from './auth.service';
import type { AuthenticatedAdminRequest } from './auth.types';

const PROTECTED_PATH_PREFIXES = [
  '/admin',
  '/api/approval',
  '/flashcards/admin',
];

const PUBLIC_PATHS = ['/auth/admin/login'];

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedAdminRequest>();
    const path = this.getPath(request);

    if (!this.isProtectedRoute(path)) {
      return true;
    }

    const token = this.extractBearerToken(request.headers.authorization);
    request.adminUser = await this.adminAuthService.authenticateToken(token);

    return true;
  }

  private getPath(request: AuthenticatedAdminRequest): string {
    const rawPath = request.originalUrl || request.url || '';
    return rawPath.split('?')[0];
  }

  private isProtectedRoute(path: string): boolean {
    if (PUBLIC_PATHS.some((publicPath) => path === publicPath)) {
      return false;
    }

    return PROTECTED_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private extractBearerToken(authorizationHeader?: string): string {
    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing admin access token');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing admin access token');
    }

    return token;
  }
}