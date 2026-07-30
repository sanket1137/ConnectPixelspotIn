import { Link } from "wouter";
import { ALL_INDIAN_CITIES, TIER_1_CITIES, VENUE_CATEGORIES, toSlug } from "@shared/constants";

interface RelatedLinksProps {
  currentCitySlug?: string;
  currentCategorySlug?: string;
}

export function RelatedLinks({ currentCitySlug, currentCategorySlug }: RelatedLinksProps) {
  // Select some top cities for internal linking
  const topCities = TIER_1_CITIES.slice(0, 8);
  // Select some top categories
  const topCategories = VENUE_CATEGORIES.slice(0, 8);

  return (
    <div className="bg-white border-t border-gray-100 py-16 mt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-10 text-center">Explore More Advertising Locations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Related Cities */}
          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-6 flex items-center">
              Top Cities
            </h4>
            <ul className="space-y-3">
              {topCities.map(city => {
                const citySlug = toSlug(city);
                if (citySlug === currentCitySlug) return null;
                return (
                  <li key={city}>
                    <Link href={`/${citySlug}`} className="text-gray-600 hover:text-blue-600 transition-colors inline-block">
                      Advertising in {city}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Related Categories */}
          <div>
            <h4 className="font-semibold text-lg text-gray-900 mb-6 flex items-center">
              Popular Categories
            </h4>
            <ul className="space-y-3">
              {topCategories.map(cat => {
                const catSlug = toSlug(cat) + "-advertising";
                if (catSlug === currentCategorySlug) return null;
                return (
                  <li key={cat}>
                    <Link href={`/${catSlug}`} className="text-gray-600 hover:text-blue-600 transition-colors inline-block">
                      {cat} Advertising
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* City + Category specific */}
          {currentCitySlug && (
            <div>
              <h4 className="font-semibold text-lg text-gray-900 mb-6 flex items-center">
                Top Categories in {currentCitySlug.charAt(0).toUpperCase() + currentCitySlug.slice(1)}
              </h4>
              <ul className="space-y-3">
                {topCategories.slice(0, 6).map(cat => {
                  const catSlug = toSlug(cat) + "-advertising";
                  if (catSlug === currentCategorySlug) return null;
                  return (
                    <li key={cat}>
                      <Link href={`/${currentCitySlug}/${catSlug}`} className="text-gray-600 hover:text-blue-600 transition-colors inline-block">
                        {cat} in {currentCitySlug.charAt(0).toUpperCase() + currentCitySlug.slice(1)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
