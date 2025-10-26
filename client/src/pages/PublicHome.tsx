import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MapPin, Users, DollarSign, Monitor, Sparkles, ArrowRight, Search, Filter, TrendingUp, Eye, Building2 } from 'lucide-react';
import { Link } from 'wouter';
import type { Screen } from '@shared/schema';
import blackLogo from "@assets/Untitled design_1761331115867.png";

interface PublicScreensResponse {
  cities: string[];
  count: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
};

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

// City images mapping
const CITY_IMAGES: Record<string, string> = {
  'Mumbai': 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=400',
  'Delhi': 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400',
  'Bengaluru': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400',
  'Bangalore': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400',
  'Bangalore South': 'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400',
  'Gurgaon': 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400',
  'Surat': 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400',
};

export default function PublicHome() {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('All Venues');
  const [budgetRange, setBudgetRange] = useState<number[]>([0, 50000]);
  const [hoveredScreen, setHoveredScreen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showCities, setShowCities] = useState(true);

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

  // Calculate total impressions
  const totalImpressions = screens.reduce((sum, screen) => sum + (screen.avgDailyFootfall || 0), 0);

  // Filter screens
  const filteredScreens = screens.filter((screen) => {
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
    window.scrollTo({ top: 600, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <Link href="/">
              <img 
                src={blackLogo} 
                alt="Pixelspot" 
                className="h-10 w-auto cursor-pointer"
                data-testid="img-logo"
              />
            </Link>
            
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" data-testid="button-header-login">
                  Login
                </Button>
              </Link>
              <Link href="/register?role=advertiser">
                <Button data-testid="button-header-signup">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Sign Up Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground" data-testid="text-hero-title">
              India's Largest Digital
              <br />
              <span className="text-primary">Out-of-Home</span> Advertising Network
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto" data-testid="text-hero-subtitle">
              Discover premium DOOH screens across India. Book instantly, launch campaigns in minutes, and track real-time performance.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 max-w-3xl mx-auto">
              <Card className="hover-elevate">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <p className="text-3xl font-bold text-foreground">{cityCount}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Cities Covered</p>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    <p className="text-3xl font-bold text-foreground">{screens.length}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Live Screens</p>
                </CardContent>
              </Card>
              
              <Card className="hover-elevate">
                <CardContent className="pt-6 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-primary" />
                    <p className="text-3xl font-bold text-foreground">{(totalImpressions / 1000000).toFixed(1)}M+</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Daily Impressions</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/register?role=advertiser">
                <Button size="lg" data-testid="button-hero-cta">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Advertising
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}
                data-testid="button-hero-explore"
              >
                <Search className="w-5 h-5 mr-2" />
                Explore Screens
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* City Cards Section */}
      {showCities && cities.length > 0 && (
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Browse by City</h2>
            <p className="text-muted-foreground">Select a city to discover available screens</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {cities.map((city) => (
              <Card 
                key={city} 
                className="hover-elevate cursor-pointer group overflow-hidden"
                onClick={() => handleCityClick(city)}
                data-testid={`card-city-${city}`}
              >
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                  {CITY_IMAGES[city] && (
                    <img 
                      src={CITY_IMAGES[city]} 
                      alt={city}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="text-white font-semibold text-lg">{city}</h3>
                    <p className="text-white/80 text-sm">{cityCounts[city]} screens</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={() => setShowCities(false)}
              data-testid="button-view-all"
            >
              View All Screens on Map
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content - Map & Screens */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card data-testid="card-filters">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <CardDescription>Refine your search</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* City Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>
                  <Select value={selectedCity} onValueChange={setSelectedCity}>
                    <SelectTrigger data-testid="select-city">
                      <SelectValue />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Venue Type</label>
                  <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                    <SelectTrigger data-testid="select-venue">
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

                {/* Budget Range */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Daily Budget
                  </label>
                  <div className="text-center py-2 px-3 bg-primary/10 rounded-md">
                    <p className="text-sm font-semibold text-primary">
                      ₹{budgetRange[0].toLocaleString()} - ₹{budgetRange[1].toLocaleString()}
                    </p>
                  </div>
                  <Slider
                    value={budgetRange}
                    onValueChange={setBudgetRange}
                    min={0}
                    max={50000}
                    step={1000}
                    data-testid="slider-budget"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant={viewMode === 'map' ? 'default' : 'outline'}
                    onClick={() => setViewMode('map')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-view-map"
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Map
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'outline'}
                    onClick={() => setViewMode('list')}
                    className="flex-1"
                    size="sm"
                    data-testid="button-view-list"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    List
                  </Button>
                </div>

                {/* Results Count */}
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground text-center" data-testid="text-results-count">
                    Showing <span className="font-semibold text-foreground">{filteredScreens.length}</span> of {screens.length} screens
                  </p>
                </div>

                {/* Reset Filters */}
                {(selectedCity !== 'all' || selectedVenue !== 'All Venues' || budgetRange[0] !== 0 || budgetRange[1] !== 50000) && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      setSelectedCity('all');
                      setSelectedVenue('All Venues');
                      setBudgetRange([0, 50000]);
                    }}
                    data-testid="button-reset-filters"
                  >
                    Reset Filters
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Ready to Advertise?</CardTitle>
                <CardDescription>Launch your campaign today</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/register?role=advertiser">
                  <Button className="w-full" size="lg" data-testid="button-cta-create-campaign">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Campaign
                  </Button>
                </Link>
                <p className="text-xs text-muted-foreground text-center">
                  No credit card required • Free to start
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Map View */}
            {viewMode === 'map' && (
              <Card>
                <CardContent className="p-0">
                  <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={defaultCenter}
                      zoom={5}
                      options={{
                        zoomControl: true,
                        streetViewControl: false,
                        mapTypeControl: false,
                        fullscreenControl: true,
                      }}
                    >
                      {filteredScreens.map((screen) => (
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
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: hoveredScreen === screen.id ? '#22c55e' : '#8b5cf6',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 2,
                            scale: hoveredScreen === screen.id ? 12 : 10,
                          }}
                        />
                      ))}
                    </GoogleMap>
                  </LoadScript>
                </CardContent>
              </Card>
            )}

            {/* Screen Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {screensLoading ? (
                <div className="col-span-2 text-center py-12">
                  <Monitor className="w-12 h-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
                  <p className="text-muted-foreground">Loading screens...</p>
                </div>
              ) : filteredScreens.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">No screens found</p>
                  <p className="text-muted-foreground mb-4">Try adjusting your filters</p>
                  <Button
                    variant="outline"
                    onClick={() => {
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
                    className={`hover-elevate transition-all ${
                      hoveredScreen === screen.id ? 'ring-2 ring-primary shadow-lg' : ''
                    }`}
                    onMouseEnter={() => setHoveredScreen(screen.id)}
                    onMouseLeave={() => setHoveredScreen(null)}
                    data-testid={`card-screen-${screen.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">{screen.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="line-clamp-1">{screen.venueName}, {screen.city}</span>
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="flex-shrink-0">{screen.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs">{screen.avgDailyFootfall?.toLocaleString()} daily</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs">{screen.displayFormat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs line-clamp-1">{screen.venueCategory}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs">{screen.playbackSlotsPerHour}/hr</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-2xl font-bold text-primary">₹{screen.pricePerDay.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">per day</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          Min {screen.minBookingDays} days
                        </Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Link href="/register?role=advertiser" className="flex-1">
                        <Button className="w-full" variant="default" size="sm" data-testid={`button-book-${screen.id}`}>
                          Book Now
                        </Button>
                      </Link>
                      <Link href="/register?role=advertiser">
                        <Button variant="outline" size="sm" data-testid={`button-details-${screen.id}`}>
                          <Search className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-br from-primary/10 to-background border-t mt-16">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Reach Millions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join hundreds of brands using Pixelspot to create impactful DOOH campaigns across India's top locations.
          </p>
          <Link href="/register?role=advertiser">
            <Button size="lg" className="text-lg px-8 py-6" data-testid="button-bottom-cta">
              <Sparkles className="w-5 h-5 mr-2" />
              Start Your Campaign - Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Launch in minutes
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={blackLogo} alt="Pixelspot" className="h-8 w-auto" />
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
