import { UnauthorizedException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { createAdminToken, verifyAdminToken } from './token.util';
import { verifyPassword } from './password.util';

@Injectable()
export class AdminAuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: AdminLoginDto) {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.prisma.user.findUnique({
      where: { email },
    });

    if (
      !admin ||
      admin.role !== UserRole.ADMIN ||
      !admin.passwordHash ||
      !verifyPassword(dto.password, admin.passwordHash)
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = createAdminToken({
      sub: admin.id,
      email: admin.email,
      role: 'ADMIN',
    });

    return {
      success: true,
      tokenType: 'Bearer',
      accessToken,
      expiresIn: 60 * 60 * 12,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async authenticateToken(token: string) {
    const payload = verifyAdminToken(token);
    const admin = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new UnauthorizedException('Admin session is no longer valid');
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }
}