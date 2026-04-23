import type { Request } from 'express';

export interface AdminSession {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN';
}

export interface AdminTokenPayload {
  sub: string;
  email: string;
  role: 'ADMIN';
  exp: number;
}

export interface AuthenticatedAdminRequest extends Request {
  adminUser?: AdminSession;
}