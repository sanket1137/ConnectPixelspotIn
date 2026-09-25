import React, { useEffect, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Check, Users, Monitor, Loader2, Home, Sun, SunMoon, List, Map as MapIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Screen, ZoneInfo } from "@shared/schema";
import { MultiLocationSearch, LocationItem } from "@/components/map/MultiLocationSearch";
import { ScreenDetailsModal } from "@/components/screens/ScreenDetailsModal";
import { getScreenCountDisplay, calculateTotalPhysicalScreens, calculateScreenPricePerDay } from "@shared/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  zonePriceOverrides?: Record<string, number>;
  onToggleZone?: (screenIds: string[], pricePerDay: number) => void;
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
  zonePriceOverrides,
  onToggleZone,
}: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"list" | "map">("map");

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

  // Zone State
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [zoneScreens, setZoneScreens] = useState<Screen[]>([]);
  const [activeZoneScreens, setActiveZoneScreens] = useState<Screen[] | null>(null);
  const [activeZoneName, setActiveZoneName] = useState<string | null>(null);
  const [highlightedZoneIds, setHighlightedZoneIds] = useState<Set<string>>(new Set());

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
  const displayedScreens = activeZoneScreens || screensData;
  
  const filteredScreens = displayedScreens.filter(s => {
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

  function MapBoundsFitter({ bounds }: { bounds: any }) {
    const map = useMap();
    useEffect(() => {
      if (!map) return;
      map.fitBounds(bounds);
    }, [map, bounds.north, bounds.south, bounds.east, bounds.west]);
    return null;
  }

  // ── Fetch zone info for detailModalScreen ──────────────────────────
  useEffect(() => {
    if (!detailModalScreen) {
      setZoneInfo(null);
      setZoneScreens([]);
      return;
    }

    async function fetchZoneInfo() {
      try {
        const res = await fetch(`/api/zones/screen/${detailModalScreen!.id}`);
        const data = await res.json();
        if (data.zone) {
          setZoneInfo(data.zone);
          const screensRes = await fetch(`/api/zones/${encodeURIComponent(data.zone.zoneName)}/screens`);
          const screensData = await screensRes.json();
          setZoneScreens(screensData.screens || []);
        } else {
          setZoneInfo(null);
          setZoneScreens([]);
        }
      } catch (err) {
        console.error("Failed to fetch zone info:", err);
      }
    }
    fetchZoneInfo();
  }, [detailModalScreen]);

  const handleViewZone = () => {
    if (!zoneInfo || zoneScreens.length === 0) return;
    setHighlightedZoneIds(new Set(zoneScreens.map(s => s.id)));
    setDetailModalScreen(null);
    setActiveZoneScreens(zoneScreens);
    setActiveZoneName(zoneInfo.zoneName);

    // Calculate bounding box of zone screens to fit map
    if (zoneScreens.length > 0) {
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      zoneScreens.forEach(s => {
        const lat = parseFloat(String(s.latitude));
        const lng = parseFloat(String(s.longitude));
        if (!isNaN(lat) && !isNaN(lng)) {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
        }
      });
      // Use map bounds fitter since panTarget is used in Express Builder
      setPanTarget(null);
      // Let MapBoundsFitter or the useEffect handle the bounds 
      // Actually we don't have locationBounds in Step3. We can just set panTarget to center
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      // Rough zoom calculation
      setPanTarget({ lat: centerLat, lng: centerLng, zoom: 11 });
    }
  };

  const handleBookZone = () => {
    if (!zoneInfo || zoneScreens.length === 0 || !onToggleZone) return;
    onToggleZone(zoneScreens.map(s => s.id), zoneInfo.pricePerDay / zoneScreens.length);
    setDetailModalScreen(null);
    setHighlightedZoneIds(new Set());
  };

  const locationLabel = locations.map(l => l.label).join(", ") || "selected locations";

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
        <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200 transition-all duration-150 ${isHovered ? 'ring-2 ring-blue-400' : ''} ${isSelected ? 'ring-2 ring-blue-600' : ''}`}>
          {screen.screenImages?.[0] ? (
            <img src={screen.screenImages[0]} alt={screen.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100"><Monitor className="h-10 w-10 text-slate-300" /></div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
            {isSelected && (<div className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow"><Check className="w-3 h-3" /> Selected</div>)}
          </div>
          <button
            className={`absolute bottom-2 right-2 h-8 w-8 rounded-full flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100 ${isSelected ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
            onClick={(e) => { e.stopPropagation(); onToggleScreen(screen.id); }}
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
        <div className="px-1">
          <div className="flex items-center justify-between mb-0.5 gap-2">
            <h3 className="font-semibold text-sm text-slate-900 truncate">{screen.name}</h3>
            {dist !== null && <span className="text-[10px] text-slate-400 shrink-0">{dist.toFixed(1)} km</span>}
          </div>
          <div className="pt-0.5">
            <span className="font-bold text-slate-900 text-sm">₹{calculateScreenPricePerDay(screen).toLocaleString()}</span>
            <span className="text-slate-400 text-xs"> / day</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] min-h-[560px] w-full bg-white">
      <div className="shrink-0 px-4 py-2 border-b border-slate-200 bg-white shadow-sm z-20 flex flex-col lg:flex-row items-center gap-4">
        <div className="flex-1 w-full min-w-0">
          <MultiLocationSearch selectedLocations={locations} onChange={onChangeLocations} placeholder="Search..." className="w-full" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant={envFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setEnvFilter("all")}>All</Button>
          <Button variant={envFilter === "indoor" ? "default" : "outline"} size="sm" onClick={() => setEnvFilter("indoor")}><Home className="h-3.5 w-3.5 mr-1" /> Indoor</Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        <div
          ref={listRef}
          className={`flex flex-col bg-slate-50 border-r border-slate-200 ${
            isMobile ? (viewMode === "list" ? "absolute inset-0 w-full z-10" : "hidden") : "w-[55%] relative"
          }`}
        >
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
              {sortedScreens.map(screen => (<ScreenCard key={screen.id} screen={screen} />))}
            </div>
          </div>
        </div>

        <div className={`flex-1 relative bg-slate-200 ${isMobile ? (viewMode === "map" ? "block absolute inset-0 z-0" : "hidden") : "block"}`}>
          <Map mapId="express-screens-map" defaultCenter={initialCenter} defaultZoom={initialZoom} disableDefaultUI zoomControl style={{ width: "100%", height: "100%" }}>
            {activeZoneName && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium text-sm animate-in fade-in slide-in-from-top-4">
                Viewing Zone: {activeZoneName}
                <button 
                  onClick={() => { setActiveZoneScreens(null); setActiveZoneName(null); setHighlightedZoneIds(new Set()); }}
                  className="ml-1 hover:bg-amber-200 rounded-full p-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <MapController />
            {filteredScreens.map(screen => {
              const isSelected = selectedScreenIds.includes(screen.id);
              const isHovered = highlightedId === screen.id;
              const isHighlightedZone = highlightedZoneIds.has(screen.id);
              const basePrice = calculateScreenPricePerDay(screen);
              const price = zonePriceOverrides?.[screen.id] ?? basePrice ?? 0;
              const priceDisplay = price >= 1000 ? `₹${(price / 1000).toFixed(1).replace('.0', '')}k` : `₹${price}`;

              return (
                <AdvancedMarker key={screen.id} position={{ lat: parseFloat(String(screen.latitude)), lng: parseFloat(String(screen.longitude)) }} onClick={() => setDetailModalScreen(screen)}>
                  <div className={`relative flex flex-col items-center cursor-pointer transition-all ${isHovered ? 'scale-125' : 'scale-100'}`} onMouseEnter={() => setHighlightedId(screen.id)} onMouseLeave={() => setHighlightedId(null)}>
                    <div className={`px-3 py-1.5 rounded-full font-bold text-[13px] border-2 shadow-sm whitespace-nowrap ${isSelected ? 'bg-green-600 text-white' : isHighlightedZone ? 'bg-amber-500 text-white' : 'bg-white text-slate-800'}`}>{priceDisplay}</div>
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        </div>

        {/* Mobile View Toggle */}
        {isMobile && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
            <div className="bg-slate-900 text-white rounded-full shadow-2xl p-1 flex items-center">
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full px-6 transition-all ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-300 hover:text-white"}`}
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`rounded-full px-6 transition-all ${viewMode === "map" ? "bg-slate-700 text-white" : "text-slate-300 hover:text-white"}`}
                onClick={() => setViewMode("map")}
              >
                <MapIcon className="w-4 h-4 mr-2" />
                Map
              </Button>
            </div>
          </div>
        )}
      </div>

      <ScreenDetailsModal
        isOpen={!!detailModalScreen}
        onClose={() => setDetailModalScreen(null)}
        screen={detailModalScreen}
        onAdd={(s) => { onToggleScreen(s.id); if (window.innerWidth < 640) setDetailModalScreen(null); }}
        isAdded={detailModalScreen ? selectedScreenIds.includes(detailModalScreen.id) : false}
        zoneInfo={zoneInfo}
        allZoneScreens={zoneScreens}
        onViewZone={handleViewZone}
        onBookZone={handleBookZone}
        isZoneBooked={zoneInfo ? zoneInfo.screenIds.every(id => selectedScreenIds.includes(id)) : false}
      />
    </div>
  );
}
