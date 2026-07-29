import { Screen } from "@shared/schema";
import { toSlug, fromCitySlug, fromVenueSlug, VENUE_CATEGORIES } from "@shared/constants";

export interface SEOData {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  heroText: string;
  schema: any[];
}

export function generateCityPageSEO(cityName: string, screenCount: number): SEOData {
  const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  return {
    title: `Digital Billboard Advertising in ${formattedCity} | Connect by PixelSpot`,
    description: `Advertise on premium digital screens in ${formattedCity}. Discover shopping malls, cinemas, corporate offices and outdoor LED billboards available through Connect by PixelSpot.`,
    canonical: `https://connect.pixelspot.in/${toSlug(cityName)}`,
    h1: `Digital Billboard Advertising in ${formattedCity}`,
    heroText: `Discover premium digital advertising screens across malls, cinemas, corporate offices and outdoor locations in ${formattedCity}.`,
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://connect.pixelspot.in" },
          { "@type": "ListItem", "position": 2, "name": formattedCity, "item": `https://connect.pixelspot.in/${toSlug(cityName)}` }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": `How much does digital billboard advertising cost in ${formattedCity}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `Campaign budgets vary depending on screen type, location and duration in ${formattedCity}. You can discover available screens and build a campaign that fits your marketing budget on Connect.` }
          },
          {
            "@type": "Question",
            "name": `Which malls offer digital advertising in ${formattedCity}?`,
            "acceptedAnswer": { "@type": "Answer", "text": `You can discover available inventory across premium shopping malls, cinemas, corporate campuses, cafés, and restaurants in ${formattedCity} through our platform.` }
          },
          {
            "@type": "Question",
            "name": "How do I book a DOOH campaign?",
            "acceptedAnswer": { "@type": "Answer", "text": "Simply search for screens, add them to your campaign, choose your campaign duration, upload your creative and complete your booking through the platform." }
          }
        ]
      }
    ]
  };
}

export function generateCategoryPageSEO(categoryName: string, screenCount: number): SEOData {
  return {
    title: `${categoryName} Advertising | Connect by PixelSpot`,
    description: `Discover premium ${categoryName.toLowerCase()} digital advertising screens across India. Book DOOH campaigns easily with Connect by PixelSpot.`,
    canonical: `https://connect.pixelspot.in/${toSlug(categoryName)}-advertising`,
    h1: `${categoryName} Advertising`,
    heroText: `Discover premium ${categoryName.toLowerCase()} digital advertising screens available across India.`,
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://connect.pixelspot.in" },
          { "@type": "ListItem", "position": 2, "name": `${categoryName} Advertising`, "item": `https://connect.pixelspot.in/${toSlug(categoryName)}-advertising` }
        ]
      }
    ]
  };
}

export function generateCityCategoryPageSEO(cityName: string, categoryName: string, screenCount: number): SEOData {
  const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  return {
    title: `${categoryName} Advertising in ${formattedCity} | Connect by PixelSpot`,
    description: `Advertise on premium ${categoryName.toLowerCase()} digital screens in ${formattedCity}. Launch your DOOH campaign easily with Connect by PixelSpot.`,
    canonical: `https://connect.pixelspot.in/${toSlug(cityName)}/${toSlug(categoryName)}-advertising`,
    h1: `${categoryName} Advertising in ${formattedCity}`,
    heroText: `Discover premium ${categoryName.toLowerCase()} digital advertising screens in ${formattedCity}.`,
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://connect.pixelspot.in" },
          { "@type": "ListItem", "position": 2, "name": formattedCity, "item": `https://connect.pixelspot.in/${toSlug(cityName)}` },
          { "@type": "ListItem", "position": 3, "name": `${categoryName} Advertising`, "item": `https://connect.pixelspot.in/${toSlug(cityName)}/${toSlug(categoryName)}-advertising` }
        ]
      }
    ]
  };
}

export function generateScreenPageSEO(screen: Screen): SEOData {
  const formattedCity = screen.city ? screen.city.charAt(0).toUpperCase() + screen.city.slice(1) : "India";
  return {
    title: `${screen.name} Digital Advertising in ${formattedCity} | Connect by PixelSpot`,
    description: `Book digital advertising space at ${screen.name} in ${formattedCity}. Reach your target audience with premium DOOH screens on Connect by PixelSpot.`,
    canonical: `https://connect.pixelspot.in/screens/${toSlug(screen.name + "-" + formattedCity)}-${screen.id.split('-')[0]}`,
    h1: `${screen.name} Digital Advertising`,
    heroText: `Advertise on the premium digital screen at ${screen.name} located in ${formattedCity}.`,
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://connect.pixelspot.in" },
          { "@type": "ListItem", "position": 2, "name": formattedCity, "item": `https://connect.pixelspot.in/${toSlug(formattedCity)}` },
          { "@type": "ListItem", "position": 3, "name": screen.name, "item": `https://connect.pixelspot.in/screens/${toSlug(screen.name + "-" + formattedCity)}-${screen.id.split('-')[0]}` }
        ]
      },
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": screen.name,
        "image": screen.screenImages?.[0] || "",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": formattedCity,
          "addressCountry": "IN"
        },
        "geo": screen.latitude && screen.longitude ? {
          "@type": "GeoCoordinates",
          "latitude": screen.latitude,
          "longitude": screen.longitude
        } : undefined
      }
    ]
  };
}

export function injectSEO(template: string, seo: SEOData, htmlContent: string): string {
  // Replace title
  let injected = template.replace(/<title>.*?<\/title>/i, `<title>${seo.title}</title>`);
  
  // Replace meta title and description
  injected = injected.replace(/<meta name="title" content="[^"]*" \/>/, `<meta name="title" content="${seo.title}" />`);
  injected = injected.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${seo.description}" />`);
  
  // Replace OG tags
  injected = injected.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${seo.title}" />`);
  injected = injected.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${seo.description}" />`);
  injected = injected.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${seo.canonical}" />`);
  
  // Replace canonical
  injected = injected.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${seo.canonical}" />`);
  
  // Inject schemas before closing </head>
  const schemaScripts = seo.schema.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\\n');
  injected = injected.replace('</head>', `${schemaScripts}\\n</head>`);
  
  // Inject HTML content into a crawler-friendly div right inside the body, so React can hydrate or replace it.
  const seoContainer = `<div id="seo-content" style="display:none;" aria-hidden="true">${htmlContent}</div>`;
  injected = injected.replace('<body>', `<body>\\n${seoContainer}`);
  
  return injected;
}
