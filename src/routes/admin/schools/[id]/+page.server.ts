import type { PageServerLoad, Actions } from './$types';
import { error, fail } from '@sveltejs/kit';
import { eq, asc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { schools, styles, schoolStyles } from '$lib/server/db/schema';
import { uploadPhoto, removePhoto } from '$lib/server/photo-storage';
import { normalize, plLocale } from '$lib/search';
import { FEATURE_SLUGS, isFeatureSlug } from '$lib/features';

type Photo = { key: string; alt?: string };

function parseArray<T>(json: string | null): T[] {
  try {
    const arr = JSON.parse(json ?? '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
const parsePhotos = (json: string | null) => parseArray<Photo>(json);

async function getSchoolOr404(id: string) {
  const [school] = await db.select().from(schools).where(eq(schools.id, id)).limit(1);
  if (!school) throw error(404, 'Nie znaleziono szkoły');
  return school;
}

export const load: PageServerLoad = async ({ params }) => {
  const school = await getSchoolOr404(params.id);
  const [allStyles, checked] = await Promise.all([
    db.select({ id: styles.id, name: styles.name }).from(styles).orderBy(asc(styles.name)),
    db.select({ styleId: schoolStyles.styleId }).from(schoolStyles).where(eq(schoolStyles.schoolId, params.id)),
  ]);
  return {
    school,
    photos: parsePhotos(school.photosJson),
    features: parseArray<string>(school.featuresJson),
    allStyles,
    checkedStyleIds: checked.map((r) => r.styleId),
    featureSlugs: FEATURE_SLUGS,
  };
};

const num = (v: FormDataEntryValue | null): number | null => {
  const s = v?.toString().trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const str = (v: FormDataEntryValue | null): string => v?.toString().trim() ?? '';

export const actions: Actions = {
  save: async ({ params, request }) => {
    const fd = await request.formData();
    const name = str(fd.get('name'));
    if (!name) return fail(400, { error: 'Nazwa jest wymagana.' });

    const description = str(fd.get('description'));
    const address = str(fd.get('address'));
    const neighborhood = str(fd.get('neighborhood'));

    const styleIds = fd.getAll('styleIds').map(Number).filter(Number.isInteger);
    const features = [
      ...fd.getAll('features').map(String).filter(isFeatureSlug),
      ...str(fd.get('customFeatures'))
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    ];

    const allStyles = styleIds.length
      ? await db.select({ id: styles.id, name: styles.name }).from(styles)
      : [];
    const selectedNames = allStyles.filter((s) => styleIds.includes(s.id)).map((s) => s.name);

    await db
      .update(schools)
      .set({
        name,
        address,
        neighborhood,
        postcode: str(fd.get('postcode')) || null,
        phone: str(fd.get('phone')) || null,
        email: str(fd.get('email')) || null,
        websiteUrl: str(fd.get('websiteUrl')),
        scheduleUrl: str(fd.get('scheduleUrl')),
        pricingUrl: str(fd.get('pricingUrl')),
        description,
        editorialSummary: str(fd.get('editorialSummary')),
        price: num(fd.get('price')),
        singleClassPrice: num(fd.get('singleClassPrice')),
        openPrice: num(fd.get('openPrice')),
        pricingNotes: str(fd.get('pricingNotes')) || null,
        featuresJson: JSON.stringify(features),
        isListed: fd.get('isListed') === 'on',
        scrapeLocked: fd.get('scrapeLocked') === 'on',
        lastUpdated: new Date().toISOString().slice(0, 10),
        // Search shadow columns (FTS/trigrams refresh nightly via renormalize-search)
        nameN: normalize(name, plLocale),
        streetN: normalize(address, plLocale),
        districtN: normalize(neighborhood, plLocale),
        descriptionN: normalize(description, plLocale),
        stylesN: selectedNames.map((n) => normalize(n, plLocale)).join(' '),
      })
      .where(eq(schools.id, params.id));

    await db.delete(schoolStyles).where(eq(schoolStyles.schoolId, params.id));
    if (styleIds.length) {
      await db
        .insert(schoolStyles)
        .values(styleIds.map((styleId) => ({ schoolId: params.id, styleId })));
    }

    return { saved: true };
  },

  uploadPhoto: async ({ params, request }) => {
    const school = await getSchoolOr404(params.id);
    const fd = await request.formData();
    const file = fd.get('photo');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { error: 'Nie wybrano pliku.' });
    }
    if (file.size > 8 * 1024 * 1024) {
      return fail(400, { error: 'Plik jest za duży (max 8 MB).' });
    }
    const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
    if (!ext) {
      return fail(400, { error: 'Dozwolone formaty: JPEG, PNG, WebP.' });
    }

    const body = await file.arrayBuffer();
    const fileId = await uploadPhoto(Buffer.from(body), `${params.id}.${ext}`);

    const photos = parsePhotos(school.photosJson);
    photos.push({ key: fileId });
    await db
      .update(schools)
      .set({ photosJson: JSON.stringify(photos) })
      .where(eq(schools.id, params.id));
    return { uploaded: fileId };
  },

  deletePhoto: async ({ params, request }) => {
    const school = await getSchoolOr404(params.id);
    const fd = await request.formData();
    const key = str(fd.get('key'));
    const photos = parsePhotos(school.photosJson);
    if (!photos.some((p) => p.key === key)) return fail(400, { error: 'Nie ma takiego zdjęcia.' });

    await removePhoto(key);
    await db
      .update(schools)
      .set({ photosJson: JSON.stringify(photos.filter((p) => p.key !== key)) })
      .where(eq(schools.id, params.id));
    return { deleted: key };
  },

  movePhoto: async ({ params, request }) => {
    const school = await getSchoolOr404(params.id);
    const fd = await request.formData();
    const key = str(fd.get('key'));
    const dir = str(fd.get('dir')) === 'up' ? -1 : 1;
    const photos = parsePhotos(school.photosJson);
    const i = photos.findIndex((p) => p.key === key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= photos.length) return { moved: false };
    [photos[i], photos[j]] = [photos[j], photos[i]];
    await db
      .update(schools)
      .set({ photosJson: JSON.stringify(photos) })
      .where(eq(schools.id, params.id));
    return { moved: true };
  },
};
