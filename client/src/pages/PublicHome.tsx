import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MapPin, Users, DollarSign, Monitor, Sparkles, ArrowRight, Search, Filter, TrendingUp, Eye, Building2, LayoutDashboard } from 'lucide-react';
import { Link } from 'wouter';
import type { Screen, User } from '@shared/schema';
import logo from "@assets/pixelspot-logo.png";
import railwayImg from "@assets/Gemini_Generated_Image_wfa0lrwfa0lrwfa0_1763277847119.png";
import airportLargeImg from "@assets/Gemini_Generated_Image_pla8lvpla8lvpla8_1763277847120.png";
import airportKioskImg from "@assets/Gemini_Generated_Image_ladsi7ladsi7lads_1763277847120.png";
import corporateImg from "@assets/Gemini_Generated_Image_fjsgtufjsgtufjsg_1763277847121.png";
import streetBillboardImg from "@assets/Gemini_Generated_Image_iv6mx4iv6mx4iv6m_1763277847121.png";
import gymImg from "@assets/Gemini_Generated_Image_58c0x558c0x558c0_1763278104633.png";
import residentialImg from "@assets/Gemini_Generated_Image_a8c8zna8c8zna8c8_1763278104633.png";
import cafeImg from "@assets/Gemini_Generated_Image_gkftp9gkftp9gkft_1763278160282.png";
import discoverHeroImg from "@assets/Gemini_Generated_Image_a8c8zna8c8zna8c8_1763278499067.png";

interface PublicScreensResponse {
  cities: string[];
  count: number;
}

const getMapContainerStyle = () => ({
  width: '100%',
  height: window.innerWidth < 640 ? '300px' : window.innerWidth < 1024 ? '400px' : '500px',
});

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const VENUE_TYPES = [
  'All Venues',
  'Airport',
  'Mall',
  'Metro',
  'Office Building',
  'Shopping Complex',
  'Restaurant',
  'Gym',
  'Hospital',
  'Cinema',
  'College',
];

// Generate consistent pastel gradient colors for cities based on city name
const getCityGradient = (cityName: string): string => {
  // Hash the city name to get a consistent number
  let hash = 0;
  for (let i = 0; i < cityName.length; i++) {
    hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Generate hue from hash (0-360)
  const hue = Math.abs(hash % 360);
  
  // Create two complementary hues for gradient (pastel colors: low saturation, high lightness)
  const hue1 = hue;
  const hue2 = (hue + 40) % 360;
  
  return `linear-gradient(135deg, hsl(${hue1}, 45%, 70%) 0%, hsl(${hue2}, 50%, 65%) 100%)`;
};

export default function PublicHome() {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('India');
  const [selectedVenue, setSelectedVenue] = useState<string>('All Venues');
  const [budgetRange, setBudgetRange] = useState<number[]>([0, 50000]);
  const [hoveredScreen, setHoveredScreen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showCities, setShowCities] = useState(true);

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Fetch public screens
  const { data: screens = [], isLoading: screensLoading } = useQuery<Screen[]>({
    queryKey: ['/api/public/screens'],
  });

  // Fetch cities
  const { data: citiesData } = useQuery<PublicScreensResponse>({
    queryKey: ['/api/public/cities'],
  });

  const cities = citiesData?.cities || [];
  const cityCount = citiesData?.count || 0;

  // Get unique states from screens
  const states = Array.from(new Set(screens.map(s => s.state).filter((state): state is string => Boolean(state))));

  // Calculate total impressions
  const totalImpressions = screens.reduce((sum, screen) => sum + (screen.avgDailyFootfall || 0), 0);

  // Filter screens
  const filteredScreens = screens.filter((screen) => {
    if (selectedCountry !== 'India') return false; // Only India for now
    if (selectedState !== 'all' && screen.state !== selectedState) return false;
    if (selectedCity !== 'all' && screen.city !== selectedCity) return false;
    if (selectedVenue !== 'All Venues' && screen.venueCategory !== selectedVenue) return false;
    if (screen.pricePerDay < budgetRange[0] || screen.pricePerDay > budgetRange[1]) return false;
    return true;
  });

  // Get city counts
  const cityCounts = screens.reduce((acc, screen) => {
    const city = screen.city;
    if (city) {
      acc[city] = (acc[city] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const handleMarkerClick = (screenId: string) => {
    const element = document.getElementById(`screen-${screenId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleCityClick = (city: string) => {
    setSelectedCity(city);
    setShowCities(false);
    // Scroll to screens section
    const screensSection = document.getElementById('screens-section');
    if (screensSection) {
      screensSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToScreens = () => {
    const screensSection = document.getElementById('screens-section');
    if (screensSection) {
      screensSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <img 
                src={logo} 
                alt="Pixelspot" 
                className="h-8 sm:h-10 w-auto cursor-pointer"
                data-testid="img-logo"
              />
            </Link>
            
            <div className="flex items-center gap-2 sm:gap-3">
              {currentUser ? (
                <Link href={
                  currentUser.role === 'admin' ? '/admin' :
                  currentUser.role === 'screen_owner' ? '/owner' :
                  '/advertiser'
                }>
                  <Button size="sm" className="sm:size-default" data-testid="button-header-dashboard">
                    <LayoutDashboard className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Go to Dashboard</span>
                    <span className="sm:hidden">Dashboard</span>
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="sm:size-default" data-testid="button-header-login">
                      <span className="hidden sm:inline">Login</span>
                      <span className="sm:hidden">Log in</span>
                    </Button>
                  </Link>
                  <Link href="/register?role=advertiser">
                    <Button size="sm" className="sm:size-default" data-testid="button-header-signup">
                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Sign Up Free</span>
                      <span className="sm:hidden">Sign Up</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 lg:py-28 relative">
          <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-1000">
              <Badge className="mb-4 sm:mb-6 text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30 hover-elevate" data-testid="badge-ai-powered">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                AI-Powered Smart DOOH Ad Network
              </Badge>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold leading-tight" data-testid="text-hero-title">
                India's Largest
                <br />
                <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient bg-300%">
                  AI-Enabled DOOH
                </span>{' '}
                Advertising Network
              </h1>
            </div>
            <div className="animate-in fade-in slide-in-from-bottom-5 duration-1000 delay-200">
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4" data-testid="text-hero-subtitle">
                Leverage AI-driven campaign creation, smart screen matching, and intelligent audience targeting. Book premium DOOH screens instantly and launch data-powered campaigns in minutes.
              </p>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-300">
              <Card className="hover-elevate border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1">{cityCount}</p>
                  <p className="text-sm text-muted-foreground font-medium">Cities Covered</p>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Monitor className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1">{screens.length}</p>
                  <p className="text-sm text-muted-foreground font-medium">Live Screens</p>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <p className="text-4xl font-bold text-foreground mb-1">500+</p>
                  <p className="text-sm text-muted-foreground font-medium">Advertisers Onboard</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 sm:pt-6 animate-in fade-in slide-in-from-bottom-7 duration-1000 delay-500 px-4">
              <Link href="/register?role=advertiser" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 group" data-testid="button-hero-cta">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:rotate-12 transition-transform" />
                  Start Advertising
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 group"
                onClick={scrollToScreens}
                data-testid="button-hero-explore"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
                Explore Screens
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Browse by City Section */}
      {showCities && cities.length > 0 && (
        <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
          <div className="text-center mb-8 sm:mb-10 space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Browse by City</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore premium DOOH screens in major cities across India
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {cities.map((city) => {
              const count = cityCounts[city] || 0;
              const gradient = getCityGradient(city);
              
              return (
                <Card
                  key={city}
                  className="hover-elevate overflow-hidden cursor-pointer group"
                  onClick={() => handleCityClick(city)}
                  data-testid={`card-city-${city}`}
                >
                  <div 
                    className="relative h-20 sm:h-24 overflow-hidden transition-transform group-hover:scale-105"
                    style={{ background: gradient }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                      <h3 className="font-bold text-white text-sm sm:text-base mb-0.5 drop-shadow-lg">{city}</h3>
                      <p className="text-xs text-white/95 flex items-center gap-1 drop-shadow-md">
                        <Monitor className="w-3 h-3" />
                        {count} {count === 1 ? 'Screen' : 'Screens'}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Our Network Section */}
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-10 space-y-3">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
            Our <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">Network</span>
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover premium DOOH screens across diverse venue categories
          </p>
        </div>
        
        {/* Collage Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Left Column - Large Image */}
          <div
            className="md:row-span-2 relative overflow-hidden rounded-lg cursor-pointer group h-64 md:h-full"
            onClick={() => {
              setSelectedVenue('Highway');
              setShowCities(false);
              scrollToScreens();
            }}
            data-testid="card-network-highway"
          >
            <img
              src={streetBillboardImg}
              alt="Road Side Media"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <h3 className="absolute bottom-4 left-4 font-bold text-white text-lg md:text-xl">Road Side Media</h3>
          </div>

          {/* Middle Column - Airport (Top) */}
          <div
            className="md:col-span-2 relative overflow-hidden rounded-lg cursor-pointer group h-64"
            onClick={() => {
              setSelectedVenue('Airport');
              setShowCities(false);
              scrollToScreens();
            }}
            data-testid="card-network-airport"
          >
            <img
              src={airportLargeImg}
              alt="Airport"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <h3 className="absolute bottom-4 left-4 font-bold text-white text-lg md:text-xl">Airport</h3>
          </div>

          {/* Middle Column - Transit Media (Bottom) */}
          <div
            className="md:col-span-2 relative overflow-hidden rounded-lg cursor-pointer group h-64"
            onClick={() => {
              setSelectedVenue('Metro');
              setShowCities(false);
              scrollToScreens();
            }}
            data-testid="card-network-transit"
          >
            <img
              src={railwayImg}
              alt="Transit Media"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <h3 className="absolute bottom-4 left-4 font-bold text-white text-lg md:text-xl">Transit Media</h3>
          </div>
        </div>

        {/* Bottom Row - Small Images */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
          {[
            { name: 'Café', image: cafeImg, venueType: 'Café' },
            { name: 'Tech Parks', image: corporateImg, venueType: 'Corporate Park' },
            { name: 'Residential', image: residentialImg, venueType: 'Apartment' },
            { name: 'Gyms', image: gymImg, venueType: 'Gym' },
            { name: 'City Junction', image: airportKioskImg, venueType: 'Road Junction' },
          ].map((network) => (
            <div
              key={network.name}
              className="relative overflow-hidden rounded-lg cursor-pointer group h-32 sm:h-40"
              onClick={() => {
                setSelectedVenue(network.venueType);
                setShowCities(false);
                scrollToScreens();
              }}
              data-testid={`card-network-${network.name.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <img
                src={network.image}
                alt={network.name}
                className="w-full h-full object-cover transition-transform group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <h3 className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 font-bold text-white text-xs sm:text-sm">{network.name}</h3>
            </div>
          ))}
        </div>
      </div>

      {/* Discover Perfect Screen Section */}
      <div className="bg-gradient-to-br from-primary/5 to-background border-t mt-8 sm:mt-12 md:mt-16 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <Badge className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Precision Targeting
              </Badge>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Discover the
                <br />
                <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                  perfect screen
                </span>
                <br />
                for your brand
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
                Pinpoint high-impact locations with AI-powered recommendations. Our intelligent platform analyzes audience demographics, footfall patterns, and engagement data to match your brand with the most effective DOOH screens across India.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4">
                <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 group" onClick={scrollToScreens} data-testid="button-discover-cta">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Explore Screens
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>
            </div>
            <div className="relative mt-8 lg:mt-0">
              <div className="relative rounded-2xl overflow-hidden border border-primary/20 shadow-2xl">
                <img 
                  src={discoverHeroImg} 
                  alt="Digital billboard in urban setting"
                  className="w-full h-auto"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-4 sm:-bottom-6 -right-4 sm:-right-6 bg-primary text-primary-foreground p-4 sm:p-6 rounded-xl sm:rounded-2xl shadow-xl border border-primary/20">
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold">{screens.length}+</p>
                <p className="text-xs sm:text-sm font-medium">Premium Screens</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* From Discovery to Delivery Section */}
      <div className="bg-gradient-to-br from-background to-primary/10 border-y mt-8 sm:mt-12 md:mt-16">
        <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
          <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
            <Badge className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Complete Solution
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
              From Discovery
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                to Delivery
              </span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto px-4">
              All powered by AI on one intelligent dashboard
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* AI Campaign Creation */}
            <Card className="hover-elevate border-primary/20">
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-3">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">AI Campaign Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Let our AI guide you through campaign creation with smart recommendations based on your goals, budget, and target audience.
                </p>
              </CardContent>
            </Card>

            {/* Smart Screen Matching */}
            <Card className="hover-elevate border-primary/20">
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-3">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Smart Screen Matching</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Discover screens that align perfectly with your campaign objectives through intelligent filtering and AI-powered suggestions.
                </p>
              </CardContent>
            </Card>

            {/* Real-time Analytics */}
            <Card className="hover-elevate border-primary/20">
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-3">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Performance Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Monitor your campaign performance with comprehensive analytics including impressions, reach, and engagement metrics.
                </p>
              </CardContent>
            </Card>

            {/* Instant Booking */}
            <Card className="hover-elevate border-primary/20">
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-3">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Instant Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Book premium DOOH screens instantly with transparent pricing and secure payment processing through our platform.
                </p>
              </CardContent>
            </Card>

            {/* Multi-City Campaigns */}
            <Card className="hover-elevate border-primary/20">
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-3">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Multi-City Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Launch campaigns across multiple cities from one dashboard. Manage all your screens and bookings in a single place.
                </p>
              </CardContent>
            </Card>

            {/* Automated Workflows */}
            <Card className="hover-elevate border-primary/20">
              <CardHeader>
                <div className="p-3 rounded-full bg-primary/10 w-fit mb-3">
                  <Monitor className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl">Streamlined Approval</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Automated booking workflows with real-time notifications keep you updated on approvals, rejections, and campaign status.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="container mx-auto px-4 py-12 sm:py-16 md:py-20">
        <div className="text-center mb-10 sm:mb-12 md:mb-16 space-y-3 sm:space-y-4">
          <Badge className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-primary/20 to-purple-500/20 border-primary/30">
            Simple Process
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold">How It Works</h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Launch your DOOH campaign in 4 simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 text-3xl font-bold text-primary">
                1
              </div>
              <h3 className="text-xl font-bold">Sign Up Free</h3>
              <p className="text-muted-foreground">
                Create your advertiser account in seconds. No credit card required to get started.
              </p>
            </div>
            {/* Connector line */}
            <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 text-3xl font-bold text-primary">
                2
              </div>
              <h3 className="text-xl font-bold">Discover Screens</h3>
              <p className="text-muted-foreground">
                Browse screens on map or use AI to find the perfect match for your campaign goals.
              </p>
            </div>
            <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 text-3xl font-bold text-primary">
                3
              </div>
              <h3 className="text-xl font-bold">Book & Pay</h3>
              <p className="text-muted-foreground">
                Select your dates, upload creatives, and complete secure payment to confirm booking.
              </p>
            </div>
            <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent" />
          </div>

          {/* Step 4 */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 text-3xl font-bold text-primary">
              4
            </div>
            <h3 className="text-xl font-bold">Go Live</h3>
            <p className="text-muted-foreground">
              Your campaign goes live and you can track performance in real-time from your dashboard.
            </p>
          </div>
        </div>

        <div className="text-center mt-8 sm:mt-10 md:mt-12">
          <Link href="/register?role=advertiser" className="inline-block w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14 group" data-testid="button-howitworks-cta">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Get Started Now
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content - Map & Screens with Horizontal Filters */}
      <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16" id="screens-section">
        <div className="text-center mb-6 sm:mb-8 space-y-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">Explore Premium Screens</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect DOOH screens for your campaign
          </p>
        </div>

        {/* Horizontal Filters */}
        <Card className="mb-6" data-testid="card-filters">
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4">
              {/* First Row: Dropdowns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Country Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Country</label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="h-9" data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* State Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="h-9" data-testid="select-state">
                      <SelectValue placeholder="All States" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {states.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger className="h-9" data-testid="select-city">
                      <SelectValue placeholder="All Cities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities ({screens.length})</SelectItem>
                      {cities.map((city) => {
                        const count = screens.filter((s) => s.city === city).length;
                        return (
                          <SelectItem key={city} value={city}>
                            {city} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Venue Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Venue Type</label>
                  <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                    <SelectTrigger className="h-9" data-testid="select-venue">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VENUE_TYPES.map((venue) => (
                        <SelectItem key={venue} value={venue}>
                          {venue}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">View</label>
                  <div className="flex gap-2">
                    <Button
                      variant={viewMode === 'map' ? 'default' : 'outline'}
                      onClick={() => setViewMode('map')}
                      className="flex-1 h-9"
                      size="sm"
                      data-testid="button-view-map"
                    >
                      <MapPin className="w-3.5 h-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Map</span>
                    </Button>
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'outline'}
                      onClick={() => setViewMode('list')}
                      className="flex-1 h-9"
                      size="sm"
                      data-testid="button-view-list"
                    >
                      <Search className="w-3.5 h-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">List</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Second Row: Budget Range Slider */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Daily Budget Range</label>
                  <div className="text-xs font-semibold text-primary">
                    ₹{budgetRange[0].toLocaleString()} - ₹{budgetRange[1].toLocaleString()}
                  </div>
                </div>
                <Slider
                  value={budgetRange}
                  onValueChange={setBudgetRange}
                  min={0}
                  max={50000}
                  step={1000}
                  className="w-full"
                  data-testid="slider-budget"
                />
              </div>

              {/* Third Row: Results Count & Reset */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
                <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                  Showing <span className="font-semibold text-foreground">{filteredScreens.length}</span> of {screens.length} screens
                </p>
                {(selectedCountry !== 'India' || selectedState !== 'all' || selectedCity !== 'all' || selectedVenue !== 'All Venues' || budgetRange[0] !== 0 || budgetRange[1] !== 50000) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCountry('India');
                      setSelectedState('all');
                      setSelectedCity('all');
                      setSelectedVenue('All Venues');
                      setBudgetRange([0, 50000]);
                    }}
                    data-testid="button-reset-filters"
                  >
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        {viewMode === 'map' && (
          <Card className="mb-6">
            <CardContent className="p-0">
              <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                <GoogleMap
                  mapContainerStyle={getMapContainerStyle()}
                  center={defaultCenter}
                  zoom={5}
                  options={{
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                  }}
                >
                  {filteredScreens.map((screen) => {
                    const isHovered = hoveredScreen === screen.id;
                    return (
                      <Marker
                        key={screen.id}
                        position={{
                          lat: parseFloat(screen.latitude as string),
                          lng: parseFloat(screen.longitude as string),
                        }}
                        onClick={() => handleMarkerClick(screen.id)}
                        onMouseOver={() => setHoveredScreen(screen.id)}
                        onMouseOut={() => setHoveredScreen(null)}
                        icon={{
                          path: 'M 0, 0 m -5, 0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0',
                          fillColor: isHovered ? '#22c55e' : '#8b5cf6',
                          fillOpacity: 1,
                          strokeColor: '#ffffff',
                          strokeWeight: 2,
                          scale: isHovered ? 2.4 : 2,
                        }}
                      />
                    );
                  })}
                </GoogleMap>
              </LoadScript>
            </CardContent>
          </Card>
        )}

        {/* Screen Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {screensLoading ? (
            <div className="col-span-full text-center py-12">
              <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
              <p className="text-muted-foreground">Loading screens...</p>
            </div>
          ) : filteredScreens.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">No screens found</p>
              <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedCountry('India');
                  setSelectedState('all');
                  setSelectedCity('all');
                  setSelectedVenue('All Venues');
                  setBudgetRange([0, 50000]);
                }}
                data-testid="button-reset-filters-empty"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            filteredScreens.map((screen) => (
              <Card
                key={screen.id}
                id={`screen-${screen.id}`}
                className={`hover-elevate overflow-hidden transition-all ${
                  hoveredScreen === screen.id ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
                onMouseEnter={() => setHoveredScreen(screen.id)}
                onMouseLeave={() => setHoveredScreen(null)}
                data-testid={`card-screen-${screen.id}`}
              >
                {/* Screen Image */}
                <div className="relative h-40 sm:h-48 bg-muted overflow-hidden cursor-pointer group">
                  {(screen.screenImages && screen.screenImages.length > 0) || (screen.images && screen.images.length > 0) ? (
                    <img
                      src={(screen.screenImages?.[0] ?? screen.images?.[0]) || ''}
                      alt={screen.name}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/600x400/1a1a1a/666?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <MapPin className="w-12 h-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge className="absolute top-2 right-2 text-xs" variant="secondary">{screen.category}</Badge>
                  {screen.venueCategory && (
                    <Badge className="absolute top-2 left-2 text-xs bg-primary/90 backdrop-blur-sm">
                      {screen.venueCategory}
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3 sm:p-4 space-y-2.5">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight mb-1 line-clamp-1">{screen.name}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {screen.venueName}, {screen.city}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="text-xs">{screen.avgDailyFootfall?.toLocaleString()}/day</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      <span className="text-xs">{screen.displayFormat}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground">Per day</p>
                      <p className="font-bold text-lg sm:text-xl text-primary">₹{screen.pricePerDay.toLocaleString()}</p>
                    </div>
                    <Link href="/register?role=advertiser">
                      <Button size="sm" data-testid={`button-book-${screen.id}`}>
                        <Eye className="w-3 h-3 mr-1" />
                        <span className="text-xs">View</span>
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* CTA Section */}
        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 sm:p-8 text-center">
            <h3 className="text-xl sm:text-2xl font-bold mb-2">Ready to Launch Your Campaign?</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-2xl mx-auto">
              Join hundreds of brands using Pixelspot to create impactful DOOH campaigns
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/register?role=advertiser">
                <Button size="lg" data-testid="button-cta-create-campaign">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Campaign
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                No credit card required • Free to start
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-br from-primary/10 to-background border-t mt-8 sm:mt-12 md:mt-16">
        <div className="container mx-auto px-4 py-12 sm:py-14 md:py-16 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4">Ready to Reach Millions?</h2>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Join hundreds of brands using Pixelspot to create impactful DOOH campaigns across India's top locations.
          </p>
          <Link href="/register?role=advertiser" className="inline-block w-full sm:w-auto px-4">
            <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 h-12 sm:h-14" data-testid="button-bottom-cta">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Start Your Campaign - Free
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
            No credit card required • Launch in minutes
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logo} alt="Pixelspot" className="h-8 w-auto" />
              <p className="text-sm text-muted-foreground">© 2025 Pixelspot. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/register?role=screen_owner">
                <Button variant="ghost" size="sm">List Your Screen</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">Advertiser Login</Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
