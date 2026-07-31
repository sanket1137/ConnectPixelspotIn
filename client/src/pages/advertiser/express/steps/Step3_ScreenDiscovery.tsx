import React, { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Check, Users, Monitor, Loader2, Home, Sun, SunMoon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Screen } from "@shared/schema";
import { MultiLocationSearch, LocationItem } from "@/components/map/MultiLocationSearch";
import { ScreenDetailsModal } from "@/components/screens/ScreenDetailsModal";
import { getScreenCountDisplay, calculateTotalPhysicalScreens, calculateScreenPricePerDay } from "@shared/utils";

interface Props {
  locations: LocationItem[];
  onChangeLocations: (locations: LocationItem[]) => void;
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
  onChangeLocations,
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
    prevKey.current = key;
    setIsLoading(true);
    setFetchError(null);

    // Intelligent location strategy — same as Discover Screens:
    //   Country/State → use boundsN/S/E/W via /api/screens
    //   City/POI/map  → use /api/screens/in-area with radius JSON
    const wideLocation = locations.find(
      l => l.locationType === 'country' || l.locationType === 'state'
    );

    let fetchUrl: string;
    if (wideLocation && wideLocation.bounds) {
      const b = wideLocation.bounds;
      fetchUrl = `/api/screens?boundsN=${b.north}&boundsS=${b.south}&boundsE=${b.east}&boundsW=${b.west}&sortBy=popularity&sortOrder=desc`;
    } else {
      fetchUrl = `/api/screens/in-area?locations=${encodeURIComponent(JSON.stringify(locations))}`;
    }

    apiRequest("GET", fetchUrl)
      .then(res => res.json())
      .then((data: any) => {
        const screens: Screen[] = Array.isArray(data) ? data : (data?.screens ?? []);
        onScreensLoaded(screens);
        if (wideLocation?.bounds) {
          // Map will be fit via MapBoundsFitter; no panTarget needed
        } else {
          const first = screens.find(s => s.latitude && s.longitude && Number(s.latitude) !== 0);
          if (first) {
            setPanTarget({ lat: Number(first.latitude), lng: Number(first.longitude), zoom: 12 });
          } else if (defaultMapLoc) {
            setPanTarget({ lat: defaultMapLoc.lat!, lng: defaultMapLoc.lng!, zoom: 12 });
          }
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
    setDetailModalScreen(screen);
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

  function MapBoundsFitter({ bounds }: { bounds: google.maps.LatLngBoundsLiteral }) {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      map.fitBounds(bounds);
    }, [map, bounds.north, bounds.south, bounds.east, bounds.west]);
    return null;
  }

  const locationLabel = locations.map(l => l.label).join(", ") || "selected locations";

  // ── Airbnb-style price bubble marker ─────────────────────────────────────
  const PriceBubble = ({ screen }: { screen: Screen }) => {
    const isSelected = selectedScreenIds.includes(screen.id);
    const isHovered = highlightedId === screen.id;
    const basePrice = calculateScreenPricePerDay(screen);
    const price = basePrice >= 1000
      ? `₹${(basePrice / 1000).toFixed(0)}k`
      : `₹${basePrice}`;
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
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {isSelected && (
              <div className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow">
                <Check className="w-3 h-3" /> Selected
              </div>
            )}
            {screen.isMultiScreen && screen.bulkBookingMandatory && screen.numberOfScreens && screen.numberOfScreens > 1 && (
              <Badge className="px-1.5 py-0 h-5 text-[10px] bg-amber-500 hover:bg-amber-600 text-white border-0 shadow uppercase">
                {screen.numberOfScreens} Screens (All Required)
              </Badge>
            )}
          </div>
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
            title={isSelected ? "Deselect" : "Select"}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>

        {/* Info */}
        <div className="px-1">
          <div className="flex items-center justify-between mb-0.5 gap-2">
            <h3 className="font-semibold text-sm text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors">{screen.name}</h3>
            {dist !== null && (
              <span className="text-[10px] text-slate-400 shrink-0">{dist.toFixed(1)} km</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 line-clamp-1">{screen.venueName || screen.name} · {screen.category || screen.type}</p>
            {screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1 && (
              <Badge variant="secondary" className="text-[9px] h-3.5 px-1 py-0 bg-primary/10 text-primary uppercase font-bold">
                {getScreenCountDisplay(screen)}
              </Badge>
            )}
          </div>
          {screen.avgDailyFootfall && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Users className="w-3 h-3" />
              {Number(screen.avgDailyFootfall).toLocaleString()} daily
            </div>
          )}
          <div className="pt-0.5">
            <span className="font-bold text-slate-900 text-sm">₹{calculateScreenPricePerDay(screen).toLocaleString()}</span>
            <span className="text-slate-400 text-xs"> / day</span>
          </div>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[560px] w-full bg-white">
      {/* Unified Toolbar */}
      <div className="shrink-0 px-4 py-2 border-b border-slate-200 bg-white shadow-sm z-20 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 w-full min-w-0">
          <MultiLocationSearch
            selectedLocations={locations}
            onChange={onChangeLocations}
            onLocationFocus={(loc) => {
              if (loc.lat && loc.lng) {
                setPanTarget({ lat: loc.lat, lng: loc.lng, zoom: 12 });
              }
            }}
            placeholder="Search city, area, or landmark..."
            className="w-full"
          />
        </div>
        
        {/* Environment Filters */}
        <div className="flex items-center gap-2 shrink-0 border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-4 w-full lg:w-auto overflow-x-auto scrollbar-none pb-1 lg:pb-0">
          <Button
            variant={envFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setEnvFilter("all")}
            className={`rounded-full h-9 px-4 text-xs font-medium ${envFilter === "all" ? "bg-slate-900 text-white" : ""}`}
          >
            All
          </Button>
          <Button
            variant={envFilter === "indoor" ? "default" : "outline"}
            size="sm"
            onClick={() => setEnvFilter("indoor")}
            className={`rounded-full h-9 px-4 text-xs font-medium gap-1.5 ${envFilter === "indoor" ? "bg-slate-900 text-white" : ""}`}
          >
            <Home className="h-3.5 w-3.5" /> Indoor
          </Button>
          <Button
            variant={envFilter === "outdoor" ? "default" : "outline"}
            size="sm"
            onClick={() => setEnvFilter("outdoor")}
            className={`rounded-full h-9 px-4 text-xs font-medium gap-1.5 ${envFilter === "outdoor" ? "bg-slate-900 text-white" : ""}`}
          >
            <Sun className="h-3.5 w-3.5" /> Outdoor
          </Button>
          <Button
            variant={envFilter === "semi" ? "default" : "outline"}
            size="sm"
            onClick={() => setEnvFilter("semi")}
            className={`rounded-full h-9 px-4 text-xs font-medium gap-1.5 ${envFilter === "semi" ? "bg-slate-900 text-white" : ""}`}
          >
            <SunMoon className="h-3.5 w-3.5" /> Semi
          </Button>
        </div>
      </div>

      {(error || fetchError) && (
        <p className="text-xs font-medium text-destructive px-4 py-1.5 bg-red-50 border-b border-red-100">{error || fetchError}</p>
      )}

      {/* Main split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Airbnb card grid */}
        <div ref={listRef} className="w-[55%] flex flex-col bg-slate-50 border-r border-slate-200 z-10">
          {/* List Header */}
          <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between sticky top-0 z-10">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {isLoading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    Loading screens…
                  </span>
                ) : (
                  <>Over {calculateTotalPhysicalScreens(screensData).toLocaleString()} screen{calculateTotalPhysicalScreens(screensData) !== 1 ? "s" : ""}</>
                )}
              </h2>
              {!isLoading && <p className="text-[10px] text-slate-400 truncate max-w-[250px]">{locationLabel}</p>}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={onSelectAll} disabled={isLoading || screensData.length === 0} className="h-7 text-[11px] px-2.5 rounded-md">
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-[11px] px-2.5 rounded-md text-slate-500">
                Clear
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
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
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
                {sortedScreens.map(screen => (
                  <ScreenCard key={screen.id} screen={screen} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Map */}
        <div className="flex-1 relative bg-slate-200">
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

              {/* Fit map for country/state wide-area locations */}
              {locations
                .filter(l => (l.locationType === 'country' || l.locationType === 'state') && l.bounds)
                .slice(-1)
                .map((loc, idx) => (
                  <MapBoundsFitter key={`bounds-${idx}`} bounds={loc.bounds!} />
                ))
              }

              {/* Target location pins + circles — only for city/poi, not country/state */}
              {locations.filter(l => l.lat && l.lng && l.locationType !== 'country' && l.locationType !== 'state').map((loc, idx) => (
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
                  {loc.radiusKm && (
                    <CircleOverlay center={{ lat: loc.lat!, lng: loc.lng! }} radius={loc.radiusKm * 1000} />
                  )}
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
