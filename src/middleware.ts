import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

const publicPaths = ['/', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { role } = session;

  const adminPaths = ['/admin'];
  const operatorPaths = ['/sorting', '/handover', '/menu', '/b2b'];

  if (role === 'ADMIN' && operatorPaths.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (role === 'OPERATOR' && adminPaths.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/menu', request.url));
  }
  if (role === 'SECURITY' && path !== '/handover' && !adminPaths.some((p) => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/handover', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
