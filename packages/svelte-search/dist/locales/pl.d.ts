import type { SearchLocale } from '../core/types.js';
declare function stripPolishDiacritics(text: string): string;
declare function polishLocationStems(token: string): string[];
declare const LOCATIVE_IRREGULARS: Record<string, string>;
/**
 * Polish locative case for city names.
 * "Kraków" → "Krakowie", used in "w Krakowie" (in Kraków).
 */
export declare function polishLocative(city: string): string;
export declare const plLocale: SearchLocale;
export { polishLocationStems, stripPolishDiacritics, LOCATIVE_IRREGULARS };
