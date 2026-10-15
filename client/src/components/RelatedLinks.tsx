import { Link } from "wouter";
import { ALL_INDIAN_CITIES, TIER_1_CITIES, VENUE_CATEGORIES, toSlug } from "@shared/constants";
import { getLocalitiesForCity } from "@shared/localities";

interface RelatedLinksProps {
  currentCitySlug?: string;
  currentLocalitySlug?: string;
  currentCategorySlug?: string;
}

export function RelatedLinks({ currentCitySlug, currentLocalitySlug, currentCategorySlug }: RelatedLinksProps) {
  const topCities = TIER_1_CITIES.slice(0, 10);
  const topCategories = VENUE_CATEGORIES.slice(0, 10);
  const localities = currentCitySlug ? getLocalitiesForCity(currentCitySlug) : [];
  const cityName = currentCitySlug ? currentCitySlug.charAt(0).toUpperCase() + currentCitySlug.slice(1) : "";

  return (
    <div className="bg-white border-t border-slate-200 py-16 mt-20" data-aeo="internal-link-mesh">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h3 className="text-2xl font-bold text-slate-900 mb-2 text-center font-serif">Explore Digital Out-of-Home Networks</h3>
        <p className="text-sm text-slate-500 text-center mb-12 max-w-2xl mx-auto">
          Crawlable directory of verified digital billboards, corporate tech parks, shopping malls, and transit screens across Indian metropolitan corridors.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Localities in Current City */}
          {localities.length > 0 && (
            <div className="lg:col-span-2 bg-slate-50 p-6 rounded-xl border border-slate-100">
              <h4 className="font-semibold text-base text-slate-900 mb-4 flex items-center justify-between">
                <span>Top Neighborhoods & Zones in {cityName}</span>
                <span className="text-xs text-blue-600 font-medium">{localities.length} Localities</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {localities.map(loc => {
                  const isCurrent = loc.slug === currentLocalitySlug;
                  return (
                    <Link
                      key={loc.slug}
                      href={`/${currentCitySlug}/${loc.slug}`}
                      className={`text-xs px-3 py-1.5 rounded-full transition-colors border ${
                        isCurrent
                          ? "bg-blue-600 text-white border-blue-600 font-semibold"
                          : "bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      {loc.name} DOOH
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top Indian Cities */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h4 className="font-semibold text-base text-slate-900 mb-4">
              Metro Cities
            </h4>
            <ul className="space-y-2 text-sm">
              {topCities.map(city => {
                const citySlug = toSlug(city);
                const isCurrent = citySlug === currentCitySlug && !currentLocalitySlug;
                return (
                  <li key={city}>
                    <Link
                      href={`/${citySlug}`}
                      className={`transition-colors block py-0.5 ${
                        isCurrent ? "font-semibold text-blue-600" : "text-slate-600 hover:text-blue-600"
                      }`}
                    >
                      {city} Digital Billboards
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Venue Categories */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h4 className="font-semibold text-base text-slate-900 mb-4">
              Screen Venue Formats
            </h4>
            <ul className="space-y-2 text-sm">
              {topCategories.map(cat => {
                const catSlug = toSlug(cat) + "-advertising";
                const isCurrent = catSlug === currentCategorySlug;
                const linkHref = currentCitySlug ? `/${currentCitySlug}/${catSlug}` : `/${catSlug}`;
                return (
                  <li key={cat}>
                    <Link
                      href={linkHref}
                      className={`transition-colors block py-0.5 ${
                        isCurrent ? "font-semibold text-blue-600" : "text-slate-600 hover:text-blue-600"
                      }`}
                    >
                      {cat} {currentCitySlug ? `in ${cityName}` : 'Advertising'}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Root Domain Authority Funnel Notice */}
        <div className="mt-12 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
          Powered by <a href="https://pixelspot.in" target="_blank" rel="noopener noreferrer" className="text-slate-600 hover:text-blue-600 underline">Pixelspot</a> and PixelOS Cloud CMS · Enterprise hardware, proof-of-play auditing, and programmatic media buying.
        </div>
      </div>
    </div>
  );
}
