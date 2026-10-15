import { Router } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { 
  generateCityPageSEO, 
  generateCategoryPageSEO, 
  generateCityCategoryPageSEO,
  generateLocalityPageSEO,
  generateScreenPageSEO,
  buildCrawlerHtml,
  injectSEO,
  SEOData
} from "./seo-generator";
import { 
  fromCitySlug, 
  fromVenueSlug, 
  ALL_INDIAN_CITIES, 
  VENUE_CATEGORIES,
  toSlug,
  normalizeCityName,
  normalizeVenueCategory
} from "@shared/constants";
import { findLocality, getLocalitiesForCity, matchesLocality, LocalityDef } from "@shared/localities";
import { generateSitemapXml } from "./sitemap";
import type { Screen } from "@shared/schema";

export const seoRouter = Router();

// Platform paths that must bypass the SEO catch-all router
const RESERVED_PATHS = [
  'api', 'admin', 'login', 'register', 'advertiser', 
  'agency', 'owner', 'screens', 'discover', 'auth',
  'privacy', 'terms', 'refund', 'contact', 'about',
  'verify-email', 'complete-profile', 'tickets', 'reset-password'
];

seoRouter.get("/robots.txt", (_req, res) => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /advertiser
Disallow: /agency
Disallow: /owner
Disallow: /api/

Sitemap: https://connect.pixelspot.in/sitemap.xml
`;
  res.type('text/plain');
  res.send(robots);
});

seoRouter.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const xml = await generateSitemapXml("https://connect.pixelspot.in");
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// Helper to check if a string is a valid city slug
const isValidCity = (slug: string): boolean => {
  const city = fromCitySlug(slug);
  if (!city) return false;
  const canonical = normalizeCityName(city);
  return ALL_INDIAN_CITIES.some(c => c.toLowerCase() === canonical.toLowerCase());
};

// Helper to check if a string is a valid category slug (e.g., "mall-advertising" or "cinema")
const isValidCategory = (slug: string): boolean => {
  const clean = slug.replace(/-advertising$/, '');
  const category = fromVenueSlug(clean);
  return !!(category && VENUE_CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase()));
};

/**
 * Resolves index.html template from dev or prod dist paths.
 */
let cachedTemplate: string | null = null;
const getIndexTemplate = async (): Promise<string> => {
  // In production, template doesn't change
  if (process.env.NODE_ENV === "production" && cachedTemplate) {
    return cachedTemplate;
  }

  const candidatePaths = [
    path.resolve(process.cwd(), "dist", "public", "index.html"),
    path.resolve(process.cwd(), "public", "index.html"),
    path.resolve(process.cwd(), "client", "index.html"),
  ];

  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = await fs.promises.readFile(p, "utf-8");
        if (content && content.includes("<div id=\"root\">")) {
          if (process.env.NODE_ENV === "production") cachedTemplate = content;
          return content;
        }
      }
    } catch {
      // try next path
    }
  }

  throw new Error("Unable to locate index.html template for SSR injection");
};

/**
 * GET /api/seo-page-data — API consumed by React client-side hydration on SEOLandingPage
 */
seoRouter.get("/api/seo-page-data", async (req, res) => {
  try {
    const { citySlug, localitySlug, categorySlug, screenSlug, slug } = req.query as Record<string, string | undefined>;
    let screens: Screen[] = [];
    let seoData: SEOData | null = null;

    // 1. Single Screen by Slug
    if (screenSlug) {
      const parts = screenSlug.split('-');
      const shortId = parts[parts.length - 1];
      if (shortId && shortId.length === 8) {
        const screen = await storage.getScreenByShortId(shortId);
        if (screen) {
          screens = [screen];
          seoData = generateScreenPageSEO(screen);
        } else {
          return res.status(404).json({ error: "Screen not found" });
        }
      }
    } 
    // 2. City + Locality (+ optional Category)
    else if (citySlug && localitySlug) {
      const city = fromCitySlug(citySlug);
      if (city) {
        const canonicalCity = normalizeCityName(city);
        const cityScreens = await storage.getScreensByCity(canonicalCity);
        const locality = findLocality(citySlug, localitySlug) || {
          name: localitySlug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
          slug: localitySlug,
          keywords: [localitySlug.replace(/-/g, ' ')]
        };

        let matched = cityScreens.filter(s => matchesLocality(s, locality));
        if (categorySlug) {
          const cat = fromVenueSlug(categorySlug.replace(/-advertising$/, ''));
          if (cat) {
            matched = matched.filter(s => s.venueCategory.toLowerCase() === cat.toLowerCase());
          }
        }

        screens = matched;
        seoData = generateLocalityPageSEO(canonicalCity, locality, matched);
      }
    }
    // 3. City + Category
    else if (citySlug && categorySlug) {
      const city = fromCitySlug(citySlug);
      const cat = fromVenueSlug(categorySlug.replace(/-advertising$/, ''));
      if (city && cat) {
        const canonicalCity = normalizeCityName(city);
        const cityScreens = await storage.getScreensByCity(canonicalCity);
        screens = cityScreens.filter(s => s.venueCategory.toLowerCase() === cat.toLowerCase());
        seoData = generateCityCategoryPageSEO(canonicalCity, cat, screens);
      }
    }
    // 4. City Hub
    else if (citySlug) {
      const city = fromCitySlug(citySlug);
      if (city) {
        const canonicalCity = normalizeCityName(city);
        screens = await storage.getScreensByCity(canonicalCity);
        seoData = generateCityPageSEO(canonicalCity, screens);
      }
    }
    // 5. Category Hub
    else if (categorySlug) {
      const cat = fromVenueSlug(categorySlug.replace(/-advertising$/, ''));
      if (cat) {
        screens = await storage.getScreensByCategory(cat);
        seoData = generateCategoryPageSEO(cat, screens);
      }
    }
    // 6. Generic single slug
    else if (slug) {
      if (isValidCity(slug)) {
        const city = fromCitySlug(slug)!;
        const canonicalCity = normalizeCityName(city);
        screens = await storage.getScreensByCity(canonicalCity);
        seoData = generateCityPageSEO(canonicalCity, screens);
      } else if (isValidCategory(slug)) {
        const cat = fromVenueSlug(slug.replace(/-advertising$/, ''))!;
        screens = await storage.getScreensByCategory(cat);
        seoData = generateCategoryPageSEO(cat, screens);
      }
    }

    if (!seoData) {
      return res.status(404).json({ error: "Page not found" });
    }

    const localities = citySlug ? getLocalitiesForCity(citySlug) : [];

    res.json({
      title: seoData.title,
      description: seoData.description,
      canonical: seoData.canonical,
      h1: seoData.h1,
      heroText: seoData.heroText,
      aeoAnswer: seoData.aeoAnswer,
      metrics: seoData.metrics,
      geoPassages: seoData.geoPassages,
      faqs: seoData.faqs,
      breadcrumbs: seoData.breadcrumbs,
      screens,
      localities,
    });
  } catch (err: any) {
    console.error("SEO page data error:", err);
    res.status(500).json({ error: "Failed to fetch SEO page data" });
  }
});

/**
 * SSR Handler for Individual Screens: /screens/:screenSlug
 */
seoRouter.get("/screens/:screenSlug", async (req, res, next) => {
  try {
    const { screenSlug } = req.params;
    const parts = screenSlug.split('-');
    const shortId = parts[parts.length - 1];
    
    if (!shortId || shortId.length !== 8) {
      return next(); // Let SPA handle if not a valid slug
    }

    const screen = await storage.getScreenByShortId(shortId);
    if (!screen) {
      return next();
    }

    const seoData = generateScreenPageSEO(screen);
    const template = await getIndexTemplate();
    const crawlerHtml = buildCrawlerHtml(seoData, [screen]);
    const finalHtml = injectSEO(template, seoData, crawlerHtml);

    res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
  } catch (err) {
    next(err);
  }
});

/**
 * SSR Catch-all Route for Hierarchical Programmatic SEO Pages:
 * - /:slug1 (City or Category)
 * - /:slug1/:slug2 (City + Locality OR City + Category)
 * - /:slug1/:slug2/:slug3 (City + Locality + Category)
 */
seoRouter.get("/:slug1/:slug2?/:slug3?", async (req, res, next) => {
  try {
    const { slug1, slug2, slug3 } = req.params;

    // Skip reserved application routes
    if (!slug1 || RESERVED_PATHS.includes(slug1.toLowerCase())) {
      return next();
    }

    const template = await getIndexTemplate();

    // =========================================================================
    // Case 1: City + Locality + Category (e.g. /bengaluru/indiranagar/cafe-advertising)
    // =========================================================================
    if (slug1 && slug2 && slug3 && isValidCity(slug1)) {
      const city = fromCitySlug(slug1)!;
      const canonicalCity = normalizeCityName(city);
      const locality = findLocality(slug1, slug2) || {
        name: slug2.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        slug: slug2,
        keywords: [slug2.replace(/-/g, ' ')]
      };
      const cat = fromVenueSlug(slug3.replace(/-advertising$/, ''));

      if (cat) {
        const cityScreens = await storage.getScreensByCity(canonicalCity);
        const localityScreens = cityScreens.filter(s => matchesLocality(s, locality));
        const catScreens = localityScreens.filter(s => s.venueCategory.toLowerCase() === cat.toLowerCase());
        const displayScreens = catScreens.length ? catScreens : localityScreens;

        const seoData = generateCityCategoryPageSEO(canonicalCity, `${locality.name} ${cat}`, displayScreens);
        const crawlerHtml = buildCrawlerHtml(seoData, displayScreens);
        const finalHtml = injectSEO(template, seoData, crawlerHtml);
        return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
      }
    }

    // =========================================================================
    // Case 2: City + Second Slug (e.g. /bengaluru/indiranagar OR /bengaluru/mall-advertising)
    // =========================================================================
    if (slug1 && slug2 && isValidCity(slug1)) {
      const city = fromCitySlug(slug1)!;
      const canonicalCity = normalizeCityName(city);
      const cityScreens = await storage.getScreensByCity(canonicalCity);

      // Sub-case 2A: City + Category (e.g. /bengaluru/mall-advertising)
      if (isValidCategory(slug2)) {
        const cat = fromVenueSlug(slug2.replace(/-advertising$/, ''))!;
        const catScreens = cityScreens.filter(s => s.venueCategory.toLowerCase() === cat.toLowerCase());
        const displayScreens = catScreens;

        const seoData = generateCityCategoryPageSEO(canonicalCity, cat, displayScreens);
        const crawlerHtml = buildCrawlerHtml(seoData, displayScreens);
        const finalHtml = injectSEO(template, seoData, crawlerHtml);
        return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
      }

      // Sub-case 2B: City + Locality (e.g. /bengaluru/indiranagar)
      const locality = findLocality(slug1, slug2) || {
        name: slug2.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        slug: slug2,
        keywords: [slug2.replace(/-/g, ' ')]
      };

      const localityScreens = cityScreens.filter(s => matchesLocality(s, locality));
      const displayScreens = localityScreens;

      const seoData = generateLocalityPageSEO(canonicalCity, locality, displayScreens);
      const crawlerHtml = buildCrawlerHtml(seoData, displayScreens);
      const finalHtml = injectSEO(template, seoData, crawlerHtml);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
    }

    // =========================================================================
    // Case 3: Just City (e.g. /bengaluru, /mumbai, /delhi)
    // =========================================================================
    if (slug1 && !slug2 && isValidCity(slug1)) {
      const city = fromCitySlug(slug1)!;
      const canonicalCity = normalizeCityName(city);
      const screens = await storage.getScreensByCity(canonicalCity);

      const seoData = generateCityPageSEO(canonicalCity, screens);
      const crawlerHtml = buildCrawlerHtml(seoData, screens);
      const finalHtml = injectSEO(template, seoData, crawlerHtml);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
    }

    // =========================================================================
    // Case 4: Just Category Nationwide (e.g. /mall-advertising, /cinema-advertising)
    // =========================================================================
    if (slug1 && !slug2 && isValidCategory(slug1)) {
      const cat = fromVenueSlug(slug1.replace(/-advertising$/, ''))!;
      const screens = await storage.getScreensByCategory(cat);

      const seoData = generateCategoryPageSEO(cat, screens);
      const crawlerHtml = buildCrawlerHtml(seoData, screens);
      const finalHtml = injectSEO(template, seoData, crawlerHtml);
      return res.status(200).set({ "Content-Type": "text/html; charset=utf-8" }).end(finalHtml);
    }

    // Not an SEO route — pass through to SPA router
    next();
  } catch (err) {
    next(err);
  }
});
