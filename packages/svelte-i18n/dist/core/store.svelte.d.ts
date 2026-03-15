import type { I18nConfig, I18nInstance } from './types.js';
/**
 * Create an i18n instance with Svelte 5 runes-based reactivity.
 *
 * @example
 * // src/lib/i18n.ts
 * import { createI18n } from '@nomideusz/svelte-i18n';
 *
 * export const i18n = createI18n({
 *   defaultLocale: 'en',
 *   supportedLocales: ['en', 'pl'],
 *   loader: (locale) => import(`./messages/${locale}.json`).then(m => m.default),
 * });
 */
export declare function createI18n(config: I18nConfig): I18nInstance;
