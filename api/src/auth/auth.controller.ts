import { Body, Controller, Post } from '@nestjs/common';

import { AdminAuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('admin/login')
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.login(dto);
  }
}
