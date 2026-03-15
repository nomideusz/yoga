import type { Locale, I18nInstance } from "../core/types.js";
interface Props {
    /**
     * The i18n instance created by createI18n().
     */
    i18n: I18nInstance;
    /**
     * Optional display name map, e.g. { en: 'English', pl: 'Polski' }.
     * Falls back to the locale code itself if not provided.
     */
    labels?: Record<Locale, string>;
    /**
     * Optional CSS class for the wrapper.
     */
    class?: string;
}
declare const LocaleSwitcher: import("svelte").Component<Props, {}, "">;
type LocaleSwitcher = ReturnType<typeof LocaleSwitcher>;
export default LocaleSwitcher;
