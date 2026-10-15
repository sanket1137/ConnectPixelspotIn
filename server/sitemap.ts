import type { Request, Response } from "express";
import { storage } from "./storage";
import { toSlug, VENUE_CATEGORIES, normalizeVenueCategory } from "@shared/constants";
import { TOP_LOCALITIES_BY_CITY } from "@shared/localities";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function renderSitemap(entries: SitemapEntry[]): string {
  const urls = entries
    .map(e => {
      const parts = [`    <loc>${escapeXml(e.loc)}</loc>`];
      if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
      if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
      if (typeof e.priority === "number") parts.push(`    <priority>${e.priority.toFixed(1)}</priority>`);
      return `  <url>\n${parts.join("\n")}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function generateSitemapXml(baseUrl: string = "https://connect.pixelspot.in"): Promise<string> {
  const { cities, cityVenues, lastUpdated } = await storage.getSitemapData();
  const lastmod = lastUpdated ? lastUpdated.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  const entries: SitemapEntry[] = [
    { loc: `${baseUrl}/`, lastmod, changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/about`, lastmod, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/contact`, lastmod, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/privacy`, lastmod, changefreq: "yearly", priority: 0.3 },
    { loc: `${baseUrl}/terms`, lastmod, changefreq: "yearly", priority: 0.3 },
    { loc: `${baseUrl}/refund`, lastmod, changefreq: "yearly", priority: 0.3 },
  ];

  const seenLocs = new Set<string>();
  seenLocs.add(`${baseUrl}/`);

  // 1. City Hub Pages: connect.pixelspot.in/{city}
  for (const city of cities) {
    const citySlug = toSlug(city);
    const loc = `${baseUrl}/${citySlug}`;
    if (!seenLocs.has(loc)) {
      seenLocs.add(loc);
      entries.push({
        loc,
        lastmod,
        changefreq: "daily",
        priority: 0.9,
      });
    }

    // 2. Locality Hub Pages: connect.pixelspot.in/{city}/{locality}
    const localities = TOP_LOCALITIES_BY_CITY[citySlug] || [];
    for (const locality of localities) {
      const locUrl = `${baseUrl}/${citySlug}/${locality.slug}`;
      if (!seenLocs.has(locUrl)) {
        seenLocs.add(locUrl);
        entries.push({
          loc: locUrl,
          lastmod,
          changefreq: "weekly",
          priority: 0.85,
        });
      }
    }
  }

  // 3. City + Category Pages: connect.pixelspot.in/{city}/{category}-advertising
  for (const { city, venueCategory } of cityVenues) {
    const citySlug = toSlug(city);
    const catSlug = `${toSlug(normalizeVenueCategory(venueCategory))}-advertising`;
    const loc = `${baseUrl}/${citySlug}/${catSlug}`;
    if (!seenLocs.has(loc)) {
      seenLocs.add(loc);
      entries.push({
        loc,
        lastmod,
        changefreq: "weekly",
        priority: 0.8,
      });
    }
  }

  // 4. Nationwide Category Hubs: connect.pixelspot.in/{category}-advertising
  for (const cat of VENUE_CATEGORIES) {
    const catSlug = `${toSlug(cat)}-advertising`;
    const loc = `${baseUrl}/${catSlug}`;
    if (!seenLocs.has(loc)) {
      seenLocs.add(loc);
      entries.push({
        loc,
        lastmod,
        changefreq: "weekly",
        priority: 0.75,
      });
    }
  }

  // 5. Individual Screen Pages: connect.pixelspot.in/screens/{screenSlug}
  try {
    const screens = await storage.getPublicScreens();
    for (const screen of screens) {
      if (screen.name) {
        const slug = `${toSlug(screen.name + "-" + (screen.city || ""))}-${screen.id.split('-')[0]}`;
        const loc = `${baseUrl}/screens/${slug}`;
        if (!seenLocs.has(loc)) {
          seenLocs.add(loc);
          entries.push({
            loc,
            lastmod,
            changefreq: "weekly",
            priority: 0.7,
          });
        }
      }
    }
  } catch (err) {
    // If public screens query fails, continue with hubs
  }

  return renderSitemap(entries);
}

/**
 * Express handler for /sitemap.xml
 */
export async function sitemapHandler(_req: Request, res: Response) {
  try {
    const xml = await generateSitemapXml("https://connect.pixelspot.in");
    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
    res.send(xml);
  } catch (error) {
    console.error("Error generating sitemap:", error);
    res.status(500).send("Error generating sitemap");
  }
}
