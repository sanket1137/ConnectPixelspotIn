import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { printMediaPlan } from "@/lib/mediaPlanPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save, Send, Play, Download, Trash2, Plus, ArrowLeft, Percent,
  MapPin, Building2, Eye, EyeOff, X, RefreshCw, SlidersHorizontal, Check, Search, Monitor, Layers
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { VENUE_CATEGORIES } from "@shared/constants";
import { SearchAutocomplete } from "@/components/map/SearchAutocomplete";
import { Slider } from "@/components/ui/slider";
import { ScreenDetailsModal } from "@/components/screens/ScreenDetailsModal";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

function toInputDate(d: string | Date) {
  return new Date(d).toISOString().split("T")[0];
}

// ─── Map-based Screen Picker ─────────────────────────────────────────────────

export function ScreenPickerModal({
  open, onClose, onAdd, onAddZone, existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (screen: any) => void;
  onAddZone?: (screens: any[], zoneInfo: any) => void;
  existingIds: Set<string>;
}) {
  const [venueCategory, setVenueCategory] = useState("all");
  const [envType, setEnvType] = useState("all");
  const [genderOrientation, setGenderOrientation] = useState("all");
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [locationName, setLocationName] = useState("");
  const [radiusKm, setRadiusKm] = useState(15);
  
  const [detailModalScreen, setDetailModalScreen] = useState<any>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Zone State
  const [zoneInfo, setZoneInfo] = useState<any>(null);
  const [zoneScreens, setZoneScreens] = useState<any[]>([]);
  const [activeZoneScreens, setActiveZoneScreens] = useState<any[] | null>(null);
  const [activeZoneName, setActiveZoneName] = useState<string | null>(null);
  const [highlightedZoneIds, setHighlightedZoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!detailModalScreen) {
      setZoneInfo(null);
      setZoneScreens([]);
      return;
    }
    async function fetchZoneInfo() {
      try {
        const res = await apiRequest("GET", `/api/zones/screen/${detailModalScreen!.id}`);
        const data = await res.json();
        if (data.zone) {
          setZoneInfo(data.zone);
          const screensRes = await apiRequest("GET", `/api/zones/${encodeURIComponent(data.zone.zoneName)}/screens`);
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

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (lat !== undefined && lng !== undefined) {
      params.append("lat", lat.toString());
      params.append("lng", lng.toString());
      params.append("radiusKm", radiusKm.toString());
    }
    return params.toString();
  }, [lat, lng, radiusKm]);

  const { data: screensData = [] } = useQuery<any>({
    queryKey: [`/api/screens?${queryString}`],
    queryFn: async () => {
      const endpoint = (lat !== undefined && lng !== undefined) ? `/api/screens?${queryString}` : "/api/agency/screens";
      const res = await apiRequest("GET", endpoint);
      return res.json();
    },
    enabled: open,
  });

  const fetchedScreens = Array.isArray(screensData) ? screensData : (screensData.screens || []);
  const screens = activeZoneScreens || fetchedScreens;

  const envTypes: string[] = ["all", ...Array.from(new Set(screens.map((s: any) => String(s.environmentType || "")).filter(Boolean))).sort()];
  // Extract unique gender orientations from userIntents
  const genderOrientations: string[] = ["all", ...Array.from(new Set(screens.flatMap((s: any) => (s.userIntents || []).map((x: any) => String(x || ""))).filter(Boolean))).sort()];

  const filtered = screens.filter((s: any) => {
    if (venueCategory !== "all" && s.venueCategory !== venueCategory) return false;
    if (envType !== "all" && s.environmentType !== envType) return false;
    if (genderOrientation !== "all" && !(s.userIntents || []).includes(genderOrientation) && !(s.lifestyleTags || []).includes(genderOrientation)) return false;
    return true;
  });

  const mapScreens = filtered.filter((s: any) => s.latitude && s.longitude);
  const defaultCenter = (lat !== undefined && lng !== undefined) 
    ? { lat, lng } 
    : (mapScreens.length > 0
        ? { lat: parseFloat(mapScreens[0].latitude), lng: parseFloat(mapScreens[0].longitude) }
        : { lat: 20.5937, lng: 78.9629 });

  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      setPanTarget({ lat, lng, zoom: radiusKm <= 5 ? 13 : radiusKm <= 15 ? 11 : 9 });
    }
  }, [lat, lng, radiusKm]);

  function MapController() {
    const map = useMap("agency-screen-picker-map");
    useEffect(() => {
      if (!map || !panTarget) return;
      map.panTo({ lat: panTarget.lat, lng: panTarget.lng });
      if (panTarget.zoom !== undefined) map.setZoom(panTarget.zoom);
      setPanTarget(null);
    }, [map, panTarget]);
    return null;
  }

  if (!open) return null;

  const PriceBubble = ({ screen }: { screen: any }) => {
    const isSelected = existingIds.has(screen.id);
    const isHighlightedZone = highlightedZoneIds.has(screen.id);
    const isHovered = highlightedId === screen.id;
    const price = screen.pricePerDay >= 1000
      ? `₹${(screen.pricePerDay / 1000).toFixed(1).replace('.0', '')}k`
      : `₹${Number(screen.pricePerDay).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    return (
      <div className="relative">
        <div className={`
          px-2.5 py-1 rounded-full font-bold text-[12px] shadow-md border-2 whitespace-nowrap cursor-pointer transition-all duration-150
          ${isSelected ? 'bg-violet-600 text-white border-white scale-110' : 'bg-white text-slate-800 border-white hover:scale-110'}
          ${isHovered && !isSelected ? 'shadow-xl scale-110 ring-2 ring-violet-400' : ''}
          ${isHighlightedZone ? 'ring-4 ring-orange-400 border-orange-400' : ''}
        `}
        onClick={() => setDetailModalScreen(screen)}
        >{price}</div>
        <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0
          border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px]
          ${isSelected ? 'border-t-violet-600' : 'border-t-white'}
        `} />
      </div>
    );
  };

  const handleCardClick = (screen: any) => {
     setDetailModalScreen(screen);
  };

  const handleAddScreen = (screen: any) => {
    onAdd(screen);
  };

  return (
    <div className="absolute inset-0 bg-background flex flex-col overflow-hidden z-40 rounded-lg">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <h2 className="font-semibold text-lg text-slate-900">Add Screens to Plan</h2>
            <p className="text-xs text-slate-500">{filtered.length} screens match your criteria</p>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border-b px-6 py-3 flex flex-wrap gap-3 items-center shrink-0 z-10">
        <div className="w-full md:w-[320px] bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all flex items-center">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <SearchAutocomplete 
            onPlaceSelect={(place, inputValue) => {
              setActiveZoneScreens(null);
              setActiveZoneName(null);
              setHighlightedZoneIds(new Set());
              if (place?.geometry?.location) {
                setLat(place.geometry.location.lat());
                setLng(place.geometry.location.lng());
                setLocationName(inputValue);
              } else {
                setLat(undefined);
                setLng(undefined);
                setLocationName("");
              }
            }}
            placeholder="Search area, city or state..."
          />
        </div>

        {lat !== undefined && (
          <div className="flex items-center gap-3 w-full md:w-[150px] mr-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{radiusKm} km</span>
            <Slider
              value={[radiusKm]}
              min={1} max={100} step={1}
              onValueChange={([val]) => setRadiusKm(val)}
              className="flex-1"
            />
          </div>
        )}

        <Select value={venueCategory} onValueChange={setVenueCategory}>
          <SelectTrigger className="h-10 text-sm w-[180px] rounded-full border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm">
            <SelectValue placeholder="Venue Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Venues</SelectItem>
            {VENUE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={envType} onValueChange={setEnvType}>
          <SelectTrigger className="h-10 text-sm w-[180px] rounded-full border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm">
            <SelectValue placeholder="Environment" />
          </SelectTrigger>
          <SelectContent>
            {envTypes.map((t) => <SelectItem key={t} value={t as string}>{t === "all" ? "All Environments" : t as string}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={genderOrientation} onValueChange={setGenderOrientation}>
          <SelectTrigger className="h-10 text-sm w-[180px] rounded-full border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors shadow-sm">
            <SelectValue placeholder="Gender Orientation" />
          </SelectTrigger>
          <SelectContent>
            {genderOrientations.map((t) => <SelectItem key={t} value={t as string}>{t === "all" ? "All Genders" : t as string}</SelectItem>)}
          </SelectContent>
        </Select>

        {(lat !== undefined || locationName || venueCategory !== "all" || envType !== "all" || genderOrientation !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-900 rounded-full h-10 px-4"
            onClick={() => { 
              setLat(undefined); setLng(undefined); setLocationName("");
              setVenueCategory("all"); setEnvType("all"); setGenderOrientation("all"); 
              setActiveZoneScreens(null); setActiveZoneName(null); setHighlightedZoneIds(new Set());
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Split view body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left List */}
        <div className="w-full md:w-[480px] shrink-0 border-r bg-slate-50/50 overflow-y-auto p-4 flex flex-col gap-4">
          {activeZoneName && (() => {
            const currentZoneScreens = activeZoneScreens || screens;
            const isEntireZoneAdded = currentZoneScreens.length > 0 && currentZoneScreens.every(s => existingIds.has(s.id));
            return (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-2.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Zone Network Package</span>
                      <span className="text-sm font-bold text-slate-900">{activeZoneName} ({currentZoneScreens.length} screens)</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-slate-700 rounded-full"
                    onClick={() => {
                      setActiveZoneScreens(null);
                      setActiveZoneName(null);
                      setHighlightedZoneIds(new Set());
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant={isEntireZoneAdded ? "outline" : "default"}
                  className={`w-full font-medium text-xs h-8 shadow-sm flex items-center justify-center gap-1.5 ${
                    isEntireZoneAdded
                      ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                  disabled={isEntireZoneAdded}
                  onClick={() => {
                    if (isEntireZoneAdded) return;
                    if (onAddZone && zoneInfo) {
                      onAddZone(currentZoneScreens, zoneInfo);
                    } else {
                      currentZoneScreens.forEach(s => {
                        if (!existingIds.has(s.id)) handleAddScreen(s);
                      });
                    }
                  }}
                >
                  {isEntireZoneAdded ? (
                    <><Check className="w-3.5 h-3.5" /> Zone Already Added to Plan ({currentZoneScreens.length} Screens)</>
                  ) : (
                    <><Plus className="w-3.5 h-3.5" /> Add Entire Zone to Plan ({currentZoneScreens.length} Screens)</>
                  )}
                </Button>
              </div>
            );
          })()}

          {filtered.map(screen => {
            const isSelected = existingIds.has(screen.id);
            const isHovered = highlightedId === screen.id;
            return (
              <div
                key={screen.id}
                ref={(el) => { cardRefs.current[screen.id] = el; }}
                className={`bg-white rounded-xl border p-3 flex gap-4 cursor-pointer transition-all hover:shadow-md ${isHovered ? 'border-violet-400 shadow-md ring-1 ring-violet-400' : 'border-slate-200'} ${isSelected ? 'border-violet-600 bg-violet-50/30' : ''}`}
                onMouseEnter={() => setHighlightedId(screen.id)}
                onMouseLeave={() => setHighlightedId(null)}
                onClick={() => handleCardClick(screen)}
              >
                {/* Image */}
                <div className="w-32 h-24 rounded-lg bg-slate-100 overflow-hidden shrink-0 relative">
                  {screen.screenImages?.[0] || screen.images?.[0] ? (
                    <img 
                      src={screen.screenImages?.[0] || screen.images?.[0]} 
                      alt={screen.name} 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400/1a1a1a/666?text=No+Image"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Monitor className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-1.5 left-1.5 bg-violet-600 text-white p-1 rounded-full shadow-sm">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 py-1 flex flex-col">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm line-clamp-1">{screen.name}</h3>
                    <div className="font-bold text-slate-900 text-sm shrink-0">₹{(screen.pricePerDay || 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">/day</span></div>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">{screen.city}{screen.venueName ? ` • ${screen.venueName}` : ''}</p>
                  
                  <div className="flex gap-1.5 flex-wrap mt-auto">
                    {screen.zoneId && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 font-semibold flex items-center gap-1">
                        <Layers className="w-3 h-3" /> Zone Inventory
                      </Badge>
                    )}
                    {screen.venueCategory && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 hover:bg-slate-200">{screen.venueCategory}</Badge>
                    )}
                    {screen.environmentType && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 hover:bg-slate-200">{screen.environmentType.split(' ')[0]}</Badge>
                    )}
                    {screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 font-semibold">{screen.numberOfScreens} Screens Network</Badge>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <Button 
                      size="sm" 
                      variant={isSelected ? "outline" : screen.zoneId ? "secondary" : "default"} 
                      className={`w-full h-8 text-xs ${
                        isSelected 
                          ? 'text-violet-700 border-violet-200 hover:bg-violet-50' 
                          : screen.zoneId 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white font-semibold' 
                            : 'bg-violet-600 hover:bg-violet-700'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isSelected) {
                          if (screen.zoneId) {
                            setDetailModalScreen(screen);
                          } else {
                            handleAddScreen(screen);
                          }
                        }
                      }}
                      disabled={isSelected}
                    >
                      {isSelected ? (
                        <><Check className="w-3.5 h-3.5 mr-1.5" /> Added to Plan</>
                      ) : screen.zoneId ? (
                        <><Layers className="w-3.5 h-3.5 mr-1.5" /> View Zone & Add</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5 mr-1.5" /> Add to Plan</>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <h3 className="font-medium text-slate-900 mb-1">No screens found</h3>
              <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
            </div>
          )}
        </div>

        {/* Right Map */}
        <div className="hidden md:block flex-1 relative bg-slate-100">
          <Map
            id="agency-screen-picker-map"
            style={{ width: "100%", height: "100%" }}
            defaultCenter={defaultCenter}
            defaultZoom={mapScreens.length === 1 ? 13 : 6}
            gestureHandling="greedy"
            disableDefaultUI
            zoomControl
            mapId="agency-screen-picker-map"
          >
            <MapController />
            
            {activeZoneName && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg border border-orange-200 flex items-center gap-3">
                <span className="text-sm font-semibold text-slate-800">Viewing Zone: <span className="text-orange-600">{activeZoneName}</span></span>
                <button 
                  onClick={() => {
                    setActiveZoneScreens(null);
                    setActiveZoneName(null);
                    setHighlightedZoneIds(new Set());
                  }}
                  className="hover:bg-slate-200 p-1 rounded-full text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {mapScreens.map((s: any) => (
              <AdvancedMarker
                key={s.id}
                position={{ lat: parseFloat(s.latitude), lng: parseFloat(s.longitude) }}
                onClick={() => setDetailModalScreen(s)}
                onMouseEnter={() => setHighlightedId(s.id)}
                onMouseLeave={() => setHighlightedId(null)}
              >
                <PriceBubble screen={s} />
              </AdvancedMarker>
            ))}
          </Map>
        </div>
      </div>

      <ScreenDetailsModal
        isOpen={!!detailModalScreen}
        onClose={() => setDetailModalScreen(null)}
        screen={detailModalScreen}
        onAdd={() => {
          if (detailModalScreen && !existingIds.has(detailModalScreen.id)) {
            handleAddScreen(detailModalScreen);
          }
          setDetailModalScreen(null);
        }}
        isAdded={detailModalScreen ? existingIds.has(detailModalScreen.id) : false}
        zoneInfo={zoneInfo}
        allZoneScreens={zoneScreens}
        onViewZone={() => {
          if (!zoneInfo || zoneScreens.length === 0) return;
          setHighlightedZoneIds(new Set(zoneScreens.map(s => s.id)));
          setDetailModalScreen(null);
          setActiveZoneScreens(zoneScreens);
          setActiveZoneName(zoneInfo.zoneName);

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
          const centerLat = (minLat + maxLat) / 2;
          const centerLng = (minLng + maxLng) / 2;
          setPanTarget({ lat: centerLat, lng: centerLng, zoom: 11 });
        }}
        onBookZone={() => {
          if (!zoneInfo || zoneScreens.length === 0) return;
          const unadded = zoneScreens.filter(s => !existingIds.has(s.id));
          if (unadded.length === 0) {
            setDetailModalScreen(null);
            return;
          }
          if (onAddZone) {
            onAddZone(zoneScreens, zoneInfo);
          } else {
            unadded.forEach(s => {
              handleAddScreen(s);
            });
          }
          setDetailModalScreen(null);
          setHighlightedZoneIds(new Set());
        }}
        isZoneBooked={zoneScreens.length > 0 && zoneScreens.every(s => existingIds.has(s.id))}
      />
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MediaPlanBuilder() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Plan header state
  const [name, setName] = useState("");
  const [clientBrand, setClientBrand] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [margin, setMargin] = useState(0);
  const [notes, setNotes] = useState("");
  const [showMargin, setShowMargin] = useState(false);

  // Items state (local, synced to server)
  const [items, setItems] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [executeDialog, setExecuteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [planId, setPlanId] = useState<string | null>(id || null);

  // Load existing plan
  const { data: planData, isLoading } = useQuery<any>({
    queryKey: [`/api/agency/media-plans/${id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agency/media-plans/${id}`);
      return res.json();
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (planData) {
      setName(planData.name || "");
      setClientBrand(planData.clientBrand || "");
      setStartDate(toInputDate(planData.startDate));
      setEndDate(toInputDate(planData.endDate));
      setBudget(String(planData.budget || 0));
      setMargin(planData.agencyMargin || 0);
      setNotes(planData.notes || "");
      setItems(planData.items || []);
    }
  }, [planData]);

  // ── Calculated values ──────────────────────────────────────────
  const netTotal = items
    .filter((i) => i.status === "included")
    .reduce((s, i) => s + (i.totalPrice || i.days * i.pricePerDay), 0);

  const multiplier = 1 + margin / 100;
  const clientTotal = Math.round(netTotal * multiplier);

  // ── Save (create or update) ────────────────────────────────────
  const savePlan = async () => {
    if (!name || !clientBrand || !startDate || !endDate) {
      toast({ title: "Please fill name, client, start & end date", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name, clientBrand,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        budget: clientTotal,
        agencyMargin: margin,
        notes: notes || null,
      };

      if (isNew && !planId) {
        // Create
        const res = await apiRequest("POST", "/api/agency/media-plans", payload);
        const created = await res.json();
        setPlanId(created.id);
        setLocation(`/agency/media-plans/${created.id}`, { replace: true });
        toast({ title: "Plan created ✓" });
      } else {
        // Update
        await apiRequest("PUT", `/api/agency/media-plans/${planId}`, payload);
        qc.invalidateQueries({ queryKey: [`/api/agency/media-plans/${planId}`] });
        qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
        toast({ title: "Plan saved ✓" });
      }
    } catch {
      toast({ title: "Failed to save plan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Calculate days between campaign start & end date (inclusive) ──
  const getCampaignDays = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 1;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
    const diffMs = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1); // Inclusive duration (e.g. Oct 1 to Oct 30 = 30 days)
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (val && endDate && items.length > 0) {
      const newDays = getCampaignDays(val, endDate);
      updateAllItemsDays(newDays);
    }
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    if (startDate && val && items.length > 0) {
      const newDays = getCampaignDays(startDate, val);
      updateAllItemsDays(newDays);
    }
  };

  const updateAllItemsDays = (newDays: number) => {
    if (newDays < 1) return;
    setItems((prev) =>
      prev.map((i) => ({
        ...i,
        days: newDays,
        totalPrice: (i.pricePerDay || 0) * newDays,
      }))
    );
    if (planId) {
      items.forEach((i) => {
        apiRequest("PUT", `/api/agency/media-plans/${planId}/items/${i.id}`, { days: newDays }).catch(() => {});
      });
    }
  };

  // ── Add screen to plan ─────────────────────────────────────────
  const addScreen = async (screen: any) => {
    if (!planId) {
      toast({ title: "Save the plan first before adding screens", variant: "destructive" });
      return;
    }
    // Auto-calculate days from campaign date range
    const calculatedDays = getCampaignDays(startDate, endDate);
    try {
      const res = await apiRequest("POST", `/api/agency/media-plans/${planId}/items`, {
        screenId: screen.id,
        days: calculatedDays,
      });
      const item = await res.json();
      setItems((prev) => [...prev, { ...item, days: calculatedDays, totalPrice: (item.pricePerDay || screen.pricePerDay || 0) * calculatedDays, screen }]);
      toast({ title: `${screen.name} added (${calculatedDays} day${calculatedDays !== 1 ? "s" : ""})` });
    } catch {
      toast({ title: "Failed to add screen", variant: "destructive" });
    }
  };

  // ── Add entire zone to plan ───────────────────────────────────
  const addZone = async (zoneScreensToAdd: any[], zoneInfoObj?: any) => {
    if (!planId) {
      toast({ title: "Save the plan first before adding screens", variant: "destructive" });
      return;
    }
    const screenIdsToAdd = zoneScreensToAdd
      .filter((s) => !existingIds.has(s.id))
      .map((s) => s.id);

    if (screenIdsToAdd.length === 0) {
      toast({ title: `Zone "${zoneInfoObj?.zoneName || "package"}" is already added to the plan!` });
      return;
    }

    const calculatedDays = getCampaignDays(startDate, endDate);
    try {
      const res = await apiRequest("POST", `/api/agency/media-plans/${planId}/items/bulk`, {
        screenIds: screenIdsToAdd,
        days: calculatedDays,
      });
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        // Refresh the plan to get populated items
        const updatedRes = await apiRequest("GET", `/api/agency/media-plans/${planId}`);
        const updatedPlan = await updatedRes.json();
        setItems(updatedPlan.items || []);
        toast({ title: `Added ${data.items.length} screens from ${zoneInfoObj?.zoneName || "zone"} (${calculatedDays} day${calculatedDays !== 1 ? "s" : ""})` });
      } else {
        toast({ title: `Zone "${zoneInfoObj?.zoneName || "package"}" screens already in plan` });
      }
    } catch {
      toast({ title: "Failed to add zone screens", variant: "destructive" });
    }
  };

  // ── Update days for an item ────────────────────────────────────
  const updateDays = async (itemId: string, days: number) => {
    if (!planId || days < 1) return;
    setItems((prev) =>
      prev.map((i) => i.id === itemId
        ? { ...i, days, totalPrice: i.pricePerDay * days }
        : i)
    );
    try {
      await apiRequest("PUT", `/api/agency/media-plans/${planId}/items/${itemId}`, { days });
    } catch {
      toast({ title: "Failed to update days", variant: "destructive" });
    }
  };

  // ── Remove screen from plan ────────────────────────────────────
  const removeItem = async (itemId: string) => {
    if (!planId) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await apiRequest("DELETE", `/api/agency/media-plans/${planId}/items/${itemId}`);
    } catch {
      toast({ title: "Failed to remove screen", variant: "destructive" });
    }
  };

  // ── Mark as sent ───────────────────────────────────────────────
  const markSent = async () => {
    if (!planId) { await savePlan(); return; }
    try {
      await apiRequest("POST", `/api/agency/media-plans/${planId}/send`);
      qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
      toast({ title: "Plan marked as sent" });
      // Auto-print
      handleDownload();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  // ── Execute plan ───────────────────────────────────────────────
  const executePlan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agency/media-plans/${planId}/execute`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Campaign created — ${data.bookingsCreated} bookings submitted ✓` });
      qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
      setLocation("/agency/campaigns");
    },
    onError: () => toast({ title: "Failed to execute plan", variant: "destructive" }),
  });

  // ── Download / Print ───────────────────────────────────────────
  const handleDownload = () => {
    const agencyOrgName = user?.companyName || user?.agencyName || user?.name || "Agency";
    const phone = user?.mobileNumber || user?.phone || "";

    printMediaPlan({
      plan: {
        name, clientBrand,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date().toISOString(),
        notes,
        agencyMargin: margin,
        agencyName: agencyOrgName,
        createdByAdmin: false,
        contactExecutive: user?.name || agencyOrgName,
        contactPhone: phone,
        contactEmail: user?.email || "",
        contactWebsite: user?.companyName || user?.agencyName || "",
      },
      items: items
        .filter((i) => i.status === "included")
        .map((i) => ({
          screenName: i.screen?.name || i.screenId,
          venueName: i.screen?.venueName || "",
          city: i.screen?.city || "",
          state: i.screen?.state || "",
          location: i.screen?.location || "",
          venueCategory: i.screen?.venueCategory || "",
          environmentType: i.screen?.environmentType || "",
          category: i.screen?.category || "",
          days: i.days,
          pricePerDay: i.pricePerDay,
          totalPrice: i.totalPrice || i.days * i.pricePerDay,
          notes: i.notes,
          size: i.screen?.size,
          screen: i.screen,
          zoneName: i.zoneName || i.screen?.zoneName,
          zoneId: i.zoneId || i.screen?.zoneId,
        })),
    });
  };

  const existingIds = new Set(items.map((i) => i.screenId));
  const isExecuted = planData?.status === "executed";

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  if (pickerOpen) {
    return (
      <div className="h-[calc(100vh-64px)] w-full relative bg-slate-50 p-2 md:p-4">
        <ScreenPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onAdd={addScreen}
          onAddZone={addZone}
          existingIds={existingIds}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/agency/media-plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{isNew ? "New Media Plan" : name || "Media Plan"}</h1>
          {planData?.status && (
            <Badge variant="outline" className="mt-0.5 text-xs">
              {planData.status}
            </Badge>
          )}
        </div>
        {/* Action buttons */}
        {!isExecuted && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={savePlan} disabled={isSaving}>
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload} disabled={!planId}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50"
              onClick={markSent} disabled={!planId || items.length === 0}>
              <Send className="w-3.5 h-3.5" /> Send to Client
            </Button>
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700"
              onClick={() => setExecuteDialog(true)} disabled={!planId || items.length === 0}>
              <Play className="w-3.5 h-3.5" /> Execute
            </Button>
          </div>
        )}
        {isExecuted && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left col: Plan details + margin ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Plan Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q3 Launch – Nike" disabled={isExecuted} />
              </div>
              <div>
                <Label className="text-xs">Client / Brand *</Label>
                <Input value={clientBrand} onChange={(e) => setClientBrand(e.target.value)}
                  placeholder="Client or brand name" disabled={isExecuted} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Date *</Label>
                  <Input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} disabled={isExecuted} />
                </div>
                <div>
                  <Label className="text-xs">End Date *</Label>
                  <Input type="date" value={endDate} onChange={(e) => handleEndDateChange(e.target.value)} disabled={isExecuted} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Client Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for the client…" rows={2} disabled={isExecuted} />
              </div>
            </CardContent>
          </Card>

          {/* Margin — internal only, never in PDF */}
          {!isExecuted && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">Agency Margin</p>
                    <p className="text-[11px] text-muted-foreground">Hidden from client PDF</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setShowMargin((v) => !v)}>
                    {showMargin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showMargin ? "number" : "password"}
                      min={0} max={99}
                      value={margin}
                      onChange={(e) => setMargin(Math.min(99, Math.max(0, Number(e.target.value))))}
                      className="pr-8"
                    />
                    <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {showMargin && margin > 0 && (
                    <span className="text-xs text-amber-600 font-medium">
                      +{fmt(clientTotal - netTotal)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget summary */}
          <Card className="border-0 shadow-sm bg-violet-50">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net (screens)</span>
                <span className="font-medium">{fmt(netTotal)}</span>
              </div>
              {margin > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margin ({margin}%)</span>
                  <span className="font-medium text-amber-600">+{fmt(clientTotal - netTotal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Client Total</span>
                <span className="text-violet-700">{fmt(clientTotal)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Margin is not shown in the client PDF</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Right col: Screen line items ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">
              Screens in Plan
              <span className="ml-2 text-muted-foreground font-normal">
                ({items.filter((i) => i.status === "included").length} Locations · {items.filter((i) => i.status === "included").reduce((sum, i) => sum + ((i.screen?.isMultiScreen && i.screen?.numberOfScreens && i.screen.numberOfScreens > 0) ? i.screen.numberOfScreens : (i.screen?.numberOfScreens || 1)), 0)} Physical Screens)
              </span>
            </h2>
            {!isExecuted && (
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => {
                  if (!planId) { savePlan().then(() => setPickerOpen(true)); }
                  else setPickerOpen(true);
                }}>
                <Plus className="w-4 h-4" /> Add Screen
              </Button>
            )}
          </div>

          {items.filter((i) => i.status === "included").length === 0 ? (
            <Card className="border-0 shadow-sm border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">No screens added yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add Screen" to browse and add screens.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 text-[11px] text-muted-foreground font-medium">
                <div className="col-span-4">Screen</div>
                <div className="col-span-3">City &amp; Area</div>
                <div className="col-span-1 text-center">Days</div>
                <div className="col-span-2 text-right">Net / Day</div>
                <div className="col-span-2 text-right">Client Total</div>
              </div>

              {items
                .filter((i) => i.status === "included")
                .map((item) => {
                  const s = item.screen || {};
                  const cityArea = `${s.city || ""}${s.venueName ? ` – ${s.venueName}` : ""}`;
                  const net = item.totalPrice || item.days * item.pricePerDay;
                  const clientAmt = Math.round(net * multiplier);
                  const isMulti = !!((s.isMultiScreen && s.numberOfScreens && s.numberOfScreens > 1) || (s.numberOfScreens > 1));
                  const numScreens = s.numberOfScreens || 1;

                  return (
                    <Card key={item.id} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="md:grid md:grid-cols-12 md:gap-2 md:items-center space-y-2 md:space-y-0">

                          {/* Screen name + tags */}
                          <div className="md:col-span-4">
                            <p className="font-medium text-sm leading-tight flex items-center flex-wrap gap-1">
                              {s.name || item.screenId}
                              {(item.zoneName || s.zoneName) && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 font-semibold flex items-center gap-1">
                                  <Layers className="w-3 h-3" /> Zone: {item.zoneName || s.zoneName}
                                </Badge>
                              )}
                              {isMulti && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 font-semibold">
                                  {numScreens} Screens
                                </Badge>
                              )}
                            </p>
                            {isMulti && (
                              <p className="text-[10px] text-amber-600 mt-0.5 font-medium">* Mandatory to book all {numScreens} screens</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.venueCategory && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{s.venueCategory}</Badge>
                              )}
                              {(s.lifestyleTags || []).slice(0, 2).map((t: string) => (
                                <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">{t}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* City & Area */}
                          <div className="md:col-span-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="line-clamp-1">{cityArea}</span>
                            </p>
                            {s.environmentType && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{s.environmentType}</p>
                            )}
                          </div>

                          {/* Days input */}
                          <div className="md:col-span-1 flex items-center justify-center">
                            <Input
                              type="number" min={1}
                              value={item.days}
                              onChange={(e) => updateDays(item.id, Number(e.target.value))}
                              className="h-7 text-xs text-center w-14"
                              disabled={isExecuted}
                            />
                          </div>

                          {/* Net per day (internal reference) */}
                          <div className="md:col-span-2 text-right">
                            {s.numberOfScreens > 1 ? (
                              <div className="flex flex-col items-end">
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {fmt(item.pricePerDay / s.numberOfScreens)} / screen
                                </p>
                                <p className="text-xs font-medium text-slate-700 whitespace-nowrap mt-0.5">
                                  {fmt(item.pricePerDay)} total
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                                {fmt(item.pricePerDay)}
                              </p>
                            )}
                          </div>

                          {/* Client-facing total + delete */}
                          <div className="md:col-span-2 flex items-center justify-end gap-1">
                            <p className="text-sm font-bold text-violet-700 whitespace-nowrap">{fmt(clientAmt)}</p>
                            {!isExecuted && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-red-400 hover:text-red-500 shrink-0"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Screen Picker Modal */}
      <ScreenPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addScreen}
        existingIds={existingIds}
      />

      {/* Execute Confirmation Dialog */}
      <AlertDialog open={executeDialog} onOpenChange={setExecuteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute this media plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a campaign and submit booking requests for all{" "}
              {items.filter((i) => i.status === "included").length} screen(s) at a
              client total of <strong>{fmt(clientTotal)}</strong>.<br /><br />
              The plan will be locked after execution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => { setExecuteDialog(false); executePlan.mutate(); }}
            >
              {executePlan.isPending ? "Executing…" : "Yes, Execute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
