// Public URL for an uploaded listing photo (key in photosJson[].key, shaped
// `schools/<schoolId>/<filename>.webp`). Size variants were pre-generated at
// upload (thumb_/med_/large_ prefixes on the filename); we pick the closest
// one for the requested width. Served same-origin via /photos/[...key], which
// streams from Garage with immutable cache headers (CDN-cacheable).

const SIZE_PREFIX: Record<string, string> = {
  thumbnail: 'thumb_', // 300x300 cover
  medium: 'med_', // fits 800x600
  large: 'large_', // fits 1200x900
  original: '',
};

function sizeForWidth(width?: number): keyof typeof SIZE_PREFIX {
  if (!width) return 'medium';
  if (width <= 300) return 'thumbnail';
  if (width <= 800) return 'medium';
  return 'large';
}

export function photoUrl(key: string, opts: { width?: number; height?: number; quality?: number } = {}): string {
  const parts = key.split('/');
  const filename = parts.pop()!;
  const prefix = SIZE_PREFIX[sizeForWidth(opts.width)];
  return `/photos/${[...parts, `${prefix}${filename}`].join('/')}`;
}
