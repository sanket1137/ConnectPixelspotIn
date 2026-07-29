import { storage } from "./storage";
import { ALL_INDIAN_CITIES, VENUE_CATEGORIES, toSlug } from "@shared/constants";

export async function generateSitemapXml(baseUrl: string): Promise<string> {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n`;

  const addUrl = (path: string, priority: string, changefreq: string) => {
    xml += `  <url>\\n`;
    xml += `    <loc>${baseUrl}${path}</loc>\\n`;
    xml += `    <changefreq>${changefreq}</changefreq>\\n`;
    xml += `    <priority>${priority}</priority>\\n`;
    xml += `  </url>\\n`;
  };

  // Add static root
  addUrl('/', '1.0', 'daily');
  
  // Add active cities
  const screens = await storage.getPublicScreens();
  const activeCities = new Set(screens.map(s => s.city));
  
  for (const city of activeCities) {
    if (city) {
      addUrl(`/${toSlug(city)}`, '0.9', 'daily');
    }
  }

  // Add active categories
  const activeCategories = new Set(screens.map(s => s.venueCategory));
  for (const cat of activeCategories) {
    if (cat) {
      addUrl(`/${toSlug(cat)}-advertising`, '0.9', 'daily');
    }
  }

  // Add city + category combinations
  const activeCityCategories = new Set(screens.map(s => `${s.city}|${s.venueCategory}`));
  for (const cityCat of activeCityCategories) {
    const [city, cat] = cityCat.split('|');
    if (city && cat) {
      addUrl(`/${toSlug(city)}/${toSlug(cat)}-advertising`, '0.8', 'weekly');
    }
  }

  // Add individual screens
  for (const screen of screens) {
    const slug = `${toSlug(screen.name + "-" + (screen.city || ""))}-${screen.id.split('-')[0]}`;
    addUrl(`/screens/${slug}`, '0.7', 'weekly');
  }

  xml += `</urlset>`;
  return xml;
}
