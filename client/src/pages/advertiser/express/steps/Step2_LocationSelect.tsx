import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { MapPin, Building2, Navigation, MousePointerClick } from "lucide-react";
import { Map, AdvancedMarker, useMap, useMapsLibrary, MapMouseEvent } from "@vis.gl/react-google-maps";
import { Badge } from "@/components/ui/badge";

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India center

interface Props {
  locationMode: "city" | "pin";
  targetCity: string;
  pinLat: number;
  pinLng: number;
  radiusKm: number;
  onLocationModeChange: (mode: "city" | "pin") => void;
  onCityChange: (city: string) => void;
  onPinChange: (lat: number, lng: number) => void;
  onRadiusChange: (km: number) => void;
  error?: string;
}

/** Circle overlay using the imperative Maps API */
function CircleOverlay({ center, radius }: { center: { lat: number; lng: number }; radius: number }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  useEffect(() => {
    if (!map || !mapsLib) return;
    const circle = new mapsLib.Circle({
      map,
      center,
      radius,
      fillColor: "#f59e0b",
      fillOpacity: 0.12,
      strokeColor: "#f59e0b",
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });
    return () => circle.setMap(null);
  }, [map, mapsLib, center.lat, center.lng, radius]);
  return null;
}

/** Imperatively pans map to target when it changes */
function MapPanner({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom !== undefined) map.setZoom(target.zoom);
  }, [map, target]);
  return null;
}

export default function Step2_LocationSelect({
  locationMode,
  targetCity,
  pinLat,
  pinLng,
  radiusKm,
  onLocationModeChange,
  onCityChange,
  onPinChange,
  onRadiusChange,
  error,
}: Props) {
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  const { data: locationsData } = useQuery<{ states: string[]; cities: Record<string, string[]>; allCities: string[] }>({
    queryKey: ["/api/screens/locations"],
  });
  const allCities = locationsData?.allCities || [];

  const handleMapClick = (e: MapMouseEvent) => {
    if (!e.detail.latLng) return;
    const { lat, lng } = e.detail.latLng;
    onPinChange(lat, lng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      onPinChange(latitude, longitude);
      setPanTarget({ lat: latitude, lng: longitude, zoom: 14 });
    });
  };

  const radiusLabel = radiusKm < 1 ? `${Math.round(radiusKm * 1000)}m` : `${radiusKm}km`;
  const hasPinDropped = pinLat !== 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Choose your location</h2>
        <p className="text-sm text-muted-foreground">Select a city or drop a pin — we'll load screens in that area</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => onLocationModeChange("city")}
          className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
            locationMode === "city" ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/40"
          }`}
          data-testid="button-mode-city"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${locationMode === "city" ? "bg-amber-500/20" : "bg-muted"}`}>
            <Building2 className={`h-5 w-5 ${locationMode === "city" ? "text-amber-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">Select City</p>
            <p className="text-xs text-muted-foreground">All screens in a city</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onLocationModeChange("pin")}
          className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
            locationMode === "pin" ? "border-amber-500 bg-amber-500/5" : "border-border hover:border-amber-500/40"
          }`}
          data-testid="button-mode-pin"
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${locationMode === "pin" ? "bg-amber-500/20" : "bg-muted"}`}>
            <MapPin className={`h-5 w-5 ${locationMode === "pin" ? "text-amber-500" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">Drop a Pin</p>
            <p className="text-xs text-muted-foreground">Screens within a radius</p>
          </div>
        </button>
      </div>

      {/* City mode */}
      {locationMode === "city" && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select City</Label>
          <Select value={targetCity} onValueChange={onCityChange}>
            <SelectTrigger className="h-12" data-testid="select-city">
              <SelectValue placeholder="Choose a city..." />
            </SelectTrigger>
            <SelectContent>
              {allCities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}

      {/* Pin mode */}
      {locationMode === "pin" && (
        <div className="space-y-4">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Drop a pin on the map</Label>
              {!hasPinDropped && (
                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                  <MousePointerClick className="h-3 w-3" />
                  Click anywhere on the map to set your location
                </p>
              )}
              {hasPinDropped && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  ✓ Pin set — click again to move it
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUseMyLocation}
              className="gap-1.5 shrink-0"
              data-testid="button-use-location"
            >
              <Navigation className="h-3.5 w-3.5" />
              Use my location
            </Button>
          </div>

          {/* Map — taller, no controlled center, click to drop pin */}
          <div className={`rounded-xl overflow-hidden border relative ${hasPinDropped ? "h-80" : "h-96"}`}>
            {/* Overlay prompt when no pin yet */}
            {!hasPinDropped && (
              <div className="absolute inset-0 z-10 pointer-events-none flex items-end justify-center pb-4">
                <div className="bg-black/70 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4" />
                  Click on the map to drop your pin
                </div>
              </div>
            )}
            <Map
              mapId="express-pin-map"
              defaultCenter={DEFAULT_CENTER}
              defaultZoom={5}
              gestureHandling="greedy"
              disableDefaultUI
              zoomControl
              onClick={handleMapClick}
              style={{ width: "100%", height: "100%", cursor: "crosshair" }}
            >
              <MapPanner target={panTarget} />
              {hasPinDropped && (
                <>
                  <AdvancedMarker position={{ lat: pinLat, lng: pinLng }} />
                  <CircleOverlay
                    center={{ lat: pinLat, lng: pinLng }}
                    radius={radiusKm * 1000}
                  />
                </>
              )}
            </Map>
          </div>

          {/* Radius slider — only shown once pin is dropped */}
          {hasPinDropped && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Search Radius</Label>
                <Badge variant="secondary" className="font-mono">{radiusLabel}</Badge>
              </div>
              <Slider
                min={0.5}
                max={25}
                step={0.5}
                value={[radiusKm]}
                onValueChange={([val]) => onRadiusChange(val)}
                className="w-full"
                data-testid="slider-radius"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>500m</span>
                <span>25km</span>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
