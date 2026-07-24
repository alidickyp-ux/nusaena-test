import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession, SESSION_COOKIE_NAME } from '@/lib/auth';

const publicPaths = ['/', '/api/auth/login'];

const securityPaths = [
  '/menu',
  '/handover',
  '/pickup',
  '/api/handover',
  '/api/pickup',
  '/api/auth/me',
  '/api/auth/logout',
];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Path publik
  if (publicPaths.includes(path)) {
    return NextResponse.next();
  }

  // Verifikasi sesi
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    // 🔥 API → JSON 401, halaman → redirect
    if (path.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  const { role } = session;
  const adminPaths = ['/admin'];
  const operatorPaths = ['/sorting', '/handover', '/menu', '/b2b'];

  // Role-based redirects
  if (role === 'ADMIN' && operatorPaths.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }
  if (role === 'OPERATOR' && adminPaths.some(p => path.startsWith(p))) {
    return NextResponse.redirect(new URL('/menu', request.url));
  }
  if (role === 'SECURITY') {
    const isAllowed = securityPaths.some(p => path === p || path.startsWith(p + '/'));
    const isAdminPath = adminPaths.some(p => path.startsWith(p));
    if (isAdminPath || !isAllowed) {
      return NextResponse.redirect(new URL('/handover', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};