// Canonical listing feature slugs. features_json may also hold free-text
// strings (rendered verbatim, untranslated); only these slugs get i18n labels
// via the `feature_<slug with _>` message keys.
export const FEATURE_SLUGS = [
	'prysznice',
	'przebieralnia',
	'wypozyczenie-mat',
	'sklep',
	'parking',
	'klimatyzacja',
	'ogrzewana-sala',
	'zajecia-online',
	'zajecia-po-angielsku',
	'pierwsze-zajecia-gratis',
	'herbata',
	'dostep-dla-niepelnosprawnych',
] as const;

const SLUG_SET = new Set<string>(FEATURE_SLUGS);

export function isFeatureSlug(value: string): boolean {
	return SLUG_SET.has(value);
}

export function featureMessageKey(slug: string): string {
	return `feature_${slug.replaceAll('-', '_')}`;
}
