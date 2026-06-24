import type { Locale } from './types.js';
export interface LocaleRoutingConfig {
    /** Locale served at the un-prefixed root (e.g. 'pl' → `/krakow`). */
    defaultLocale: Locale;
    /** Every locale the app serves, including the default. */
    supportedLocales: Locale[];
    /**
     * Optional URL-segment overrides: locale code → URL prefix. Use when the
     * recognizable URL segment differs from the ISO language code — e.g.
     * `{ uk: 'ua' }` serves Ukrainian at `/ua/*` while `hreflang` and
     * `<html lang>` correctly stay `uk`. Locales without an entry use their
     * own code as the prefix.
     */
    prefixes?: Record<Locale, string>;
}
/**
 * Split a pathname into its locale and the delocalized remainder.
 *
 * @example
 * extractLocale('/en/krakow', cfg)  // → { locale: 'en', pathname: '/krakow' }
 * extractLocale('/krakow', cfg)     // → { locale: 'pl', pathname: '/krakow' }
 * extractLocale('/en', cfg)         // → { locale: 'en', pathname: '/' }
 * extractLocale('/', cfg)           // → { locale: 'pl', pathname: '/' }
 */
export declare function extractLocale(pathname: string, config: LocaleRoutingConfig): {
    locale: Locale;
    pathname: string;
};
/**
 * Add the locale prefix to an internal path. Inverse of {@link extractLocale}.
 * The default locale is returned un-prefixed. External, hash, and protocol
 * links (anything not starting with a single '/') are returned untouched.
 *
 * Preserves query strings and hashes: only the path segment is prefixed.
 *
 * @example
 * localizeHref('/krakow', 'en', cfg)         // → '/en/krakow'
 * localizeHref('/krakow', 'pl', cfg)         // → '/krakow'
 * localizeHref('/', 'en', cfg)               // → '/en'
 * localizeHref('/krakow?style=hatha', 'en')  // → '/en/krakow?style=hatha'
 */
export declare function localizeHref(path: string, locale: Locale, config: LocaleRoutingConfig): string;
/**
 * Build the `<link rel="alternate" hreflang>` set for a page, including
 * `x-default` (→ the default locale). Pass the DELOCALIZED canonical path
 * (i.e. `extractLocale(url.pathname).pathname`) and an absolute origin.
 *
 * @example
 * alternates('/krakow', cfg, 'https://szkolyjogi.pl')
 * // → [
 * //   { hreflang: 'pl', href: 'https://szkolyjogi.pl/krakow' },
 * //   { hreflang: 'en', href: 'https://szkolyjogi.pl/en/krakow' },
 * //   { hreflang: 'uk', href: 'https://szkolyjogi.pl/uk/krakow' },
 * //   { hreflang: 'x-default', href: 'https://szkolyjogi.pl/krakow' },
 * // ]
 */
export declare function alternates(path: string, config: LocaleRoutingConfig, origin: string): Array<{
    hreflang: string;
    href: string;
}>;
/**
 * Pick the best supported locale from an `Accept-Language` header. Matches on
 * the primary subtag (`en-US` → `en`), honours quality weights, and falls back
 * to the default locale when nothing matches.
 *
 * @example
 * negotiateLocale('uk,en;q=0.8,pl;q=0.5', cfg)  // → 'uk'
 * negotiateLocale('fr-FR,fr;q=0.9', cfg)        // → 'pl' (default)
 */
export declare function negotiateLocale(acceptLanguage: string | null | undefined, config: LocaleRoutingConfig): Locale;
/**
 * Resolve the active locale for a request: URL prefix wins; if the path is
 * un-prefixed (the bare default root and below), fall back to content
 * negotiation. Use this in a server `handle` hook to set `event.locals.locale`.
 */
export declare function resolveLocale(input: {
    pathname: string;
    acceptLanguage?: string | null;
}, config: LocaleRoutingConfig): Locale;
/**
 * SvelteKit `reroute` hook factory: maps a prefixed URL onto the existing
 * (un-prefixed) route tree, so `/en/krakow` is served by the `/[city]` route
 * with no duplicate route files.
 *
 * @example
 * // src/hooks.ts
 * export const reroute = createReroute(i18nRoutingConfig);
 */
export declare function createReroute(config: LocaleRoutingConfig): ({ url }: {
    url: URL;
}) => string;
