import type { Request, Response } from "express";
import { storage } from "./storage";
import { toSlug } from "@shared/constants";

/**
 * Resolve the public base URL of the site.
 * Priority: BASE_URL env → request Host header → production default.
 */
function getBaseUrl(req: Request): string {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol || "https";
  const host = (req.headers["x-forwarded-host"] as string) || req.get("host");
  if (host) return `${proto}://${host}`;
  return "https://connect.pixelspot.in";
}

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
    { loc: `${baseUrl}/discover-screens`, lastmod, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/about-us`, lastmod, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/contact-us`, lastmod, changefreq: "monthly", priority: 0.5 },
    { loc: `${baseUrl}/privacy-policy`, lastmod, changefreq: "yearly", priority: 0.3 },
    { loc: `${baseUrl}/terms-of-service`, lastmod, changefreq: "yearly", priority: 0.3 },
    { loc: `${baseUrl}/refund-policy`, lastmod, changefreq: "yearly", priority: 0.3 },
  ];

  for (const city of cities) {
    entries.push({
      loc: `${baseUrl}/city/${toSlug(city)}`,
      lastmod,
      changefreq: "weekly",
      priority: 0.8,
    });
  }

  for (const { city, venueCategory } of cityVenues) {
    entries.push({
      loc: `${baseUrl}/city/${toSlug(city)}/${toSlug(venueCategory)}`,
      lastmod,
      changefreq: "weekly",
      priority: 0.7,
    });
  }

  try {
    const screens = await storage.getPublicScreens();
    for (const screen of screens) {
      if (screen.name) {
        const slug = `${toSlug(screen.name + "-" + (screen.city || ""))}-${screen.id.split('-')[0]}`;
        entries.push({
          loc: `${baseUrl}/screens/${slug}`,
          lastmod,
          changefreq: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    // Ignore error if getPublicScreens fails
  }

  return renderSitemap(entries);
}

/**
 * GET /sitemap.xml — dynamic sitemap including static routes + city + city/venue landing pages.
 */
export async function serveSitemap(req: Request, res: Response): Promise<void> {
  try {
    const baseUrl = getBaseUrl(req);
    const xml = await generateSitemapXml(baseUrl);
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600, stale-while-revalidate=7200");
    res.send(xml);
  } catch (error) {
    console.error("[sitemap] Failed to generate sitemap.xml:", error);
    res.status(500).set("Content-Type", "application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n`,
    );
  }
}

/**
 * GET /robots.txt — production-aware robots.txt that points crawlers to our sitemap
 * and disallows private/admin areas.
 */
export function serveRobotsTxt(req: Request, res: Response): void {
  const baseUrl = getBaseUrl(req);
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "Disallow: /profile",
    "Disallow: /settings",
    "Disallow: /manage-",
    "Disallow: /owner/",
    "Disallow: /advertiser/",
    "Disallow: /agency/",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
    "",
  ].join("\n");
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.set("Cache-Control", "public, max-age=3600");
  res.send(body);
}
