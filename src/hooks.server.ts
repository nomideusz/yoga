// apps/yoga — server locale resolution + <html lang> injection,
// plus Temps (Sentry wire-compatible) server-side error tracking.
//
// DSN is read at runtime from PUBLIC_SENTRY_DSN; an empty/unset DSN makes Sentry
// a no-op, so local dev without the var is safe. Performance tracing is off —
// errors only, which is all the Temps error-fixer workflow consumes.
//
// event.url keeps the ORIGINAL (prefixed) path even after reroute, so the
// locale prefix is still visible here. resolveLocale trusts the URL prefix and
// only negotiates Accept-Language at the bare root.
import * as Sentry from '@sentry/sveltekit';
import { env } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';
import { resolveLocale, negotiateLocale, localizeHref } from '@nomideusz/svelte-i18n';
import { i18nRouting } from '$lib/i18n-routing';

Sentry.init({
	dsn: env.PUBLIC_SENTRY_DSN,
	environment: process.env.NODE_ENV ?? 'development',
});

// Basic-Auth gate for /admin/*. Locked shut when ADMIN_PASSWORD is unset —
// never open by default. Username is ignored; only the password matters.
const adminAuthHandle: Handle = async ({ event, resolve }) => {
  if (!event.url.pathname.startsWith('/admin')) return resolve(event);

  const expected = privateEnv.ADMIN_PASSWORD;
  const header = event.request.headers.get('authorization') ?? '';
  let ok = false;
  if (expected && header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      ok = password === expected;
    } catch {
      ok = false;
    }
  }
  if (!ok) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="admin", charset="UTF-8"' },
    });
  }
  return resolve(event);
};

const localeHandle: Handle = async ({ event, resolve }) => {
  const acceptLanguage = event.request.headers.get('accept-language');
  const cookieLocale = event.cookies.get('locale');

  // Bare-root entry: send foreign visitors to their prefixed home, respecting cookie preference.
  if (event.url.pathname === '/') {
    const targetLocale = cookieLocale || negotiateLocale(acceptLanguage, i18nRouting);
    if (targetLocale !== i18nRouting.defaultLocale && i18nRouting.supportedLocales.includes(targetLocale)) {
      return new Response(null, {
        status: 302,
        headers: {
          location: localizeHref('/', targetLocale, i18nRouting),
          vary: 'accept-language, cookie',
        },
      });
    }
  }

  let locale = resolveLocale({ pathname: event.url.pathname, acceptLanguage }, i18nRouting);
  if (event.url.pathname === '/' && cookieLocale && i18nRouting.supportedLocales.includes(cookieLocale)) {
    locale = cookieLocale;
  }
  event.locals.locale = locale;

  // Sync / refresh the language preference cookie
  if (cookieLocale !== locale) {
    event.cookies.set('locale', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: false, // allow client-side modification for immediate switcher updates
      sameSite: 'lax',
      secure: event.url.protocol === 'https:'
    });
  }

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', locale),
  });
};

// sentryHandle() runs first so request context is attached to any error the
// locale handle (or downstream load/actions) throws.
export const handle = sequence(Sentry.sentryHandle(), adminAuthHandle, localeHandle);
export const handleError = Sentry.handleErrorWithSentry();
