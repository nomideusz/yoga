import { db } from "$lib/server/db/index";
import { schools, styles as stylesTable } from "$lib/server/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { getCityPath, getStylePath } from "$lib/paths";
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
  const [listingRows, cityRows, styleRows] = await Promise.all([
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
    db.select({ name: stylesTable.name, slug: stylesTable.slug }).from(stylesTable),
  ]);

  const urls: string[] = [];

  // ── Static pages ──────────────────────────────────────────────────────
  urls.push(renderUrl({ loc: BASE, changefreq: "daily", priority: "1.0" }));
  urls.push(renderUrl({ loc: `${BASE}/about`, changefreq: "monthly", priority: "0.5" }));
  urls.push(renderUrl({ loc: `${BASE}/post`, changefreq: "monthly", priority: "0.5" }));
  urls.push(renderUrl({ loc: `${BASE}/terms`, changefreq: "monthly", priority: "0.3" }));

  // ── City pages ────────────────────────────────────────────────────────
  for (const { city, citySlug } of cityRows) {
    urls.push(
      renderUrl({
        loc: `${BASE}${getCityPath(city, citySlug)}`,
        changefreq: "weekly",
        priority: "0.8",
      }),
    );
  }

  // ── Category (style) pages ────────────────────────────────────────────
  for (const { name, slug } of styleRows) {
    // Use slug from DB if available, otherwise getStylePath computes it
    const path = slug ? `/category/${encodeURIComponent(slug)}` : getStylePath(name);
    urls.push(
      renderUrl({
        loc: `${BASE}${path}`,
        changefreq: "weekly",
        priority: "0.6",
      }),
    );
  }

  // ── Listing pages ─────────────────────────────────────────────────────
  for (const listing of listingRows) {
    const cityPath = getCityPath(listing.city, listing.citySlug);
    const listingSlug = listing.slug || listing.id;
    urls.push(
      renderUrl({
        loc: `${BASE}${cityPath}/${listingSlug}`,
        changefreq: "weekly",
        priority: "0.7",
        lastmod: listing.lastUpdated,
      }),
    );
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
