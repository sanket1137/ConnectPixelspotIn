import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Plus, Check, ShoppingCart, Trash2, List, Map as MapIcon, X, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Screen } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const SELECTED_SCREENS_KEY = "selectedScreenIds";
const VIEW_PREFERENCE_KEY = "screenViewPreference";

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

type ViewMode = "list" | "map";

export default function DiscoverScreens() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [detailDialogScreen, setDetailDialogScreen] = useState<Screen | null>(null);
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const itemsPerPage = 12;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [filters, setFilters] = useState({
    state: "",
    city: "",
    venueCategory: "",
    screenCategory: "",
    environmentType: "",
    trafficType: "",
    minPrice: "",
    maxPrice: "",
  });

  const [center] = useState(defaultCenter);

  // Load selected screens and view preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_SCREENS_KEY);
    if (saved) {
      setSelectedScreenIds(new Set(JSON.parse(saved)));
    }

    const savedView = localStorage.getItem(VIEW_PREFERENCE_KEY);
    if (savedView === "map" || savedView === "list") {
      setViewMode(savedView);
    }
  }, []);

  // Save view preference
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_PREFERENCE_KEY, mode);
  };

  const { data: screens = [] } = useQuery<Screen[]>({
    queryKey: ["/api/screens", filters],
  });

  // Fetch location options (states and cities)
  const { data: locations } = useQuery<{
    states: string[];
    cities: { [state: string]: string[] };
    allCities: string[];
  }>({
    queryKey: ["/api/screens/locations"],
  });

  // All possible venue categories from schema (always available)
  const venueCategoryOptions = [
    'Airport',
    'Apartment',
    'Bus Stop',
    'Café',
    'Cinema',
    'Co-working',
    'College',
    'Corporate Park',
    'Flyover',
    'Gym',
    'Highway',
    'Hospital',
    'Mall',
    'Metro',
    'Office Building',
    'Restaurant',
    'Retail Store',
    'Road Junction',
    'Road Side',
    'Salon',
    'Shopping Complex',
    'Stadium'
  ];
  
  // Extract unique values from screens for other dropdowns
  const screenCategoryOptions = Array.from(new Set(screens.map(s => s.category).filter(Boolean))).sort();
  const environmentTypeOptions = Array.from(new Set(screens.map(s => s.environmentType).filter(Boolean))).sort();
  const trafficTypeOptions = Array.from(new Set(screens.map(s => s.trafficType).filter(Boolean))).sort();

  // Get cities for selected state
  const availableCities = filters.state && locations?.cities[filters.state] 
    ? locations.cities[filters.state] 
    : locations?.allCities || [];

  // Strict filtering: show only screens that match ALL selected filters
  const getFilteredScreens = () => {
    const results = screens.filter((screen) => {
      if (filters.state && screen.state !== filters.state) return false;
      if (filters.city && screen.city !== filters.city) return false;
      if (filters.venueCategory && screen.venueCategory !== filters.venueCategory) return false;
      if (filters.screenCategory && screen.category !== filters.screenCategory) return false;
      if (filters.environmentType && screen.environmentType !== filters.environmentType) return false;
      if (filters.trafficType && screen.trafficType !== filters.trafficType) return false;
      if (filters.minPrice && screen.pricePerDay < parseInt(filters.minPrice)) return false;
      if (filters.maxPrice && screen.pricePerDay > parseInt(filters.maxPrice)) return false;
      return true;
    });
    
    return { results, relaxedFilters: [] };
  };
  
  const { results: filteredScreens, relaxedFilters } = getFilteredScreens();

  const selectedScreens = screens.filter(s => selectedScreenIds.has(s.id));

  // Pagination for list view
  const totalPages = Math.ceil(filteredScreens.length / itemsPerPage);
  const paginatedScreens = filteredScreens.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleScreenSelection = (screen: Screen) => {
    const newSet = new Set(selectedScreenIds);
    if (newSet.has(screen.id)) {
      newSet.delete(screen.id);
      toast({
        title: "Screen Removed",
        description: `${screen.name} removed from selection.`,
      });
    } else {
      newSet.add(screen.id);
      toast({
        title: "Screen Added",
        description: `${screen.name} added to your campaign.`,
      });
    }
    setSelectedScreenIds(newSet);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(Array.from(newSet)));
  };

  const removeScreen = (screenId: string) => {
    const newSet = new Set(selectedScreenIds);
    newSet.delete(screenId);
    setSelectedScreenIds(newSet);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(Array.from(newSet)));
  };

  const proceedToCreateCampaign = () => {
    if (selectedScreenIds.size === 0) {
      toast({
        title: "No Screens Selected",
        description: "Please select at least one screen for your campaign.",
        variant: "destructive",
      });
      return;
    }
    setLocation("/advertiser/campaigns/new");
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Top Header with Filters */}
      <div className="border-b border-border bg-card">
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* View Toggle and Results Count Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1 w-fit">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("list")}
                data-testid="button-list-view"
                className="gap-2"
              >
                <List className="h-4 w-4" />
                <span className="hidden xs:inline">List</span>
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("map")}
                data-testid="button-map-view"
                className="gap-2"
              >
                <MapIcon className="h-4 w-4" />
                <span className="hidden xs:inline">Map</span>
              </Button>
            </div>

            {/* Results Count and Cart */}
            <div className="flex items-center justify-between sm:justify-end gap-3">
              <p className="text-sm font-medium text-muted-foreground" data-testid="text-results-count">
                {filteredScreens.length} screens
              </p>

              {/* Cart Button */}
              {selectedScreenIds.size > 0 && (
                <Sheet open={showCart} onOpenChange={setShowCart}>
                  <SheetTrigger asChild>
                    <Button variant="default" size="sm" className="gap-2" data-testid="button-cart">
                      <ShoppingCart className="h-4 w-4" />
                      Selected ({selectedScreenIds.size})
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Selected Screens</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedScreens.map((screen) => (
                          <div key={screen.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{screen.name}</p>
                                {screen.isMultiScreen && screen.numberOfScreens && (
                                  <Badge variant="default" className="text-xs bg-purple-600 hover:bg-purple-700">
                                    🖥️ {screen.numberOfScreens}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{screen.city}</p>
                              <p className="text-xs font-semibold text-primary mt-1">
                                {screen.isMultiScreen && screen.numberOfScreens ? (
                                  <>₹{screen.pricePerDay.toLocaleString()}/day × {screen.numberOfScreens} screens</>
                                ) : (
                                  <>₹{screen.pricePerDay.toLocaleString()}/day</>
                                )}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => removeScreen(screen.id)}
                              data-testid={`button-remove-screen-${screen.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="w-full"
                        onClick={proceedToCreateCampaign}
                        data-testid="button-proceed-campaign"
                      >
                        Create Campaign
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </div>
          </div>

          {/* Filter Row 1: Location and Categories */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {/* State Dropdown */}
            <Select 
              value={filters.state} 
              onValueChange={(value) => setFilters({ ...filters, state: value === "all" ? "" : value, city: "" })}
            >
              <SelectTrigger data-testid="select-state">
                <SelectValue placeholder="All States" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {locations?.states.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* City Dropdown */}
            <Select 
              value={filters.city} 
              onValueChange={(value) => setFilters({ ...filters, city: value === "all" ? "" : value })}
            >
              <SelectTrigger data-testid="select-city">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Venue Category Dropdown */}
            <Select 
              value={filters.venueCategory} 
              onValueChange={(value) => setFilters({ ...filters, venueCategory: value === "all" ? "" : value })}
            >
              <SelectTrigger data-testid="select-venue-category">
                <SelectValue placeholder="All Venues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Venues</SelectItem>
                {venueCategoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Screen Category Dropdown */}
            <Select 
              value={filters.screenCategory} 
              onValueChange={(value) => setFilters({ ...filters, screenCategory: value === "all" ? "" : value })}
            >
              <SelectTrigger data-testid="select-screen-category">
                <SelectValue placeholder="All Screen Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Screen Types</SelectItem>
                {screenCategoryOptions.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Environment Type Dropdown */}
            <Select 
              value={filters.environmentType} 
              onValueChange={(value) => setFilters({ ...filters, environmentType: value === "all" ? "" : value })}
            >
              <SelectTrigger data-testid="select-environment-type">
                <SelectValue placeholder="All Environments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                {environmentTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Row 2: Traffic Type, Price Range, and Clear */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* Traffic Type Dropdown */}
            <Select 
              value={filters.trafficType} 
              onValueChange={(value) => setFilters({ ...filters, trafficType: value === "all" ? "" : value })}
            >
              <SelectTrigger data-testid="select-traffic-type">
                <SelectValue placeholder="All Traffic Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Traffic Types</SelectItem>
                {trafficTypeOptions.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Min Price Input */}
            <Input
              type="number"
              placeholder="Min Price ₹"
              value={filters.minPrice}
              onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
              data-testid="input-min-price"
            />

            {/* Max Price Input */}
            <Input
              type="number"
              placeholder="Max Price ₹"
              value={filters.maxPrice}
              onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
              data-testid="input-max-price"
            />

            {/* Clear Filters Button */}
            <Button
              variant="outline"
              size="default"
              onClick={() => setFilters({ 
                state: "", 
                city: "", 
                venueCategory: "", 
                screenCategory: "", 
                environmentType: "", 
                trafficType: "", 
                minPrice: "", 
                maxPrice: "" 
              })}
              data-testid="button-clear-filters"
            >
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </div>
      </div>

      {/* Relaxed Filters Alert */}
      {relaxedFilters.length > 0 && (
        <div className="px-3 sm:px-4 md:px-6 pt-3 sm:pt-4">
          <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900" data-testid="alert-relaxed-filters">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-200">
              <strong>No exact matches found.</strong> Showing results without: <strong>{relaxedFilters.join(", ")}</strong> filter{relaxedFilters.length > 1 ? "s" : ""}.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content - List or Map View */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" ? (
          <div className="h-full overflow-y-auto p-3 sm:p-4 md:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {paginatedScreens.map((screen) => (
                <Card key={screen.id} className="hover-elevate overflow-hidden" data-testid={`card-screen-${screen.id}`}>
                  {/* Screen Image - LARGE */}
                  <div className="relative h-56 bg-muted overflow-hidden cursor-pointer" onClick={() => setDetailDialogScreen(screen)}>
                    {(screen.screenImages && screen.screenImages.length > 0) || (screen.images && screen.images.length > 0) ? (
                      <img
                        src={(screen.screenImages?.[0] ?? screen.images?.[0]) || ''}
                        alt={screen.name}
                        className="w-full h-full object-cover transition-transform hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/600x400/1a1a1a/666?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <MapPin className="w-16 h-16 text-muted-foreground/50" />
                      </div>
                    )}
                    <Badge className="absolute top-3 right-3" variant="secondary">{screen.type}</Badge>
                    {screen.isMultiScreen && screen.numberOfScreens && (
                      <Badge className="absolute top-3 left-3 bg-purple-600 hover:bg-purple-700">
                        {screen.numberOfScreens} Screens
                      </Badge>
                    )}
                  </div>

                  <CardContent className="p-5 space-y-3">
                    <div>
                      <h3 className="font-bold text-lg leading-tight mb-2">{screen.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {screen.location}, {screen.city}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{screen.size}</Badge>
                      <Badge variant="outline" className="text-xs">{screen.venueCategory || 'Standard'}</Badge>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Price per day</p>
                        <p className="font-bold text-lg text-primary">
                          {screen.isMultiScreen && screen.numberOfScreens ? (
                            <>₹{screen.pricePerDay.toLocaleString()}<span className="text-sm font-normal text-muted-foreground"> × {screen.numberOfScreens}</span></>
                          ) : (
                            <>₹{screen.pricePerDay.toLocaleString()}</>
                          )}
                        </p>
                      </div>
                      <Button
                        variant={selectedScreenIds.has(screen.id) ? "secondary" : "default"}
                        size="sm"
                        onClick={() => toggleScreenSelection(screen)}
                        data-testid={`button-toggle-screen-${screen.id}`}
                      >
                        {selectedScreenIds.has(screen.id) ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Selected
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  Previous
                </Button>
                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        data-testid={`button-page-${page}`}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full">
            {!isLoaded ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            ) : (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={11}
                onCenterChanged={() => {}}
                onZoomChanged={() => {}}
                options={{
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  fullscreenControl: true,
                }}
              >
                {filteredScreens.map((screen) => {
                  const isSelected = selectedScreenIds.has(screen.id);
                  // Custom monitor/screen icon SVG
                  const iconSvg = `
                    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="8" width="30" height="20" rx="2" fill="${isSelected ? '#10b981' : '#7c3aed'}" stroke="white" stroke-width="2"/>
                      <rect x="7" y="10" width="26" height="16" fill="${isSelected ? '#059669' : '#6d28d9'}"/>
                      <rect x="15" y="28" width="10" height="2" fill="${isSelected ? '#10b981' : '#7c3aed'}"/>
                      <rect x="12" y="30" width="16" height="3" rx="1" fill="${isSelected ? '#10b981' : '#7c3aed'}"/>
                    </svg>
                  `;
                  
                  return (
                    <Marker
                      key={screen.id}
                      position={{ lat: parseFloat(screen.latitude.toString()), lng: parseFloat(screen.longitude.toString()) }}
                      onClick={() => setSelectedScreen(screen)}
                      icon={{
                        url: `data:image/svg+xml;base64,${btoa(iconSvg)}`,
                        scaledSize: new google.maps.Size(40, 40),
                        anchor: new google.maps.Point(20, 35),
                      }}
                    />
                  );
                })}

                {selectedScreen && (
                  <InfoWindow
                    position={{ lat: parseFloat(selectedScreen.latitude.toString()), lng: parseFloat(selectedScreen.longitude.toString()) }}
                    onCloseClick={() => setSelectedScreen(null)}
                    options={{
                      maxWidth: 350,
                      pixelOffset: new google.maps.Size(0, -10)
                    }}
                  >
                    <div style={{ width: '320px', maxWidth: '320px' }}>
                      {/* Screen Image - LARGE */}
                      <div className="relative h-48 bg-gray-200 overflow-hidden rounded-md mb-3">
                        {selectedScreen.images && selectedScreen.images.length > 0 ? (
                          <img
                            src={selectedScreen.images[0]}
                            alt={selectedScreen.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.currentTarget.src = 'https://placehold.co/600x400/1a1a1a/666?text=No+Image';
                            }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' }}>
                            <MapPin style={{ width: '48px', height: '48px', color: '#9ca3af' }} />
                          </div>
                        )}
                        <span style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {selectedScreen.type}
                        </span>
                        {selectedScreen.isMultiScreen && selectedScreen.numberOfScreens && (
                          <span style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {selectedScreen.numberOfScreens} Screens
                          </span>
                        )}
                      </div>

                      <div style={{ padding: '0 4px' }}>
                        <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '8px', color: '#111827' }}>
                          {selectedScreen.name}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px' }}>
                          {selectedScreen.location}, {selectedScreen.city}
                        </p>

                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: '1px solid #d1d5db',
                            color: '#374151'
                          }}>
                            {selectedScreen.size}
                          </span>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            border: '1px solid #d1d5db',
                            color: '#374151'
                          }}>
                            {selectedScreen.venueCategory || 'Standard'}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '12px',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          <div>
                            <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Price per day</p>
                            <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#0d9488' }}>
                              ₹{selectedScreen.pricePerDay.toLocaleString()}
                              {selectedScreen.isMultiScreen && selectedScreen.numberOfScreens && (
                                <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#6b7280' }}>
                                  {' '}× {selectedScreen.numberOfScreens}
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => toggleScreenSelection(selectedScreen)}
                            style={{
                              backgroundColor: selectedScreenIds.has(selectedScreen.id) ? '#f3f4f6' : '#0d9488',
                              color: selectedScreenIds.has(selectedScreen.id) ? '#111827' : 'white',
                              padding: '8px 16px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '13px',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {selectedScreenIds.has(selectedScreen.id) ? (
                              <>
                                <Check style={{ width: '14px', height: '14px' }} />
                                Selected
                              </>
                            ) : (
                              <>
                                <Plus style={{ width: '14px', height: '14px' }} />
                                Add
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        )}
      </div>

      {/* Screen Detail Dialog */}
      <Dialog open={!!detailDialogScreen} onOpenChange={(open) => !open && setDetailDialogScreen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {detailDialogScreen && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{detailDialogScreen.name}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6">
                {/* Screen Image */}
                <div className="relative h-72 bg-muted overflow-hidden rounded-lg">
                  {detailDialogScreen.images && detailDialogScreen.images.length > 0 ? (
                    <img
                      src={detailDialogScreen.images[0]}
                      alt={detailDialogScreen.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/800x600/1a1a1a/666?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <MapPin className="w-20 h-20 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge className="absolute top-3 right-3" variant="secondary">{detailDialogScreen.type}</Badge>
                  {detailDialogScreen.isMultiScreen && detailDialogScreen.numberOfScreens && (
                    <Badge className="absolute top-3 left-3 bg-purple-600 hover:bg-purple-700">
                      {detailDialogScreen.numberOfScreens} Screens
                    </Badge>
                  )}
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">Location</h4>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                    <p className="text-base">{detailDialogScreen.location}, {detailDialogScreen.city}</p>
                  </div>
                </div>

                {/* Screen Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Size</p>
                    <Badge variant="outline">{detailDialogScreen.size}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Category</p>
                    <Badge variant="outline">{detailDialogScreen.venueCategory || 'Standard'}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Price per day</p>
                    <p className="text-2xl font-bold text-primary">
                      {detailDialogScreen.isMultiScreen && detailDialogScreen.numberOfScreens ? (
                        <>₹{detailDialogScreen.pricePerDay.toLocaleString()}<span className="text-base font-normal text-muted-foreground"> × {detailDialogScreen.numberOfScreens}</span></>
                      ) : (
                        <>₹{detailDialogScreen.pricePerDay.toLocaleString()}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Minimum booking</p>
                    <p className="text-xl font-semibold">{detailDialogScreen.minBookingDays} days</p>
                  </div>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t">
                  <Button
                    className="w-full"
                    size="lg"
                    variant={selectedScreenIds.has(detailDialogScreen.id) ? "secondary" : "default"}
                    onClick={() => {
                      toggleScreenSelection(detailDialogScreen);
                      setDetailDialogScreen(null);
                    }}
                    data-testid={`button-toggle-detail-${detailDialogScreen.id}`}
                  >
                    {selectedScreenIds.has(detailDialogScreen.id) ? (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Selected - Click to Remove
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        Add to Campaign
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
