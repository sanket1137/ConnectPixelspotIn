import React, { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Check, Users, Monitor, Loader2, Home, Sun, SunMoon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Screen } from "@shared/schema";
import { LocationItem } from "@/components/map/MultiLocationSearch";
import { ScreenDetailsModal } from "@/components/screens/ScreenDetailsModal";

interface Props {
  locations: LocationItem[];
  selectedScreenIds: string[];
  screensData: Screen[];
  onScreensLoaded: (screens: Screen[]) => void;
  onToggleScreen: (screenId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  error?: string;
}

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

export default function Step3_ScreenDiscovery({
  locations,
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

  const defaultMapLoc = locations.find(l => l.type === 'map' && l.lat);
  const [initialCenter] = useState(
    defaultMapLoc ? { lat: defaultMapLoc.lat!, lng: defaultMapLoc.lng! } : { lat: 20.5937, lng: 78.9629 }
  );

  const [envFilter, setEnvFilter] = useState("all");
  const [initialZoom] = useState(defaultMapLoc ? 12 : 5);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [infoWindowScreen, setInfoWindowScreen] = useState<Screen | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [detailModalScreen, setDetailModalScreen] = useState<Screen | null>(null);

  const prevKey = useRef("");
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const listRef = useRef<HTMLDivElement | null>(null);

  // ── Fetch screens ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (locations.length === 0) return;
    const key = JSON.stringify(locations);
    if (key === prevKey.current && screensData.length > 0) return;
    const url = `/api/screens/in-area?locations=${encodeURIComponent(JSON.stringify(locations))}`;
    prevKey.current = key;
    setIsLoading(true);
    setFetchError(null);
    apiRequest("GET", url)
      .then(res => res.json())
      .then((data: Screen[]) => {
        onScreensLoaded(data);
        const first = data.find(s => s.latitude && s.longitude && Number(s.latitude) !== 0);
        if (first) {
          setPanTarget({ lat: Number(first.latitude), lng: Number(first.longitude), zoom: 12 });
        } else if (defaultMapLoc) {
          setPanTarget({ lat: defaultMapLoc.lat!, lng: defaultMapLoc.lng!, zoom: 12 });
        }
      })
      .catch(e => {
        console.error("Error fetching screens:", e);
        setFetchError("Failed to load screens. Please try again.");
      })
      .finally(() => setIsLoading(false));
  }, [locations]);

  // ── Pan to newly added location automatically ─────────────────────────────
  useEffect(() => {
    const mapLocs = locations.filter(l => l.type === 'map' && l.lat && l.lng);
    if (mapLocs.length > 0) {
      const last = mapLocs[mapLocs.length - 1];
      const radius = last.radiusKm || 5;
      const zoom = radius <= 2 ? 15 : radius <= 5 ? 13 : radius <= 15 ? 11 : radius <= 30 ? 9 : 8;
      setPanTarget({ lat: last.lat!, lng: last.lng!, zoom });
    }
  }, [locations.length]);

  // ── Filtered & sorted screens ─────────────────────────────────────────────
  const filteredScreens = screensData.filter(s => {
    if (envFilter === "all") return true;
    if (envFilter === "indoor") return s.environmentType?.toLowerCase().includes("indoor") && !s.environmentType?.toLowerCase().includes("semi");
    if (envFilter === "outdoor") return s.environmentType?.toLowerCase().includes("outdoor") && !s.environmentType?.toLowerCase().includes("semi");
    if (envFilter === "semi") return s.environmentType?.toLowerCase().includes("semi");
    return true;
  });

  const sortedScreens = [...filteredScreens].sort((a, b) => {
    const mapLocs = locations.filter(l => l.type === 'map' && l.lat !== undefined && l.lng !== undefined);
    if (mapLocs.length > 0) {
      const distA = Math.min(...mapLocs.map(l => distanceKm(l.lat!, l.lng!, Number(a.latitude), Number(a.longitude))));
      const distB = Math.min(...mapLocs.map(l => distanceKm(l.lat!, l.lng!, Number(b.latitude), Number(b.longitude))));
      return distA - distB;
    }
    return 0;
  });

  const screensWithCoords = filteredScreens.filter(
    s => s.latitude && s.longitude && Number(s.latitude) !== 0
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePinClick = (screen: Screen) => {
    setDetailModalScreen(screen);
    setHighlightedId(screen.id);
    setTimeout(() => {
      cardRefs.current[screen.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  };

  const handleCardHover = (id: string | null) => setHighlightedId(id);

  const handleCardClick = (screen: Screen) => {
    onToggleScreen(screen.id);
    setHighlightedId(screen.id);
    if (screen.latitude && screen.longitude && Number(screen.latitude) !== 0) {
      setPanTarget({ lat: Number(screen.latitude), lng: Number(screen.longitude), zoom: 14 });
    }
  };

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

  const locationLabel = locations.map(l => l.label).join(", ") || "selected locations";

  // ── Airbnb-style price bubble marker ─────────────────────────────────────
  const PriceBubble = ({ screen }: { screen: Screen }) => {
    const isSelected = selectedScreenIds.includes(screen.id);
    const isHovered = highlightedId === screen.id;
    const price = screen.pricePerDay >= 1000
      ? `₹${(screen.pricePerDay / 1000).toFixed(0)}k`
      : `₹${screen.pricePerDay}`;
    return (
      <div className="relative">
        <div className={`
          px-2.5 py-1 rounded-full font-bold text-[12px] shadow-md border-2 whitespace-nowrap cursor-pointer transition-all duration-150
          ${isSelected ? 'bg-blue-600 text-white border-white scale-110' : 'bg-white text-slate-800 border-white hover:scale-110'}
          ${isHovered && !isSelected ? 'shadow-xl scale-110' : ''}
        `}>{price}</div>
        <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0
          border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px]
          ${isSelected ? 'border-t-blue-600' : 'border-t-white'}
        `} />
      </div>
    );
  };

  // ── Airbnb-style card ─────────────────────────────────────────────────────
  const ScreenCard = ({ screen }: { screen: Screen }) => {
    const isSelected = selectedScreenIds.includes(screen.id);
    const isHovered = highlightedId === screen.id;
    const mapLocs = locations.filter(l => l.type === 'map' && l.lat !== undefined && l.lng !== undefined);
    const dist = mapLocs.length > 0
      ? Math.min(...mapLocs.map(l => distanceKm(l.lat!, l.lng!, Number(screen.latitude), Number(screen.longitude))))
      : null;

    return (
      <div
        ref={(el) => { cardRefs.current[screen.id] = el; }}
        className="group cursor-pointer flex flex-col gap-2"
        onMouseEnter={() => handleCardHover(screen.id)}
        onMouseLeave={() => handleCardHover(null)}
        onClick={() => handleCardClick(screen)}
      >
        {/* Image */}
        <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200 transition-all duration-150 ${isHovered ? 'ring-2 ring-blue-400' : ''} ${isSelected ? 'ring-2 ring-blue-600' : ''}`}>
          {screen.screenImages?.[0] ? (
            <img
              src={screen.screenImages[0]}
              alt={screen.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <Monitor className="h-10 w-10 text-slate-300" />
            </div>
          )}
          {isSelected && (
            <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow">
              <Check className="w-3 h-3" /> Selected
            </div>
          )}
          {screen.environmentType && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] bg-black/60 text-white border-0 backdrop-blur-sm uppercase">
                {screen.environmentType.split(' ')[0]}
              </Badge>
            </div>
          )}
          <button
            className={`absolute bottom-2 right-2 h-8 w-8 rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={(e) => { e.stopPropagation(); onToggleScreen(screen.id); }}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="space-y-0.5 px-0.5">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{screen.venueName || screen.name}, {screen.city}</h3>
            {dist !== null && <span className="text-xs text-slate-400 shrink-0 ml-1">{dist.toFixed(1)} km</span>}
          </div>
          <p className="text-xs text-slate-500 line-clamp-1">{screen.name} · {screen.category || screen.type}</p>
          {screen.avgDailyFootfall && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Users className="w-3 h-3" />
              {Number(screen.avgDailyFootfall).toLocaleString()} daily
            </div>
          )}
          <div className="pt-0.5">
            <span className="font-bold text-slate-900 text-sm">₹{(screen.pricePerDay || 0).toLocaleString()}</span>
            <span className="text-slate-400 text-xs"> / day</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-260px)] min-h-[560px] w-full bg-white border-y border-slate-200">
      {/* Header bar */}
      <div className="shrink-0 px-6 py-3 border-b border-slate-200 bg-white grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-4">
        {/* Left: Title & Info */}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">
            {isLoading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Loading screens in {locationLabel}…
              </span>
            ) : (
              <>Over {screensData.length.toLocaleString()} screen{screensData.length !== 1 ? "s" : ""}</>
            )}
          </h2>
          {!isLoading && <p className="text-xs text-slate-400 truncate pr-4">{locationLabel}</p>}
        </div>

        {/* Center: Filters */}
        <div className="flex justify-center">
          <Tabs defaultValue="all" onValueChange={setEnvFilter}>
            <TabsList className="h-8 bg-slate-100 rounded-full p-0.5 shadow-sm border border-slate-200/60">
              <TabsTrigger value="all" className="rounded-full h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm">All</TabsTrigger>
              <TabsTrigger value="indoor" className="rounded-full h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1">
                <Home className="h-3 w-3" /> Indoor
              </TabsTrigger>
              <TabsTrigger value="outdoor" className="rounded-full h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1">
                <Sun className="h-3 w-3" /> Outdoor
              </TabsTrigger>
              <TabsTrigger value="semi" className="rounded-full h-7 px-3 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1">
                <SunMoon className="h-3 w-3" /> Semi
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onSelectAll} disabled={isLoading || screensData.length === 0} className="rounded-full text-xs h-8 px-4" data-testid="button-select-all">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearAll} className="rounded-full text-xs h-8 px-4 text-slate-500 hover:text-slate-700" data-testid="button-clear-all">
            Clear
          </Button>
        </div>
      </div>

      {(error || fetchError) && (
        <p className="text-sm text-destructive px-6 py-2">{error || fetchError}</p>
      )}

      {/* Main split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Airbnb card grid */}
        <div ref={listRef} className="w-[52%] overflow-y-auto bg-white border-r border-slate-200">
          <div className="p-6">
            {isLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-slate-200 rounded-xl mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-3/4 mb-1" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : screensData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Monitor className="h-14 w-14 text-slate-200 mb-4" />
                <h3 className="text-base font-semibold text-slate-600">No screens found</h3>
                <p className="text-sm text-slate-400 mt-1">Try adding a different location or adjusting your radius.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pb-8">
                {sortedScreens.map(screen => (
                  <ScreenCard key={screen.id} screen={screen} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 relative bg-slate-50 p-4">
          <div className="w-full h-full rounded-2xl overflow-hidden shadow-md border border-slate-200/60 bg-slate-200 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading map…
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

              {/* Target location pins + circles */}
              {locations.filter(l => l.type === 'map' && l.lat && l.lng).map((loc, idx) => (
                <React.Fragment key={`target-${idx}`}>
                  <AdvancedMarker
                    position={{ lat: loc.lat!, lng: loc.lng! }}
                    onClick={() => {
                      const radius = loc.radiusKm || 5;
                      const zoom = radius <= 2 ? 15 : radius <= 5 ? 13 : radius <= 15 ? 11 : radius <= 30 ? 9 : 8;
                      setPanTarget({ lat: loc.lat!, lng: loc.lng!, zoom });
                    }}
                  >
                    <div className="w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  </AdvancedMarker>
                  <CircleOverlay center={{ lat: loc.lat!, lng: loc.lng! }} radius={(loc.radiusKm || 5) * 1000} />
                </React.Fragment>
              ))}

              {/* Screen price bubble markers */}
              {screensWithCoords.map(screen => (
                <AdvancedMarker
                  key={screen.id}
                  position={{ lat: Number(screen.latitude), lng: Number(screen.longitude) }}
                  onClick={() => handlePinClick(screen)}
                  zIndex={highlightedId === screen.id ? 100 : selectedScreenIds.includes(screen.id) ? 50 : 1}
                >
                  <PriceBubble screen={screen} />
                </AdvancedMarker>
              ))}
            </Map>
          </div>
        </div>
      </div>

      {/* Sticky bottom — selected count */}
      {selectedScreenIds.length > 0 && (
        <div className="shrink-0 bg-white border-t border-slate-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              <span className="text-amber-600 font-bold">{selectedScreenIds.length}</span> screen{selectedScreenIds.length !== 1 ? "s" : ""} selected
              {" · "}
              <span className="text-slate-500">
                ₹{screensData.filter(s => selectedScreenIds.includes(s.id)).reduce((sum, s) => sum + s.pricePerDay, 0).toLocaleString()}/day
              </span>
            </p>
            <Button variant="ghost" size="sm" onClick={onClearAll} className="text-xs text-slate-400 h-7">
              Clear all
            </Button>
          </div>
        </div>
      )}

      {/* Screen Details Modal (same as Find Screens) */}
      <ScreenDetailsModal
        isOpen={!!detailModalScreen}
        onClose={() => setDetailModalScreen(null)}
        screen={detailModalScreen}
        onAdd={(screen) => { onToggleScreen(screen.id); }}
        isAdded={detailModalScreen ? selectedScreenIds.includes(detailModalScreen.id) : false}
      />
    </div>
  );
}
