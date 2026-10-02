import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ShoppingCart, List, Map as MapIcon, SlidersHorizontal, Check, Loader2, Star, Menu, Users, Search, X, Coffee, Utensils, Bus, ShoppingBag, Building2, Plane, Monitor, Train, Briefcase, Activity, Store, Hotel, Ticket, MonitorPlay, Dumbbell, GraduationCap, Scissors, Car, Layers, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Screen, ZoneInfo } from "@shared/schema";
import { VENUE_CATEGORIES } from "@shared/constants";
import { getScreenCountDisplay, calculateScreenPricePerDay } from "@shared/utils";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { SearchAutocomplete } from "@/components/map/SearchAutocomplete";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DiscoverAuthModal } from "@/components/DiscoverAuthModal";
import { MapBottomSheet, type SheetSnap } from "@/components/discover/MapBottomSheet";
import { VenuePanel } from "@/components/map/VenuePanel";
import { VenueMarker } from "@/components/map/VenueMarker";
import { groupScreensByVenue, venueKeyFor, screenCount, type VenueGroup } from "@/lib/venueGroups";
import { cardFactsFor, type DisplayFact } from "@/lib/venueFacts";
import { ScreenResultCard } from "@/components/discover/ScreenResultCard";
import { ScreenDetailPanel } from "@/components/discover/ScreenDetailPanel";
import { useDiscoverPanel, parentPanel, type DiscoverPanel } from "@/lib/discoverPanel";
import { findSimilarScreens } from "@/lib/similarScreens";
import { VENUE_FAMILIES, parseSearchQuery, resolveVenueType, typesInFamily } from "@shared/venueTaxonomy";
import { screenFamily, priceInfo, primaryPhoto, localityLine } from "@/lib/screenInfo";
import { ScreenPhoto } from "@/components/discover/VenueTypeIcon";
import { formatRupees } from "@/lib/venueGroups";
import { venuesInView, type MapViewport } from "@/lib/mapClusters";

const SELECTED_SCREENS_KEY = "selectedScreenIds";

// Sort options — all applied on the server so paging stays correct
type DiscoverSort = "recommended" | "price_asc" | "price_desc" | "distance" | "map_center" | "footfall" | "value" | "package_size" | "newest";
const SORT_LABELS: Record<DiscoverSort, string> = {
  recommended: "Recommended",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  distance: "Nearest to searched place",
  map_center: "Nearest to map centre",
  footfall: "Highest daily footfall",
  value: "Best value (₹ per 1,000 people)",
  package_size: "Most screens",
  newest: "Newest",
};

interface DiscoverFilters {
  state: string;
  city: string;
  families: string[]; // venue family chips (phase 3 taxonomy)
  venueTypes: string[]; // venue type multi-select
  venueCategories: string[]; // legacy raw category (unknown ?venue= values only)
  environment: "" | "indoor" | "outdoor";
  screenCategories: string[];
  trafficTypes: string[];
  userIntents: string[];
  locationTags: string[];
  minPrice: string;
  maxPrice: string;
  search: string;
}

const EMPTY_FILTERS: DiscoverFilters = {
  state: "",
  city: "",
  families: [],
  venueTypes: [],
  venueCategories: [],
  environment: "",
  screenCategories: [],
  trafficTypes: [],
  userIntents: [],
  locationTags: [],
  minPrice: "",
  maxPrice: "",
  search: "",
};

// Filters that count toward the "Filters (n)" badge — the location search is not one of them
function activeFilterCount(f: DiscoverFilters): number {
  return (
    (f.state ? 1 : 0) + (f.city ? 1 : 0) + f.venueTypes.length + f.venueCategories.length + f.screenCategories.length +
    f.trafficTypes.length + f.userIntents.length + f.locationTags.length + (f.minPrice ? 1 : 0) + (f.maxPrice ? 1 : 0)
  );
}

export default function DiscoverScreens() {
  const map = useMap("discover-screens-map");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [hoveredScreenId, setHoveredScreenId] = useState<string | null>(null);
  // Sidebar: results ↔ screen detail ↔ venue (mirrored in the URL)
  const { panel, setPanel } = useDiscoverPanel();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Zone State
  const [zoneInfo, setZoneInfo] = useState<ZoneInfo | null>(null);
  const [zoneScreens, setZoneScreens] = useState<Screen[]>([]);
  const [activeZoneScreens, setActiveZoneScreens] = useState<Screen[] | null>(null);
  const [activeZoneName, setActiveZoneName] = useState<string | null>(null);
  const [highlightedZoneIds, setHighlightedZoneIds] = useState<Set<string>>(new Set());
  const [zonePriceOverrides, setZonePriceOverrides] = useState<globalThis.Map<string, number>>(new globalThis.Map());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // Mobile: the sheet over the map — 0 peek, 1 half, 2 full
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>(0);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Search State
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [locationName, setLocationName] = useState<string>("");
  const [locationType, setLocationType] = useState<string>("city");
  const [locationBounds, setLocationBounds] = useState<google.maps.LatLngBoundsLiteral | null>(null);
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false);
  const geocodingLib = useMapsLibrary("geocoding");

  // Filters State
  const [filters, setFilters] = useState<DiscoverFilters>(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const q = params.get("q");
    const venue = params.get("venue");
    // ?venue=Apartment (links from other pages) → the canonical type; unknown text stays raw
    const venueType = venue ? resolveVenueType(venue)?.type.slug : undefined;

    return {
      ...EMPTY_FILTERS,
      venueTypes: venueType ? [venueType] : [],
      venueCategories: venue && !venueType ? [venue] : [],
      search: q || "",
    };
  });

  const [sortBy, setSortBy] = useState<DiscoverSort>("recommended");
  // "Search this area": the map view the advertiser asked to search (bounds + its centre)
  const [areaSearch, setAreaSearch] = useState<{ bounds: { north: number; south: number; east: number; west: number }; lat: number; lng: number } | null>(null);
  // Shown after the advertiser pans/zooms the map themselves (never on its own moves)
  const [showSearchArea, setShowSearchArea] = useState(false);
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);

  // Ref for map circle
  const circleRef = useRef<google.maps.Circle | null>(null);
  // Refs for sidebar list cards, keyed by screen id — lets a hovered/selected map marker scroll its card into view
  const listItemRefs = useRef(new globalThis.Map<string, HTMLDivElement | null>());

  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_SCREENS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setSelectedScreenIds(new Set(parsed));
        }
      } catch (e) {
        console.error("Failed to parse selected screens from localStorage", e);
      }
    }
    const savedOverrides = localStorage.getItem("zonePriceOverrides");
    if (savedOverrides) {
      try {
        const parsed = JSON.parse(savedOverrides);
        if (Array.isArray(parsed)) {
          setZonePriceOverrides(new globalThis.Map(parsed));
        }
      } catch (e) {
        console.error("Failed to parse zone prices", e);
      }
    }
  }, []);

  // Fetch zone info when a screen's detail is open
  const detailScreenId = panel.kind === "screen" ? panel.id : null;
  useEffect(() => {
    if (!detailScreenId) {
      setZoneInfo(null);
      setZoneScreens([]);
      return;
    }

    async function fetchZoneInfo() {
      try {
        const res = await fetch(`/api/zones/screen/${detailScreenId}`);
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
  }, [detailScreenId]);

  const saveZoneOverrides = (newOverrides: Map<string, number>) => {
    setZonePriceOverrides(newOverrides);
    localStorage.setItem("zonePriceOverrides", JSON.stringify(Array.from(newOverrides.entries())));
  };

  // Where + what to search (no sort / paging): shared by the list, map pins and chip counts.
  // Geography, in priority order: "Search this area" (map bounds; its centre is the distance
  // origin), a country/state (its bounds), or the searched place + radius.
  const filterString = useMemo(() => {
    const params = new URLSearchParams();
    const bounds = areaSearch
      ? areaSearch.bounds
      : locationBounds && (locationType === "country" || locationType === "administrative_area_level_1") ? locationBounds : null;
    if (bounds) {
      params.append("boundsN", bounds.north.toString());
      params.append("boundsS", bounds.south.toString());
      params.append("boundsE", bounds.east.toString());
      params.append("boundsW", bounds.west.toString());
      if (areaSearch) {
        // centre only sets where distances are measured from (bounds win over radius on the server)
        params.append("lat", areaSearch.lat.toString());
        params.append("lng", areaSearch.lng.toString());
      }
    } else if (lat !== undefined && lng !== undefined) {
      params.append("lat", lat.toString());
      params.append("lng", lng.toString());
      params.append("radiusKm", radiusKm.toString());
    }

    if (filters.state) params.append("state", filters.state);
    if (filters.city) params.append("city", filters.city);
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
    
    filters.families.forEach(f => params.append("families", f));
    filters.venueTypes.forEach(t => params.append("venueTypes", t));
    if (filters.environment) params.append("environment", filters.environment);
    if (filters.venueCategories.length > 0) {
      filters.venueCategories.forEach(v => params.append("venueCategories", v));
    }
    if (filters.screenCategories.length > 0) {
      filters.screenCategories.forEach(s => params.append("screenCategories", s));
    }
    if (filters.trafficTypes.length > 0) {
      filters.trafficTypes.forEach(t => params.append("trafficTypes", t));
    }
    if (filters.userIntents.length > 0) {
      filters.userIntents.forEach(i => params.append("userIntents", i));
    }
    if (filters.locationTags.length > 0) {
      filters.locationTags.forEach(t => params.append("locationTags", t));
    }
    if (filters.search) {
      params.append("search", filters.search);
    }
    
    return params.toString();
  }, [filters, lat, lng, radiusKm, locationBounds, locationType, areaSearch]);

  // Distance sorts need an origin: the searched place, or the map centre after "Search this area"
  const hasDistanceOrigin = !!areaSearch || (lat !== undefined && lng !== undefined);
  const effectiveSort: DiscoverSort = (sortBy === "distance" || sortBy === "map_center") && !hasDistanceOrigin ? "recommended" : sortBy;

  // Results list: sorted and paged on the server (24 per page), "Load more" fetches the next page
  const LIST_PAGE_SIZE = 24;
  const {
    data: listData,
    isLoading: listLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<{ screens: (Screen & { distanceKm?: number })[]; total: number }>({
    queryKey: ["/api/screens", "list", filterString, effectiveSort],
    queryFn: async ({ pageParam }) => {
      const res = await fetch(`/api/screens?${filterString}&sortBy=${effectiveSort}&page=${pageParam}&pageSize=${LIST_PAGE_SIZE}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Screens request failed (${res.status})`);
      return res.json();
    },
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (pages.length * LIST_PAGE_SIZE < last.total ? pages.length + 1 : undefined),
    enabled: initialLocationLoaded,
  });

  // Map: every match as a slim row (pins, clusters, venue grouping, header count)
  const { data: pinData, isLoading: pinsLoading } = useQuery<(Screen & { distanceKm?: number })[]>({
    queryKey: [`/api/screens/pins?${filterString}`],
    enabled: initialLocationLoaded,
  });
  const isLoading = listLoading || pinsLoading;

  // Screens per venue family/type for this search (the server ignores the type filter itself,
  // so every chip keeps its own count while one is selected)
  const { data: facets } = useQuery<{ total: number; families: Record<string, number>; types: Record<string, number> }>({
    queryKey: [`/api/screens/facets?${filterString}`],
    enabled: initialLocationLoaded,
  });

  useEffect(() => {
    // If we've already done the initial location fetch, do nothing.
    if (initialLocationLoaded) return;
    
    // If the library is not yet loaded, we must wait.
    if (!geocodingLib) return;

    const geocoder = new geocodingLib.Geocoder();

    // A shared link to a venue (?place=lat,lng) or a screen (?screen=id) searches around that
    // place, not around the viewer, so the linked venue/screen is actually in the results
    const startAt = (pLat: number, pLng: number) => {
      setLat(pLat);
      setLng(pLng);
      setRadiusKm(5);
      geocoder.geocode({ location: { lat: pLat, lng: pLng } }, (results, status) => {
        const comp = status === "OK" ? results?.[0]?.address_components.find(c => c.types.includes("sublocality") || c.types.includes("locality")) : undefined;
        setLocationName(comp?.long_name || "");
      });
      setInitialLocationLoaded(true);
    };
    if (panel.kind === "venue") {
      const [pLat, pLng] = panel.key.split(",").map(Number);
      if (!isNaN(pLat) && !isNaN(pLng)) {
        startAt(pLat, pLng);
        return;
      }
    }
    if (panel.kind === "screen") {
      fetch(`/api/screens/by-ids?ids=${encodeURIComponent(panel.id)}`)
        .then(r => (r.ok ? r.json() : []))
        .then((rows: Screen[]) => {
          const s = Array.isArray(rows) ? rows[0] : null;
          const sLat = s ? parseFloat(String(s.latitude)) : NaN;
          const sLng = s ? parseFloat(String(s.longitude)) : NaN;
          if (!isNaN(sLat) && !isNaN(sLng)) startAt(sLat, sLng);
          else setInitialLocationLoaded(true);
        })
        .catch(() => setInitialLocationLoaded(true));
      return;
    }

    const fetchFallbackIPLocation = async () => {
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (response.ok) {
          const data = await response.json();
          if (data.latitude && data.longitude && data.city) {
            setLat(data.latitude);
            setLng(data.longitude);
            setLocationName(data.city);
            setInitialLocationLoaded(true);
            return;
          }
        }
      } catch (err) {
        console.error("IP fallback failed", err);
      }
      
      // Ultimate fallback: Just load everything
      setInitialLocationLoaded(true);
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLat(latitude);
          setLng(longitude);
          
          // Reverse geocode to get the city name
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === "OK" && results && results[0]) {
              // Find locality or administrative_area_level_2
              const cityComponent = results[0].address_components.find(c => 
                c.types.includes("locality") || c.types.includes("administrative_area_level_2")
              );
              if (cityComponent) {
                setLocationName(cityComponent.long_name);
              } else {
                setLocationName("Current Location");
              }
            } else {
              setLocationName("Current Location");
            }
            setInitialLocationLoaded(true);
          });
        },
        () => {
          // Declining location access is a normal choice, not an error — fall back to IP location
          fetchFallbackIPLocation();
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    } else {
      fetchFallbackIPLocation();
    }
  }, [initialLocationLoaded, geocodingLib]);

  // `screens`: every match (slim pin rows) — map, counts, venue grouping, similar screens.
  // `listScreens`: full rows on the list pages loaded so far. "View zone" shows just the zone.
  const screens: (Screen & { distanceKm?: number })[] = activeZoneScreens || pinData || [];
  const listScreens = useMemo(
    () => activeZoneScreens || (listData?.pages.flatMap(p => p.screens) ?? []),
    [activeZoneScreens, listData]
  );
  const listTotal = activeZoneScreens ? activeZoneScreens.length : listData?.pages[0]?.total ?? 0;

  const totalPhysicalScreensCount = useMemo(() => {
    return screens.reduce((acc, s) => {
      return acc + (s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1);
    }, 0);
  }, [screens]);

  const mapScreens = useMemo(() => {
    return screens.filter(s => !isNaN(parseFloat(String(s.latitude))) && !isNaN(parseFloat(String(s.longitude))));
  }, [screens]);

  // One map pin per venue: listings at the same spot (e.g. a PVR lobby package + its audi screens)
  const venueGroups = useMemo(() => groupScreensByVenue(mapScreens), [mapScreens]);
  const venueByKey = useMemo(() => {
    const m = new globalThis.Map<string, VenueGroup>();
    venueGroups.forEach(g => m.set(g.key, g));
    return m;
  }, [venueGroups]);
  const activeVenue = panel.kind === "venue" ? venueByKey.get(panel.key) || null : null;

  // The screen whose detail is open: from the results, the zone, or (shared link to a screen
  // outside the current search) fetched on its own
  const screenFromResults = useMemo(() => {
    if (panel.kind !== "screen") return null;
    // full rows only — pins are slim, so a pin-only screen is fetched by id below
    return listScreens.find(s => s.id === panel.id) || zoneScreens.find(s => s.id === panel.id) || null;
  }, [panel, listScreens, zoneScreens]);
  const { data: fetchedDetail, isLoading: detailLoading } = useQuery<Screen[]>({
    queryKey: [`/api/screens/by-ids?ids=${panel.kind === "screen" ? panel.id : ""}`],
    enabled: panel.kind === "screen" && !screenFromResults && !isLoading,
  });
  const detailScreen: (Screen & { distanceKm?: number }) | null = useMemo(() => {
    if (panel.kind !== "screen") return null;
    const full: (Screen & { distanceKm?: number }) | null = screenFromResults || (Array.isArray(fetchedDetail) ? fetchedDetail[0] || null : null);
    if (!full) return null;
    // a screen fetched by id has no distance — take it from its map pin
    const pin = full.distanceKm === undefined ? screens.find(s => s.id === full.id) : undefined;
    return pin?.distanceKm !== undefined ? { ...full, distanceKm: pin.distanceKm } : full;
  }, [panel, screenFromResults, fetchedDetail, screens]);
  const detailVenue = useMemo(() => {
    if (!detailScreen) return null;
    const key = venueKeyFor(detailScreen);
    return key ? venueByKey.get(key) || null : null;
  }, [detailScreen, venueByKey]);
  const similarScreens = useMemo(
    () => (detailScreen ? findSimilarScreens(detailScreen, mapScreens) : []),
    [detailScreen, mapScreens]
  );
  // Venue key the selected pin should show as active (open venue, or the venue of the open screen)
  const selectedVenueKey = panel.kind === "venue" ? panel.key : detailScreen ? venueKeyFor(detailScreen) : null;

  // Card facts per venue ("660 flats · ₹1.2 Cr avg flat value"), parsed once per venue
  const typeFactsCache = useMemo(() => new globalThis.Map<string, DisplayFact[]>(), [venueGroups]);
  const typeFactsFor = (screen: Screen): DisplayFact[] => {
    const key = venueKeyFor(screen) || screen.id;
    let facts = typeFactsCache.get(key);
    if (!facts) {
      const venue = venueByKey.get(key);
      facts = venue ? cardFactsFor(venue.listings, venue.family) : cardFactsFor([screen], screenFamily(screen));
      typeFactsCache.set(key, facts);
    }
    return facts;
  };

  // Zoomed out, nearby venues merge into count bubbles; only what's in view is rendered
  const [mapViewport, setMapViewport] = useState<MapViewport>({ zoom: 5, bounds: null });
  const syncMapViewport = useCallback(() => {
    if (!map) return;
    const b = map.getBounds()?.toJSON();
    setMapViewport({ zoom: map.getZoom() ?? 5, bounds: b ? { north: b.north, south: b.south, east: b.east, west: b.west } : null });
  }, [map]);
  useEffect(() => {
    if (!map) return;
    syncMapViewport();
    const listener = map.addListener("idle", syncMapViewport);
    return () => listener.remove();
  }, [map, syncMapViewport]);
  // "Search this area" appears only after the advertiser moves the map (drag, wheel, pinch) —
  // programmatic moves (fitting a new search, opening a venue) never trigger it, and panning
  // alone never refetches.
  useEffect(() => {
    if (!map) return;
    let userMoved = false;
    const markUser = () => { userMoved = true; };
    const div = map.getDiv();
    div.addEventListener("wheel", markUser, { passive: true });
    div.addEventListener("touchmove", markUser, { passive: true });
    const drag = map.addListener("dragstart", markUser);
    const idle = map.addListener("idle", () => {
      if (userMoved) setShowSearchArea(true);
      userMoved = false;
    });
    return () => {
      div.removeEventListener("wheel", markUser);
      div.removeEventListener("touchmove", markUser);
      drag.remove();
      idle.remove();
    };
  }, [map]);

  const searchThisArea = () => {
    if (!map) return;
    const b = map.getBounds()?.toJSON();
    const c = map.getCenter();
    if (!b || !c) return;
    setAreaSearch({ bounds: { north: b.north, south: b.south, east: b.east, west: b.west }, lat: c.lat(), lng: c.lng() });
    setShowSearchArea(false);
    if (sortBy === "distance") setSortBy("map_center");
    setPage(1);
  };

  // A new place / radius search replaces the map-area search
  useEffect(() => {
    setAreaSearch(null);
    setShowSearchArea(false);
  }, [lat, lng, radiusKm, locationBounds]);

  // Every venue gets its own pin; only those in (or near) the visible map area are drawn
  const mapVenues = useMemo(() => venuesInView(venueGroups, mapViewport), [venueGroups, mapViewport]);

  // Once results have loaded, drop a venue/screen the new search no longer contains (replace, so
  // Back doesn't bring back something that isn't there)
  useEffect(() => {
    if (isLoading || !initialLocationLoaded) return;
    if (panel.kind === "venue" && !venueByKey.has(panel.key)) setPanel({ kind: "results" }, "replace");
    if (panel.kind === "screen" && !detailScreen && !detailLoading && fetchedDetail !== undefined) setPanel({ kind: "results" }, "replace");
  }, [panel, venueByKey, isLoading, initialLocationLoaded, detailScreen, detailLoading, fetchedDetail, setPanel]);

  // The results list keeps its scroll position while a detail/venue is open
  const listScrollRef = useRef<HTMLDivElement | null>(null);
  const savedListScroll = useRef(0);
  const navigatePanel = useCallback((next: DiscoverPanel) => {
    if (panel.kind === "results" && next.kind !== "results" && listScrollRef.current) {
      savedListScroll.current = listScrollRef.current.scrollTop;
    }
    setPanel(next);
  }, [panel.kind, setPanel]);
  useLayoutEffect(() => {
    if (panel.kind === "results" && listScrollRef.current) listScrollRef.current.scrollTop = savedListScroll.current;
  }, [panel.kind]);

  const goBack = useCallback(() => navigatePanel(parentPanel(panel)), [navigatePanel, panel]);

  // Esc goes back one level (but not while a dialog on top of the page is open)
  useEffect(() => {
    if (panel.kind === "results") return;
    if (showAuthModal || showAdvancedFilters || showMobileSearch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panel.kind, goBack, showAuthModal, showAdvancedFilters, showMobileSearch]);

  // Keep the selected pin on screen. Zooming in (venues) centres on the pin first so it can't end
  // up off-screen; otherwise only pan when it's outside the current view.
  const revealOnMap = (lat: number, lng: number, zoomTo?: number) => {
    if (!map || isNaN(lat) || isNaN(lng)) return;
    if (isMobile) {
      // Mobile: the half sheet covers the lower ~52%, and the search pill + chips the top ~110px —
      // centre the pin in the strip of map between them
      map.setCenter({ lat, lng });
      if (zoomTo && (map.getZoom() || 0) < zoomTo) map.setZoom(zoomTo);
      const mapHeight = map.getDiv().clientHeight || window.innerHeight;
      const visibleMid = (110 + window.innerHeight * 0.48) / 2;
      map.panBy(0, Math.round(mapHeight / 2 - visibleMid));
      return;
    }
    if (zoomTo && (map.getZoom() || 0) < zoomTo) {
      map.setCenter({ lat, lng });
      map.setZoom(zoomTo);
      return;
    }
    const bounds = map.getBounds();
    if (!bounds || !bounds.contains({ lat, lng })) map.panTo({ lat, lng });
  };

  const openVenue = (key: string) => {
    const venue = venueByKey.get(key);
    if (!venue) return;
    navigatePanel({ kind: "venue", key });
    if (isMobile) setSheetSnap(1);
    revealOnMap(venue.lat, venue.lng, 15);
  };

  const openScreen = (screen: Screen, fromVenue?: string) => {
    navigatePanel({ kind: "screen", id: screen.id, fromVenue });
    if (isMobile) setSheetSnap(1);
    revealOnMap(parseFloat(String(screen.latitude)), parseFloat(String(screen.longitude)));
  };

  // A click on the map itself (not a pin, not the end of a drag) goes back to the results.
  // Google fires the map's click for marker clicks too, so pins stamp the time they were clicked.
  const lastMarkerClick = useRef(0);
  const markMarkerClick = () => { lastMarkerClick.current = Date.now(); };
  const handleMapClick = () => {
    if (Date.now() - lastMarkerClick.current < 400) return;
    if (panel.kind !== "results") navigatePanel({ kind: "results" });
    // on mobile an empty-map tap also lowers the sheet so the map is free to explore
    if (isMobile) setSheetSnap(0);
  };

  // Scroll the sidebar list to whichever screen is hovered/selected on the map (desktop only —
  // on mobile the list lives in the sheet and hover doesn't exist)
  useEffect(() => {
    if (isMobile || !hoveredScreenId) return;
    listItemRefs.current.get(hoveredScreenId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [hoveredScreenId, isMobile]);

  const { data: locations } = useQuery<{
    states: string[];
    cities: { [state: string]: string[] };
    allCities: string[];
  }>({
    queryKey: ["/api/screens/locations"],
  });

  const { data: advancedFilters } = useQuery<{
    cities: string[];
    venueTypes: string[];
    environmentTypes: string[];
    tags: any[];
    userIntents: string[];
    locationTags: string[];
  }>({
    queryKey: ["/api/screens/filters"],
  });

  const screenCategoryOptions = Array.from(new Set(screens.map(s => s.category).filter(Boolean))).sort();
  const availableCities = filters.state && locations?.cities[filters.state] 
    ? locations.cities[filters.state] 
    : locations?.allCities || [];

  // Update Map Circle
  useEffect(() => {
    if (!map || !window.google) return;

    // Handle Country/State Bounds
    if (locationBounds && (locationType === "country" || locationType === "administrative_area_level_1")) {
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
      map.fitBounds(locationBounds);
      return;
    }

    // Handle Radius Circle for City/POI
    if (lat !== undefined && lng !== undefined) {
      if (!circleRef.current) {
        circleRef.current = new window.google.maps.Circle({
          strokeColor: "#0f766e",
          strokeOpacity: 0.3,
          strokeWeight: 2,
          fillColor: "#0f766e",
          fillOpacity: 0.1,
          map,
        });
      }
      circleRef.current.setCenter({ lat, lng });
      circleRef.current.setRadius(radiusKm * 1000);

      // Fit map to circle bounds
      const bounds = circleRef.current.getBounds();
      if (bounds) map.fitBounds(bounds);
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, [map, lat, lng, radiusKm, locationBounds, locationType]);

  // While a map-area search is active the place's radius circle no longer describes the results
  useEffect(() => {
    circleRef.current?.setVisible(!areaSearch);
  }, [areaSearch]);

  // Fallback map bounds if no lat/lng but screens exist (never while searching a map area — the
  // advertiser chose that view)
  useEffect(() => {
    if (!map || !window.google || areaSearch || (lat !== undefined && lng !== undefined) || screens.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasCoords = false;
    screens.forEach((screen) => {
      const lat = parseFloat(String(screen.latitude));
      const lng = parseFloat(String(screen.longitude));
      if (!isNaN(lat) && !isNaN(lng)) {
        bounds.extend({ lat, lng });
        hasCoords = true;
      }
    });

    if (hasCoords) {
      map.fitBounds(bounds);
      if (screens.length === 1) map.setZoom(13);
    }
  }, [map, screens, lat, lng, areaSearch]);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult | null, inputValue: string) => {
    setLocationName(inputValue);
    setAreaSearch(null);
    setShowSearchArea(false);
    if (sortBy === "map_center") {
      setSortBy("recommended");
    }
    setPage(1);

    if (place?.geometry?.location) {
      const newLat = typeof place.geometry.location.lat === "function" ? place.geometry.location.lat() : Number(place.geometry.location.lat);
      const newLng = typeof place.geometry.location.lng === "function" ? place.geometry.location.lng() : Number(place.geometry.location.lng);
      
      let type = "city";
      if (place.types) {
        if (place.types.includes("country")) type = "country";
        else if (place.types.includes("administrative_area_level_1")) type = "administrative_area_level_1";
        else if (place.types.includes("locality")) type = "locality";
        else if (place.types.includes("sublocality") || place.types.includes("neighborhood") || place.types.includes("point_of_interest") || place.types.includes("establishment")) {
          type = "poi";
        }
      }
      setLocationType(type);
      
      let targetRadius = radiusKm;
      if (type === "poi") {
        targetRadius = 10;
        setRadiusKm(10);
      } else if (type === "locality" || type === "city") {
        targetRadius = 15;
        setRadiusKm(15);
      }

      let bounds: google.maps.LatLngBoundsLiteral | null = null;
      if (place.geometry.viewport) {
        bounds = typeof place.geometry.viewport.toJSON === "function" ? place.geometry.viewport.toJSON() : place.geometry.viewport;
        setLocationBounds(bounds);
      } else {
        setLocationBounds(null);
      }
      
      setLat(newLat);
      setLng(newLng);
      setFilters(prev => ({ ...prev, search: "" }));
      setActiveZoneScreens(null);
      setActiveZoneName(null);

      // Force map and circle to update immediately
      if (map) {
        if (bounds && (type === "country" || type === "administrative_area_level_1")) {
          if (circleRef.current) {
            circleRef.current.setMap(null);
            circleRef.current = null;
          }
          map.fitBounds(bounds);
        } else {
          if (!circleRef.current && window.google) {
            circleRef.current = new window.google.maps.Circle({
              strokeColor: "#0f766e",
              strokeOpacity: 0.3,
              strokeWeight: 2,
              fillColor: "#0f766e",
              fillOpacity: 0.1,
              map,
            });
          }
          if (circleRef.current) {
            circleRef.current.setCenter({ lat: newLat, lng: newLng });
            circleRef.current.setRadius(targetRadius * 1000);
            circleRef.current.setVisible(true);
            const circleBounds = circleRef.current.getBounds();
            if (circleBounds) {
              map.fitBounds(circleBounds);
            } else {
              map.setCenter({ lat: newLat, lng: newLng });
              map.setZoom(type === "poi" ? 14 : 12);
            }
          } else {
            map.setCenter({ lat: newLat, lng: newLng });
            map.setZoom(type === "poi" ? 14 : 12);
          }
        }
      }
    } else if (inputValue) {
      if (geocodingLib && window.google) {
        const geocoder = new geocodingLib.Geocoder();
        geocoder.geocode({ address: inputValue, componentRestrictions: { country: "in" } }, (results, status) => {
          if (status === "OK" && results && results[0]) {
            handlePlaceSelect(results[0], inputValue);
          } else {
            setLat(undefined);
            setLng(undefined);
            setLocationBounds(null);
            setLocationType("city");
            setFilters(prev => ({ ...prev, search: inputValue }));
            setActiveZoneScreens(null);
            setActiveZoneName(null);
            if (circleRef.current) {
              circleRef.current.setMap(null);
              circleRef.current = null;
            }
          }
        });
      } else {
        setLat(undefined);
        setLng(undefined);
        setLocationBounds(null);
        setLocationType("city");
        setFilters(prev => ({ ...prev, search: inputValue }));
        setActiveZoneScreens(null);
        setActiveZoneName(null);
        if (circleRef.current) {
          circleRef.current.setMap(null);
          circleRef.current = null;
        }
      }
    } else {
      setLat(undefined);
      setLng(undefined);
      setLocationBounds(null);
      setLocationType("city");
      setFilters(prev => ({ ...prev, search: "" }));
      setActiveZoneScreens(null);
      setActiveZoneName(null);
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    toast({ title: "Locating...", description: "Getting your current location." });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mockPlace: any = {
          geometry: {
            location: {
              lat: () => latitude,
              lng: () => longitude,
            }
          },
          formatted_address: "Current Location",
          name: "Current Location"
        };
        handlePlaceSelect(mockPlace, "Current Location");
      },
      (error) => {
        toast({ title: "Location Error", description: "Could not get your location.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const toggleScreenSelection = (screen: Screen) => {
    const next = new Set(selectedScreenIds);
    if (next.has(screen.id)) {
      next.delete(screen.id);
      
      // Cleanup zone price override if it exists
      if (zonePriceOverrides.has(screen.id)) {
        const newOverrides = new globalThis.Map(zonePriceOverrides);
        newOverrides.delete(screen.id);
        saveZoneOverrides(newOverrides);
      }
      toast({ title: "Removed from Campaign", description: `${screen.name} removed.` });
    } else {
      next.add(screen.id);
      toast({ title: "Added to Campaign", description: `${screen.name} added.` });
    }
    setSelectedScreenIds(next);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(Array.from(next)));

    // Only prompt login if adding a screen
    if (!user && !selectedScreenIds.has(screen.id)) {
      setPendingAction(() => () => setLocation("/advertiser/quick-campaign"));
      setShowAuthModal(true);
    }
  };

  const addScreensToCampaign = (toAdd: Screen[]) => {
    if (toAdd.length === 0) return;
    const next = new Set(selectedScreenIds);
    toAdd.forEach(s => next.add(s.id));
    setSelectedScreenIds(next);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(Array.from(next)));
    toast({ title: "Added to Campaign", description: `${toAdd.length} ${toAdd.length === 1 ? "listing" : "listings"} added.` });
    if (!user) {
      setPendingAction(() => () => setLocation("/advertiser/quick-campaign"));
      setShowAuthModal(true);
    }
  };

  const handleViewZone = () => {
    if (!zoneInfo || zoneScreens.length === 0) return;
    setHighlightedZoneIds(new Set(zoneScreens.map(s => s.id)));
    navigatePanel({ kind: "results" });

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
      setLocationBounds({ north: maxLat, south: minLat, east: maxLng, west: minLng });
      setLat(undefined);
      setLng(undefined);
    }
  };

  const handleBookZone = () => {
    if (!zoneInfo || zoneScreens.length === 0) return;
    
    const next = new Set(selectedScreenIds);
    const newOverrides = new globalThis.Map(zonePriceOverrides);
    
    zoneScreens.forEach(s => {
      next.add(s.id);
      newOverrides.set(s.id, zoneInfo.pricePerDay / zoneScreens.length);
    });
    
    setSelectedScreenIds(next);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(Array.from(next)));
    saveZoneOverrides(newOverrides);
    setHighlightedZoneIds(new Set());
    
    toast({
      title: "Zone Booked",
      description: `Added all ${zoneScreens.length} screens in ${zoneInfo.zoneName} to campaign.`,
    });
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
    if (!user) {
      setPendingAction(() => () => setLocation("/advertiser/quick-campaign"));
      setShowAuthModal(true);
      return;
    }
    setLocation("/advertiser/quick-campaign");
  };

  // Custom Map Marker Content — single screen
  const renderCustomMarker = (screen: Screen) => {
    const isOpen = detailScreenId === screen.id;
    const isHovered = hoveredScreenId === screen.id && !isOpen;
    const isSelected = selectedScreenIds.has(screen.id);
    const isHighlightedZone = highlightedZoneIds.has(screen.id);
    const hasMultiScreen = !!(screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1);
    const isBulkMandatory = !!screen.bulkBookingMandatory;

    // Use zone price override if we have one for this screen, else regular price
    const hasZoneOverride = zonePriceOverrides.has(screen.id);
    const basePrice = calculateScreenPricePerDay(screen);
    const price = zonePriceOverrides.get(screen.id) ?? basePrice ?? 0;
    const formatPrice = (p: number) => p >= 1000 ? `₹${(p / 1000).toFixed(1).replace('.0', '')}k` : `₹${Number(p).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

    // Bulk-mandatory venues are priced per screen × how many screens the booking spans, so
    // show that breakdown directly instead of a single collapsed total
    let priceDisplay = formatPrice(price);
    if (hasMultiScreen && isBulkMandatory && !hasZoneOverride && screen.numberOfScreens) {
      const unitPrice = Math.round(price / screen.numberOfScreens);
      priceDisplay = `${formatPrice(unitPrice)} × ${screen.numberOfScreens}`;
    }

    // Open in the sidebar: primary blue with a halo; in the campaign: green
    const pillColor = isOpen
      ? 'bg-primary text-primary-foreground border-white ring-4 ring-primary/25'
      : isSelected
        ? 'bg-green-600 text-white border-white'
        : isHighlightedZone
          ? 'bg-amber-500 text-white border-white'
          : isHovered
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-800 border-white hover:bg-slate-50';

    const caretColor = isOpen
      ? 'border-t-primary'
      : isSelected
        ? 'border-t-green-600'
        : isHighlightedZone
          ? 'border-t-amber-500'
          : isHovered
            ? 'border-t-slate-900'
            : 'border-t-white';

    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${screen.venueName}, ${priceDisplay} per day`}
        aria-pressed={isOpen}
        className={`relative flex flex-col items-center transition-all duration-300 cursor-pointer ${
          isHovered || isOpen ? 'scale-125 z-50' : 'scale-100 z-10'
        }`}
        onMouseEnter={() => setHoveredScreenId(screen.id)}
        onMouseLeave={() => setHoveredScreenId(null)}
        onClick={() => {
          markMarkerClick();
          openScreen(screen);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openScreen(screen);
          }
        }}
      >
        {/* Price pill */}
        <div className={`px-3 py-1.5 rounded-full font-bold text-[13px] shadow-lg border-2 whitespace-nowrap ${
          pillColor
        } ${(isHovered || isOpen) && !isSelected ? 'shadow-xl font-extrabold' : 'shadow-md'}`}>
          {priceDisplay}
        </div>

        {/* Multi-screen / bulk-mandatory badges — combined into one row to keep the marker compact */}
        {(hasMultiScreen || isBulkMandatory) && (
          <div className="mt-0.5 flex items-center gap-1 justify-center flex-wrap">
            {/* When bulk-mandatory, the price pill above already shows "×N" as part of the price
                breakdown — skip the redundant count badge here and only flag the "All required" state */}
            {hasMultiScreen && !isBulkMandatory && (
              <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-sm border ${
                isSelected ? 'bg-green-700 text-white border-green-700' : 'bg-violet-600 text-white border-violet-600'
              }`}>
                <Layers className="w-2.5 h-2.5" />
                <span>×{screen.numberOfScreens}</span>
              </div>
            )}

            {isBulkMandatory && (
              <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-sm bg-amber-500 text-white border border-amber-500">
                <AlertTriangle className="w-2.5 h-2.5" />
                <span>All required</span>
              </div>
            )}
          </div>
        )}

        {/* Caret */}
        <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${caretColor}`} />
      </div>
    );
  };

  // Venue pin — one pin for every listing at the same spot. Shows the lowest price and the
  // total number of screens; clicking opens the venue panel listing packages and single screens.
  const renderVenueMarker = (venue: VenueGroup) => (
    <VenueMarker
      venue={venue}
      isActive={selectedVenueKey === venue.key}
      isHovered={!!hoveredScreenId && venue.listings.some(l => l.id === hoveredScreenId)}
      addedCount={venue.listings.filter(l => selectedScreenIds.has(l.id)).length}
      isHighlightedZone={venue.listings.some(l => highlightedZoneIds.has(l.id))}
      onClick={() => {
        markMarkerClick();
        openVenue(venue.key);
      }}
      onMouseEnter={() => setHoveredScreenId(venue.listings[0].id)}
      onMouseLeave={() => setHoveredScreenId(null)}
    />
  );

  const resultsLabel = "All results";

  // Quick filter chips — desktop header and the mobile row under the search pill: Indoor/Outdoor,
  // then one chip per venue family with its screen count in this search (families with nothing
  // here are hidden unless selected). Type words in the search box ("gym") light their family up.
  const impliedFamilies = useMemo(() => new Set<string>(parseSearchQuery(filters.search).families), [filters.search]);
  const chipClass = (active: boolean, implied = false) => `shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-colors ${
    active
      ? 'border-slate-900 bg-slate-900 text-white'
      : implied
        ? 'border-primary text-primary bg-primary/5'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
  }`;
  const toggleFamily = (slug: string) => {
    setFilters(f => ({ ...f, families: f.families.includes(slug) ? f.families.filter(x => x !== slug) : [...f.families, slug] }));
    setPage(1);
  };
  const quickChips = [
    ...(["indoor", "outdoor"] as const).map(env => (
      <button
        key={`env-${env}`}
        type="button"
        aria-pressed={filters.environment === env}
        onClick={() => { setFilters(f => ({ ...f, environment: f.environment === env ? "" : env })); setPage(1); }}
        className={chipClass(filters.environment === env)}
      >
        {env === "indoor" ? "Indoor screens" : "Outdoor screens"}
      </button>
    )),
    <div key="sep" className="w-px h-6 bg-slate-200 mx-0.5 shrink-0 self-center" aria-hidden="true" />,
    ...VENUE_FAMILIES
      .map(f => ({ ...f, count: facets?.families[f.slug] ?? 0 }))
      .filter(f => f.count > 0 || filters.families.includes(f.slug))
      .sort((a, b) => b.count - a.count)
      .map(f => {
        const active = filters.families.includes(f.slug);
        return (
          <button
            key={`family-${f.slug}`}
            type="button"
            aria-pressed={active}
            aria-label={`${f.label}, ${f.count.toLocaleString("en-IN")} screens`}
            onClick={() => toggleFamily(f.slug)}
            className={chipClass(active, impliedFamilies.has(f.slug))}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${active ? 'text-white/70' : 'text-slate-400'}`}>{f.count.toLocaleString("en-IN")}</span>
          </button>
        );
      }),
  ];

  // Venue type multi-select (Filters dialog): grouped by family, with counts for this search
  const venueTypeOptions = VENUE_FAMILIES.flatMap(f =>
    typesInFamily(f.slug)
      .map(t => ({ t, count: facets?.types[t.slug] ?? 0 }))
      .filter(({ t, count }) => count > 0 || filters.venueTypes.includes(t.slug))
      .map(({ t, count }) => ({ value: t.slug, label: `${f.label} · ${t.label} (${count.toLocaleString("en-IN")})` }))
  );

  // "Nearest to map centre" searches the visible map area (like "Search this area") and sorts by
  // distance from its centre. "Nearest to searched place" only makes sense with a place searched.
  const sortOptions: DiscoverSort[] = [
    "recommended", "price_asc", "price_desc",
    ...(lat !== undefined && !areaSearch ? (["distance"] as DiscoverSort[]) : []),
    "map_center", "footfall", "value", "package_size", "newest",
  ];
  const sortSelect = (
    <Select
      value={effectiveSort}
      onValueChange={(v) => {
        const next = v as DiscoverSort;
        if (next === "map_center" && !areaSearch) searchThisArea();
        setSortBy(next);
      }}
    >
      <SelectTrigger className="w-auto min-w-[150px] max-w-[230px] h-9 border-none bg-slate-100 text-sm font-medium rounded-full" aria-label="Sort by">
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map(s => <SelectItem key={s} value={s}>{SORT_LABELS[s]}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const resultsCountLabel = isLoading ? 'Searching...' : `Over ${totalPhysicalScreensCount.toLocaleString()} screens`;
  const resultsPlaceLabel = areaSearch ? "This map area" : locationName;

  const resultsHeader = (
    <div className="flex justify-between items-end gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-slate-900">{resultsCountLabel}</h2>
        {resultsPlaceLabel && <p className="text-sm text-slate-500 truncate">{resultsPlaceLabel}</p>}
      </div>
      {sortSelect}
    </div>
  );

  const resultsList = isLoading ? (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-300" />
    </div>
  ) : listScreens.length === 0 ? (
    <div className="text-center py-20">
      <h3 className="text-lg font-medium text-slate-700">No exact matches</h3>
      <p className="text-slate-500 text-sm mt-1">
        {effectiveSort === "value" && screens.length > 0
          ? "None of these screens list their daily footfall, so they can't be ranked by value. Try another sort."
          : "Try changing or removing some of your filters."}
      </p>
      <Button
        variant="outline"
        className="mt-4 rounded-full"
        onClick={() => { setFilters(EMPTY_FILTERS); setSortBy("recommended"); }}
      >
        Clear all filters
      </Button>
    </div>
  ) : (
    <div className="flex flex-col">
      {effectiveSort === "value" && (
        <p className="text-xs text-slate-500 mb-4">
          Ranked by price per day for every 1,000 people who pass by daily. Screens that don't list their footfall are left out.
        </p>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 pb-8">
        {listScreens.map(screen => {
          const key = venueKeyFor(screen);
          const venue = key ? venueByKey.get(key) : undefined;
          const moreAtVenue = venue && venue.listings.length > 1 ? venue.totalScreens - screenCount(screen) : 0;
          return (
            <ScreenResultCard
              key={screen.id}
              screen={screen}
              typeFacts={typeFactsFor(screen)}
              isAdded={selectedScreenIds.has(screen.id)}
              isHighlighted={hoveredScreenId === screen.id}
              isSelected={detailScreenId === screen.id}
              moreAtVenue={moreAtVenue}
              priceOverride={zonePriceOverrides.get(screen.id)}
              showValue={effectiveSort === "value"}
              onOpen={() => openScreen(screen)}
              onToggleAdd={() => {
                if ((screen.zoneId || screen.zoneName) && !selectedScreenIds.has(screen.id)) {
                  openScreen(screen);
                } else {
                  toggleScreenSelection(screen);
                }
              }}
              onOpenVenue={venue ? () => openVenue(venue.key) : undefined}
              onHoverChange={(hovered) => setHoveredScreenId(hovered ? screen.id : null)}
              cardRef={(el) => { listItemRefs.current.set(screen.id, el); }}
            />
          );
        })}
      </div>
      {!activeZoneScreens && (
        <div className="flex flex-col items-center gap-2 pb-8">
          <p className="text-xs text-slate-500">
            Showing {listScreens.length.toLocaleString("en-IN")} of {listTotal.toLocaleString("en-IN")} listings
          </p>
          {hasNextPage && (
            <Button
              variant="outline"
              className="rounded-full shadow-sm"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Loading…</> : "Load more"}
            </Button>
          )}
        </div>
      )}
    </div>
  );

  // Mobile sheet header: what's visible at peek. Results → count, sort, book; screen/venue → a
  // compact summary (tap it to raise the sheet) with the add button right there.
  const expandSheet = () => setSheetSnap(1);
  const mobileSheetHeader = detailScreen && panel.kind === "screen" ? (() => {
    const p = priceInfo(detailScreen, zonePriceOverrides.get(detailScreen.id));
    const added = selectedScreenIds.has(detailScreen.id);
    return (
      <div className="flex items-center gap-3 px-4 pb-3">
        <button type="button" onClick={expandSheet} className="flex items-center gap-3 flex-1 min-w-0 text-left" aria-label={`Show details for ${detailScreen.venueName}`}>
          <ScreenPhoto src={primaryPhoto(detailScreen)} family={screenFamily(detailScreen)} alt={detailScreen.venueName} className="w-16 h-14 rounded-xl shrink-0" iconClassName="w-6 h-6" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 line-clamp-1">{detailScreen.venueName}</div>
            <div className="text-xs text-slate-500 line-clamp-1">{localityLine(detailScreen)}</div>
            <div className="text-sm font-bold text-slate-900">
              {formatRupees(p.total)}<span className="text-xs font-normal text-slate-500">/day{p.screens > 1 ? ` · ${p.screens} screens` : ""}</span>
            </div>
          </div>
        </button>
        <Button
          size="sm"
          className={`rounded-full h-10 px-4 font-semibold shrink-0 ${added ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          onClick={() => toggleScreenSelection(detailScreen)}
          aria-pressed={added}
        >
          {added ? <><Check className="w-4 h-4 mr-1" /> Added</> : "Add"}
        </Button>
      </div>
    );
  })() : activeVenue ? (
    <button type="button" onClick={expandSheet} className="flex items-center gap-3 px-4 pb-3 w-full text-left">
      <ScreenPhoto src={activeVenue.image} family={activeVenue.family} alt={activeVenue.name} className="w-16 h-14 rounded-xl shrink-0" iconClassName="w-6 h-6" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900 line-clamp-1">{activeVenue.name}</div>
        <div className="text-xs text-slate-500">
          {activeVenue.totalScreens} screens · from {formatRupees(activeVenue.minPrice)}/day
        </div>
      </div>
      <span className="text-xs font-semibold text-primary shrink-0">View</span>
    </button>
  ) : (
    <div className="flex items-center justify-between gap-2 px-4 pb-3">
      <button type="button" onClick={() => setSheetSnap(sheetSnap === 0 ? 1 : sheetSnap)} className="min-w-0 text-left">
        <div className="text-base font-semibold text-slate-900">{resultsCountLabel}</div>
        {resultsPlaceLabel && <div className="text-xs text-slate-500 truncate">{resultsPlaceLabel}</div>}
      </button>
      <div className="flex items-center gap-2 shrink-0">
        {sheetSnap > 0 && sortSelect}
        {selectedScreenIds.size > 0 && (
          <Button size="sm" className="rounded-full h-9 px-3.5 font-semibold" onClick={proceedToCreateCampaign}>
            Book ({selectedScreenIds.size})
          </Button>
        )}
      </div>
    </div>
  );

  // Sidebar content for the venue / screen states (null = show the results list)
  const panelContent = activeVenue ? (
    <VenuePanel
      key={activeVenue.key}
      venue={activeVenue}
      selectedIds={selectedScreenIds}
      hoveredScreenId={hoveredScreenId}
      cartCount={selectedScreenIds.size}
      onToggle={toggleScreenSelection}
      onAddMany={addScreensToCampaign}
      onOpenDetails={(s) => openScreen(s, activeVenue.key)}
      onHover={setHoveredScreenId}
      onBack={() => navigatePanel({ kind: "results" })}
      onBook={proceedToCreateCampaign}
      backLabel={resultsLabel}
      isMobile={isMobile}
    />
  ) : detailScreen ? (
    <ScreenDetailPanel
      key={detailScreen.id}
      screen={detailScreen}
      venue={detailVenue}
      similar={similarScreens}
      isAdded={selectedScreenIds.has(detailScreen.id)}
      priceOverride={zonePriceOverrides.get(detailScreen.id)}
      backLabel={panel.kind === "screen" && panel.fromVenue && venueByKey.get(panel.fromVenue) ? venueByKey.get(panel.fromVenue)!.name : resultsLabel}
      onBack={goBack}
      onClose={isMobile ? () => navigatePanel({ kind: "results" }) : undefined}
      onToggle={() => toggleScreenSelection(detailScreen)}
      onOpenScreen={(s) => openScreen(s)}
      onOpenVenue={detailVenue && detailVenue.listings.length > 1 ? () => openVenue(detailVenue.key) : undefined}
      zoneInfo={zoneInfo}
      isZoneBooked={zoneInfo ? zoneInfo.screenIds.every(id => selectedScreenIds.has(id)) : false}
      onViewZone={handleViewZone}
      onBookZone={handleBookZone}
    />
  ) : panel.kind === "screen" ? (
    <div className="flex flex-1 items-center justify-center h-full text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full overflow-hidden bg-white">
      
      {/* Top Banner & Header */}
      <div className="bg-white border-b border-slate-200 z-10 shadow-sm shrink-0 hidden md:block">
        <div className="px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">Discover Screens</h1>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              className="rounded-full shadow-sm"
              onClick={proceedToCreateCampaign}
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              <span className="font-semibold">{selectedScreenIds.size} Screens</span>
            </Button>
            <Button 
              className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
              onClick={proceedToCreateCampaign}
              disabled={selectedScreenIds.size === 0}
            >
              Book Campaign
            </Button>
          </div>
        </div>
        
        {/* Desktop Search & Quick Filters */}
        <div className="px-6 pb-2 pt-4 flex flex-col gap-4 w-full max-w-[100vw] overflow-hidden">
          
          <div className="flex justify-center w-full">
            <div className="flex flex-col sm:flex-row items-center w-full max-w-4xl bg-white rounded-2xl sm:rounded-full border border-slate-300 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
               {/* Location */}
               <div className="flex-1 w-full sm:w-auto px-8 h-[68px] flex flex-col justify-center sm:border-r border-b sm:border-b-0 border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer relative group">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-800 mb-0.5">Location</div>
                  <SearchAutocomplete 
                    onPlaceSelect={handlePlaceSelect} 
                    className="w-full"
                    value={locationName}
                  />
               </div>

               {/* Radius */}
               {!["country", "administrative_area_level_1"].includes(locationType) && (
               <div className="px-8 h-[68px] w-full sm:w-64 flex flex-col justify-center hover:bg-slate-50 transition-colors group shrink-0">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-800 flex justify-between mb-1.5">
                    <span>Radius</span>
                    <span className="text-slate-500 font-semibold">{radiusKm} km</span>
                  </div>
                  <div className="flex items-center h-8">
                    <input 
                      type="range" 
                      min={1} 
                      max={50} 
                      value={radiusKm} 
                      onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary" 
                    />
                  </div>
               </div>
               )}

               {/* Search Button */}
               <div className="px-3 h-[68px] w-full sm:w-auto flex items-center justify-center shrink-0">
                  <Button className="w-full sm:w-[52px] h-[52px] rounded-xl sm:rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-sm">
                     <Search className="w-5 h-5 text-current" />
                     <span className="ml-2 font-medium text-current sm:hidden">Search</span>
                  </Button>
               </div>
            </div>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex overflow-x-auto pb-2 w-full max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex items-center gap-3 w-max mx-auto px-2 sm:px-0">
            <Dialog open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-full border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 shrink-0 h-9 px-4">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {activeFilterCount(filters) > 0 && (
                    <Badge className="ml-2 bg-slate-900 text-white border-0 px-1.5 py-0 min-w-0">{activeFilterCount(filters)}</Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Advanced Filters</DialogTitle>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">State</label>
                      <SearchableSelect
                        placeholder="All States"
                        value={filters.state}
                        onChange={(v) => setFilters({ ...filters, state: v, city: "" })}
                        options={(locations?.states || []).map(s => ({ label: s, value: s }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City</label>
                      <SearchableSelect
                        placeholder="All Cities"
                        value={filters.city}
                        onChange={(v) => setFilters({ ...filters, city: v })}
                        options={(availableCities || []).map(c => ({ label: c, value: c }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Venue Type</label>
                      <MultiSelect
                        placeholder="All venue types"
                        selected={filters.venueTypes}
                        onChange={(v) => { setFilters({ ...filters, venueTypes: v, venueCategories: [] }); setPage(1); }}
                        options={venueTypeOptions}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Screen Format</label>
                      <MultiSelect
                        placeholder="All Formats"
                        selected={filters.screenCategories}
                        onChange={(v) => setFilters({ ...filters, screenCategories: v })}
                        options={screenCategoryOptions.map(c => ({ label: c, value: c }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">User Intent</label>
                      <MultiSelect
                        placeholder="Select Intent"
                        selected={filters.userIntents}
                        onChange={(v) => setFilters({ ...filters, userIntents: v })}
                        options={(advancedFilters?.userIntents || []).map(c => ({ label: c, value: c }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Surrounding (Tags)</label>
                      <MultiSelect
                        placeholder="Select Tags"
                        selected={filters.locationTags}
                        onChange={(v) => setFilters({ ...filters, locationTags: v })}
                        options={(advancedFilters?.locationTags || []).map(c => ({ label: c, value: c }))}
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white" 
                    onClick={() => setShowAdvancedFilters(false)}
                  >
                    {isLoading ? "Searching…" : `Show ${totalPhysicalScreensCount.toLocaleString("en-IN")} screens`}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>

            {quickChips}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left List Area (desktop). On mobile the same content lives in the bottom sheet. */}
        {!isMobile && (
        <div
          ref={listScrollRef}
          className={`flex flex-col bg-white z-10 w-[55%] relative ${panelContent ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          {panelContent ? panelContent : (
          <div className="p-6">
            <div className="mb-6">{resultsHeader}</div>
            {resultsList}
          </div>
          )}
        </div>
        )}

        <div className={`
          flex-1 bg-slate-50 relative p-0 sm:p-6 sm:pb-6 md:border-l border-slate-200
          ${isMobile ? 'block absolute inset-0 z-0' : 'block'}
        `}>

          {/* Mobile Floating Search Pill + quick filters */}
          {isMobile && (
            <div className="absolute top-3 left-0 right-0 z-20 flex flex-col gap-2">
            <div className="px-4 flex items-center gap-2">
              <div 
                className="flex-1 bg-white rounded-full shadow-lg border border-slate-200 px-4 h-12 flex items-center gap-3 cursor-pointer"
                onClick={() => setShowMobileSearch(true)}
              >
                <Search className="w-5 h-5 text-slate-800 font-bold" />
                <div className="flex-1 flex flex-col justify-center">
                  <span className="text-[13px] font-bold text-slate-900 leading-tight">
                    {locationName || "Where to promote?"}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-tight">
                    {radiusKm} km • Any format
                  </span>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                size="icon"
                className="w-12 h-12 rounded-full bg-white shadow-lg border-slate-200 shrink-0"
                onClick={() => setShowAdvancedFilters(true)}
              >
                <SlidersHorizontal className="w-5 h-5 text-slate-700" />
              </Button>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [&>button]:h-8 [&>button]:px-3.5 [&>button]:text-[13px] [&>button]:shadow-sm">
              {quickChips}
            </div>
            </div>
          )}

          <div className="w-full h-full sm:rounded-2xl overflow-hidden shadow-none sm:shadow-md border-0 sm:border border-slate-200/60 bg-slate-200 relative z-0">
            <Map
              id="discover-screens-map"
              mapId="pixelspot-discover-map"
              defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
              defaultZoom={5}
              gestureHandling="greedy"
              disableDefaultUI={true}
              zoomControl={!isMobile}
              clickableIcons={false}
              onClick={handleMapClick}
              style={{ width: '100%', height: '100%' }}
            >
              {showSearchArea && !activeZoneName && (
                <button
                  type="button"
                  onClick={searchThisArea}
                  className={`absolute ${isMobile ? 'top-[124px]' : 'top-4'} left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 h-10 text-sm font-semibold text-slate-900 shadow-lg border border-slate-200 hover:bg-slate-50 animate-in fade-in slide-in-from-top-2`}
                >
                  <Search className="w-4 h-4" /> Search this area
                </button>
              )}
              {activeZoneName && (
                <div className={`absolute ${isMobile ? 'top-[124px]' : 'top-4'} left-1/2 -translate-x-1/2 z-[100] whitespace-nowrap bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 font-medium text-sm animate-in fade-in slide-in-from-top-4`}>
                  Viewing Zone: {activeZoneName}
                  <button 
                    onClick={() => { setActiveZoneScreens(null); setActiveZoneName(null); setHighlightedZoneIds(new Set()); }}
                    className="ml-1 hover:bg-amber-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {mapVenues.map((venue) => {
                if (venue.listings.length === 1) {
                  const screen = venue.listings[0];
                  return (
                    <AdvancedMarker
                      key={screen.id}
                      position={{ lat: parseFloat(String(screen.latitude)), lng: parseFloat(String(screen.longitude)) }}
                      zIndex={detailScreenId === screen.id ? 200 : hoveredScreenId === screen.id ? 100 : 1}
                    >
                      {renderCustomMarker(screen)}
                    </AdvancedMarker>
                  );
                }
                const isActive = selectedVenueKey === venue.key;
                const isHovered = !!hoveredScreenId && venue.listings.some(l => l.id === hoveredScreenId);
                return (
                  <AdvancedMarker
                    key={`venue-${venue.key}`}
                    position={{ lat: venue.lat, lng: venue.lng }}
                    zIndex={isActive ? 200 : isHovered ? 100 : 2}
                  >
                    {renderVenueMarker(venue)}
                  </AdvancedMarker>
                );
              })}
            </Map>
          </div>
        </div>

      </div>

      {/* Mobile: results / screen / venue in a sheet over the map (peek · half · full) */}
      {isMobile && (
        <MapBottomSheet
          snap={sheetSnap}
          onSnapChange={setSheetSnap}
          header={sheetSnap === 0 || !panelContent ? mobileSheetHeader : null}
        >
          {panelContent ? (
            <div className="flex-1 min-h-0 flex flex-col">{panelContent}</div>
          ) : (
            <div ref={listScrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 pt-1 pb-8">
              {resultsList}
            </div>
          )}
        </MapBottomSheet>
      )}

      {/* Mobile Search Modal */}
      {isMobile && (
        <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
          <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border-0 p-0 shadow-2xl mt-safe top-24 transform -translate-y-0">
            <div className="bg-white p-6 flex flex-col gap-6">
              <DialogTitle className="text-xl font-bold text-slate-900">Where to promote?</DialogTitle>
              <DialogDescription className="sr-only">Choose a location and radius to find screens nearby.</DialogDescription>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                <SearchAutocomplete 
                  onPlaceSelect={(place, val) => {
                    handlePlaceSelect(place, val);
                    setShowMobileSearch(false);
                  }} 
                  className="w-full h-12 text-base"
                  value={locationName}
                />
              </div>
              
              {!["country", "administrative_area_level_1"].includes(locationType) && (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Radius</label>
                  <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">{radiusKm} km</span>
                </div>
                <input 
                  type="range" 
                  min={1} 
                  max={50} 
                  value={radiusKm} 
                  onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary mt-2" 
                />
              </div>
              )}
              
              <Button 
                className="w-full h-12 rounded-xl mt-4 text-base font-semibold shadow-sm" 
                onClick={() => setShowMobileSearch(false)}
              >
                <Search className="w-4 h-4 mr-2" />
                Search Area
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DiscoverAuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          if (pendingAction) pendingAction();
        }}
      />

    </div>
  );
}
