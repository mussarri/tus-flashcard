import type { ExecutionContext } from '@nestjs/common';

import { AdminAuthGuard } from './admin-auth.guard';
import type { AdminAuthService } from './auth.service';
import type { AuthenticatedAdminRequest } from './auth.types';

describe('AdminAuthGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  function setup(authorization?: string) {
    const request = {
      originalUrl: '/admin/items',
      headers: { authorization },
    } as AuthenticatedAdminRequest;
    const admin = {
      id: 'admin-id',
      email: 'admin@example.test',
      name: 'Admin',
      role: 'ADMIN' as const,
    };
    const service = {
      authenticateToken: jest.fn().mockResolvedValue(admin),
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const guard = new AdminAuthGuard(service as unknown as AdminAuthService);

    return { request, service, context, guard, admin };
  }

  it('uses the development admin without a token in development', async () => {
    process.env.NODE_ENV = 'development';
    const { request, service, context, guard } = setup();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.adminUser).toMatchObject({
      id: 'development-admin',
      role: 'ADMIN',
    });
    expect(service.authenticateToken).not.toHaveBeenCalled();
  });

  it('requires a token outside development', async () => {
    process.env.NODE_ENV = 'production';
    const { service, context, guard } = setup();

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing admin access token',
    );
    expect(service.authenticateToken).not.toHaveBeenCalled();
  });
});
