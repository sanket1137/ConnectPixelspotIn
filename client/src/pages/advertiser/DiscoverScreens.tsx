import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Filter, X, Eye, Plus, Check, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Screen } from "@shared/schema";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const SELECTED_SCREENS_KEY = "selectedScreenIds";

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

export default function DiscoverScreens() {
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [filters, setFilters] = useState({
    city: "",
    type: "",
    minPrice: "",
    maxPrice: "",
  });

  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(11);

  // Load selected screens from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_SCREENS_KEY);
    if (saved) {
      setSelectedScreenIds(new Set(JSON.parse(saved)));
    }
  }, []);

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
    <div className="h-screen flex">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-96 bg-card border-r border-border p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground font-serif">Filters</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)} data-testid="button-close-filters">
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <Label htmlFor="search-city">City / Location</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-city"
                  placeholder="Search city..."
                  className="pl-10"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  data-testid="input-search-city"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="screen-type">Screen Type</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger id="screen-type" className="mt-2" data-testid="select-screen-type">
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
            </div>

            <div>
              <Label>Price Range (₹/day)</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                    data-testid="input-min-price"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                    data-testid="input-max-price"
                  />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFilters({ city: "", type: "", minPrice: "", maxPrice: "" })}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>

            {/* Selected Screens Summary */}
            {selectedScreenIds.size > 0 && (
              <Card className="mt-6">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Selected Screens</span>
                      <Badge variant="secondary" data-testid="badge-selected-count">{selectedScreenIds.size}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedScreens.map((screen) => (
                      <div key={screen.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{screen.name}</p>
                          <p className="text-xs text-muted-foreground">{screen.city}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => removeScreen(screen.id)}
                          data-testid={`button-remove-screen-${screen.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <Button
                    className="w-full mt-4"
                    onClick={proceedToCreateCampaign}
                    data-testid="button-proceed-campaign"
                  >
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-start gap-3 text-sm text-muted-foreground">
              <MapPin className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground mb-1">How it works</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Browse screens on the map</li>
                  <li>Click markers to view details</li>
                  <li>Add screens to your campaign</li>
                  <li>Proceed to create campaign</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Area */}
      <div className="flex-1 relative">
        {!showFilters && (
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 left-4 z-10 shadow-lg"
            onClick={() => setShowFilters(true)}
            data-testid="button-show-filters"
          >
            <Filter className="h-5 w-5" />
          </Button>
        )}

        {/* Results count */}
        <div className="absolute top-4 right-4 z-10 bg-card rounded-lg shadow-lg px-4 py-2 border border-border">
          <p className="text-sm font-medium" data-testid="text-results-count">
            {filteredScreens.length} screens found
          </p>
        </div>

        <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY}>
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={center}
            zoom={zoom}
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
                position={{ lat: screen.latitude, lng: screen.longitude }}
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
                position={{ lat: selectedScreen.latitude, lng: selectedScreen.longitude }}
                onCloseClick={() => setSelectedScreen(null)}
              >
                <Card className="border-0 shadow-none max-w-sm">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-bold text-lg mb-1">{selectedScreen.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{selectedScreen.address}, {selectedScreen.city}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary">{selectedScreen.type}</Badge>
                        <Badge variant="outline">{selectedScreen.size}</Badge>
                        {selectedScreen.isDigital && <Badge>Digital</Badge>}
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Daily Views</p>
                          <p className="font-semibold">{selectedScreen.dailyViews.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Price/Day</p>
                          <p className="font-semibold text-primary">₹{selectedScreen.pricePerDay.toLocaleString()}</p>
                        </div>
                      </div>

                      {selectedScreen.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {selectedScreen.description}
                        </p>
                      )}

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
        </LoadScript>
      </div>
    </div>
  );
}
