// packages/svelte-i18n/src/lib/core/store.svelte.ts
import { interpolate } from './interpolate.js';
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
export function createI18n(config) {
    let _locale = $state(config.defaultLocale);
    let _isLoading = $state(false);
    let _messages = $state({});
    // Cache: locale → messages (never re-fetches the same locale)
    const cache = new Map();
    /** Extract messages from a loader result, handling `{ default: {...} }` from dynamic imports. */
    function unwrap(loaded) {
        const maybeDefault = loaded.default;
        return (maybeDefault ? maybeDefault : loaded);
    }
    function applyMessages(locale, msgs) {
        cache.set(locale, msgs);
        _messages = msgs;
        _isLoading = false;
    }
    function loadMessages(locale) {
        const cached = cache.get(locale);
        if (cached) {
            _messages = cached;
            _isLoading = false;
            return;
        }
        const result = config.loader(locale);
        // Synchronous loader — apply immediately so SSR's first render has messages.
        if (!(result instanceof Promise)) {
            applyMessages(locale, unwrap(result));
            return;
        }
        _isLoading = true;
        return result
            .then((loaded) => applyMessages(locale, unwrap(loaded)))
            .catch((err) => {
            _isLoading = false;
            throw err;
        });
    }
    // Eagerly load default locale
    loadMessages(config.defaultLocale);
    return {
        get locale() {
            return _locale;
        },
        get isLoading() {
            return _isLoading;
        },
        get supportedLocales() {
            return config.supportedLocales;
        },
        t(key, params) {
            const value = _messages[key];
            if (value === undefined)
                return key;
            return interpolate(value, params);
        },
        async setLocale(locale) {
            if (!config.supportedLocales.includes(locale)) {
                console.warn(`[svelte-i18n] Locale "${locale}" is not in supportedLocales.`);
                return;
            }
            if (locale === _locale && cache.has(locale))
                return;
            _locale = locale;
            const result = loadMessages(locale);
            if (result)
                await result;
        },
    };
}
