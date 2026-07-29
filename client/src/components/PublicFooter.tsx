import { Link } from "wouter";
import logo from "@assets/pixelspot-logo.png";
import { TIER_1_CITIES, VENUE_CATEGORIES, toSlug } from "@shared/constants";

interface PublicFooterProps {
  platformStats?: any;
}

export function PublicFooter({ platformStats }: PublicFooterProps) {

  // Use top 8 cities for SEO links
  const topCities = TIER_1_CITIES.slice(0, 8);
  // Use top 8 categories for SEO links
  const topCategories = VENUE_CATEGORIES.slice(0, 8);

  return (
    <footer className="bg-gray-900 text-white pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <img src={logo} alt="Pixelspot" className="h-8 w-auto mb-4 brightness-0 invert" />
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              India's hyperlocal digital screen advertising platform. Helping local businesses reach their customers where they live, work and shop.
            </p>
            <div className="text-xs text-gray-500 space-y-1">
              <p>PIXELSPOT SOLUTIONS PVT LTD</p>
              <p>CIN: U26103KA2025PTC201293 · GSTIN: 29AAPCP6653G1ZT</p>
            </div>
            {platformStats && (
              <p className="text-xs text-blue-400 font-medium mt-3">
                {platformStats.totalPhysicalScreens?.toLocaleString()}+ screens across {platformStats.totalCities}+ cities
              </p>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5 text-white">Quick Links</h4>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Find Screens', href: '/screens' },
                { label: 'List Your Screen', href: '/register?role=screen_owner' },
                { label: 'Start Advertising', href: '/register?role=advertiser' },
                { label: 'Sign In', href: '/login' },
              ].map(l => (
                <Link key={l.href} href={l.href}>
                  <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">{l.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5 text-white">Cities We Cover</h4>
            <div className="flex flex-col gap-3">
              {topCities.map(city => (
                <Link key={city} href={`/${toSlug(city)}`}>
                  <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                    Outdoor Advertising in {city}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-5 text-white">Popular Inventory</h4>
            <div className="flex flex-col gap-3">
              {[
                { city: 'Bengaluru', cat: 'Mall' },
                { city: 'Mumbai', cat: 'Cinema' },
                { city: 'Delhi', cat: 'Metro' },
                { city: 'Hyderabad', cat: 'Corporate Park' },
                { city: 'Pune', cat: 'Airport' },
                { city: 'Chennai', cat: 'Transit Hub' },
              ].map(({ city, cat }) => (
                <Link key={`${city}-${cat}`} href={`/${toSlug(city)}/${toSlug(cat)}-advertising`}>
                  <span className="text-sm text-gray-400 hover:text-white transition-colors cursor-pointer">
                    Advertising in {cat}s in {city}
                  </span>
                </Link>
              ))}
              <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">
                <p className="text-sm text-gray-400">contact@pixelspot.in</p>
                <p className="text-sm text-gray-400">+91 72048 08334</p>
                <p className="text-sm text-gray-400">Bengaluru, Karnataka</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">© 2025 PIXELSPOT SOLUTIONS PRIVATE LIMITED. All rights reserved.</p>
          <div className="flex items-center gap-5">
            {[{ label: 'Privacy', href: '/privacy' }, { label: 'Terms', href: '/terms' }, { label: 'Refunds', href: '/refund' }].map(l => (
              <Link key={l.href} href={l.href}>
                <span className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer">{l.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
