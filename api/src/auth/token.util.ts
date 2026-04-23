import { UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';

import type { AdminTokenPayload } from './auth.types';

const DEFAULT_ADMIN_AUTH_SECRET =
  process.env.ADMIN_AUTH_SECRET ||
  'default_admin_secret_change_me_in_production';
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 12;

function getSecret() {
  return process.env.ADMIN_AUTH_SECRET ?? DEFAULT_ADMIN_AUTH_SECRET;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string): string {
  return createHmac('sha256', getSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createAdminToken(
  payload: Omit<AdminTokenPayload, 'exp'>,
  ttlSeconds = DEFAULT_TOKEN_TTL_SECONDS,
): string {
  const signedPayload: AdminTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(signedPayload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    throw new UnauthorizedException('Invalid admin token');
  }

  const expectedSignature = Buffer.from(
    signPayload(encodedPayload),
    'base64url',
  );
  const actualSignature = Buffer.from(signature, 'base64url');

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    throw new UnauthorizedException('Invalid admin token');
  }

  let payload: AdminTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminTokenPayload;
  } catch {
    throw new UnauthorizedException('Invalid admin token');
  }

  if (!payload?.sub || !payload?.email || payload.role !== 'ADMIN') {
    throw new UnauthorizedException('Invalid admin token');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new UnauthorizedException('Admin session expired');
  }

  return payload;
}
