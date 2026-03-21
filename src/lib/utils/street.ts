/** Strip ul./al./os./pl. prefix and house number from an address */
export function extractStreet(address: string): string {
  return address
    .replace(/^(ul\.|al\.|os\.|pl\.)\s*/i, '')
    .replace(/\s+\d+[a-zA-Z]?(\s*\/\s*\d+)?$/, '')
    .trim();
}

const POLISH_MAP: Record<string, string> = {
  ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n',
  ó: 'o', ś: 's', ź: 'z', ż: 'z',
  Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n',
  Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
};

/** Normalize Polish diacritics for fuzzy comparison */
export function normalizePolish(str: string): string {
  return str.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (ch) => POLISH_MAP[ch] ?? ch).toLowerCase();
}

/** Extract the street name from address for ghost autocomplete */
export function extractStreetDisplay(address: string): string {
  return extractStreet(address).toUpperCase();
}
