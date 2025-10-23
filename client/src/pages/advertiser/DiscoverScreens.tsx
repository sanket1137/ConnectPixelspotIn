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
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCart, setShowCart] = useState(false);
  const itemsPerPage = 12;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [filters, setFilters] = useState({
    city: "",
    type: "",
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

  // Tiered fallback strategy: progressively drop filters if no results
  const getFilteredScreens = () => {
    const activeScreens = screens.filter(s => s.status === "active");
    
    // Try strict match (all filters)
    const applyFilters = (filtersToApply: typeof filters) => {
      return activeScreens.filter((screen) => {
        if (filtersToApply.city && !screen.city.toLowerCase().includes(filtersToApply.city.toLowerCase())) return false;
        if (filtersToApply.type && screen.type !== filtersToApply.type) return false;
        if (filtersToApply.minPrice && screen.pricePerDay < parseInt(filtersToApply.minPrice)) return false;
        if (filtersToApply.maxPrice && screen.pricePerDay > parseInt(filtersToApply.maxPrice)) return false;
        return true;
      });
    };
    
    let results = applyFilters(filters);
    let relaxedFilters: string[] = [];
    
    // If no results, progressively drop filters (least important first)
    if (results.length === 0 && (filters.city || filters.type || filters.minPrice || filters.maxPrice)) {
      // Drop type filter (least important)
      if (filters.type) {
        const withoutType = { ...filters, type: "" };
        results = applyFilters(withoutType);
        if (results.length > 0) {
          relaxedFilters.push("Screen Type");
          return { results, relaxedFilters };
        }
      }
      
      // Drop maxPrice filter
      if (filters.maxPrice) {
        const withoutMaxPrice = { ...filters, type: "", maxPrice: "" };
        results = applyFilters(withoutMaxPrice);
        if (results.length > 0) {
          if (filters.type) relaxedFilters.push("Screen Type");
          relaxedFilters.push("Max Price");
          return { results, relaxedFilters };
        }
      }
      
      // Drop minPrice filter
      if (filters.minPrice) {
        const withoutPriceFilters = { ...filters, type: "", minPrice: "", maxPrice: "" };
        results = applyFilters(withoutPriceFilters);
        if (results.length > 0) {
          if (filters.type) relaxedFilters.push("Screen Type");
          if (filters.maxPrice) relaxedFilters.push("Max Price");
          relaxedFilters.push("Min Price");
          return { results, relaxedFilters };
        }
      }
      
      // Last resort: show all active screens in city (or all if no city filter)
      results = activeScreens.filter(s => 
        !filters.city || s.city.toLowerCase().includes(filters.city.toLowerCase())
      );
      if (filters.type) relaxedFilters.push("Screen Type");
      if (filters.maxPrice) relaxedFilters.push("Max Price");
      if (filters.minPrice) relaxedFilters.push("Min Price");
      if (!filters.city && results.length > 0) {
        relaxedFilters.push("City");
      }
    }
    
    return { results, relaxedFilters };
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
        <div className="p-4 space-y-4">
          {/* First Row: View Toggle, Filters, and Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("list")}
                data-testid="button-list-view"
                className="gap-2"
              >
                <List className="h-4 w-4" />
                List
              </Button>
              <Button
                variant={viewMode === "map" ? "default" : "ghost"}
                size="sm"
                onClick={() => handleViewModeChange("map")}
                data-testid="button-map-view"
                className="gap-2"
              >
                <MapIcon className="h-4 w-4" />
                Map
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 flex-1">
              {/* City Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search city..."
                  className="pl-10"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  data-testid="input-search-city"
                />
              </div>

              {/* Screen Type */}
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger className="w-[180px]" data-testid="select-screen-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">All types</SelectItem>
                  <SelectItem value="billboard">Billboard</SelectItem>
                  <SelectItem value="digital">Digital Screen</SelectItem>
                  <SelectItem value="transit">Transit</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>

              {/* Price Range */}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min ₹"
                  className="w-24"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  data-testid="input-min-price"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max ₹"
                  className="w-24"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  data-testid="input-max-price"
                />
              </div>

              {/* Clear Filters */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ city: "", type: "", minPrice: "", maxPrice: "" })}
                data-testid="button-clear-filters"
              >
                Clear
              </Button>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Results count */}
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
        </div>
      </div>

      {/* Relaxed Filters Alert */}
      {relaxedFilters.length > 0 && (
        <div className="px-6 pt-4">
          <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900" data-testid="alert-relaxed-filters">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>No exact matches found.</strong> Showing results without: <strong>{relaxedFilters.join(", ")}</strong> filter{relaxedFilters.length > 1 ? "s" : ""}.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Content - List or Map View */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedScreens.map((screen) => (
                <Card key={screen.id} className="hover-elevate overflow-hidden" data-testid={`card-screen-${screen.id}`}>
                  {/* Screen Image */}
                  <div className="relative h-48 bg-muted overflow-hidden">
                    {screen.images && screen.images.length > 0 ? (
                      <img
                        src={screen.images[0]}
                        alt={screen.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/400x300/1a1a1a/666?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <MapPin className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <Badge className="absolute top-2 right-2" variant="secondary">{screen.type}</Badge>
                  </div>

                  <CardHeader className="gap-2 space-y-0 pb-4">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{screen.name}</CardTitle>
                      {screen.isMultiScreen && screen.numberOfScreens && (
                        <Badge variant="default" className="text-xs bg-purple-600 hover:bg-purple-700">
                          🖥️ Multi-Venue: {screen.numberOfScreens}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{screen.location}, {screen.city}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{screen.size}</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">Price/Day</p>
                        <p className="font-semibold text-primary">
                          {screen.isMultiScreen && screen.numberOfScreens ? (
                            <>₹{screen.pricePerDay.toLocaleString()} × {screen.numberOfScreens}</>
                          ) : (
                            <>₹{screen.pricePerDay.toLocaleString()}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">Min Booking</p>
                        <p className="font-semibold">{screen.minBookingDays} days</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        variant={selectedScreenIds.has(screen.id) ? "secondary" : "default"}
                        onClick={() => toggleScreenSelection(screen)}
                        data-testid={`button-toggle-screen-${screen.id}`}
                      >
                        {selectedScreenIds.has(screen.id) ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Selected
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
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
                  >
                    <div className="max-w-sm">
                      {/* Screen Image */}
                      <div className="relative h-40 bg-muted overflow-hidden rounded-t-md mb-3">
                        {selectedScreen.images && selectedScreen.images.length > 0 ? (
                          <img
                            src={selectedScreen.images[0]}
                            alt={selectedScreen.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://placehold.co/400x250/1a1a1a/666?text=No+Image';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <MapPin className="w-10 h-10 text-muted-foreground/50" />
                          </div>
                        )}
                        <Badge className="absolute top-2 right-2" variant="secondary">{selectedScreen.type}</Badge>
                      </div>

                      <div className="space-y-3 px-1">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{selectedScreen.name}</h3>
                            {selectedScreen.isMultiScreen && selectedScreen.numberOfScreens && (
                              <Badge variant="default" className="text-xs bg-purple-600 hover:bg-purple-700">
                                🖥️ Multi-Venue: {selectedScreen.numberOfScreens}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{selectedScreen.location}, {selectedScreen.city}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{selectedScreen.size}</Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <p className="text-muted-foreground">Price/Day</p>
                            <p className="font-semibold text-primary">
                              {selectedScreen.isMultiScreen && selectedScreen.numberOfScreens ? (
                                <>₹{selectedScreen.pricePerDay.toLocaleString()} × {selectedScreen.numberOfScreens}</>
                              ) : (
                                <>₹{selectedScreen.pricePerDay.toLocaleString()}</>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <p className="text-muted-foreground">Min Booking</p>
                            <p className="font-semibold">{selectedScreen.minBookingDays} days</p>
                          </div>
                        </div>

                        <Button
                          className="w-full"
                          variant={selectedScreenIds.has(selectedScreen.id) ? "secondary" : "default"}
                          onClick={() => toggleScreenSelection(selectedScreen)}
                          data-testid={`button-toggle-screen-${selectedScreen.id}`}
                        >
                          {selectedScreenIds.has(selectedScreen.id) ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Selected
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Add to Campaign
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
