import crypto from 'crypto';
import type { AuthTokenPayload } from '../../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'consentguard-kpc-inuka-secret-jwt-key-2026';
const TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Base64URL encoding helper
 */
function base64UrlEncode(strOrBuffer: string | Buffer): string {
  const buf = typeof strOrBuffer === 'string' ? Buffer.from(strOrBuffer, 'utf8') : strOrBuffer;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Secure password hashing using PBKDF2 with SHA-512 and random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored salt:hash string
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, originalHash] = storedHash.split(':');
    const verifyKey = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(verifyKey, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Issue standard HMAC-SHA256 JWT Token
 */
export function generateToken(payload: AuthTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(dataToSign)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

/**
 * Verify HMAC-SHA256 JWT Token and return payload
 */
export function verifyToken<T = AuthTokenPayload>(token: string): (T & { iat: number; exp: number }) | null {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(dataToSign)
      .digest();
    const expectedEncoded = base64UrlEncode(expectedSignature);

    // Timing-safe comparison of signatures
    if (
      Buffer.from(encodedSignature).length !== Buffer.from(expectedEncoded).length ||
      !crypto.timingSafeEqual(Buffer.from(encodedSignature), Buffer.from(expectedEncoded))
    ) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload as T & { iat: number; exp: number };
  } catch {
    return null;
  }
}
