import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MapPin, Users, DollarSign, Monitor, Sparkles, ArrowRight, Search, Filter, TrendingUp, Building2, LayoutDashboard, Navigation } from 'lucide-react';
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

  // Fetch public screens
  const { data: screens = [], isLoading: screensLoading } = useQuery<Screen[]>({
    queryKey: ['/api/public/screens'],
  });

  // Fetch cities
  const { data: citiesData } = useQuery<PublicScreensResponse>({
    queryKey: ['/api/public/cities'],
  });

  // Fetch city stats (with physical screen counts)
  const { data: cityStatsData } = useQuery<CityStatsResponse>({
    queryKey: ['/api/public/city-stats'],
  });

  // Fetch platform-wide stats
  const { data: platformStats } = useQuery<PublicStatsResponse>({
    queryKey: ['/api/public/stats'],
  });

  // Fetch nearby screens (IP-based geolocation, no user permission needed)
  const { data: nearbyData, isLoading: nearbyLoading } = useQuery<NearbyScreensResponse>({
    queryKey: ['/api/public/nearby-screens'],
    staleTime: 5 * 60 * 1000, // Cache for 5 min — IP/location doesn't change often
    retry: 1,
  });

  const cities = citiesData?.cities || [];
  const cityCount = platformStats?.totalCities || citiesData?.count || 0;

  // Build city counts map from server-sourced city stats (physical screens, not DB rows)
  const cityCounts = (cityStatsData?.cityStats || []).reduce((acc, cs) => {
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
                  <p className="text-4xl font-bold text-foreground mb-1">{platformStats?.totalPhysicalScreens?.toLocaleString() || screens.length}</p>
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
              const landmarkImg = CITY_LANDMARK_IMAGES[city];
              
              return (
                <Card
                  key={city}
                  className="hover-elevate overflow-hidden cursor-pointer group"
                  onClick={() => handleCityClick(city)}
                  data-testid={`card-city-${city}`}
                >
                  <div className="relative h-20 sm:h-24 overflow-hidden">
                    {landmarkImg ? (
                      <img
                        src={landmarkImg}
                        alt={`${city} landmark`}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        loading="lazy"
                        onError={(e) => {
                          // Hide broken image and show gradient fallback
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLDivElement | null;
                          if (fallback) fallback.style.display = 'block';
                        }}
                      />
                    ) : null}
                    <div
                      className="absolute inset-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: gradient, display: landmarkImg ? 'none' : 'block' }}
                    />
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

      {/* ========== SCREENS NEAR YOU (IP Geolocation) ========== */}
      {(nearbyLoading || (nearbyData && nearbyData.screens.length > 0)) && (
        <div className="container mx-auto px-4 py-8 sm:py-12 md:py-16" id="nearby-section">
          <div className="text-center mb-6 sm:mb-8 space-y-2">
            {nearbyLoading ? (
              <>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  <span className="bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent animate-gradient bg-300%">
                    Finding Screens Near You
                  </span>
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Detecting your location...
                </p>
              </>
            ) : nearbyData?.detectedCity ? (
              <>
                <Badge className="mb-2 text-xs sm:text-sm px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
                  <Navigation className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                  Screens near {nearbyData.detectedCity}
                </Badge>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Screens Near You
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  {nearbyData.totalNearby > nearbyData.screens.length
                    ? `Showing top ${nearbyData.screens.length} of ${nearbyData.totalNearby} screens within ${nearbyData.radiusKm}km of ${nearbyData.detectedCity}`
                    : `${nearbyData.screens.length} screens within ${nearbyData.radiusKm}km of ${nearbyData.detectedCity}`}
                  {nearbyData.fallback && ' — plus popular screens from across India'}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">
                  Top Screens for You
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                  Our most popular DOOH screens across India
                </p>
              </>
            )}
          </div>

          {/* Nearby Map */}
          {!nearbyLoading && nearbyData && nearbyData.lat && nearbyData.lng && (
            <Card className="mb-6">
              <CardContent className="p-0">
                <Map
                  style={getMapContainerStyle()}
                  defaultCenter={{ lat: nearbyData.lat, lng: nearbyData.lng }}
                  defaultZoom={11}
                  gestureHandling="greedy"
                  disableDefaultUI
                  zoomControl={true}
                  fullscreenControl={true}
                  mapId="nearby-screens-map"
                >
                  {nearbyData.screens.map((screen) => (
                    <AdvancedMarker
                      key={screen.id}
                      position={{
                        lat: parseFloat(screen.latitude as string),
                        lng: parseFloat(screen.longitude as string),
                      }}
                      onClick={() => {
                        const el = document.getElementById(`screen-${screen.id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          backgroundColor: '#22c55e',
                          border: '2px solid white',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          cursor: 'pointer',
                        }}
                      />
                    </AdvancedMarker>
                  ))}
                </Map>
              </CardContent>
            </Card>
          )}

          {/* Nearby Screen Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
            {nearbyLoading ? (
              // Skeleton cards while loading
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={`skel-${i}`} className="overflow-hidden animate-pulse">
                  <div className="h-40 sm:h-48 bg-muted" />
                  <CardContent className="p-3 sm:p-4 space-y-2.5">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="flex justify-between pt-2 border-t">
                      <div className="h-6 bg-muted rounded w-20" />
                      <div className="h-8 bg-muted rounded w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              nearbyData?.screens.map((screen) => (
                <ScreenCard
                  key={screen.id}
                  screen={screen}
                  showDistance={!!nearbyData.detectedCity}
                />
              ))
            )}
          </div>

          {/* "Explore All" CTA */}
          {!nearbyLoading && nearbyData && screens.length > nearbyData.screens.length && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                size="lg"
                className="group"
                onClick={scrollToScreens}
              >
                <Search className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                Explore All {screens.length} Screens
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}
        </div>
      )}

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
              <Map
                style={getMapContainerStyle()}
                defaultCenter={defaultCenter}
                defaultZoom={5}
                gestureHandling="greedy"
                disableDefaultUI
                zoomControl={true}
                fullscreenControl={true}
                mapId="public-home-map"
              >
                {filteredScreens.map((screen) => {
                  const isHovered = hoveredScreen === screen.id;
                  return (
                    <AdvancedMarker
                      key={screen.id}
                      position={{
                        lat: parseFloat(screen.latitude as string),
                        lng: parseFloat(screen.longitude as string),
                      }}
                      onClick={() => handleMarkerClick(screen.id)}
                      onMouseEnter={() => setHoveredScreen(screen.id)}
                      onMouseLeave={() => setHoveredScreen(null)}
                    >
                      <div
                        style={{
                          width: isHovered ? 20 : 16,
                          height: isHovered ? 20 : 16,
                          borderRadius: '50%',
                          backgroundColor: isHovered ? '#22c55e' : '#8b5cf6',
                          border: '2px solid white',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          transition: 'all 0.15s ease',
                          cursor: 'pointer',
                        }}
                      />
                    </AdvancedMarker>
                  );
                })}
              </Map>
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
              <ScreenCard
                key={screen.id}
                screen={screen}
                isHovered={hoveredScreen === screen.id}
                onMouseEnter={() => setHoveredScreen(screen.id)}
                onMouseLeave={() => setHoveredScreen(null)}
              />
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
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <img src={logo} alt="Pixelspot" className="h-8 w-auto" />
              </div>
              <p className="text-sm text-muted-foreground">India's digital out-of-home advertising marketplace. Connect brands with screens across the country.</p>
              <p className="text-sm text-muted-foreground mt-3">PIXELSPOT SOLUTIONS PVT LTD</p>
              <p className="text-xs text-muted-foreground">CIN: U26103KA2025PTC201293</p>
              <p className="text-xs text-muted-foreground">GSTIN: 29AAPCP6653G1ZT</p>
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
                <p>Bangalore, Karnataka, India</p>
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
