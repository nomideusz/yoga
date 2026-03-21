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

// ── Geo intent detection ───────────────────────────────────
// Patterns are matched against NORMALIZED (diacritic-stripped) text.

const GEO_PATTERNS = [
  // Polish (include all case/number variants)
  /\bblisko\b/i,
  /\bblisko\s+mnie\b/i,
  /\bniedaleko\b/i,
  /\bw\s+poblizu\b/i,
  /\bobok\b/i,
  /\bw\s+okolic\w*\b/i,           // w okolicy, w okolicach, w okolicę
  /\bnajblizej\b/i,
  /\bnajblizsz\w*/i,
  /\bkolo\s+mnie\b/i,
  /\bw\s+sasiedztwie\b/i,
  /\bw\s+moim\s+rejonie\b/i,
  // English
  /\bnear\s*me\b/i,
  /\bnearby\b/i,
  /\bclosest\b/i,
  /\baround\s+me\b/i,
];

/** Detect "near me" / "blisko" intent. Tests against normalized text. */
export function hasGeoIntent(query: string): boolean {
  const n = stripDiacritics(query).toLowerCase();
  return GEO_PATTERNS.some(p => p.test(n));
}

/** Remove geo-intent phrases from query. Works on normalized text. */
export function stripGeoIntent(query: string): string {
  let q = stripDiacritics(query).toLowerCase();
  for (const p of GEO_PATTERNS) q = q.replace(p, '');
  return q.replace(/\s+/g, ' ').trim();
}

// ── Stop words (site-generic terms) ────────────────────────
// "joga" on a yoga directory = redundant. Strip before searching.
// Polish prepositions/particles = noise in search tokens.

/** Multi-word stop phrases (checked first, longest first). */
const STOP_PHRASES = [
  'szkola jogi', 'szkoly jogi',
  'studio jogi', 'studia jogi',
  'zajecia jogi', 'lekcje jogi', 'klasy jogi',
  'yoga studio', 'yoga school', 'yoga class',
];

/** Single-word stop tokens: yoga synonyms + common Polish prepositions/particles. */
const STOP_TOKENS = new Set([
  // Site-generic
  'joga', 'yoga',
  // Polish prepositions & particles (generate massive false positives in substring search)
  'w', 'z', 'na', 'do', 'od', 'dla', 'i', 'o', 'u', 'ze',
  'przy', 'po', 'pod', 'nad', 'za', 'przed', 'miedzy', 'lub',
  // Common filler words in Polish search queries
  'sie', 'jak', 'co', 'to', 'jest', 'sa', 'nie', 'tak', 'czy',
  'tu', 'tam', 'ten', 'ta', 'te',
  // Common in location queries (all case forms)
  'okolicy', 'okolice', 'okolica', 'okolicach', 'okolicami',
  'poblizu', 'rejon', 'rejonie', 'rejonu',
  'sasiedztwie', 'centrum', 'okolo',
  'praca', 'kurs', 'kursy', 'lekcje', 'zajecia', 'treningi',
]);

/**
 * Strip stop words/phrases from a NORMALIZED string.
 * Strips geo intent phrases first (so "w okolicy" is removed as a unit,
 * not split into stop-word "w" + orphan "okolicy"), then stop phrases,
 * then single stop tokens.
 */
export function stripStopWords(normalized: string): string {
  let result = normalized;
  // Geo intent phrases first (before single-token stripping splits them)
  for (const p of GEO_PATTERNS) result = result.replace(p, ' ');
  // Multi-word stop phrases (longest first to avoid partial stripping)
  const sorted = [...STOP_PHRASES].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    result = result.replace(new RegExp(`\\b${phrase}\\b`, 'g'), ' ');
  }
  // Single-word stop tokens
  result = result
    .split(/\s+/)
    .filter(t => !STOP_TOKENS.has(t))
    .join(' ');
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Minimum token length for substring/prefix matching.
 * Tokens shorter than this are too ambiguous for client-side matching
 * (e.g., "a" matches "Ashtanga", "w" matches "Wrocław").
 */
export const MIN_SEARCH_TOKEN_LENGTH = 3;

/**
 * Polish city name case-form stemming.
 * Polish has 7 grammatical cases that transform city names:
 *   Łódź → Łodzi (locative/genitive), Warszawy (genitive), Krakowie (locative)
 * This function strips common Polish declension suffixes to recover
 * the nominative-like stem that matches our cityMap keys.
 * Works on NORMALIZED (diacritic-stripped, lowercase) text.
 *
 * Returns [original, ...stems] — always includes the original token.
 */
/**
 * Polish locative case for city names (used in "Hatha w Krakowie" display).
 * Polish locative is used after "w" (in): "w Krakowie", "w Łodzi", "w Warszawie".
 * Works on the ORIGINAL (non-normalized) city name to preserve diacritics.
 *
 * Rules are approximate — irregular forms should be stored in DB.
 */
export function polishLocative(city: string): string {
  const c = city.trim();
  // Full-name irregulars + all known cities (checked first).
  // Polish locative is too irregular for rules alone — this map is the
  // source of truth. Rules below are fallback for unknown cities only.
  const irregulars: Record<string, string> = {
    // ── Major Polish cities ──
    'Kraków': 'Krakowie',
    'Wrocław': 'Wrocławiu',
    'Łódź': 'Łodzi',
    'Poznań': 'Poznaniu',
    'Gdańsk': 'Gdańsku',
    'Gdynia': 'Gdyni',
    'Szczecin': 'Szczecinie',
    'Bydgoszcz': 'Bydgoszczy',
    'Lublin': 'Lublinie',
    'Białystok': 'Białymstoku',
    'Katowice': 'Katowicach',
    'Częstochowa': 'Częstochowie',
    'Radom': 'Radomiu',
    'Sosnowiec': 'Sosnowcu',
    'Toruń': 'Toruniu',
    'Kielce': 'Kielcach',
    'Rzeszów': 'Rzeszowie',
    'Gliwice': 'Gliwicach',
    'Olsztyn': 'Olsztynie',
    'Zabrze': 'Zabrzu',
    'Opole': 'Opolu',
    'Tychy': 'Tychach',
    'Płock': 'Płocku',
    'Elbląg': 'Elblągu',
    'Tarnów': 'Tarnowie',
    'Chorzów': 'Chorzowie',
    'Bytom': 'Bytomiu',
    'Piła': 'Pile',
    'Legnica': 'Legnicy',
    'Jaworzno': 'Jaworznie',
    'Siedlce': 'Siedlcach',
    'Mysłowice': 'Mysłowicach',
    'Konin': 'Koninie',
    'Inowrocław': 'Inowrocławiu',
    'Skierniewice': 'Skierniewicach',
    'Sopot': 'Sopocie',
    'Warszawa': 'Warszawie',
    // ── Current DB cities (all 52) ──
    'Bełchatów': 'Bełchatowie',
    'Bielany Wrocławskie': 'Bielanach Wrocławskich',
    'Borkowo': 'Borkowie',
    'Brzozówka': 'Brzozówce',
    'Czeladź': 'Czeladzi',
    'Górki': 'Górkach',
    'Kamionki': 'Kamionkach',
    'Komorniki': 'Komornikach',
    'Konstantynów Łódzki': 'Konstantynowie Łódzkim',
    'Kowale': 'Kowalach',
    'Koziegłowy': 'Koziegłowach',
    'Luboń': 'Luboniu',
    'Mierzyn': 'Mierzynie',
    'Mikołów': 'Mikołowie',
    'Monte': 'Monte',
    'Niemcz': 'Niemczu',
    'Osielsko': 'Osielsku',
    'Owińska': 'Owińskach',
    'Piekary Śląskie': 'Piekarach Śląskich',
    'Pilchowice': 'Pilchowicach',
    'Plewiska': 'Plewiskach',
    'Przeźmierowo': 'Przeźmierowie',
    'Sierosław': 'Sierosławiu',
    'Skórzewo': 'Skórzewie',
    'Suchy Dwór': 'Suchym Dworze',
    'Suchy Las': 'Suchym Lesie',
    'Wiry': 'Wirach',
    'Wola Kopcowa': 'Woli Kopcowej',
    'Wysoka': 'Wysokiej',
    'Zgierz': 'Zgierzu',
    // ── Word-level irregulars (for multi-word names not in full-name map) ──
    'Ruda': 'Rudzie',
    'Wola': 'Woli',
    'Dąbrowa': 'Dąbrowie',
    'Nowy': 'Nowym',
    'Nowa': 'Nowej',
    'Stary': 'Starym',
    'Stara': 'Starej',
    'Wielka': 'Wielkiej',
    'Wielki': 'Wielkim',
    'Mały': 'Małym',
    'Mała': 'Małej',
    'Dolna': 'Dolnej',
    'Dolny': 'Dolnym',
    'Górna': 'Górnej',
    'Górny': 'Górnym',
    'Suchy': 'Suchym',
    'Sucha': 'Suchej',
  };
  if (irregulars[c]) return irregulars[c];

  // Multi-word names: decline each word separately
  // "Wola Kopcowa" → "Woli Kopcowej", "Nowy Sącz" → "Nowym Sączu"
  const parts = c.split(/(\s+|-)/); // split preserving spaces and hyphens
  if (parts.filter(p => p.trim() && p !== '-').length > 1) {
    return parts.map(p => {
      if (!p.trim() || p === '-') return p; // preserve whitespace/hyphens
      return locativeWord(p, irregulars);
    }).join('');
  }

  return locativeWord(c, irregulars);
}

/** Decline a single Polish word to locative case. */
function locativeWord(w: string, irregulars: Record<string, string>): string {
  if (irregulars[w]) return irregulars[w];

  // ── Adjective endings (must check before noun endings) ──
  // -owa → -owej (Kopcowa → Kopcowej)
  if (w.endsWith('owa')) return w.slice(0, -1) + 'ej';
  // -owy → -owym (Kopcowy → Kopcowym)
  if (w.endsWith('owy')) return w.slice(0, -1) + 'ym';
  // -ska/-cka → -skiej/-ckiej (Śląska → Śląskiej)
  if (w.endsWith('ska')) return w.slice(0, -1) + 'iej';
  if (w.endsWith('cka')) return w.slice(0, -1) + 'iej';
  // -ski/-cki → -skim/-ckim (Trybunalski → Trybunalskim)
  if (w.endsWith('ski') || w.endsWith('cki')) return w + 'm';
  // -na → -nej (Zielona → Zielonej, Górnicza: see -cza)
  if (w.endsWith('na')) return w.slice(0, -1) + 'ej';
  // -ny → -nym (Nowy: see irregulars; Wolny → Wolnym)
  if (w.endsWith('ny')) return w.slice(0, -1) + 'ym';
  // -cza → -czej (Górnicza → Górniczej)
  if (w.endsWith('cza')) return w.slice(0, -1) + 'ej';
  // -szy/-sza → -szym/-szej (Wielkopolski already caught by -ski)
  if (w.endsWith('sza')) return w.slice(0, -1) + 'ej';
  // -ły/-ła → -łym/-łej (Biała → Białej)
  if (w.endsWith('ła')) return w.slice(0, -1) + 'ej';
  if (w.endsWith('ły')) return w.slice(0, -1) + 'ym';

  // ── Noun endings ──
  // -ów → -owie (Tarnów → Tarnowie)
  if (w.endsWith('ów')) return w.slice(0, -2) + 'owie';
  // -ław → -ławiu
  if (w.endsWith('ław')) return w + 'iu';
  // -in/-yn → -inie/-ynie
  if (w.endsWith('in') || w.endsWith('yn')) return w + 'ie';
  // -ań/-eń/-uń → -aniu/-eniu/-uniu
  if (w.endsWith('ań') || w.endsWith('eń') || w.endsWith('uń')) return w.slice(0, -1) + 'niu';
  // -ek → -ku
  if (w.endsWith('ek')) return w.slice(0, -2) + 'ku';
  // -ice/-yce → -icach/-ycach
  if (w.endsWith('ice') || w.endsWith('yce')) return w.slice(0, -1) + 'ach';
  // -la → -li (Wola → Woli) — note: -ła already caught by adjective rule above
  if (w.endsWith('la')) return w.slice(0, -1) + 'i';
  // -a (other nouns) → -ie (Warszawa → Warszawie)
  if (w.endsWith('a')) return w.slice(0, -1) + 'ie';
  // -o → -ie (Jaworzno → Jaworznie — irregular, but fallback)
  if (w.endsWith('o')) return w.slice(0, -1) + 'ie';
  // -e → -u (Opole → Opolu)
  if (w.endsWith('e')) return w.slice(0, -1) + 'u';
  // -y → -ach (Tychy → Tychach — plural neuter)
  if (w.endsWith('y')) return w.slice(0, -1) + 'ach';
  // Consonant endings after k/g/ch/sz/cz/rz/ż → -u (Sącz → Sączu, Płock → Płocku)
  if (/(?:k|g|ch|sz|cz|rz|ż|ąg|ąk)$/.test(w)) return w + 'u';
  // Other consonant endings: add -ie (Szczecin → Szczecinie)
  return w + 'ie';
}

/** Suffix rules for stripping Polish case endings → nominative-like stem. */
const STEM_RULES: [RegExp, string][] = [
  // -owie → -ów (Kraków → Krakowie)
  [/owie$/, 'ow'],
  // -odzi → -odz (Łódź → Łodzi → normalized: lodzi → lodz)
  [/odzi$/, 'odz'],
  // -owej → -owa (Kopcowej → Kopcowa, genitive feminine adjective)
  [/owej$/, 'owa'],
  // -ach → drop (Katowicach → Katowic)
  [/ach$/, ''],
  // -ami → drop (instrumental plural)
  [/ami$/, ''],
  // -ie → -ia or drop (Poznanie → Poznan, Gdańskie → Gdansk)
  [/nie$/, 'n'],
  [/cie$/, 'c'],
  [/zie$/, 'z'],
  [/skie$/, 'sk'],
  // -y → drop (Warszawy → Warszaw → matches "warszawa" via prefix)
  [/y$/, ''],
  // -i → drop (Łodzi without the 'odz' rule, generic genitive)
  [/i$/, ''],
  // -e → drop (locative: Wrocławie → Wrocław → wroclaw via prefix)
  [/e$/, ''],
  // -u → drop (Toruniu → Torun)
  [/u$/, ''],
];

/** Stem a single word using Polish case rules. Returns [original, ...stems]. */
function stemWord(word: string): string[] {
  const stems = [word];
  for (const [re, replacement] of STEM_RULES) {
    if (re.test(word)) {
      const stem = word.replace(re, replacement);
      if (stem.length >= 3 && stem !== word) stems.push(stem);
    }
  }
  return stems;
}

export function polishCityStems(token: string): string[] {
  const words = token.split(/\s+/);
  if (words.length === 1) return stemWord(token);

  // Multi-word: stem each word independently and produce combinations.
  // "woli kopcowej" → stem each → [["woli","wol"],["kopcowej","kopcowa"]]
  // → "woli kopcowej", "wol kopcowej", "woli kopcowa", "wol kopcowa"
  const wordStems = words.map(w => stemWord(w));
  const results = new Set<string>([token]);

  // Generate all combinations (for 2-3 words this is small)
  function combine(idx: number, current: string[]) {
    if (idx === wordStems.length) {
      results.add(current.join(' '));
      return;
    }
    for (const stem of wordStems[idx]) {
      current.push(stem);
      combine(idx + 1, current);
      current.pop();
    }
  }
  combine(0, []);
  return [...results];
}
