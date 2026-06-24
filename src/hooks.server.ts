// apps/yoga — server locale resolution + <html lang> injection.
//
// event.url keeps the ORIGINAL (prefixed) path even after reroute, so the
// locale prefix is still visible here. resolveLocale trusts the URL prefix and
// only negotiates Accept-Language at the bare root.
import type { Handle } from '@sveltejs/kit';
import { resolveLocale, negotiateLocale, localizeHref } from '@nomideusz/svelte-i18n';
import { i18nRouting } from '$lib/i18n-routing';

export const handle: Handle = async ({ event, resolve }) => {
  const acceptLanguage = event.request.headers.get('accept-language');

  // Bare-root entry: send foreign visitors to their prefixed home. Bots without
  // an Accept-Language header (and pl visitors) stay on the canonical pl root.
  if (event.url.pathname === '/') {
    const negotiated = negotiateLocale(acceptLanguage, i18nRouting);
    if (negotiated !== i18nRouting.defaultLocale) {
      return new Response(null, {
        status: 302,
        // localizeHref applies the URL prefix alias (e.g. uk → /ua).
        headers: { location: localizeHref('/', negotiated, i18nRouting), vary: 'accept-language' },
      });
    }
  }

  const locale = resolveLocale({ pathname: event.url.pathname, acceptLanguage }, i18nRouting);
  event.locals.locale = locale;

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', locale),
  });
};
