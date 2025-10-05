import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Map, { Marker, Popup } from "react-map-gl";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Filter, X, Eye, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Screen } from "@shared/schema";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || "";

export default function DiscoverScreens() {
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [showFilters, setShowFilters] = useState(true);
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

  return (
    <div className="h-screen flex">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-96 bg-card border-r border-border p-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground font-serif">Filters</h2>
            <Button variant="ghost" size="icon" onClick={() => setShowFilters(false)}>
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

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setFilters({ city: "", type: "", minPrice: "", maxPrice: "" })}
            >
              Clear Filters
            </Button>
          </div>

          {/* Results List */}
          <div className="mt-8">
            <h3 className="font-semibold text-foreground mb-4" data-testid="text-results-count">
              {filteredScreens.length} Screens Found
            </h3>
            <div className="space-y-3">
              {filteredScreens.slice(0, 10).map((screen) => (
                <Card
                  key={screen.id}
                  className="p-4 hover-elevate cursor-pointer"
                  onClick={() => {
                    setSelectedScreen(screen);
                    setViewState({
                      longitude: parseFloat(screen.longitude),
                      latitude: parseFloat(screen.latitude),
                      zoom: 14,
                    });
                  }}
                  data-testid={`card-screen-${screen.id}`}
                >
                  <h4 className="font-semibold text-foreground mb-1">{screen.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {screen.location}, {screen.city}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">{screen.type}</Badge>
                    <span className="font-semibold text-primary">₹{screen.pricePerDay}/day</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {!showFilters && (
          <Button
            className="absolute top-4 left-4 z-10"
            onClick={() => setShowFilters(true)}
            data-testid="button-show-filters"
          >
            <Filter className="mr-2 h-4 w-4" />
            Show Filters
          </Button>
        )}

        {MAPBOX_TOKEN ? (
          <Map
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: "100%", height: "100%" }}
            mapStyle="mapbox://styles/mapbox/dark-v11"
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
                <div className="cursor-pointer hover:scale-110 transition-transform">
                  <MapPin className="h-8 w-8 text-primary drop-shadow-lg" fill="currentColor" />
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
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" data-testid="button-view-details">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" data-testid="button-add-to-campaign">
                      <Plus className="mr-2 h-4 w-4" />
                      Add to Campaign
                    </Button>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <div className="text-center space-y-4 max-w-md p-8">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto" />
              <h3 className="text-xl font-semibold text-foreground">Mapbox Token Required</h3>
              <p className="text-muted-foreground">
                Please add your Mapbox access token to enable the interactive map feature.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
