// Auth custom sederhana pakai JWT (bukan Supabase Auth lagi).
// Role & identitas user disimpan LANGSUNG di dalam JWT, supaya middleware
// bisa cek role tanpa perlu query DB di setiap request.
import { SignJWT, jwtVerify } from 'jose';

export interface SessionPayload {
  sub: string; // user id
  username: string;
  full_name: string;
  role: 'ADMIN' | 'OPERATOR' | 'SECURITY';
}

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET belum di-set di .env.local');
  return new TextEncoder().encode(secret);
};

export async function signSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'cool_session';
