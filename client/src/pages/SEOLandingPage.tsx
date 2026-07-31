import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PublicFooter } from "@/components/PublicFooter";
import ScreenCard from "@/components/ScreenCard";
import { Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { RelatedLinks } from "@/components/RelatedLinks";

export default function SEOLandingPage() {
  const [matchBoth, paramsBoth] = useRoute("/:citySlug/:categorySlug");
  const [matchScreen, paramsScreen] = useRoute("/screens/:screenSlug");
  const [matchSingle, paramsSingle] = useRoute("/:slug");

  let citySlug = "";
  let categorySlug = "";
  let screenSlug = "";

  if (matchScreen && paramsScreen) {
    screenSlug = paramsScreen.screenSlug;
  } else if (matchBoth && paramsBoth) {
    citySlug = paramsBoth.citySlug;
    categorySlug = paramsBoth.categorySlug;
  } else if (matchSingle && paramsSingle) {
    if (paramsSingle.slug.endsWith("-advertising")) {
      categorySlug = paramsSingle.slug;
    } else {
      citySlug = paramsSingle.slug;
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["seo-page-data", citySlug, categorySlug, screenSlug],
    queryFn: async () => {
      const url = screenSlug 
        ? `/api/seo-page-data?screenSlug=${screenSlug}` 
        : `/api/seo-page-data?citySlug=${citySlug}&categorySlug=${categorySlug}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch page data");
      return res.json();
    },
    enabled: !!citySlug || !!categorySlug || !!screenSlug
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-900 to-blue-950 text-white py-24 px-6 md:px-12 text-center">
          <div className="max-w-4xl mx-auto mt-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight text-white leading-tight">
              {data?.title || "Digital Advertising"}
            </h1>
            <p className="text-lg md:text-xl text-blue-200 max-w-2xl mx-auto mb-10">
              {data?.description || "Discover premium digital screens across India."}
            </p>
            <Link href="/advertiser/discover">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 py-6 text-lg shadow-xl shadow-blue-900/20">
                Explore on Map <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </section>

        {/* Screens Grid */}
        <section className="py-20 px-4 md:px-8 max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-10 text-gray-900">Available Screens</h2>
          
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
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <p className="text-gray-500 mb-4 text-lg">No screens found for this location/category.</p>
              <Link href="/advertiser/discover">
                <Button variant="outline">Browse All Screens</Button>
              </Link>
            </div>
          )}
        </section>
        
        <RelatedLinks currentCitySlug={citySlug} currentCategorySlug={categorySlug} />
      </main>

      <PublicFooter />
    </div>
  );
}
