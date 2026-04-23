import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export function verifyPassword(
  password: string,
  storedPasswordHash: string,
): boolean {
  const [salt, storedHash] = storedPasswordHash.split(':');
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, storedHash.length / 2) as Buffer;
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}