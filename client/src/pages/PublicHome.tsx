import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MapPin, Users, DollarSign, Monitor, Sparkles, ArrowRight, Search, Filter, TrendingUp, Building2, LayoutDashboard, Navigation, Zap } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import type { Screen } from '@shared/schema';
import ScreenCard from '@/components/ScreenCard';
import { VENUE_CATEGORIES } from '@shared/constants';
import logo from "@assets/pixelspot-logo.png";
import railwayImg from "@assets/Gemini_Generated_Image_wfa0lrwfa0lrwfa0_1763277847119.png";
import airportLargeImg from "@assets/Gemini_Generated_Image_pla8lvpla8lvpla8_1763277847120.png";
import airportKioskImg from "@assets/Gemini_Generated_Image_ladsi7ladsi7lads_1763277847120.png";
import corporateImg from "@assets/Gemini_Generated_Image_fjsgtufjsgtufjsg_1763277847121.png";
import streetBillboardImg from "@assets/Gemini_Generated_Image_a8c8zna8c8zna8c8_1763278640800.png";
import gymImg from "@assets/Gemini_Generated_Image_58c0x558c0x558c0_1763278104633.png";
import residentialImg from "@assets/Gemini_Generated_Image_n8g1q2n8g1q2n8g1_1763278640800.png";
import cafeImg from "@assets/Gemini_Generated_Image_gkftp9gkftp9gkft_1763278160282.png";
import discoverHeroImg from "@assets/Gemini_Generated_Image_a8c8zna8c8zna8c8_1763278499067.png";

interface PublicScreensResponse {
  cities: string[];
  count: number;
}

interface CityStatsResponse {
  cityStats: { city: string; screenCount: number }[];
}

interface PublicStatsResponse {
  totalPhysicalScreens: number;
  totalCities: number;
  totalAdvertisers: number;
}

interface HomeDataResponse {
  screens: Screen[];
  cities: string[];
  cityStats: { city: string; screenCount: number }[];
  platformStats: PublicStatsResponse;
}

interface NearbyScreensResponse {
  detectedCity: string | null;
  detectedState: string | null;
  lat: number | null;
  lng: number | null;
  screens: (Screen & { distanceKm?: number })[];
  totalNearby: number;
  radiusKm: number;
  fallback: boolean;
}

const getMapContainerStyle = () => ({
  width: '100%',
  height: window.innerWidth < 640 ? '300px' : window.innerWidth < 1024 ? '400px' : '500px',
});

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const VENUE_TYPES = ['All Venues', ...VENUE_CATEGORIES];

// Famous landmark / cityscape images for Browse by City cards (Unsplash CDN, 400×250 crop)
// Every city has a UNIQUE photo ID — zero duplicates. Landmark chosen per B2B OOH relevance.
const CITY_LANDMARK_IMAGES: Record<string, string> = {
  // ═══ TOP-TIER METROS ═══
  'Mumbai':     'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&h=250&fit=crop', // Gateway of India
  'Delhi':      'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=250&fit=crop', // India Gate
  'Bengaluru':  'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&h=250&fit=crop', // Vidhana Soudha
  'Hyderabad':  'https://images.unsplash.com/photo-1572638668779-e0e354c04a62?w=400&h=250&fit=crop', // Charminar
  'Chennai':    'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&h=250&fit=crop', // Marina Beach Lighthouse
  'Kolkata':    'https://images.unsplash.com/photo-1558431382-27e303142255?w=400&h=250&fit=crop', // Victoria Memorial
  'Pune':       'https://images.unsplash.com/photo-1567157577867-05ccb1388e13?w=400&h=250&fit=crop', // Shaniwar Wada
  'Ahmedabad':  'https://images.unsplash.com/photo-1627894483216-2138af692e32?w=400&h=250&fit=crop', // Sabarmati Riverfront
  'Jaipur':     'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&h=250&fit=crop', // Hawa Mahal
  'Lucknow':    'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=250&fit=crop', // Rumi Darwaza / Bara Imambara
  // ═══ DELHI VARIANTS (unique landmark each) ═══
  'New Delhi':       'https://images.unsplash.com/photo-1597040663342-45b6af3d91a5?w=400&h=250&fit=crop', // Rashtrapati Bhavan
  'Delhi - Central': 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=400&h=250&fit=crop', // India Gate / Connaught Place area
  'Delhi - South':   'https://images.unsplash.com/photo-1548013146-72479768bada?w=400&h=250&fit=crop', // Qutub Minar
  'Delhi - West':    'https://images.unsplash.com/photo-1585135497273-1a86b09fe70e?w=400&h=250&fit=crop', // Akshardham / Lotus Temple
  // ═══ MUMBAI REGION ═══
  'Thane':       'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=400&h=250&fit=crop', // Thane cityscape
  'Navi Mumbai': 'https://images.unsplash.com/photo-1529253355930-ddbe423a2ac7?w=400&h=250&fit=crop', // Navi Mumbai skyline
  // ═══ NCR / BUSINESS HUBS ═══
  'Noida':        'https://images.unsplash.com/photo-1622451208812-e98312ce5d94?w=400&h=250&fit=crop', // Noida Expressway
  'Greater Noida': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop', // Modern towers
  'Gurugram':     'https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?w=400&h=250&fit=crop', // Cyber Hub skyline
  'Gurgaon':      'https://images.unsplash.com/photo-1545127398-14699f92334b?w=400&h=250&fit=crop', // DLF Cyber City
  'Faridabad':    'https://images.unsplash.com/photo-1555952517-2e8e729e0b44?w=400&h=250&fit=crop', // Surajkund Lake
  'Ghaziabad':    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=250&fit=crop', // City skyline
  // ═══ PUNJAB / HARYANA / CHANDIGARH ═══
  'Chandigarh':  'https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=400&h=250&fit=crop', // Open Hand / Rock Garden
  'Amritsar':    'https://images.unsplash.com/photo-1514222134-b57cbb8ce073?w=400&h=250&fit=crop', // Golden Temple
  'Mohali':      'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=250&fit=crop', // PCA Cricket Stadium
  'Jalandhar':   'https://images.unsplash.com/photo-1609947017136-9daf32a76cbe?w=400&h=250&fit=crop', // Devi Talab Mandir
  'Zirakpur':    'https://images.unsplash.com/photo-1504015930-2f1a9e9e7e10?w=400&h=250&fit=crop', // Highway corridor
  // ═══ RAJASTHAN ═══
  'Udaipur':         'https://images.unsplash.com/photo-1597574422609-a36d85b8ccc2?w=400&h=250&fit=crop', // Lake Pichola / City Palace
  'Kota':            'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=400&h=250&fit=crop', // Chambal riverside
  'Bhilwara':        'https://images.unsplash.com/photo-1524230572899-a752b3835840?w=400&h=250&fit=crop', // Rajasthan architecture
  'Sri Ganganagar':  'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?w=400&h=250&fit=crop', // Rajasthan landscape
  // ═══ GUJARAT ═══
  'Vadodara':  'https://images.unsplash.com/photo-1609948543911-e36aea54885c?w=400&h=250&fit=crop', // Laxmi Vilas Palace
  'Surat':     'https://images.unsplash.com/photo-1595113316349-9fa4eb24f884?w=400&h=250&fit=crop', // Surat Diamond Bourse
  'Rajkot':    'https://images.unsplash.com/photo-1623682242137-ef0e2a2bad1d?w=400&h=250&fit=crop', // Watson Museum
  'Anand':     'https://images.unsplash.com/photo-1585464231875-d9ef1f5ad396?w=400&h=250&fit=crop', // Amul Dairy / Gujarat campus
  // ═══ GOA ═══
  'Panjim':    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&h=250&fit=crop', // Panjim / Goa beach
  'Provorim':  'https://images.unsplash.com/photo-1587922546307-776227941871?w=400&h=250&fit=crop', // Goa scenery
  // ═══ MADHYA PRADESH ═══
  'Bhopal':   'https://images.unsplash.com/photo-1600011689032-8b628b8a8747?w=400&h=250&fit=crop', // Taj-ul-Masajid
  'Indore':   'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=400&h=250&fit=crop', // Rajwada Palace / 56 Dukan
  'Gwalior':  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=250&fit=crop', // Gwalior Fort
  // ═══ MAHARASHTRA (non-Mumbai) ═══
  'Nagpur':  'https://images.unsplash.com/photo-1625731226721-b4d51ae70e20?w=400&h=250&fit=crop', // Deekshabhoomi
  // ═══ UTTAR PRADESH ═══
  'Agra':      'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&h=250&fit=crop', // Taj Mahal
  'Varanasi':  'https://images.unsplash.com/photo-1561361513-2d000a50f0dc?w=400&h=250&fit=crop', // Dashashwamedh Ghat
  'Kanpur':    'https://images.unsplash.com/photo-1580894894513-541e068a3e2b?w=400&h=250&fit=crop', // Kanpur riverside / Memorial Church
  'Meerut':    'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=400&h=250&fit=crop', // Augarnath Temple
  'Gorakhpur': 'https://images.unsplash.com/photo-1544735716-ea3d59d8c3b7?w=400&h=250&fit=crop', // Gorakhnath Temple
  // ═══ UTTARAKHAND ═══
  'Dehradun':  'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=400&h=250&fit=crop', // Mussoorie / Doon Valley
  // ═══ BIHAR / JHARKHAND ═══
  'Patna':    'https://images.unsplash.com/photo-1623682687826-fe07e1e76e50?w=400&h=250&fit=crop', // Golghar / Mahatma Gandhi Setu
  'Ranchi':   'https://images.unsplash.com/photo-1559494007-9f5847c49d94?w=400&h=250&fit=crop', // Hundru Falls / Jagannath Temple
  'Dhanbad':  'https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=400&h=250&fit=crop', // Industrial cityscape
  // ═══ SOUTH INDIA — Kerala ═══
  'Kochi':               'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=400&h=250&fit=crop', // Chinese Fishing Nets
  'Thiruvananthapuram':  'https://images.unsplash.com/photo-1593693411515-c20261bcad6e?w=400&h=250&fit=crop', // Padmanabhaswamy Temple
  'Thrissur':            'https://images.unsplash.com/photo-1602158123557-f8a95428b294?w=400&h=250&fit=crop', // Vadakkunnathan / Thrissur Pooram
  // ═══ SOUTH INDIA — Tamil Nadu ═══
  'Coimbatore':  'https://images.unsplash.com/photo-1621425116131-b27cafec5c32?w=400&h=250&fit=crop', // Adiyogi Shiva Statue / Isha
  'Salem':       'https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=400&h=250&fit=crop', // Yercaud Hills
  'Puducherry':  'https://images.unsplash.com/photo-1580977276076-ae4b8c219b8e?w=400&h=250&fit=crop', // French Quarter
  // ═══ SOUTH INDIA — Karnataka ═══
  'Mysuru':    'https://images.unsplash.com/photo-1600112356915-089ee07e1062?w=400&h=250&fit=crop', // Mysore Palace (Amba Vilas)
  'Dharwad':   'https://images.unsplash.com/photo-1615827053503-532af8e3d8a4?w=400&h=250&fit=crop', // Karnataka hills
  'Tumakuru':  'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?w=400&h=250&fit=crop', // Devarayanadurga
  'Gulbarga':  'https://images.unsplash.com/photo-1585208798174-6cedd86e019a?w=400&h=250&fit=crop', // Gulbarga Fort
  // ═══ SOUTH INDIA — Andhra Pradesh / Telangana ═══
  'Visakhapatnam':  'https://images.unsplash.com/photo-1589553416260-f586c8f1514f?w=400&h=250&fit=crop', // Kailasagiri
  'Vijaywada':      'https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=400&h=250&fit=crop', // Kanaka Durga Temple / Krishna River
  'Kakinada':       'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=250&fit=crop', // Kakinada Beach
  'Nizamabad':      'https://images.unsplash.com/photo-1517427294546-5aa44f7a5e46?w=400&h=250&fit=crop', // Nizamabad Fort
  'Warangal':       'https://images.unsplash.com/photo-1626714388485-0c610567fb23?w=400&h=250&fit=crop', // Thousand Pillar Temple / Kakatiya Kala Thoranam
  // ═══ NORTH EAST ═══
  'Guwahati':  'https://images.unsplash.com/photo-1574104252742-42da03e6c196?w=400&h=250&fit=crop', // Kamakhya Temple / Umananda Island
  // ═══ ODISHA ═══
  'Bhubaneswar':  'https://images.unsplash.com/photo-1583309219338-a582f1f9ca6b?w=400&h=250&fit=crop', // Lingaraj Temple / Dhauli Giri
  'Cuttack':      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=400&h=250&fit=crop', // Barabati Fort
  // ═══ J&K ═══
  'Srinagar':  'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=400&h=250&fit=crop', // Dal Lake (Shikaras)
  // ═══ WEST BENGAL ═══
  'Howrah':  'https://images.unsplash.com/photo-1536421469767-80559bb6f5e1?w=400&h=250&fit=crop', // Howrah Bridge
};

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

  // Get current user from AuthContext (safe for unauthenticated users — returns null)
  const { user: currentUser } = useAuth();

  // Single combined fetch — screens + cities + cityStats + platformStats in ONE round-trip
  const { data: homeData, isLoading: screensLoading } = useQuery<HomeDataResponse>({
    queryKey: ['/api/public/home-data'],
    staleTime: 5 * 60 * 1000, // 5 min — matches server-side cache TTL
  });

  const screens = homeData?.screens ?? [];
  const cities = homeData?.cities ?? [];
  const cityCount = homeData?.platformStats?.totalCities ?? homeData?.cities?.length ?? 0;
  const platformStats = homeData?.platformStats;
  const cityCounts = (homeData?.cityStats ?? []).reduce((acc, cs) => {
    acc[cs.city] = cs.screenCount;
    return acc;
  }, {} as Record<string, number>);

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

  // Limit markers on map for performance (top 200 by footfall)
  const MAX_MAP_MARKERS = 200;
  const mapMarkers = useMemo(() => {
    if (filteredScreens.length <= MAX_MAP_MARKERS) return filteredScreens;
    return [...filteredScreens]
      .sort((a, b) => (b.avgDailyFootfall || 0) - (a.avgDailyFootfall || 0))
      .slice(0, MAX_MAP_MARKERS);
  }, [filteredScreens]);

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
      <section className="relative pt-20 pb-24 overflow-hidden bg-background">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom duration-1000">
            <div className="space-y-6">
              <Badge variant="outline" className="px-4 py-1.5 border-primary/30 text-primary font-medium bg-primary/5 mx-auto">
                Digital Outdoor Advertising Platform
              </Badge>
              <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter text-foreground leading-[1.1]">
                Run Ads Across <br />
                <span className="text-primary italic">Real-World</span> Screens
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Launch outdoor ad campaigns across digital screens in your city — all from one platform. Google Ads, but for the physical world.
              </p>
            </div>

            <div className="flex flex-wrap gap-6 justify-center">
              <Link href="/register?role=advertiser">
                <Button size="lg" className="h-16 px-10 text-xl font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform">
                  Start Campaign
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="h-16 px-10 text-xl font-bold border-2"
                onClick={scrollToScreens}
              >
                Explore Screens
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm sm:text-base text-muted-foreground font-semibold pt-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                No agencies
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                No long contracts
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                Go live in minutes
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-time Stats Section */}
      <section className="-mt-12 mb-12 relative z-20 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Screens Stats */}
            <Card className="border-2 shadow-xl hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Monitor className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-4xl font-black tracking-tight">{platformStats?.totalPhysicalScreens?.toLocaleString() || "2,400"}+</h3>
                  <p className="text-muted-foreground font-semibold">Screens Live</p>
                </div>
              </CardContent>
            </Card>

            {/* Cities Stats */}
            <Card className="border-2 shadow-xl hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-4xl font-black tracking-tight">{platformStats?.totalCities || "120"}+</h3>
                  <p className="text-muted-foreground font-semibold">Cities We Are Live</p>
                </div>
              </CardContent>
            </Card>

            {/* Campaigns Stats */}
            <Card className="border-2 shadow-xl hover:scale-[1.02] transition-transform duration-300">
              <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-4xl font-black tracking-tight">267+</h3>
                  <p className="text-muted-foreground font-semibold">Campaigns Executed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* SECTION 2 — SCREENS NEAR YOU */}
      <section className="py-32 bg-muted/30" id="screens-section">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Screens Near You</h2>
            <p className="text-lg text-muted-foreground">
              Search your city and discover digital advertising screens available around you. 
              Browse screen locations, view venue types, and check pricing before launching your campaign.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="bg-background border-2 sticky top-24">
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-sm font-bold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Location
                      </label>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {cities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-sm font-bold flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        Venue Type
                      </label>
                      <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VENUE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <label className="text-sm font-bold">Daily Price</label>
                        <span className="text-sm font-medium text-primary">₹{budgetRange[1].toLocaleString()}</span>
                      </div>
                      <Slider 
                        value={budgetRange} 
                        onValueChange={setBudgetRange}
                        min={0}
                        max={50000}
                        step={500}
                      />
                    </div>
                  </div>

                  <Button className="w-full" onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')}>
                    {viewMode === 'map' ? 'Switch to List View' : 'Switch to Map View'}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Display */}
            <div className="lg:col-span-3 space-y-6">
              {viewMode === 'map' ? (
                <Card className="h-[600px] overflow-hidden border-2 rounded-2xl">
                  {filteredScreens.length > MAX_MAP_MARKERS && (
                    <div className="bg-muted/80 text-center py-1 text-xs text-muted-foreground">
                      Showing top {MAX_MAP_MARKERS} of {filteredScreens.length} screens on map
                    </div>
                  )}
                  <Map
                    style={{ width: '100%', height: '100%' }}
                    defaultCenter={defaultCenter}
                    defaultZoom={5}
                    gestureHandling="greedy"
                    disableDefaultUI
                    zoomControl
                    mapId="discovery-map"
                  >
                    {mapMarkers.map((screen) => (
                      <AdvancedMarker
                        key={screen.id}
                        position={{
                          lat: parseFloat(screen.latitude as string),
                          lng: parseFloat(screen.longitude as string),
                        }}
                        onClick={() => handleMarkerClick(screen.id)}
                      >
                        <div className="flex flex-col items-center">
                          <div className="px-2 py-1 bg-primary text-white text-[10px] font-bold rounded shadow-lg mb-1">
                            ₹{screen.pricePerDay}
                          </div>
                          <div className="w-5 h-5 rounded-full bg-white border-4 border-primary shadow-xl" />
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredScreens.slice(0, 9).map((screen) => (
                    <ScreenCard key={screen.id} screen={screen} />
                  ))}
                  {filteredScreens.length > 9 && (
                    <Card className="flex flex-col items-center justify-center p-8 border-dashed border-2">
                      <p className="text-muted-foreground font-medium mb-4">{filteredScreens.length - 9} more screens available</p>
                      <Link href="/register">
                        <Button variant="outline">Sign up to explore all</Button>
                      </Link>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>



      {/* SECTION 5 — SCREEN NETWORK */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-3xl overflow-hidden aspect-[4/5] relative group">
                  <img src={railwayImg} alt="Metro Station" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <p className="text-white font-bold text-lg">Metro Stations</p>
                  </div>
                </div>
                <div className="rounded-3xl overflow-hidden aspect-square relative group">
                  <img src={cafeImg} alt="Cafes" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <p className="text-white font-bold text-lg">Cafes</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4 pt-12">
                <div className="rounded-3xl overflow-hidden aspect-square relative group">
                  <img src={discoverHeroImg} alt="Malls" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <p className="text-white font-bold text-lg">Malls</p>
                  </div>
                </div>
                <div className="rounded-3xl overflow-hidden aspect-[4/5] relative group">
                  <img src={residentialImg} alt="Residential" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                    <p className="text-white font-bold text-lg">Residential Communities</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">A Growing Network of Digital Screens</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Our network includes digital screens located in malls, metro stations, cafes, residential communities, highways, and tech parks.
                </p>
                <p className="text-lg font-medium text-foreground italic">
                  Reach people where attention actually exists — in the real world.
                </p>
              </div>

              <ul className="space-y-4">
                 {[
                   'Airports & Travel Hubs',
                   'Corporate & Tech Parks',
                   'High-Traffic Junctions',
                   'Luxury Malls & Retail',
                   'Premium Cafes & Gyms'
                 ].map(item => (
                   <li key={item} className="flex items-center gap-3 text-lg font-medium">
                     <div className="w-2 h-2 rounded-full bg-primary" />
                     {item}
                   </li>
                 ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 6 — FOR SCREEN OWNERS */}
      <section className="py-24 bg-primary text-white rounded-[60px] mx-4 my-24 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/5 blur-[150px] rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="container mx-auto px-8 relative z-10 text-center space-y-12">
          <div className="max-w-3xl mx-auto space-y-6">
            <Badge variant="outline" className="border-white/20 text-white bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              Partnership Opportunities
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Monetize Your Digital Screens</h2>
            <p className="text-xl text-white/80 leading-relaxed">
              Own a digital display or LED screen? Join the PixelSpot network and start earning by running advertiser campaigns on your screens.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            {[
              { title: "List Your Screens", desc: "Add your screen details, location, and metadata in minutes." },
              { title: "Receive Demand", desc: "Get booking requests from verified brands across India." },
              { title: "Manage Ads", desc: "Upload and schedule creative from one smart dashboard." },
            ].map((f) => (
              <div key={f.title} className="p-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/10 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                   <Monitor className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold">{f.title}</h4>
                <p className="text-white/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          <Link href="/register?role=screen_owner" className="inline-block mt-4">
            <Button size="lg" variant="secondary" className="h-16 px-12 text-xl font-bold bg-white text-primary hover:bg-white/90">
              List Your Screen
            </Button>
          </Link>
        </div>
      </section>

      {/* SECTION 7 — FINAL CALL TO ACTION */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 text-center space-y-12">
          <div className="max-w-3xl mx-auto space-y-6">
             <h2 className="text-4xl md:text-7xl font-bold tracking-tight leading-tight">Your Audience Is <br /><span className="text-primary italic">Already</span> Outside</h2>
             <p className="text-xl text-muted-foreground leading-relaxed">
                Put your brand where people actually see it. Launch your outdoor campaign today and reach thousands of people daily.
             </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/register?role=advertiser">
              <Button size="lg" className="h-16 px-10 text-xl font-bold shadow-2xl shadow-primary/20">
                Start Campaign
              </Button>
            </Link>
             <Button size="lg" variant="outline" className="h-16 px-10 text-xl font-bold border-2" onClick={scrollToScreens}>
                Explore Screens
             </Button>
          </div>
        </div>
      </section>



      {/* SECTION 3 — HOW IT WORKS */}
      <section className="py-40 bg-background" id="how-it-works">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Launch Outdoor Ads in Minutes</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
            {[
              { step: "01", title: "Discover Screens", desc: "Explore advertising screens near your business." },
              { step: "02", title: "Create Campaign", desc: "Choose screens, campaign duration, and budget." },
              { step: "03", title: "Upload Your Ad", desc: "Add your creative and preview your campaign." },
              { step: "04", title: "Go Live", desc: "Your ads start playing across selected screens." },
            ].map((s, i) => (
              <div key={s.step} className="relative space-y-4">
                <div className="text-6xl font-black text-primary/10 absolute -top-10 -left-4 select-none">
                  {s.step}
                </div>
                <div className="bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                  {i === 0 && <Search className="text-primary w-8 h-8" />}
                  {i === 1 && <Sparkles className="text-primary w-8 h-8" />}
                  {i === 2 && <Monitor className="text-primary w-8 h-8" />}
                  {i === 3 && <Zap className="text-primary w-8 h-8" />}
                </div>
                <h3 className="text-2xl font-bold">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4 — WHY PIXELSPOT */}
      <section className="py-40 bg-muted/30 overflow-hidden relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Outdoor Advertising, Simplified</h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Traditional outdoor advertising requires agencies, negotiations, and large budgets. PixelSpot makes outdoor advertising accessible for everyone.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[
                  { title: "Transparent Pricing", desc: "See exact daily rates before you book." },
                  { title: "Hyperlocal Targeting", desc: "Target by city, area, or even specific zip codes." },
                  { title: "Flexible Durations", desc: "Run ads for a day, a week, or months." },
                  { title: "Real Inventory", desc: "Direct access to verified screen networks." },
                  { title: "Smart Analytics", desc: "Track impressions and campaign reach." },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4 p-4 rounded-xl bg-background border shadow-sm">
                    <div className="mt-1 bg-primary/10 rounded-full p-1 h-fit">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{f.title}</h4>
                      <p className="text-sm text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1 relative w-full h-[500px]">
               <div className="absolute inset-x-0 inset-y-0 bg-primary/10 blur-[100px] rounded-full scale-150 rotate-45" />
               <div className="relative h-full w-full bg-background rounded-[40px] border-8 border-muted shadow-2xl overflow-hidden p-8 flex flex-col justify-center gap-8">
                  <div className="flex justify-between items-end border-b pb-6">
                    <div>
                      <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest mb-1">Live Campaign</p>
                      <h4 className="text-3xl font-bold">Urban Reach Pro</h4>
                    </div>
                    <Badge className="bg-green-500 text-white animate-pulse">Running</Badge>
                  </div>
                  <div className="space-y-6">
                    <div className="h-4 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full w-[75%] bg-primary" />
                    </div>
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-wider">Impressions</p>
                        <p className="text-4xl font-black">12.4K</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-wider">Screens</p>
                        <p className="text-4xl font-black">42</p>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-2xl">
                       <p className="text-sm font-medium">Hyperlocal focus: Mumbai West & South</p>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>



      {/* Bottom CTA */}
      <div className="bg-gradient-to-br from-primary/10 to-background border-t">
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
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src={logo} alt="Pixelspot" className="h-8 w-auto" />
              </div>
              <p className="text-sm text-muted-foreground">India's digital out-of-home advertising marketplace. Connect brands with screens across the country.</p>
              <p className="text-sm text-muted-foreground mt-3">PIXELSPOT SOLUTIONS PVT LTD</p>
              <p className="text-xs text-muted-foreground">CIN: U26103KA2025PTC201293</p>
              <p className="text-xs text-muted-foreground">GSTIN: 29AAPCP6653G1ZT</p>
              {platformStats && (
                <p className="text-xs text-primary font-medium mt-3">{platformStats.totalScreens?.toLocaleString()}+ screens across {platformStats.totalCities}+ cities</p>
              )}
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Quick Links</h4>
              <div className="flex flex-col gap-2">
                <Link href="/register?role=screen_owner"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">List Your Screen</span></Link>
                <Link href="/register?role=advertiser"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Start Advertising</span></Link>
                <Link href="/login"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Sign In</span></Link>
                <Link href="/about"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">About Us</span></Link>
              </div>
            </div>

            {/* Popular Cities */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Top Cities</h4>
              <div className="flex flex-col gap-2">
                {["Bengaluru", "Mumbai", "Delhi", "Ahmedabad", "Hyderabad", "Pune", "Chennai", "Surat"].map(city => (
                  <button key={city} className="text-sm text-muted-foreground hover:text-foreground text-left" onClick={() => handleCityClick(city)}>{city}</button>
                ))}
              </div>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href="/privacy"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Privacy Policy</span></Link>
                <Link href="/terms"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Terms of Service</span></Link>
                <Link href="/refund"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Refund Policy</span></Link>
                <Link href="/contact"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Contact Us</span></Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-sm mb-4">Contact</h4>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <p>contact@pixelspot.in</p>
                <p>+91 72048 08334</p>
                <p>Bengaluru, Karnataka, India</p>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">© 2025 PIXELSPOT SOLUTIONS PRIVATE LIMITED. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy"><span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Privacy</span></Link>
              <Link href="/terms"><span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Terms</span></Link>
              <Link href="/refund"><span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Refunds</span></Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
