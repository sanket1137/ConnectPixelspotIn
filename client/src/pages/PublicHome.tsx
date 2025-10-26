import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { MapPin, Users, DollarSign, Monitor, Sparkles, ArrowRight, Search, Filter } from 'lucide-react';
import { Link } from 'wouter';
import type { Screen } from '@shared/schema';

interface PublicScreensResponse {
  cities: string[];
  count: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '600px',
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629, // Center of India
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

export default function PublicHome() {
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('All Venues');
  const [budgetRange, setBudgetRange] = useState<number[]>([0, 50000]);
  const [hoveredScreen, setHoveredScreen] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

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

  // Filter screens
  const filteredScreens = screens.filter((screen) => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground" data-testid="text-hero-title">
              Discover Digital Advertising Screens Across India
            </h1>
            <p className="text-xl text-muted-foreground" data-testid="text-hero-subtitle">
              Find the perfect DOOH advertising spots for your brand. Browse screens, compare prices, and launch campaigns in minutes.
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Badge variant="secondary" className="text-base px-4 py-2" data-testid="badge-cities-count">
                <MapPin className="w-4 h-4 mr-2" />
                Available in {cityCount} cities
              </Badge>
              <Badge variant="secondary" className="text-base px-4 py-2" data-testid="badge-screens-count">
                <Monitor className="w-4 h-4 mr-2" />
                {screens.length} screens live
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <Card data-testid="card-filters">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <CardDescription>Refine your search</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Daily Budget: ₹{budgetRange[0].toLocaleString()} - ₹{budgetRange[1].toLocaleString()}
                  </label>
                  <Slider
                    value={budgetRange}
                    onValueChange={setBudgetRange}
                    min={0}
                    max={50000}
                    step={1000}
                    className="mt-2"
                    data-testid="slider-budget"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex gap-2 pt-4">
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
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                    Showing {filteredScreens.length} of {screens.length} screens
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* CTA Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Ready to Advertise?</CardTitle>
                <CardDescription>Create your campaign in minutes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/register?role=advertiser">
                  <Button className="w-full" size="lg" data-testid="button-cta-create-campaign">
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Campaign
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/register?role=advertiser">
                  <Button variant="outline" className="w-full" data-testid="button-cta-view-pricing">
                    <DollarSign className="w-4 h-4 mr-2" />
                    View Pricing
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {viewMode === 'map' ? (
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
            ) : null}

            {/* Screen Cards */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${viewMode === 'map' ? 'mt-6' : ''}`}>
              {screensLoading ? (
                <div className="col-span-2 text-center py-12">
                  <p className="text-muted-foreground">Loading screens...</p>
                </div>
              ) : filteredScreens.length === 0 ? (
                <div className="col-span-2 text-center py-12">
                  <p className="text-muted-foreground">No screens found matching your filters.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSelectedCity('all');
                      setSelectedVenue('All Venues');
                      setBudgetRange([0, 50000]);
                    }}
                    data-testid="button-reset-filters"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                filteredScreens.map((screen) => (
                  <Card
                    key={screen.id}
                    id={`screen-${screen.id}`}
                    className={`hover-elevate ${
                      hoveredScreen === screen.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onMouseEnter={() => setHoveredScreen(screen.id)}
                    onMouseLeave={() => setHoveredScreen(null)}
                    data-testid={`card-screen-${screen.id}`}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{screen.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {screen.venueName}, {screen.city}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary">{screen.category}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span>{screen.avgDailyFootfall?.toLocaleString()} daily views</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Monitor className="w-4 h-4 text-muted-foreground" />
                          <span>{screen.displayFormat}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-2xl font-bold text-primary">₹{screen.pricePerDay.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">per day</p>
                        </div>
                        <Badge variant="outline">{screen.venueCategory}</Badge>
                      </div>
                    </CardContent>
                    <CardFooter className="flex gap-2">
                      <Link href="/register?role=advertiser" className="flex-1">
                        <Button className="w-full" variant="default" data-testid={`button-book-${screen.id}`}>
                          Book Now
                        </Button>
                      </Link>
                      <Link href="/register?role=advertiser">
                        <Button variant="outline" data-testid={`button-details-${screen.id}`}>
                          Details
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
      <div className="bg-primary/5 border-t border-primary/20 mt-12">
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Campaign?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Join hundreds of advertisers using Pixelspot to reach millions of potential customers across India.
          </p>
          <Link href="/register?role=advertiser">
            <Button size="lg" data-testid="button-bottom-cta">
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started - It's Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
