import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedAdminRequest } from './auth.types';

export const CurrentAdmin = createParamDecorator(
  (
    data: keyof NonNullable<AuthenticatedAdminRequest['adminUser']> | undefined,
    ctx: ExecutionContext,
  ) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedAdminRequest>();
    const adminUser = request.adminUser;

    if (!adminUser) {
      return undefined;
    }

    return data ? adminUser[data] : adminUser;
  },
);