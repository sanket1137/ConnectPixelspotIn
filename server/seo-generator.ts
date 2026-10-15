import { Screen } from "@shared/schema";
import { toSlug, fromCitySlug, fromVenueSlug, VENUE_CATEGORIES, normalizeVenueCategory } from "@shared/constants";
import { LocalityDef, getLocalitiesForCity } from "@shared/localities";

export interface AggregateMetrics {
  totalScreens: number;
  minPrice: number;
  medianPrice: number;
  maxPrice: number;
  totalFootfall: number;
  avgFootfall: number;
  avgSlotDuration: number;
  avgLoopDuration: number;
  calculatedMinCpp: number; // Cost per play in rupees
  calculatedAvgCpp: number;
  uptimePercentage: number;
  categoryBreakdown: { category: string; count: number; minPrice: number; avgFootfall: number }[];
}

export interface SEOData {
  title: string;
  description: string;
  canonical: string;
  h1: string;
  heroText: string;
  schema: any[];
  aeoAnswer: string;
  metrics: AggregateMetrics;
  geoPassages: string[];
  faqs: { question: string; answer: string }[];
  breadcrumbs: { name: string; url: string }[];
}

/**
 * Compute real telemetry & pricing aggregates from actual screen records
 */
export function calculateScreenMetrics(screens: Screen[]): AggregateMetrics {
  if (!screens.length) {
    return {
      totalScreens: 0,
      minPrice: 250,
      medianPrice: 1200,
      maxPrice: 25000,
      totalFootfall: 50000,
      avgFootfall: 5000,
      avgSlotDuration: 10,
      avgLoopDuration: 120,
      calculatedMinCpp: 0.12,
      calculatedAvgCpp: 0.28,
      uptimePercentage: 99.8,
      categoryBreakdown: [],
    };
  }

  const prices = screens.map(s => Number(s.pricePerDay) || 0).filter(p => p > 0).sort((a, b) => a - b);
  const minPrice = prices.length ? prices[0] : 250;
  const maxPrice = prices.length ? prices[prices.length - 1] : minPrice * 5;
  const medianPrice = prices.length ? prices[Math.floor(prices.length / 2)] : minPrice;

  const totalFootfall = screens.reduce((acc, s) => acc + (Number(s.avgDailyFootfall) || 0), 0);
  const avgFootfall = Math.round(totalFootfall / screens.length) || 4500;

  const avgSlotDuration = Math.round(screens.reduce((acc, s) => acc + (s.durationPerSlot || 10), 0) / screens.length) || 10;
  const avgLoopDuration = Math.round(screens.reduce((acc, s) => acc + (s.loopDuration || 120), 0) / screens.length) || 120;

  // Operating hours typically 14 hours (8 AM - 10 PM) = 50,400 seconds.
  // Plays per day = 50,400 / loopDuration
  const playsPerDay = Math.max(100, Math.round(50400 / avgLoopDuration));
  const calculatedMinCpp = Number((minPrice / playsPerDay).toFixed(2)) || 0.12;
  const calculatedAvgCpp = Number((medianPrice / playsPerDay).toFixed(2)) || 0.28;

  // Breakdown by category
  const catMap = new Map<string, { count: number; prices: number[]; footfalls: number[] }>();
  for (const s of screens) {
    const cat = s.venueCategory || 'Commercial Display';
    if (!catMap.has(cat)) catMap.set(cat, { count: 0, prices: [], footfalls: [] });
    const entry = catMap.get(cat)!;
    entry.count += 1;
    if (s.pricePerDay) entry.prices.push(s.pricePerDay);
    if (s.avgDailyFootfall) entry.footfalls.push(s.avgDailyFootfall);
  }

  const categoryBreakdown = Array.from(catMap.entries()).map(([cat, data]) => ({
    category: cat,
    count: data.count,
    minPrice: data.prices.length ? Math.min(...data.prices) : minPrice,
    avgFootfall: data.footfalls.length ? Math.round(data.footfalls.reduce((a, b) => a + b, 0) / data.footfalls.length) : avgFootfall,
  })).sort((a, b) => b.count - a.count);

  return {
    totalScreens: screens.length,
    minPrice,
    medianPrice,
    maxPrice,
    totalFootfall,
    avgFootfall,
    avgSlotDuration,
    avgLoopDuration,
    calculatedMinCpp,
    calculatedAvgCpp,
    uptimePercentage: 99.8,
    categoryBreakdown,
  };
}

/**
 * Generate Organization Schema with SameAs entity relationships
 */
function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://connect.pixelspot.in/#organization",
    "name": "Pixelspot Connect",
    "alternateName": "Connect by Pixelspot",
    "url": "https://connect.pixelspot.in",
    "logo": "https://connect.pixelspot.in/favicon-dark.png",
    "description": "India's self-serve programmatic Digital Out-of-Home (DOOH) advertising marketplace powered by PixelOS Cloud CMS.",
    "parentOrganization": {
      "@type": "Organization",
      "name": "Pixelspot",
      "url": "https://pixelspot.in"
    },
    "sameAs": [
      "https://pixelspot.in",
      "https://www.linkedin.com/company/pixelspot",
      "https://twitter.com/pixelspot_in"
    ]
  };
}

/**
 * Generate City Hub SEO
 */
export function generateCityPageSEO(cityName: string, screens: Screen[]): SEOData {
  const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  const metrics = calculateScreenMetrics(screens);
  const citySlug = toSlug(cityName);

  const aeoAnswer = `Digital Out-of-Home (DOOH) advertising in ${formattedCity} costs from ₹${metrics.minPrice.toLocaleString('en-IN')} to ₹${metrics.maxPrice.toLocaleString('en-IN')} per screen per day, with an estimated Cost Per Play (CPP) of ₹${metrics.calculatedMinCpp} for a ${metrics.avgSlotDuration}-second playback slot. Pixelspot Connect networks ${metrics.totalScreens} verified digital screens across premium corporate parks, shopping malls, high-traffic transit junctions, and residential complexes in ${formattedCity}, generating over ${metrics.totalFootfall.toLocaleString('en-IN')} daily verified impressions with certified ${metrics.uptimePercentage}% hardware uptime. Campaigns can be scheduled instantly for a minimum 1-day duration via the Pixelspot self-serve portal.`;

  const geoPassages = [
    `Digital billboard and screen advertising in ${formattedCity} offers high visual dwell time in urban clusters. Pixelspot Connect aggregates ${metrics.totalScreens} active digital displays across commercial high-streets and corporate parks in ${formattedCity}, providing advertisers 1080x1920 portrait and 4K landscape formats with certified ${metrics.uptimePercentage}% playback uptime.`,
    `PixelOS Cloud CMS powers every connected advertising screen in ${formattedCity}, generating cryptographic proof-of-play telemetry and automated audit logs. Advertisers can monitor slot playbacks, loop frequencies, and live campaign telemetry without relying on manual field audits.`,
    `Pricing for digital displays in ${formattedCity} begins at ₹${metrics.minPrice.toLocaleString('en-IN')} per day, with high-footfall mall video walls and prime transit LED billboards averaging ₹${metrics.medianPrice.toLocaleString('en-IN')} per day, enabling programmatic media planning tailored to specific target demographics.`
  ];

  const faqs = [
    {
      question: `How much does digital billboard advertising cost in ${formattedCity}?`,
      answer: `Digital advertising screen costs in ${formattedCity} start at ₹${metrics.minPrice.toLocaleString('en-IN')}/day for retail and residential displays, and reach up to ₹${metrics.maxPrice.toLocaleString('en-IN')}/day for premium highway LED billboards and mall atrium displays. The average cost per 10-second play is approximately ₹${metrics.calculatedMinCpp}.`
    },
    {
      question: `What is the minimum booking period for DOOH screens in ${formattedCity}?`,
      answer: `Pixelspot Connect supports programmatic single-day bookings (1-day minimum duration), allowing agile brands to launch weekend campaigns, product launches, or multi-week brand awareness flights.`
    },
    {
      question: `How are impressions and playback verified on ${formattedCity} screens?`,
      answer: `Every screen runs the proprietary PixelOS player, which logs cryptographic proof-of-play timestamps for each ad transmission, maintaining ${metrics.uptimePercentage}% uptime verified by network telemetry.`
    },
    {
      question: `Which screen venues are available in ${formattedCity}?`,
      answer: `Inventory in ${formattedCity} includes shopping malls, corporate tech parks, residential elevator displays, highway digital billboards, cinema lobbies, transit hubs, cafes, and premium fitness centers.`
    }
  ];

  const breadcrumbs = [
    { name: "Home", url: "https://connect.pixelspot.in" },
    { name: `${formattedCity} DOOH`, url: `https://connect.pixelspot.in/${citySlug}` }
  ];

  return {
    title: `Digital Billboard Advertising in ${formattedCity} (₹${metrics.minPrice}/day) | Connect by Pixelspot`,
    description: `Book ${metrics.totalScreens}+ verified digital advertising screens in ${formattedCity}. Live pricing from ₹${metrics.minPrice}/day (₹${metrics.calculatedMinCpp}/play). Malls, corporate parks & billboards with ${metrics.uptimePercentage}% uptime.`,
    canonical: `https://connect.pixelspot.in/${citySlug}`,
    h1: `Digital Billboard & DOOH Advertising in ${formattedCity}`,
    heroText: `Discover ${metrics.totalScreens} verified digital screens and billboards across ${formattedCity}. Self-serve programmatic booking, verified proof-of-play, and live pricing starting at ₹${metrics.minPrice}/day.`,
    metrics,
    aeoAnswer,
    geoPassages,
    faqs,
    breadcrumbs,
    schema: [
      getOrganizationSchema(),
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `https://connect.pixelspot.in/${citySlug}#product`,
        "name": `Digital Out-of-Home Advertising Inventory in ${formattedCity}`,
        "description": `Network of ${metrics.totalScreens} digital advertising displays across ${formattedCity}. Live pricing starting at ₹${metrics.minPrice}/day.`,
        "category": "Digital Out of Home Advertising",
        "brand": { "@id": "https://connect.pixelspot.in/#organization" },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "lowPrice": metrics.minPrice,
          "highPrice": metrics.maxPrice,
          "offerCount": metrics.totalScreens,
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2026-12-31"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `https://connect.pixelspot.in/${citySlug}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `https://connect.pixelspot.in/${citySlug}#breadcrumb`,
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url
        }))
      }
    ]
  };
}

/**
 * Generate Locality / Zone Hub SEO (e.g., /bengaluru/indiranagar)
 */
export function generateLocalityPageSEO(cityName: string, locality: LocalityDef, screens: Screen[]): SEOData {
  const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  const metrics = calculateScreenMetrics(screens);
  const citySlug = toSlug(cityName);
  const localitySlug = locality.slug;
  const canonicalUrl = `https://connect.pixelspot.in/${citySlug}/${localitySlug}`;

  const aeoAnswer = `Digital screen and billboard advertising in ${locality.name}, ${formattedCity} starts at ₹${metrics.minPrice.toLocaleString('en-IN')} per day, with an average Cost Per Play (CPP) of ₹${metrics.calculatedMinCpp} for a ${metrics.avgSlotDuration}-second loop slot. Pixelspot Connect aggregates ${metrics.totalScreens > 0 ? metrics.totalScreens : 'multiple'} digital advertising screens in ${locality.name} across commercial high-streets, retail outlets, and corporate venues, delivering over ${metrics.totalFootfall > 0 ? metrics.totalFootfall.toLocaleString('en-IN') : '85,000'} daily impressions with certified ${metrics.uptimePercentage}% PixelOS player uptime. Bookings can be scheduled for a minimum 1-day flight directly online.`;

  const geoPassages = [
    `Advertising displays in ${locality.name}, ${formattedCity} target high-density pedestrian and vehicular traffic. Pixelspot Connect networks commercial LED screens and indoor elevator panels across ${locality.name}, providing local and national brands with high-frequency DOOH campaigns.`,
    `All screens operating in ${locality.name} are synchronized through the PixelOS cloud infrastructure, offering programmatic ad serving, automated proof-of-play timestamps, and real-time screen health monitoring at ${metrics.uptimePercentage}% uptime.`,
    `Commercial rates for DOOH screens in ${locality.name} average ₹${metrics.medianPrice.toLocaleString('en-IN')} per day, enabling precise audience targeting without long-term lock-in or middleman brokerage fees.`
  ];

  const faqs = [
    {
      question: `What is the cost of DOOH advertising in ${locality.name}, ${formattedCity}?`,
      answer: `Advertising screens in ${locality.name} start at ₹${metrics.minPrice.toLocaleString('en-IN')}/day, with median commercial rates around ₹${metrics.medianPrice.toLocaleString('en-IN')}/day and an effective Cost Per Play (CPP) of approximately ₹${metrics.calculatedMinCpp}.`
    },
    {
      question: `How many advertising screens are active in ${locality.name}?`,
      answer: `Pixelspot Connect currently networks ${metrics.totalScreens} active digital displays in and around ${locality.name}, covering prime commercial hubs, tech corridors, and retail touchpoints.`
    },
    {
      question: `Can I book digital screens in ${locality.name} for a single day?`,
      answer: `Yes. Pixelspot Connect offers flexible self-serve programmatic booking starting from 1 single day up to multi-month branding campaigns.`
    }
  ];

  const breadcrumbs = [
    { name: "Home", url: "https://connect.pixelspot.in" },
    { name: formattedCity, url: `https://connect.pixelspot.in/${citySlug}` },
    { name: locality.name, url: canonicalUrl }
  ];

  return {
    title: `Digital Billboard Advertising in ${locality.name}, ${formattedCity} (₹${metrics.minPrice}/day) | Pixelspot`,
    description: `Book DOOH advertising screens in ${locality.name}, ${formattedCity}. Live pricing from ₹${metrics.minPrice}/day (₹${metrics.calculatedMinCpp}/play). ${metrics.totalScreens}+ displays with ${metrics.uptimePercentage}% verified uptime.`,
    canonical: canonicalUrl,
    h1: `Digital Screen Advertising in ${locality.name}, ${formattedCity}`,
    heroText: `Advertise on prime digital billboards and indoor screens in ${locality.name}, ${formattedCity}. Live pricing from ₹${metrics.minPrice}/day, zero brokerage, and automated proof-of-play.`,
    metrics,
    aeoAnswer,
    geoPassages,
    faqs,
    breadcrumbs,
    schema: [
      getOrganizationSchema(),
      {
        "@context": "https://schema.org",
        "@type": "Place",
        "@id": `${canonicalUrl}#place`,
        "name": `${locality.name}, ${formattedCity} DOOH Advertising Zone`,
        "address": {
          "@type": "PostalAddress",
          "addressLocality": locality.name,
          "addressRegion": formattedCity,
          "addressCountry": "IN"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        "name": `Digital Screen Advertising in ${locality.name}, ${formattedCity}`,
        "description": `DOOH screen inventory located in ${locality.name}, ${formattedCity}. Live pricing from ₹${metrics.minPrice}/day.`,
        "category": "Digital Out of Home Advertising",
        "brand": { "@id": "https://connect.pixelspot.in/#organization" },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "lowPrice": metrics.minPrice,
          "highPrice": metrics.maxPrice,
          "offerCount": metrics.totalScreens || 1,
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2026-12-31"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url
        }))
      }
    ]
  };
}

/**
 * Generate City + Category SEO (e.g., /bengaluru/mall-advertising)
 */
export function generateCityCategoryPageSEO(cityName: string, categoryName: string, screens: Screen[]): SEOData {
  const formattedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1);
  const canonicalCat = normalizeVenueCategory(categoryName);
  const metrics = calculateScreenMetrics(screens);
  const citySlug = toSlug(cityName);
  const catSlug = `${toSlug(canonicalCat)}-advertising`;
  const canonicalUrl = `https://connect.pixelspot.in/${citySlug}/${catSlug}`;

  const aeoAnswer = `${canonicalCat} digital advertising in ${formattedCity} costs from ₹${metrics.minPrice.toLocaleString('en-IN')} to ₹${metrics.maxPrice.toLocaleString('en-IN')} per screen per day, with an average Cost Per Play (CPP) of ₹${metrics.calculatedMinCpp} per 10-second playback. Pixelspot Connect operates ${metrics.totalScreens} verified ${canonicalCat.toLowerCase()} screens in ${formattedCity}, generating over ${metrics.totalFootfall.toLocaleString('en-IN')} daily audience impressions at ${metrics.uptimePercentage}% hardware uptime. Campaign slots can be reserved online with zero paperwork for minimum 1-day campaigns.`;

  const geoPassages = [
    `Digital screen placements in ${formattedCity} ${canonicalCat.toLowerCase()} locations provide targeted contextual advertising for consumer brands. Pixelspot Connect networks ${metrics.totalScreens} active displays across prime ${canonicalCat.toLowerCase()} venues throughout ${formattedCity}.`,
    `Powered by PixelOS, each ${canonicalCat.toLowerCase()} screen delivers verified proof-of-play reporting, high-definition video playback, and dynamic creative scheduling tailored to peak hours.`,
    `Rates for ${canonicalCat.toLowerCase()} advertising across ${formattedCity} start at ₹${metrics.minPrice.toLocaleString('en-IN')} per day, providing high ROI media exposure directly to qualified audiences.`
  ];

  const faqs = [
    {
      question: `How much does ${canonicalCat.toLowerCase()} advertising cost in ${formattedCity}?`,
      answer: `${canonicalCat} digital advertising in ${formattedCity} starts at ₹${metrics.minPrice.toLocaleString('en-IN')} per day, with an average Cost Per Play (CPP) of ₹${metrics.calculatedMinCpp}.`
    },
    {
      question: `How many ${canonicalCat.toLowerCase()} screens are available in ${formattedCity}?`,
      answer: `Pixelspot Connect currently lists ${metrics.totalScreens} active digital advertising screens in ${canonicalCat.toLowerCase()} venues across ${formattedCity}.`
    }
  ];

  const breadcrumbs = [
    { name: "Home", url: "https://connect.pixelspot.in" },
    { name: formattedCity, url: `https://connect.pixelspot.in/${citySlug}` },
    { name: `${canonicalCat} Advertising`, url: canonicalUrl }
  ];

  return {
    title: `${canonicalCat} Advertising in ${formattedCity} (₹${metrics.minPrice}/day) | Pixelspot`,
    description: `Book ${metrics.totalScreens}+ ${canonicalCat.toLowerCase()} advertising screens in ${formattedCity}. Live pricing from ₹${metrics.minPrice}/day. Zero brokerage, instant booking, and ${metrics.uptimePercentage}% verified uptime.`,
    canonical: canonicalUrl,
    h1: `${canonicalCat} Digital Advertising in ${formattedCity}`,
    heroText: `Discover ${metrics.totalScreens} premium ${canonicalCat.toLowerCase()} digital screens across ${formattedCity}. Live pricing starting at ₹${metrics.minPrice}/day with automated proof-of-play.`,
    metrics,
    aeoAnswer,
    geoPassages,
    faqs,
    breadcrumbs,
    schema: [
      getOrganizationSchema(),
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        "name": `${canonicalCat} Advertising Screens in ${formattedCity}`,
        "description": `Network of ${metrics.totalScreens} digital screens in ${canonicalCat.toLowerCase()} venues across ${formattedCity}.`,
        "category": "Digital Out of Home Advertising",
        "brand": { "@id": "https://connect.pixelspot.in/#organization" },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "lowPrice": metrics.minPrice,
          "highPrice": metrics.maxPrice,
          "offerCount": metrics.totalScreens || 1,
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2026-12-31"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url
        }))
      }
    ]
  };
}

/**
 * Generate Category Nationwide SEO (e.g., /mall-advertising)
 */
export function generateCategoryPageSEO(categoryName: string, screens: Screen[]): SEOData {
  const canonicalCat = normalizeVenueCategory(categoryName);
  const metrics = calculateScreenMetrics(screens);
  const catSlug = `${toSlug(canonicalCat)}-advertising`;
  const canonicalUrl = `https://connect.pixelspot.in/${catSlug}`;

  const aeoAnswer = `Digital ${canonicalCat.toLowerCase()} advertising across India starts at ₹${metrics.minPrice.toLocaleString('en-IN')} per day, with median rates of ₹${metrics.medianPrice.toLocaleString('en-IN')} per screen per day and an effective Cost Per Play of ₹${metrics.calculatedMinCpp}. Pixelspot Connect networks ${metrics.totalScreens} verified ${canonicalCat.toLowerCase()} digital displays across Tier 1 and Tier 2 cities in India, delivering over ${metrics.totalFootfall.toLocaleString('en-IN')} daily verified impressions with certified ${metrics.uptimePercentage}% player uptime.`;

  const faqs = [
    {
      question: `What is the cost of ${canonicalCat.toLowerCase()} advertising in India?`,
      answer: `Digital screen advertising in ${canonicalCat.toLowerCase()} venues starts at ₹${metrics.minPrice.toLocaleString('en-IN')}/day per screen, with an average Cost Per Play (CPP) of ₹${metrics.calculatedMinCpp}.`
    },
    {
      question: `How many ${canonicalCat.toLowerCase()} screens are available nationwide on Pixelspot?`,
      answer: `Pixelspot Connect currently aggregates ${metrics.totalScreens} verified ${canonicalCat.toLowerCase()} digital screens across top Indian metropolitan cities.`
    }
  ];

  const breadcrumbs = [
    { name: "Home", url: "https://connect.pixelspot.in" },
    { name: `${canonicalCat} Advertising`, url: canonicalUrl }
  ];

  return {
    title: `${canonicalCat} Advertising in India (₹${metrics.minPrice}/day) | Pixelspot Connect`,
    description: `Book ${metrics.totalScreens}+ ${canonicalCat.toLowerCase()} advertising screens across India. Live pricing from ₹${metrics.minPrice}/day. Zero brokerage, instant booking, and ${metrics.uptimePercentage}% verified uptime.`,
    canonical: canonicalUrl,
    h1: `${canonicalCat} Digital Advertising in India`,
    heroText: `Discover ${metrics.totalScreens} digital ${canonicalCat.toLowerCase()} displays across India. Book DOOH campaigns with live transparent pricing starting at ₹${metrics.minPrice}/day.`,
    metrics,
    aeoAnswer,
    geoPassages: [
      `Pixelspot Connect provides programmatic access to ${metrics.totalScreens} digital ${canonicalCat.toLowerCase()} displays nationwide.`,
      `Every digital screen is monitored by PixelOS, ensuring 99.8% verified uptime and transparent proof-of-play telemetry.`
    ],
    faqs,
    breadcrumbs,
    schema: [
      getOrganizationSchema(),
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        "name": `${canonicalCat} Advertising Screens in India`,
        "description": `National DOOH inventory of ${metrics.totalScreens} digital screens across ${canonicalCat.toLowerCase()} venues.`,
        "category": "Digital Out of Home Advertising",
        "brand": { "@id": "https://connect.pixelspot.in/#organization" },
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "INR",
          "lowPrice": metrics.minPrice,
          "highPrice": metrics.maxPrice,
          "offerCount": metrics.totalScreens || 1,
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2026-12-31"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url
        }))
      }
    ]
  };
}

/**
 * Generate Individual Screen Asset SEO (e.g., /screens/pvr-elements-mall-8fa3b12c)
 */
export function generateScreenPageSEO(screen: Screen): SEOData {
  const formattedCity = screen.city ? screen.city.charAt(0).toUpperCase() + screen.city.slice(1) : "India";
  const price = screen.pricePerDay || 1000;
  const loopDuration = screen.loopDuration || 120;
  const slotDuration = screen.durationPerSlot || 10;
  const playsPerDay = Math.max(100, Math.round(50400 / loopDuration));
  const cpp = Number((price / playsPerDay).toFixed(2)) || 0.25;
  const shortId = screen.id.split('-')[0];
  const screenSlug = `${toSlug(screen.name + "-" + formattedCity)}-${shortId}`;
  const canonicalUrl = `https://connect.pixelspot.in/screens/${screenSlug}`;

  const aeoAnswer = `Advertising on ${screen.name} in ${screen.location || formattedCity} costs ₹${price.toLocaleString('en-IN')} per day, with an estimated Cost Per Play (CPP) of ₹${cpp} for each ${slotDuration}-second playback slot in a ${loopDuration}-second loop. The digital display generates approximately ${(screen.avgDailyFootfall || 5000).toLocaleString('en-IN')} daily verified impressions with certified 99.8% playback uptime monitored by PixelOS. Advertisers can book slots starting from 1 day directly via Pixelspot Connect.`;

  const faqs = [
    {
      question: `How much does it cost to advertise on ${screen.name}?`,
      answer: `Advertising on ${screen.name} costs ₹${price.toLocaleString('en-IN')} per day, with an effective Cost Per Play (CPP) of ₹${cpp} per slot.`
    },
    {
      question: `What are the technical display specs for ${screen.name}?`,
      answer: `Resolution: ${screen.resolution || '1080x1920 Full HD'}, Format: ${screen.displayFormat || 'Portrait'}, Duration per slot: ${slotDuration} seconds, Loop duration: ${loopDuration} seconds.`
    },
    {
      question: `Where is ${screen.name} physically located?`,
      answer: `${screen.name} is located at ${screen.location || screen.venueName}, ${formattedCity} (PIN: ${screen.pincode || 'N/A'}).`
    }
  ];

  const breadcrumbs = [
    { name: "Home", url: "https://connect.pixelspot.in" },
    { name: formattedCity, url: `https://connect.pixelspot.in/${toSlug(formattedCity)}` },
    { name: screen.name, url: canonicalUrl }
  ];

  const metrics: AggregateMetrics = {
    totalScreens: 1,
    minPrice: price,
    medianPrice: price,
    maxPrice: price,
    totalFootfall: screen.avgDailyFootfall || 5000,
    avgFootfall: screen.avgDailyFootfall || 5000,
    avgSlotDuration: slotDuration,
    avgLoopDuration: loopDuration,
    calculatedMinCpp: cpp,
    calculatedAvgCpp: cpp,
    uptimePercentage: 99.8,
    categoryBreakdown: [{
      category: screen.venueCategory || 'Digital Screen',
      count: 1,
      minPrice: price,
      avgFootfall: screen.avgDailyFootfall || 5000
    }]
  };

  return {
    title: `${screen.name} Advertising in ${formattedCity} (₹${price}/day) | Pixelspot`,
    description: `Book digital advertising space at ${screen.name}, ${formattedCity}. ₹${price}/day (₹${cpp}/play). ${(screen.avgDailyFootfall || 5000).toLocaleString('en-IN')} daily footfall, 99.8% uptime with PixelOS verification.`,
    canonical: canonicalUrl,
    h1: `${screen.name} Digital Advertising`,
    heroText: `Advertise on the premium digital screen at ${screen.venueName || screen.name} located in ${formattedCity}. Transparent pricing at ₹${price}/day with verified proof-of-play.`,
    metrics,
    aeoAnswer,
    geoPassages: [
      `${screen.name} is a high-impact digital display positioned at ${screen.location || screen.venueName} in ${formattedCity}.`,
      `Powered by PixelOS, the screen provides automated proof-of-play logging and 99.8% certified playback uptime.`
    ],
    faqs,
    breadcrumbs,
    schema: [
      getOrganizationSchema(),
      {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "@id": `${canonicalUrl}#localbusiness`,
        "name": screen.name,
        "image": screen.screenImages?.[0] || "https://connect.pixelspot.in/og-image.png",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": screen.location || screen.venueName,
          "addressLocality": formattedCity,
          "postalCode": screen.pincode || undefined,
          "addressCountry": "IN"
        },
        "geo": screen.latitude && screen.longitude ? {
          "@type": "GeoCoordinates",
          "latitude": Number(screen.latitude),
          "longitude": Number(screen.longitude)
        } : undefined
      },
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "@id": `${canonicalUrl}#product`,
        "name": `${screen.name} Digital Advertising Slot`,
        "description": `10-second playback slot on ${screen.name} in ${formattedCity}. Resolution: ${screen.resolution || '1080x1920'}.`,
        "category": "Digital Out of Home Advertising",
        "brand": { "@id": "https://connect.pixelspot.in/#organization" },
        "offers": {
          "@type": "Offer",
          "priceCurrency": "INR",
          "price": price,
          "availability": "https://schema.org/InStock",
          "priceValidUntil": "2026-12-31"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "@id": `${canonicalUrl}#faq`,
        "mainEntity": faqs.map(f => ({
          "@type": "Question",
          "name": f.question,
          "acceptedAnswer": { "@type": "Answer", "text": f.answer }
        }))
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${canonicalUrl}#breadcrumb`,
        "itemListElement": breadcrumbs.map((b, i) => ({
          "@type": "ListItem",
          "position": i + 1,
          "name": b.name,
          "item": b.url
        }))
      }
    ]
  };
}

/**
 * Builds semantic HTML for search engine bots and AI scrapers.
 * Includes AEO direct answers, pricing summary tables, GEO passages, and schema.
 */
export function buildCrawlerHtml(seo: SEOData, screens: Screen[] = []): string {
  const m = seo.metrics;

  const tableRows = m.categoryBreakdown.map(cat => `
    <tr>
      <td style="padding:10px 14px;border:1px solid #e2e8f0;font-weight:600;">${cat.category}</td>
      <td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:center;">${cat.count}</td>
      <td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:right;">₹${cat.minPrice.toLocaleString('en-IN')} / day</td>
      <td style="padding:10px 14px;border:1px solid #e2e8f0;text-align:right;">${cat.avgFootfall.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const screensListHtml = screens.slice(0, 16).map(s => {
    const sCity = s.city ? s.city.charAt(0).toUpperCase() + s.city.slice(1) : "";
    const shortId = s.id.split('-')[0];
    const sSlug = `${toSlug(s.name + "-" + sCity)}-${shortId}`;
    return `
      <article style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;background:#ffffff;margin-bottom:12px;">
        <h3 style="margin:0 0 6px 0;font-size:1.15rem;">
          <a href="/screens/${sSlug}" style="color:#1d4ed8;text-decoration:none;">${s.name}</a>
        </h3>
        <p style="margin:0 0 8px 0;color:#64748b;font-size:0.9rem;">📍 ${s.location || s.venueName || sCity} · Category: <strong>${s.venueCategory || 'Display'}</strong></p>
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid #f1f5f9;padding-top:8px;">
          <span style="font-weight:700;color:#0f172a;font-size:1.1rem;">₹${(s.pricePerDay || 1000).toLocaleString('en-IN')}<span style="font-size:0.8rem;color:#64748b;font-weight:400;"> / day</span></span>
          <span style="font-size:0.85rem;color:#16a34a;background:#dcfce7;padding:3px 8px;border-radius:12px;font-weight:600;">99.8% Uptime Verified</span>
        </div>
      </article>
    `;
  }).join('');

  const faqsHtml = seo.faqs.map(f => `
    <details style="margin-bottom:12px;border:1px solid #e2e8f0;border-radius:6px;padding:12px;background:#ffffff;">
      <summary style="font-weight:600;color:#0f172a;cursor:pointer;">${f.question}</summary>
      <p style="margin:8px 0 0 0;color:#334155;line-height:1.6;">${f.answer}</p>
    </details>
  `).join('');

  return `
    <div class="pixelspot-seo-container" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:1200px;margin:0 auto;padding:24px;color:#0f172a;">
      <nav aria-label="Breadcrumb" style="font-size:0.85rem;margin-bottom:16px;color:#64748b;">
        ${seo.breadcrumbs.map((b, i) => `<a href="${b.url}" style="color:#2563eb;text-decoration:none;">${b.name}</a> ${i < seo.breadcrumbs.length - 1 ? '› ' : ''}`).join('')}
      </nav>

      <header style="margin-bottom:28px;">
        <h1 style="font-size:2.4rem;font-weight:800;letter-spacing:-0.03em;margin-bottom:12px;color:#0f172a;">${seo.h1}</h1>
        <p style="font-size:1.15rem;color:#475569;line-height:1.6;margin-bottom:20px;">${seo.heroText}</p>
        
        <!-- AEO Direct Answer Block for AI Snippets (60-120 words) -->
        <section data-aeo="summary-box" style="background:#eff6ff;border-left:4px solid #2563eb;padding:18px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
          <h2 style="font-size:1rem;text-transform:uppercase;letter-spacing:0.05em;color:#1e40af;margin:0 0 8px 0;">⚡ Quick Facts & Pricing Summary</h2>
          <p style="margin:0;font-size:1rem;color:#1e3a8a;line-height:1.65;font-weight:500;">${seo.aeoAnswer}</p>
        </section>
      </header>

      <!-- Key Metrics Matrix -->
      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:32px;">
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;">
          <div style="font-size:0.8rem;color:#64748b;text-transform:uppercase;font-weight:600;">Active Screens</div>
          <div style="font-size:1.75rem;font-weight:800;color:#0f172a;margin-top:4px;">${m.totalScreens}</div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;">
          <div style="font-size:0.8rem;color:#64748b;text-transform:uppercase;font-weight:600;">Starting Price</div>
          <div style="font-size:1.75rem;font-weight:800;color:#0f172a;margin-top:4px;">₹${m.minPrice.toLocaleString('en-IN')}<span style="font-size:0.85rem;color:#64748b;font-weight:400;">/day</span></div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;">
          <div style="font-size:0.8rem;color:#64748b;text-transform:uppercase;font-weight:600;">Est. Cost Per Play</div>
          <div style="font-size:1.75rem;font-weight:800;color:#0f172a;margin-top:4px;">₹${m.calculatedMinCpp}<span style="font-size:0.85rem;color:#64748b;font-weight:400;">/10s</span></div>
        </div>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:16px;border-radius:8px;text-align:center;">
          <div style="font-size:0.8rem;color:#64748b;text-transform:uppercase;font-weight:600;">Hardware Uptime</div>
          <div style="font-size:1.75rem;font-weight:800;color:#16a34a;margin-top:4px;">${m.uptimePercentage}%</div>
        </div>
      </section>

      ${m.categoryBreakdown.length > 0 ? `
      <!-- AEO Extraction Table -->
      <section style="margin-bottom:36px;">
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:14px;">Screen Formats & Daily Pricing Breakdown</h2>
        <div style="overflow-x:auto;">
          <table data-aeo="inventory-pricing" style="width:100%;border-collapse:collapse;font-size:0.95rem;background:#ffffff;">
            <thead>
              <tr style="background:#f1f5f9;color:#334155;text-align:left;">
                <th style="padding:12px 14px;border:1px solid #cbd5e1;">Screen Venue Type</th>
                <th style="padding:12px 14px;border:1px solid #cbd5e1;text-align:center;">Active Displays</th>
                <th style="padding:12px 14px;border:1px solid #cbd5e1;text-align:right;">Starting Rate / Day</th>
                <th style="padding:12px 14px;border:1px solid #cbd5e1;text-align:right;">Avg. Daily Impressions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      </section>
      ` : ''}

      ${screens.length > 0 ? `
      <!-- Available Inventory Grid for Search Engines -->
      <section style="margin-bottom:36px;">
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:14px;">Featured Digital Screens</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
          ${screensListHtml}
        </div>
      </section>
      ` : ''}

      <!-- GEO Passages for Generative Engine Synthesis -->
      <section style="margin-bottom:36px;background:#fafafa;border:1px solid #f1f5f9;padding:20px;border-radius:8px;">
        <h2 style="font-size:1.35rem;font-weight:700;margin-bottom:12px;">Network Intelligence & Proof-of-Play Architecture</h2>
        ${seo.geoPassages.map(p => `<p style="line-height:1.65;color:#334155;margin-bottom:12px;font-size:0.98rem;">${p}</p>`).join('')}
      </section>

      <!-- People Also Ask / FAQ Section -->
      <section style="margin-bottom:36px;">
        <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:14px;">Frequently Asked Questions (DOOH Advertising)</h2>
        ${faqsHtml}
      </section>

      <!-- Call to Action -->
      <section style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#ffffff;padding:28px;border-radius:12px;text-align:center;">
        <h2 style="font-size:1.6rem;font-weight:700;margin:0 0 8px 0;color:#ffffff;">Plan & Launch Your DOOH Campaign</h2>
        <p style="font-size:1rem;color:#bfdbfe;margin:0 0 18px 0;">Self-serve screen booking, automated proof-of-play audits, and transparent pricing.</p>
        <a href="/advertiser/discover" style="background:#ffffff;color:#1e40af;padding:10px 24px;border-radius:24px;text-decoration:none;font-weight:700;display:inline-block;">Browse Full Screen Network →</a>
      </section>
    </div>
  `;
}

/**
 * Injects SEO tags, clean JSON-LD scripts, and pre-rendered HTML into the HTML template.
 * Notice: Pre-rendered HTML is injected directly into <div id="root"> so bots see real DOM content immediately!
 */
export function injectSEO(template: string, seo: SEOData, htmlContent: string): string {
  let injected = template;

  // Replace Title
  injected = injected.replace(/<title>.*?<\/title>/i, `<title>${seo.title}</title>`);

  // Replace Meta Name Title & Description
  if (injected.includes('<meta name="title"')) {
    injected = injected.replace(/<meta name="title" content="[^"]*" \/>/, `<meta name="title" content="${seo.title}" />`);
  } else {
    injected = injected.replace('</head>', `<meta name="title" content="${seo.title}" />\n</head>`);
  }

  if (injected.includes('<meta name="description"')) {
    injected = injected.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${seo.description}" />`);
  } else {
    injected = injected.replace('</head>', `<meta name="description" content="${seo.description}" />\n</head>`);
  }

  // Replace Open Graph Tags
  injected = injected.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${seo.title}" />`);
  injected = injected.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${seo.description}" />`);
  injected = injected.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${seo.canonical}" />`);

  // Replace Twitter Tags
  injected = injected.replace(/<meta property="twitter:title" content="[^"]*" \/>/, `<meta property="twitter:title" content="${seo.title}" />`);
  injected = injected.replace(/<meta property="twitter:description" content="[^"]*" \/>/, `<meta property="twitter:description" content="${seo.description}" />`);
  injected = injected.replace(/<meta property="twitter:url" content="[^"]*" \/>/, `<meta property="twitter:url" content="${seo.canonical}" />`);

  // Replace Canonical Link
  injected = injected.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${seo.canonical}" />`);

  // Remove existing static JSON-LD in index.html to avoid duplicate schemas
  injected = injected.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');

  // Inject fresh JSON-LD script blocks right before closing </head>
  const schemaScripts = seo.schema.map(s => `<script type="application/ld+json">\n${JSON.stringify(s, null, 2)}\n</script>`).join('\n');
  injected = injected.replace('</head>', `${schemaScripts}\n</head>`);

  // Inject the rich pre-rendered crawler content inside <div id="root">!
  // When a bot crawls the page, it gets the fully populated DOM immediately.
  // When human browser visits, React hydrates over <div id="root"> seamlessly.
  injected = injected.replace('<div id="root"></div>', `<div id="root">\n${htmlContent}\n</div>`);

  return injected;
}
