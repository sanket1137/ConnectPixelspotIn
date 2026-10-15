import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PublicFooter } from "@/components/PublicFooter";
import ScreenCard from "@/components/ScreenCard";
import { Loader2, ArrowRight, ShieldCheck, Zap, Activity, Monitor, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { RelatedLinks } from "@/components/RelatedLinks";
import { useState } from "react";

export default function SEOLandingPage() {
  const [matchScreen, paramsScreen] = useRoute("/screens/:screenSlug");
  const [matchTri, paramsTri] = useRoute("/:citySlug/:localitySlug/:categorySlug");
  const [matchBi, paramsBi] = useRoute("/:citySlug/:localityOrCategorySlug");
  const [matchSingle, paramsSingle] = useRoute("/:slug");

  let citySlug = "";
  let localitySlug = "";
  let categorySlug = "";
  let screenSlug = "";
  let singleSlug = "";

  if (matchScreen && paramsScreen) {
    screenSlug = paramsScreen.screenSlug;
  } else if (matchTri && paramsTri) {
    citySlug = paramsTri.citySlug;
    localitySlug = paramsTri.localitySlug;
    categorySlug = paramsTri.categorySlug;
  } else if (matchBi && paramsBi) {
    citySlug = paramsBi.citySlug;
    const second = paramsBi.localityOrCategorySlug;
    if (second.endsWith("-advertising")) {
      categorySlug = second;
    } else {
      localitySlug = second;
    }
  } else if (matchSingle && paramsSingle) {
    singleSlug = paramsSingle.slug;
    if (singleSlug.endsWith("-advertising")) {
      categorySlug = singleSlug;
    } else {
      citySlug = singleSlug;
    }
  }

  const { data, isLoading } = useQuery({
    queryKey: ["seo-page-data", citySlug, localitySlug, categorySlug, screenSlug, singleSlug],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (screenSlug) params.set("screenSlug", screenSlug);
      if (citySlug) params.set("citySlug", citySlug);
      if (localitySlug) params.set("localitySlug", localitySlug);
      if (categorySlug) params.set("categorySlug", categorySlug);
      if (singleSlug && !citySlug && !categorySlug) params.set("slug", singleSlug);

      const res = await fetch(`/api/seo-page-data?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch page data");
      return res.json();
    },
    enabled: !!(screenSlug || citySlug || localitySlug || categorySlug || singleSlug)
  });

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const metrics = data?.metrics || {
    totalScreens: data?.screens?.length || 0,
    minPrice: 500,
    calculatedMinCpp: 0.15,
    uptimePercentage: 99.8,
    categoryBreakdown: []
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Header />
      
      <main className="flex-1">
        {/* Breadcrumb Navigation */}
        {data?.breadcrumbs && (
          <div className="bg-slate-900 border-b border-slate-800 py-3 px-6 md:px-12">
            <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-400">
              {data.breadcrumbs.map((b: any, i: number) => (
                <span key={b.url} className="flex items-center gap-2">
                  <Link href={b.url.replace("https://connect.pixelspot.in", "") || "/"} className="hover:text-blue-400 transition-colors">
                    {b.name}
                  </Link>
                  {i < data.breadcrumbs.length - 1 && <span className="text-slate-600">›</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-blue-950 text-white pt-16 pb-20 px-6 md:px-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_70%)] pointer-events-none" />
          
          <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-medium mb-6">
              <Zap className="w-3.5 h-3.5 text-blue-400" />
              <span>Programmatic DOOH Marketplace · Verified Proof-of-Play</span>
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-white leading-tight font-serif">
              {data?.h1 || data?.title || "Digital Advertising Screens"}
            </h1>
            <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
              {data?.heroText || data?.description || "Discover verified digital screens across India with transparent pricing and live availability."}
            </p>

            {/* AEO Citation-First Direct Answer Box (Optimized for AI Overviews & Featured Snippets) */}
            {data?.aeoAnswer && (
              <div 
                data-aeo="summary-box" 
                className="bg-blue-950/60 border border-blue-800/80 rounded-xl p-5 md:p-6 text-left mb-10 shadow-lg backdrop-blur-sm max-w-3xl mx-auto"
              >
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Activity className="w-4 h-4" />
                  <span>Verified Market Pricing & Overview</span>
                </div>
                <p className="text-blue-100 text-sm md:text-base leading-relaxed font-normal">
                  {data.aeoAnswer}
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/advertiser/discover">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-base font-semibold shadow-xl shadow-blue-900/30">
                  Explore Interactive Screen Map <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Live Telemetry KPI Matrix */}
        <section className="max-w-7xl mx-auto px-4 md:px-8 -mt-8 relative z-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Inventory</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">{metrics.totalScreens} Displays</div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Starting Rate</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">₹{metrics.minPrice.toLocaleString('en-IN')}<span className="text-xs text-slate-400 font-normal">/day</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Est. Cost Per Play</div>
              <div className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">₹{metrics.calculatedMinCpp}<span className="text-xs text-slate-400 font-normal">/10s</span></div>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm text-center">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hardware Uptime</div>
              <div className="text-2xl md:text-3xl font-bold text-emerald-600 mt-1">{metrics.uptimePercentage}% Verified</div>
            </div>
          </div>
        </section>

        {/* AEO Extraction Table: Screen Formats & Daily Pricing Breakdown */}
        {metrics.categoryBreakdown && metrics.categoryBreakdown.length > 0 && (
          <section className="py-14 px-4 md:px-8 max-w-7xl mx-auto">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 font-serif">Format Telemetry & Pricing Matrix</h2>
                  <p className="text-sm text-slate-500 mt-1">Live breakdown contrasting commercial lobbies, highway billboards, and retail displays.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full self-start">
                  <ShieldCheck className="w-4 h-4" />
                  <span>PixelOS Proof-of-Play Verified</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table data-aeo="inventory-pricing" className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      <th className="py-3 px-4">Venue Category</th>
                      <th className="py-3 px-4 text-center">Active Screens</th>
                      <th className="py-3 px-4 text-right">Starting Price / Day</th>
                      <th className="py-3 px-4 text-right">Avg. Daily Footfall</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {metrics.categoryBreakdown.map((cat: any) => (
                      <tr key={cat.category} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-slate-400" />
                          <span>{cat.category}</span>
                        </td>
                        <td className="py-3 px-4 text-center">{cat.count}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">₹{cat.minPrice.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-4 text-right text-slate-600">{cat.avgFootfall.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Screens Grid */}
        <section className="py-10 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-serif">Available Digital Screens</h2>
              <p className="text-sm text-slate-500 mt-1">Book individual displays or assemble multi-screen campaigns.</p>
            </div>
            <Link href="/advertiser/discover">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                View All on Map
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : data?.screens?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.screens.map((screen: any) => (
                <ScreenCard key={screen.id} screen={screen} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-slate-500 mb-4 text-base">Explore all available screens across our network on the interactive map.</p>
              <Link href="/advertiser/discover">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">Browse Full Map Inventory</Button>
              </Link>
            </div>
          )}
        </section>

        {/* GEO Passages Section (Generative Engine Optimization) */}
        {data?.geoPassages && data.geoPassages.length > 0 && (
          <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
            <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold text-slate-900 mb-4 font-serif">Network Intelligence & Proof-of-Play Architecture</h2>
              <div className="space-y-4">
                {data.geoPassages.map((passage: string, idx: number) => (
                  <p key={idx} className="text-slate-700 text-sm md:text-base leading-relaxed">
                    {passage}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Accordion Section (People Also Ask / AEO) */}
        {data?.faqs && data.faqs.length > 0 && (
          <section className="py-12 px-4 md:px-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 text-center mb-8 font-serif">Frequently Asked Questions</h2>
            <div className="space-y-3">
              {data.faqs.map((faq: any, idx: number) => {
                const isOpen = openFaq === idx;
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden transition-all shadow-sm">
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full text-left px-5 py-4 font-semibold text-slate-900 flex items-center justify-between hover:text-blue-600 transition-colors"
                    >
                      <span>{faq.question}</span>
                      <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-1 text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        
        {/* Full Locality & Category Mesh Matrix */}
        <RelatedLinks 
          currentCitySlug={citySlug} 
          currentLocalitySlug={localitySlug}
          currentCategorySlug={categorySlug} 
        />
      </main>

      <PublicFooter />
    </div>
  );
}
