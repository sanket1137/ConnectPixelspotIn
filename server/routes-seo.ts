import { Router } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { 
  generateCityPageSEO, 
  generateCategoryPageSEO, 
  generateCityCategoryPageSEO,
  generateScreenPageSEO,
  injectSEO
} from "./seo-generator";
import { 
  fromCitySlug, 
  fromVenueSlug, 
  ALL_INDIAN_CITIES, 
  VENUE_CATEGORIES,
  toSlug,
  normalizeCityName
} from "@shared/constants";
import { generateSitemapXml } from "./sitemap";

export const seoRouter = Router();

const RESERVED_PATHS = [
  'api', 'admin', 'login', 'register', 'advertiser', 
  'agency', 'owner', 'screens', 'discover', 'auth'
];

seoRouter.get("/robots.txt", (req, res) => {
  const robots = `User-agent: *\\nAllow: /\\n\\nSitemap: https://connect.pixelspot.in/sitemap.xml`;
  res.type('text/plain');
  res.send(robots);
});

seoRouter.get("/sitemap.xml", async (req, res, next) => {
  try {
    const xml = await generateSitemapXml("https://connect.pixelspot.in");
    res.type('application/xml');
    res.send(xml);
  } catch (err) {
    next(err);
  }
});

// Helper to check if a string is a valid city
const isValidCity = (slug: string) => {
  const city = fromCitySlug(slug);
  if (!city) return false;
  const canonical = normalizeCityName(city);
  return ALL_INDIAN_CITIES.some(c => c.toLowerCase() === canonical.toLowerCase());
};

// Helper to check if a string is a valid category
const isValidCategory = (slug: string) => {
  if (!slug.endsWith('-advertising')) return false;
  const categoryBase = slug.replace('-advertising', '');
  const category = fromVenueSlug(categoryBase);
  return category && VENUE_CATEGORIES.some(c => c.toLowerCase() === category.toLowerCase());
};

const getIndexTemplate = async (): Promise<string> => {
  const clientTemplate = path.resolve(
    process.cwd(),
    "client",
    "index.html",
  );
  try {
    return await fs.promises.readFile(clientTemplate, "utf-8");
  } catch (err) {
    const distTemplate = path.resolve(process.cwd(), "public", "index.html");
    return await fs.promises.readFile(distTemplate, "utf-8");
  }
};

seoRouter.get("/api/seo-page-data", async (req, res) => {
  try {
    const { citySlug, categorySlug, screenSlug } = req.query;
    let screens = [];
    let title = "";
    let description = "";

    if (screenSlug && typeof screenSlug === 'string') {
      const parts = screenSlug.split('-');
      const shortId = parts[parts.length - 1];
      if (shortId && shortId.length === 8) {
        const screen = await storage.getScreenByShortId(shortId);
        if (screen) {
          screens = [screen];
          title = screen.name;
          description = screen.description || '';
        } else {
          return res.status(404).json({ error: "Screen not found" });
        }
      }
    } else if (citySlug && categorySlug && typeof citySlug === 'string' && typeof categorySlug === 'string') {
      const city = fromCitySlug(citySlug);
      const category = fromVenueSlug(categorySlug.replace('-advertising', ''));
      if (city && category) {
        const canonicalCity = normalizeCityName(city);
        const cityScreens = await storage.getScreensByCity(canonicalCity);
        screens = cityScreens.filter(s => s.venueCategory.toLowerCase() === category.toLowerCase());
        title = `${category} Advertising in ${canonicalCity}`;
        description = `Discover ${screens.length} ${category} screens in ${canonicalCity}.`;
      }
    } else if (citySlug && typeof citySlug === 'string') {
      const city = fromCitySlug(citySlug);
      if (city) {
        const canonicalCity = normalizeCityName(city);
        screens = await storage.getScreensByCity(canonicalCity);
        title = `Advertising in ${canonicalCity}`;
        description = `Discover ${screens.length} screens in ${canonicalCity}.`;
      }
    } else if (categorySlug && typeof categorySlug === 'string') {
      const category = fromVenueSlug(categorySlug.replace('-advertising', ''));
      if (category) {
        screens = await storage.getScreensByCategory(category);
        title = `${category} Advertising`;
        description = `Discover ${screens.length} ${category} screens.`;
      }
    }

    res.json({ title, description, screens });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch SEO data" });
  }
});

seoRouter.get("/screens/:screenSlug", async (req, res, next) => {
  try {
    const { screenSlug } = req.params;
    // Extract short ID from the end of the slug
    const parts = screenSlug.split('-');
    const shortId = parts[parts.length - 1];
    
    if (!shortId || shortId.length !== 8) {
      return next(); // Not a valid screen slug format, let SPA handle
    }

    const screen = await storage.getScreenByShortId(shortId);
    if (!screen) {
      return next();
    }

    const seoData = generateScreenPageSEO(screen);
    const template = await getIndexTemplate();
    
    // Generate basic HTML for crawler
    const htmlContent = `
      <header>
        <h1>${seoData.h1}</h1>
        <p>${seoData.heroText}</p>
      </header>
      <main>
        <article>
          <h2>About ${screen.name}</h2>
          <p>Location: ${screen.location}, ${screen.city}</p>
          <p>Category: ${screen.category}</p>
          <p>Description: ${screen.description || 'Premium digital advertising screen.'}</p>
        </article>
      </main>
    `;

    const finalHtml = injectSEO(template, seoData, htmlContent);
    res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
  } catch (err) {
    next(err);
  }
});

seoRouter.get("/:slug1/:slug2?", async (req, res, next) => {
  try {
    const { slug1, slug2 } = req.params;
    console.log("SEO Router matched:", { slug1, slug2 });

    if (RESERVED_PATHS.includes(slug1.toLowerCase())) {
      console.log("Path is reserved, skipping SEO");
      return next();
    }

    const template = await getIndexTemplate();

    // Case 1: City + Category (/bangalore/mall-advertising)
    if (slug1 && slug2 && isValidCity(slug1) && isValidCategory(slug2)) {
      const city = fromCitySlug(slug1)!;
      const canonicalCity = normalizeCityName(city);
      const category = fromVenueSlug(slug2.replace('-advertising', ''))!;
      
      const screens = await storage.getScreensByCity(canonicalCity);
      const categoryScreens = screens.filter(s => s.venueCategory.toLowerCase() === category.toLowerCase());
      
      const seoData = generateCityCategoryPageSEO(canonicalCity, category, categoryScreens.length);
      
      const htmlContent = `
        <header>
          <h1>${seoData.h1}</h1>
          <p>${seoData.heroText}</p>
        </header>
        <main>
          <h2>Available Screens (${categoryScreens.length})</h2>
          <ul>
            ${categoryScreens.map(s => `<li><a href="/screens/${toSlug(s.name + "-" + (s.city||""))}-${s.id.split('-')[0]}">${s.name}</a></li>`).join('')}
          </ul>
        </main>
      `;

      const finalHtml = injectSEO(template, seoData, htmlContent);
      return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
    }

    // Case 2: Just City (/bangalore)
    if (slug1 && !slug2 && isValidCity(slug1)) {
      const city = fromCitySlug(slug1)!;
      const canonicalCity = normalizeCityName(city);
      const screens = await storage.getScreensByCity(canonicalCity);
      
      const seoData = generateCityPageSEO(canonicalCity, screens.length);
      
      const htmlContent = `
        <header>
          <h1>${seoData.h1}</h1>
          <p>${seoData.heroText}</p>
        </header>
        <main>
          <h2>Available Screens in ${city} (${screens.length})</h2>
          <ul>
            ${screens.map(s => `<li><a href="/screens/${toSlug(s.name + "-" + (s.city||""))}-${s.id.split('-')[0]}">${s.name}</a></li>`).join('')}
          </ul>
        </main>
      `;

      const finalHtml = injectSEO(template, seoData, htmlContent);
      return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
    }

    // Case 3: Just Category (/mall-advertising)
    if (slug1 && !slug2 && isValidCategory(slug1)) {
      const category = fromVenueSlug(slug1.replace('-advertising', ''))!;
      const screens = await storage.getScreensByCategory(category);
      
      const seoData = generateCategoryPageSEO(category, screens.length);
      
      const htmlContent = `
        <header>
          <h1>${seoData.h1}</h1>
          <p>${seoData.heroText}</p>
        </header>
        <main>
          <h2>Available Screens for ${category} (${screens.length})</h2>
          <ul>
            ${screens.map(s => `<li><a href="/screens/${toSlug(s.name + "-" + (s.city||""))}-${s.id.split('-')[0]}">${s.name}</a></li>`).join('')}
          </ul>
        </main>
      `;

      const finalHtml = injectSEO(template, seoData, htmlContent);
      return res.status(200).set({ "Content-Type": "text/html" }).end(finalHtml);
    }

    // If it doesn't match our dynamic SEO routes, pass to SPA
    next();
  } catch (err) {
    next(err);
  }
});
