import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { GoogleMap, useLoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Plus, Check, ShoppingCart, Trash2, List, Map as MapIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Screen } from "@shared/schema";
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

  const filteredScreens = screens.filter((screen) => {
    if (filters.city && !screen.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    if (filters.type && screen.type !== filters.type) return false;
    if (filters.minPrice && screen.pricePerDay < parseInt(filters.minPrice)) return false;
    if (filters.maxPrice && screen.pricePerDay > parseInt(filters.maxPrice)) return false;
    return screen.status === "active";
  });

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
                              <p className="text-sm font-medium truncate">{screen.name}</p>
                              <p className="text-xs text-muted-foreground">{screen.city}</p>
                              <p className="text-xs font-semibold text-primary mt-1">₹{screen.pricePerDay.toLocaleString()}/day</p>
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

      {/* Content - List or Map View */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "list" ? (
          <div className="h-full overflow-y-auto p-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {paginatedScreens.map((screen) => (
                <Card key={screen.id} className="hover-elevate" data-testid={`card-screen-${screen.id}`}>
                  <CardHeader className="gap-2 space-y-0 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="secondary">{screen.type}</Badge>
                    </div>
                    <CardTitle className="text-lg">{screen.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{screen.location}, {screen.city}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{screen.size}</Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <p className="text-muted-foreground">Price/Day</p>
                        <p className="font-semibold text-primary">₹{screen.pricePerDay.toLocaleString()}</p>
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
                {filteredScreens.map((screen) => (
                  <Marker
                    key={screen.id}
                    position={{ lat: parseFloat(screen.latitude.toString()), lng: parseFloat(screen.longitude.toString()) }}
                    onClick={() => setSelectedScreen(screen)}
                    icon={{
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: selectedScreenIds.has(screen.id) ? 12 : 8,
                      fillColor: selectedScreenIds.has(screen.id) ? "#10b981" : "#3b82f6",
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                    }}
                  />
                ))}

                {selectedScreen && (
                  <InfoWindow
                    position={{ lat: parseFloat(selectedScreen.latitude.toString()), lng: parseFloat(selectedScreen.longitude.toString()) }}
                    onCloseClick={() => setSelectedScreen(null)}
                  >
                    <Card className="border-0 shadow-none max-w-sm">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-bold text-lg mb-1">{selectedScreen.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{selectedScreen.location}, {selectedScreen.city}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="secondary">{selectedScreen.type}</Badge>
                            <Badge variant="outline">{selectedScreen.size}</Badge>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <p className="text-muted-foreground">Price/Day</p>
                              <p className="font-semibold text-primary">₹{selectedScreen.pricePerDay.toLocaleString()}</p>
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
                      </CardContent>
                    </Card>
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
