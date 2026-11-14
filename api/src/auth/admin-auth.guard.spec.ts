import type { ExecutionContext } from '@nestjs/common';

import { AdminAuthGuard } from './admin-auth.guard';
import type { AdminAuthService } from './auth.service';
import type { AuthenticatedAdminRequest } from './auth.types';

describe('AdminAuthGuard', () => {
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

  it('requires a token in development', async () => {
    const { service, context, guard } = setup();

    await expect(guard.canActivate(context)).rejects.toThrow('Missing admin access token');
    expect(service.authenticateToken).not.toHaveBeenCalled();
  });

  it('authenticates a bearer token', async () => {
    const { request, service, context, guard, admin } = setup('Bearer valid-token');
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(service.authenticateToken).toHaveBeenCalledWith('valid-token');
    expect(request.adminUser).toEqual(admin);
  });
});
