import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from './i18n/config';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const publicPaths = ['/login', '/api/auth'];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!publicPaths.some((p) => pathname.includes(p))) {
    const sessionToken = req.cookies.get('next-auth.session-token');
    if (!sessionToken) {
      const locale = pathname.split('/')[1] || defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|favicon\\.ico|.*\\..*).*)'],
};
