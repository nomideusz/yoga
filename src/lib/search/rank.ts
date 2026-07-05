// ============================================================
// src/lib/search/rank.ts — Yoga-first ranking policy
// ============================================================
// The directory is yoga-first: pilates and meditation places are listed
// but rank below yoga schools in search results and city listings.
// Client-safe (no server imports).

// Styles that do NOT make a place a yoga school (tokenized, lowercase).
// Anything else (hatha, vinyasa, yin, power yoga, ...) counts as yoga.
const NON_YOGA_STYLE_TOKENS = new Set([
  'pilates', 'mat', 'reformer', 'meditation', 'stretching', 'barre', 'tai', 'chi',
]);

/** Is this a yoga place (vs pilates/meditation-only)? Works with display
 *  style names ("Pilates Mat") and normalized tokens ("pilates mat") alike. */
export function isYogaPlace(name: string, styles: string[]): boolean {
  if (/joga|yoga|jogi/i.test(name)) return true;
  return styles
    .flatMap((s) => s.toLowerCase().split(/\s+/))
    .some((t) => t.length > 0 && !NON_YOGA_STYLE_TOKENS.has(t));
}

/** Queries that explicitly ask for pilates/meditation — skip the yoga boost. */
export function wantsNonYoga(normalizedQuery: string): boolean {
  return /pilates|reformer|medytac|meditat|mindful|buddyz|buddhi/.test(normalizedQuery);
}

/** Stable partition: yoga places first, original order preserved within tiers. */
export function yogaFirst<T>(items: T[], toKey: (item: T) => { name: string; styles: string[] }): T[] {
  const yoga: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    const { name, styles } = toKey(item);
    (isYogaPlace(name, styles) ? yoga : rest).push(item);
  }
  return [...yoga, ...rest];
}
