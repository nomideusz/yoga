// ============================================================
// src/lib/search/normalize.ts
// ============================================================

/** Polish-specific diacritics → ASCII. Then strip remaining via NFD. */
export function stripDiacritics(text: string): string {
  const pl: Record<string, string> = {
    'ą': 'a', 'Ą': 'A', 'ć': 'c', 'Ć': 'C', 'ę': 'e', 'Ę': 'E',
    'ł': 'l', 'Ł': 'L', 'ń': 'n', 'Ń': 'N', 'ó': 'o', 'Ó': 'O',
    'ś': 's', 'Ś': 'S', 'ź': 'z', 'Ź': 'Z', 'ż': 'z', 'Ż': 'Z',
  };
  let r = '';
  for (const c of text) r += pl[c] ?? c;
  return r.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Full normalization: lowercase + strip diacritics + collapse whitespace. */
export function normalize(text: string): string {
  if (!text) return '';
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Generate trigrams from text. "hatha" → ["hat","ath","tha"] */
export function trigrams(text: string): string[] {
  const n = normalize(text);
  if (n.length < 3) return n ? [n] : [];
  const result: string[] = [];
  for (const word of n.split(/\s+/)) {
    if (word.length < 3) { result.push(word); continue; }
    for (let i = 0; i <= word.length - 3; i++) result.push(word.slice(i, i + 3));
  }
  return [...new Set(result)];
}

/** Trigram similarity (Jaccard). 0..1, higher = more similar. */
export function trigramSimilarity(a: string, b: string): number {
  const tA = new Set(trigrams(a));
  const tB = new Set(trigrams(b));
  if (tA.size === 0 && tB.size === 0) return 1;
  if (tA.size === 0 || tB.size === 0) return 0;
  let intersection = 0;
  for (const t of tA) if (tB.has(t)) intersection++;
  return intersection / (tA.size + tB.size - intersection);
}

/** Levenshtein distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j] + 1, curr[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Normalized Levenshtein similarity. 0..1, higher = more similar. */
export function levenshteinSimilarity(a: string, b: string): number {
  const na = normalize(a), nb = normalize(b);
  const max = Math.max(na.length, nb.length);
  return max === 0 ? 1 : 1 - levenshtein(na, nb) / max;
}

/** Detect postcode format: XX-XXX or XXXXX */
export function isPostcode(text: string): boolean {
  return /^\d{2}-?\d{3}$/.test(text.trim());
}

const GEO_PATTERNS = [
  /\bnear\s*me\b/i, /\bblisko\b/i, /\bniedaleko\b/i,
  /\bw\s*poblizu\b/i, /\bobok\b/i, /\bw\s*okolicy\b/i,
  /\bnajblizej\b/i, /\bnajblizsz/i,
];

/** Detect "near me" / "blisko" intent. */
export function hasGeoIntent(query: string): boolean {
  return GEO_PATTERNS.some(p => p.test(query));
}

/** Remove geo-intent phrases from query. */
export function stripGeoIntent(query: string): string {
  let q = query;
  for (const p of GEO_PATTERNS) q = q.replace(p, '');
  return q.replace(/\s+/g, ' ').trim();
}
