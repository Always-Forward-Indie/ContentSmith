import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/api/auth'];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!publicPaths.some((p) => pathname.startsWith(p))) {
    const sessionToken = req.cookies.get('next-auth.session-token');
    if (!sessionToken) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/trpc|_next|_vercel|favicon\\.ico|.*\\..*).*)'],
};
