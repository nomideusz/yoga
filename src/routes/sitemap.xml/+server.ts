import { db } from "$lib/server/db/index";
import { schoolStyles, schools, styles as stylesTable } from "$lib/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCityPath, getStyleSlug } from "$lib/paths";
import { localizeHref } from "@nomideusz/svelte-i18n";
import { i18nRouting } from "$lib/i18n-routing";
import { getCanonicalStyleSlug, MIN_STYLE_CITY_LISTINGS } from "$lib/seo";
import type { RequestHandler } from "./$types";

const BASE = "https://szkolyjogi.pl";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}

interface UrlEntry {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string | null;
}

function renderUrl({ loc, changefreq, priority, lastmod }: UrlEntry): string {
  let xml = `  <url>\n    <loc>${esc(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>`;
  if (lastmod) {
    xml += `\n    <lastmod>${lastmod.split("T")[0]}</lastmod>`;
  }
  xml += "\n  </url>";
  return xml;
}

export const GET: RequestHandler = async () => {
  // Lean queries — only fetch what we need for URLs
  const [listingRows, cityRows, styleRows, styleCityRows] = await Promise.all([
    db
      .select({
        id: schools.id,
        slug: schools.slug,
        city: schools.city,
        citySlug: schools.citySlug,
        lastUpdated: schools.lastUpdated,
      })
      .from(schools)
      .where(and(eq(schools.isListed, true), sql`${schools.city} != ''`)),
    db
      .selectDistinct({ city: schools.city, citySlug: schools.citySlug })
      .from(schools)
      .where(and(eq(schools.isListed, true), sql`${schools.city} != ''`)),
    db
      .selectDistinct({ name: stylesTable.name, slug: stylesTable.slug })
      .from(stylesTable)
      .innerJoin(schoolStyles, eq(schoolStyles.styleId, stylesTable.id))
      .innerJoin(schools, eq(schools.id, schoolStyles.schoolId))
      .where(eq(schools.isListed, true)),
    db
      .select({
        styleName: stylesTable.name,
        styleSlug: stylesTable.slug,
        city: schools.city,
        citySlug: schools.citySlug,
        schoolCount: sql<number>`count(distinct ${schools.id})`,
      })
      .from(stylesTable)
      .innerJoin(schoolStyles, eq(schoolStyles.styleId, stylesTable.id))
      .innerJoin(schools, eq(schools.id, schoolStyles.schoolId))
      .where(and(eq(schools.isListed, true), sql`${schools.citySlug} is not null`))
      .groupBy(stylesTable.id, schools.city, schools.citySlug)
      .having(sql`count(distinct ${schools.id}) >= ${MIN_STYLE_CITY_LISTINGS}`),
  ]);

  const urls: string[] = [];

  // Emit one <url> per locale for a delocalized (bare pl) path. hreflang
  // relationships are signalled in each page's <head>; the sitemap's job is
  // discovery of all locale URLs.
  function pushAll(path: string, opts: { changefreq: string; priority: string; lastmod?: string | null }) {
    for (const locale of i18nRouting.supportedLocales) {
      urls.push(renderUrl({ loc: `${BASE}${localizeHref(path, locale, i18nRouting)}`, ...opts }));
    }
  }

  // ── Static pages ──────────────────────────────────────────────────────
  pushAll("/", { changefreq: "daily", priority: "1.0" });
  pushAll("/about", { changefreq: "monthly", priority: "0.5" });
  pushAll("/post", { changefreq: "monthly", priority: "0.5" });
  pushAll("/terms", { changefreq: "monthly", priority: "0.3" });

  // ── City pages ────────────────────────────────────────────────────────
  for (const { city, citySlug } of cityRows) {
    // locale 'pl' → bare delocalized path; pushAll re-localizes per locale.
    pushAll(getCityPath(city, citySlug, "pl"), { changefreq: "weekly", priority: "0.8" });
  }

  // ── Category (style) pages ────────────────────────────────────────────
  for (const { name, slug } of styleRows) {
    const styleSlug = slug || getStyleSlug(name);
    if (getCanonicalStyleSlug(styleSlug) !== styleSlug) continue;
    pushAll(`/category/${encodeURIComponent(styleSlug)}`, { changefreq: "weekly", priority: "0.6" });
  }

  // ── Inventory-backed style × city pages ───────────────────────────────
  for (const row of styleCityRows) {
    if (!row.citySlug || row.schoolCount < MIN_STYLE_CITY_LISTINGS) continue;
    const styleSlug = row.styleSlug || getStyleSlug(row.styleName);
    if (getCanonicalStyleSlug(styleSlug) !== styleSlug) continue;
    pushAll(`/category/${encodeURIComponent(styleSlug)}/${row.citySlug}`, {
      changefreq: "weekly",
      priority: "0.65",
    });
  }

  // ── Listing pages ─────────────────────────────────────────────────────
  for (const listing of listingRows) {
    const cityPath = getCityPath(listing.city, listing.citySlug, "pl");
    const listingSlug = listing.slug || listing.id;
    pushAll(`${cityPath}/${listingSlug}`, {
      changefreq: "weekly",
      priority: "0.7",
      lastmod: listing.lastUpdated,
    });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
};
