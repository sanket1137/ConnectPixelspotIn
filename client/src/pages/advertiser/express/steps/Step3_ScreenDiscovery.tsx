import { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { MapPin, Check, Users, Clock, Monitor, Loader2, Home, Sun, SunMoon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Screen } from "@shared/schema";

interface Props {
  locationMode: "city" | "pin";
  targetCity: string;
  pinLat: number;
  pinLng: number;
  radiusKm: number;
  selectedScreenIds: string[];
  screensData: Screen[];
  onScreensLoaded: (screens: Screen[]) => void;
  onToggleScreen: (screenId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  error?: string;
}

function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function AvailabilityBadge({ available }: { available: boolean | null | undefined }) {
  if (available === false)
    return <Badge variant="destructive" className="text-xs">Unavailable</Badge>;
  return <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-700">Available</Badge>;
}

export default function Step3_ScreenDiscovery({
  locationMode,
  targetCity,
  pinLat,
  pinLng,
  radiusKm,
  selectedScreenIds,
  screensData,
  onScreensLoaded,
  onToggleScreen,
  onSelectAll,
  onClearAll,
  error,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [initialCenter] = useState(
    locationMode === "pin" && pinLat !== 0
      ? { lat: pinLat, lng: pinLng }
      : { lat: 20.5937, lng: 78.9629 }
  );
  const [envFilter, setEnvFilter] = useState("all");
  const [initialZoom] = useState(locationMode === "city" ? 11 : 13);
  // Target for imperative pan — set to trigger MapController
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  // The screen currently shown in the InfoWindow
  const [infoWindowScreen, setInfoWindowScreen] = useState<Screen | null>(null);
  // The screen highlighted (list hover → pin pulse / pin click → list glow)
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const prevKey = useRef("");
  // Refs for each list card so we can scroll to them
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── Fetch screens ─────────────────────────────────────────────────────────
  useEffect(() => {
    const key =
      locationMode === "city"
        ? `city:${targetCity}`
        : `pin:${pinLat},${pinLng},${radiusKm}`;

    if (key === prevKey.current && screensData.length > 0) return;

    let url = "";
    if (locationMode === "city" && targetCity) {
      url = `/api/screens/in-area?city=${encodeURIComponent(targetCity)}`;
    } else if (locationMode === "pin" && pinLat !== 0) {
      url = `/api/screens/in-area?lat=${pinLat}&lng=${pinLng}&radiusKm=${radiusKm}`;
    }
    if (!url) return;

    prevKey.current = key;
    setIsLoading(true);
    setFetchError(null);

    apiRequest("GET", url)
      .then((res) => res.json())
      .then((data: Screen[]) => {
        onScreensLoaded(data);
        const first = data.find(
          (s) => s.latitude && s.longitude && Number(s.latitude) !== 0
        );
        if (first) {
          setPanTarget({ lat: Number(first.latitude), lng: Number(first.longitude), zoom: locationMode === "city" ? 11 : 13 });
        } else if (locationMode === "pin" && pinLat !== 0) {
          setPanTarget({ lat: pinLat, lng: pinLng });
        }
      })
      .catch((e) => {
        console.error("Error fetching screens:", e);
        setFetchError("Failed to load screens. Please try again.");
      })
      .finally(() => setIsLoading(false));
  }, [locationMode, targetCity, pinLat, pinLng, radiusKm]);

  // ── Filtered screens ──────────────────────────────────────────────────────
  const filteredScreens = screensData.filter((s) => {
    if (envFilter === "all") return true;
    if (envFilter === "indoor") return s.environmentType?.toLowerCase().includes("indoor") && !s.environmentType?.toLowerCase().includes("semi");
    if (envFilter === "outdoor") return s.environmentType?.toLowerCase().includes("outdoor") && !s.environmentType?.toLowerCase().includes("semi");
    if (envFilter === "semi") return s.environmentType?.toLowerCase().includes("semi");
    return true;
  });

  // ── Sorted list & map screens ─────────────────────────────────────────────
  const sortedScreens = [...filteredScreens].sort((a, b) => {
    if (locationMode === "pin" && pinLat !== 0) {
      const da = distanceKm(pinLat, pinLng, Number(a.latitude), Number(a.longitude));
      const db = distanceKm(pinLat, pinLng, Number(b.latitude), Number(b.longitude));
      return da - db;
    }
    return 0;
  });

  const screensWithCoords = filteredScreens.filter(
    (s) => s.latitude && s.longitude && Number(s.latitude) !== 0
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  /** Pin clicked on map → show InfoWindow + highlight + scroll list */
  const handlePinClick = (screen: Screen) => {
    setInfoWindowScreen(screen);
    setHighlightedId(screen.id);
    // Scroll the list card into view
    setTimeout(() => {
      cardRefs.current[screen.id]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }, 50);
  };

  /** List card hovered → highlight its pin on map */
  const handleCardHover = (id: string | null) => {
    setHighlightedId(id);
  };

  /** List card clicked → toggle selection + move map center + highlight */
  const handleCardClick = (screen: Screen) => {
    onToggleScreen(screen.id);
    setHighlightedId(screen.id);
    if (screen.latitude && screen.longitude && Number(screen.latitude) !== 0) {
      setPanTarget({ lat: Number(screen.latitude), lng: Number(screen.longitude), zoom: 14 });
    }
  };

  // Inner component that imperatively pans the map using useMap()
  function MapController() {
    const map = useMap();
    useEffect(() => {
      if (!map || !panTarget) return;
      map.panTo({ lat: panTarget.lat, lng: panTarget.lng });
      if (panTarget.zoom !== undefined) map.setZoom(panTarget.zoom);
      setPanTarget(null);
    }, [map, panTarget]);
    return null;
  }

  const locationLabel =
    locationMode === "city" ? targetCity : `${radiusKm}km radius`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Select your screens</h2>
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading screens in {locationLabel}…
              </span>
            ) : (
              <>
                {screensData.length} screen{screensData.length !== 1 ? "s" : ""} found
                {locationMode === "city" ? ` in ${targetCity}` : ` within ${radiusKm}km`}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            disabled={isLoading || screensData.length === 0}
            data-testid="button-select-all"
          >
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll} data-testid="button-clear-all">
            Clear
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Tabs defaultValue="all" className="w-full" onValueChange={setEnvFilter}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="indoor" className="text-xs gap-1.5 flex items-center">
            <Home className="h-3.5 w-3.5" /> Indoor
          </TabsTrigger>
          <TabsTrigger value="outdoor" className="text-xs gap-1.5 flex items-center">
            <Sun className="h-3.5 w-3.5" /> Outdoor
          </TabsTrigger>
          <TabsTrigger value="semi" className="text-xs gap-1.5 flex items-center">
            <SunMoon className="h-3.5 w-3.5" /> Semi
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {(error || fetchError) && (
        <p className="text-sm text-destructive">{error || fetchError}</p>
      )}

      {/* Main split layout — always rendered */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[500px]">
        {/* ── Left: Screen List ── */}
        <div ref={listRef} className="overflow-y-auto space-y-2 pr-1">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 rounded-xl border-2 border-border animate-pulse">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                    <div className="flex gap-1.5">
                      <div className="h-5 bg-muted rounded w-16" />
                      <div className="h-5 bg-muted rounded w-20" />
                    </div>
                  </div>
                  <div className="h-8 bg-muted rounded w-14" />
                </div>
              </div>
            ))
          ) : screensData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed rounded-xl py-12">
              <Monitor className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">No screens found in this area</p>
              <p className="text-sm text-muted-foreground">
                Try a different city or increase the radius
              </p>
            </div>
          ) : (
            sortedScreens.map((screen) => {
              const isSelected = selectedScreenIds.includes(screen.id);
              const isHighlighted = highlightedId === screen.id;
              const dist =
                locationMode === "pin" && pinLat !== 0
                  ? distanceKm(
                      pinLat,
                      pinLng,
                      Number(screen.latitude),
                      Number(screen.longitude)
                    )
                  : null;

              return (
                <div
                  key={screen.id}
                  ref={(el) => { cardRefs.current[screen.id] = el; }}
                  onClick={() => handleCardClick(screen)}
                  onMouseEnter={() => handleCardHover(screen.id)}
                  onMouseLeave={() => handleCardHover(null)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    isHighlighted && !isSelected
                      ? "border-violet-500 bg-violet-500/5 shadow-md"
                      : isSelected
                      ? "border-amber-500 bg-amber-500/5 shadow-sm"
                      : "border-border hover:border-amber-500/40 bg-card"
                  }`}
                  data-testid={`card-screen-${screen.id}`}
                >
                  <div className="flex gap-3">
                    {/* Screen Image */}
                    <div className="w-32 h-24 rounded-lg overflow-hidden shrink-0 border bg-muted group overflow-hidden relative">
                      {screen.screenImages && screen.screenImages.length > 0 ? (
                        <img
                          src={screen.screenImages[0]}
                          alt={screen.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Monitor className="h-8 w-8" />
                        </div>
                      )}
                      {screen.environmentType && (
                        <div className="absolute top-1 left-1">
                           <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] bg-black/60 text-white border-0 backdrop-blur-sm uppercase">
                             {screen.environmentType.split(' ')[0]}
                           </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{screen.name}</p>
                            {isSelected && <Check className="h-4 w-4 text-amber-500 shrink-0" />}
                            {isHighlighted && !isSelected && (
                              <MapPin className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            <MapPin className="inline h-3 w-3 mr-0.5" />
                            {screen.location}, {screen.city}
                            {dist !== null && (
                              <span className="ml-1 text-amber-600">• {dist.toFixed(1)}km</span>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Monitor className="h-2.5 w-2.5" />
                              {screen.size || screen.type}
                            </Badge>
                            {screen.avgDailyFootfall && (
                              <Badge variant="outline" className="text-xs gap-1 text-[10px]">
                                <Users className="h-2.5 w-2.5" />
                                {Number(screen.avgDailyFootfall).toLocaleString()}
                              </Badge>
                            )}
                            <AvailabilityBadge available={screen.status === "active"} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">per day</p>
                          <p className="font-bold text-sm text-amber-600">
                            ₹{screen.pricePerDay.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Right: Map ── */}
        <div className="rounded-xl overflow-hidden border h-full relative">
          {isLoading && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading map…
              </div>
            </div>
          )}
          <Map
            mapId="express-screens-map"
            defaultCenter={initialCenter}
            defaultZoom={initialZoom}
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl
            style={{ width: "100%", height: "100%" }}
          >
            <MapController />
            {screensWithCoords.map((screen) => {
              const isSelected = selectedScreenIds.includes(screen.id);
              const isHighlighted = highlightedId === screen.id;

              return (
                <AdvancedMarker
                  key={screen.id}
                  position={{
                    lat: Number(screen.latitude),
                    lng: Number(screen.longitude),
                  }}
                  onClick={() => handlePinClick(screen)}
                >
                  <div
                    className="flex items-center justify-center rounded-full border-2 shadow-lg cursor-pointer transition-all duration-150"
                    style={{
                      width: isHighlighted ? 36 : isSelected ? 30 : 26,
                      height: isHighlighted ? 36 : isSelected ? 30 : 26,
                      backgroundColor: isHighlighted
                        ? "#7c3aed"           // violet when highlighted
                        : isSelected
                        ? "#f59e0b"           // amber when selected
                        : "#ffffff",          // white when idle
                      borderColor: isHighlighted
                        ? "#fff"
                        : isSelected
                        ? "#fff"
                        : "#9ca3af",
                      boxShadow: isHighlighted
                        ? "0 0 0 4px rgba(124,58,237,0.3)"
                        : isSelected
                        ? "0 0 0 3px rgba(245,158,11,0.3)"
                        : undefined,
                      zIndex: isHighlighted ? 100 : isSelected ? 50 : 1,
                    }}
                  >
                    <Monitor
                      style={{
                        width: isHighlighted ? 18 : 14,
                        height: isHighlighted ? 18 : 14,
                        color: isHighlighted || isSelected ? "#fff" : "#4b5563",
                      }}
                    />
                  </div>
                </AdvancedMarker>
              );
            })}

            {infoWindowScreen && (
              <InfoWindow
                position={{ lat: Number(infoWindowScreen.latitude), lng: Number(infoWindowScreen.longitude) }}
                onCloseClick={() => { setInfoWindowScreen(null); setHighlightedId(null); }}
              >
                <div className="p-1 min-w-56">
                  {infoWindowScreen.screenImages && infoWindowScreen.screenImages.length > 0 && (
                    <div className="w-full h-28 rounded-md overflow-hidden mb-2 border">
                      <img 
                        src={infoWindowScreen.screenImages[0]} 
                        alt={infoWindowScreen.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="font-bold text-sm">{infoWindowScreen.name}</p>
                  <p className="text-xs text-gray-500 mb-1">{infoWindowScreen.city}</p>
                  <p className="text-sm font-semibold text-amber-600">₹{infoWindowScreen.pricePerDay.toLocaleString()}/day</p>
                  <button
                    onClick={() => { onToggleScreen(infoWindowScreen.id); setInfoWindowScreen(null); }}
                    className={`mt-2 w-full text-xs px-3 py-1.5 rounded font-medium ${
                      selectedScreenIds.includes(infoWindowScreen.id) ? "bg-gray-100 text-gray-700" : "bg-amber-600 text-white"
                    }`}
                  >
                    {selectedScreenIds.includes(infoWindowScreen.id) ? "✓ Selected" : "+ Select"}
                  </button>
                </div>
              </InfoWindow>
            )}
          </Map>
        </div>
      </div>

      {/* Sticky selected count */}
      {selectedScreenIds.length > 0 && (
        <div className="sticky bottom-0 bg-background border-t pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              <span className="text-amber-600 font-bold">{selectedScreenIds.length}</span>{" "}
              screen{selectedScreenIds.length !== 1 ? "s" : ""} selected
            </p>
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
              ₹
              {screensData
                .filter((s) => selectedScreenIds.includes(s.id))
                .reduce((sum, s) => sum + s.pricePerDay, 0)
                .toLocaleString()}
              /day
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
