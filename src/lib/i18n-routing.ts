// apps/yoga — shared URL-locale routing config.
// Single source of truth for hooks, paths.ts, sitemap, and hreflang.
import type { LocaleRoutingConfig } from '@nomideusz/svelte-i18n';

export const i18nRouting: LocaleRoutingConfig = {
  defaultLocale: 'pl',
  // Default (pl) is served un-prefixed; en gets /en.
  supportedLocales: ['pl', 'en', 'uk'],
  // Ukrainian is served at /ua/* (recognizable), while the locale code,
  // <html lang>, and hreflang correctly stay 'uk' (ISO 639-1).
  prefixes: { uk: 'ua' },
};
