import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Map, { Marker, Popup } from "react-map-gl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Filter, X, Eye, Plus, Check, ShoppingCart, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Screen } from "@shared/schema";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";
const SELECTED_SCREENS_KEY = "selectedScreenIds";

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

  const [viewState, setViewState] = useState({
    longitude: 77.5946,
    latitude: 12.9716,
    zoom: 11,
  });

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
                <SelectTrigger className="mt-2" data-testid="select-screen-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="billboard">Billboard</SelectItem>
                  <SelectItem value="digital_display">Digital Display</SelectItem>
                  <SelectItem value="led_screen">LED Screen</SelectItem>
                  <SelectItem value="video_wall">Video Wall</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Price Range (per day)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  data-testid="input-min-price"
                />
                <Input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  data-testid="input-max-price"
                />
              </div>
            </div>

            {selectedScreens.length > 0 && (
              <>
                <div className="border-t border-border pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Selected Screens ({selectedScreens.length})</h3>
                    <Button 
                      size="sm" 
                      onClick={proceedToCreateCampaign}
                      data-testid="button-create-campaign"
                    >
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Create Campaign
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedScreens.map((screen) => (
                      <Card key={screen.id} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{screen.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{screen.city}</p>
                            <p className="text-xs font-semibold text-primary mt-1">₹{screen.pricePerDay}/day</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => removeScreen(screen.id)}
                            data-testid={`button-remove-${screen.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Map View */}
      <div className="flex-1 relative">
        {!showFilters && (
          <Button
            variant="outline"
            size="icon"
            className="absolute top-4 left-4 z-10 shadow-lg"
            onClick={() => setShowFilters(true)}
            data-testid="button-show-filters"
          >
            <Filter className="h-5 w-5" />
          </Button>
        )}

        {selectedScreenIds.size > 0 && (
          <div className="absolute top-4 right-4 z-10">
            <Card className="p-3 shadow-lg">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <span className="font-semibold">{selectedScreenIds.size} selected</span>
              </div>
            </Card>
          </div>
        )}

        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          mapStyle="mapbox://styles/mapbox/streets-v12"
          mapboxAccessToken={MAPBOX_TOKEN}
          style={{ width: "100%", height: "100%" }}
        >
          {filteredScreens.map((screen) => (
            <Marker
              key={screen.id}
              longitude={parseFloat(screen.longitude)}
              latitude={parseFloat(screen.latitude)}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedScreen(screen);
              }}
            >
              <div
                className={`cursor-pointer transition-transform hover:scale-110 ${
                  selectedScreenIds.has(screen.id) ? "opacity-100" : "opacity-80"
                }`}
              >
                <MapPin
                  className={`h-8 w-8 ${
                    selectedScreenIds.has(screen.id) ? "text-green-500 fill-green-500" : "text-primary fill-primary"
                  }`}
                />
              </div>
            </Marker>
          ))}

          {selectedScreen && (
            <Popup
              longitude={parseFloat(selectedScreen.longitude)}
              latitude={parseFloat(selectedScreen.latitude)}
              onClose={() => setSelectedScreen(null)}
              closeOnClick={false}
              className="min-w-[300px]"
            >
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{selectedScreen.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedScreen.location}, {selectedScreen.city}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Type:</span>
                    <span className="font-medium">{selectedScreen.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-medium">{selectedScreen.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-bold text-primary">₹{selectedScreen.pricePerDay}/day</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => toggleScreenSelection(selectedScreen)}
                  variant={selectedScreenIds.has(selectedScreen.id) ? "secondary" : "default"}
                  data-testid="button-toggle-screen"
                >
                  {selectedScreenIds.has(selectedScreen.id) ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Campaign
                    </>
                  )}
                </Button>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </div>
  );
}
