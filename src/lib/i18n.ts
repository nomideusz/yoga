// apps/yoga — i18n setup (multi-locale)
//
// Static (synchronous) message loader: all three locales are bundled so
// `setLocale` applies synchronously. This is what makes SSR locale resolution
// safe — the root layout sets the locale during the synchronous render pass,
// which SvelteKit never interleaves across requests. Do NOT switch back to a
// dynamic import() loader without revisiting the per-request locale design.
import { createI18n } from '@nomideusz/svelte-i18n';
import pl from './messages/pl.json';
import en from './messages/en.json';
import uk from './messages/uk.json';

const messages: Record<string, Record<string, string>> = { pl, en, uk };

export const i18n = createI18n({
  defaultLocale: 'pl',
  supportedLocales: ['pl', 'en', 'uk'],
  loader: (locale: string) => messages[locale] ?? messages.pl,
});
