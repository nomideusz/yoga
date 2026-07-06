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

// joga + Polish declensions (jogi, jodze, jogę/joge, jogą)
const YOGA_NAME_RE = /jog[aię]|joge|jodze|yoga|yogi/i;

/** Is this a yoga place (vs pilates/meditation-only)? Works with display
 *  style names ("Pilates Mat") and normalized tokens ("pilates mat") alike. */
export function isYogaPlace(name: string, styles: string[]): boolean {
  if (YOGA_NAME_RE.test(name)) return true;
  return styles
    .flatMap((s) => s.toLowerCase().split(/\s+/))
    .some((t) => t.length > 0 && !NON_YOGA_STYLE_TOKENS.has(t));
}

/** Queries that explicitly ask for pilates/meditation — skip the yoga boost. */
export function wantsNonYoga(normalizedQuery: string): boolean {
  return /pilates|reformer|medytac|meditat|mindful|buddyz|buddhi/.test(normalizedQuery);
}

// Gym/multi-activity venues — they may offer yoga classes (and stay listed),
// but they're not what someone browsing a yoga directory expects on top.
const GYM_NAME_RE = /fitness|si[łl]ownia|gym\b|crossfit|\bems\b|pole dance|tenis|trening/i;
// "club/klub" is a weak signal — only gym-ish when the name has no yoga word
// ("reSET Club" yes, "NAYA Yoga Club" no)
const CLUB_NAME_RE = /\bclub\b|\bklub\b/i;

/**
 * Ranking tier: 0 = dedicated yoga school, 1 = gym-named place with yoga
 * classes, 2 = pilates/meditation-only place. Lower ranks first.
 */
export function yogaTier(name: string, styles: string[]): 0 | 1 | 2 {
  if (!isYogaPlace(name, styles)) return 2;
  if (GYM_NAME_RE.test(name)) return 1;
  if (CLUB_NAME_RE.test(name) && !YOGA_NAME_RE.test(name)) return 1;
  return 0;
}

/** Stable partition by yogaTier — original order preserved within tiers. */
export function yogaFirst<T>(items: T[], toKey: (item: T) => { name: string; styles: string[] }): T[] {
  const tiers: T[][] = [[], [], []];
  for (const item of items) {
    const { name, styles } = toKey(item);
    tiers[yogaTier(name, styles)].push(item);
  }
  return tiers.flat();
}
