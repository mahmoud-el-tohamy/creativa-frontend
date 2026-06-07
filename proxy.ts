import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This proxy protects all routes except /login.
// We check for the refreshToken cookie because accessToken expires quickly.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api')) {
    console.log(`[PROXY] Intercepted API request: ${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.next();
  }

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get('refreshToken');

  if (!refreshToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
