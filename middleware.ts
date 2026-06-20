import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Matcher tous les chemins sauf API, _next, fichiers statiques
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
