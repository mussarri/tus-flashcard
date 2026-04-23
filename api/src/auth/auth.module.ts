import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminAuthService } from './auth.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AdminAuthService,
    AdminAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: AdminAuthGuard,
    },
  ],
  exports: [AdminAuthService],
})
export class AuthModule {}