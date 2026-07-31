import React, { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, ShoppingCart, List, Map as MapIcon, SlidersHorizontal, Check, Loader2, Star, Menu, Users, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Screen } from "@shared/schema";
import { VENUE_CATEGORIES } from "@shared/constants";
import { MultiSelect } from "@/components/ui/multi-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useLocationAutocomplete } from "@/hooks/use-location-autocomplete";
import { SearchAutocomplete } from "@/components/map/SearchAutocomplete";
import { ScreenDetailsModal } from "@/components/screens/ScreenDetailsModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/contexts/AuthContext";
import { DiscoverAuthModal } from "@/components/DiscoverAuthModal";
import useEmblaCarousel from "embla-carousel-react";

const SELECTED_SCREENS_KEY = "selectedScreenIds";

type ViewMode = "desktop" | "mobile_list" | "mobile_map";

export default function DiscoverScreens() {
  const map = useMap("discover-screens-map");
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [hoveredScreenId, setHoveredScreenId] = useState<string | null>(null);
  const [detailModalScreen, setDetailModalScreen] = useState<Screen | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ startIndex: 0, align: "center", skipSnaps: false });
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Search State
  const [lat, setLat] = useState<number | undefined>();
  const [lng, setLng] = useState<number | undefined>();
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [locationName, setLocationName] = useState<string>("");
  const [initialLocationLoaded, setInitialLocationLoaded] = useState(false);
  const geocodingLib = useMapsLibrary("geocoding");

  // Filters State
  const [filters, setFilters] = useState<{
    state: string;
    city: string;
    venueCategories: string[];
    screenCategories: string[];
    environmentTypes: string[];
    trafficTypes: string[];
    userIntents: string[];
    locationTags: string[];
    minPrice: string;
    maxPrice: string;
    search: string;
  }>(() => {
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const q = params.get("q");
    const venue = params.get("venue");
    
    return {
      state: "",
      city: "",
      venueCategories: venue ? [venue] : [],
      screenCategories: [],
      environmentTypes: [],
      trafficTypes: [],
      userIntents: [],
      locationTags: [],
      minPrice: "",
      maxPrice: "",
      search: q || "",
    };
  });

  const [sortBy, setSortBy] = useState<string>("popularity");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isMobile, setIsMobile] = useState(false);
  const [page, setPage] = useState(1);
  
  // Ref for map circle
  const circleRef = useRef<google.maps.Circle | null>(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setViewMode("desktop");
      else if (viewMode === "desktop") setViewMode("mobile_map");
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

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
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (lat !== undefined && lng !== undefined) {
      params.append("lat", lat.toString());
      params.append("lng", lng.toString());
      params.append("radiusKm", radiusKm.toString());
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
    } else {
      params.append("sortBy", sortBy === 'distance' ? 'popularity' : sortBy);
      params.append("sortOrder", sortOrder);
    }

    if (filters.state) params.append("state", filters.state);
    if (filters.city) params.append("city", filters.city);
    if (filters.minPrice) params.append("minPrice", filters.minPrice);
    if (filters.maxPrice) params.append("maxPrice", filters.maxPrice);
    
    if (filters.venueCategories.length > 0) {
      filters.venueCategories.forEach(v => params.append("venueCategories", v));
    }
    if (filters.screenCategories.length > 0) {
      filters.screenCategories.forEach(s => params.append("screenCategories", s));
    }
    if (filters.environmentTypes.length > 0) {
      filters.environmentTypes.forEach(e => params.append("environmentTypes", e));
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
  }, [filters, lat, lng, radiusKm, sortBy, sortOrder]);

  const { data: result, isLoading } = useQuery<{ screens: (Screen & { distanceKm?: number })[], total?: number } | Screen[]>({
    queryKey: [`/api/screens?${queryString}`],
    enabled: initialLocationLoaded,
  });

  useEffect(() => {
    // If we've already done the initial location fetch, do nothing.
    if (initialLocationLoaded) return;
    
    // If the library is not yet loaded, we must wait. 
    if (!geocodingLib) return; 

    const geocoder = new geocodingLib.Geocoder();

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
        (error) => {
          console.error("Geolocation denied or failed", error);
          fetchFallbackIPLocation();
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    } else {
      fetchFallbackIPLocation();
    }
  }, [initialLocationLoaded, geocodingLib]);

  const screens = Array.isArray(result) ? result : (result?.screens || []);

  const totalPhysicalScreensCount = useMemo(() => {
    return screens.reduce((acc, s) => {
      return acc + (s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1);
    }, 0);
  }, [screens]);

  const mapScreens = useMemo(() => {
    return screens.filter(s => !isNaN(parseFloat(String(s.latitude))) && !isNaN(parseFloat(String(s.longitude))));
  }, [screens]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const index = emblaApi.selectedScrollSnap();
      setCarouselIndex(index);
      const selectedScreen = mapScreens[index];
      if (selectedScreen && isBottomSheetOpen && bottomSheetSnap === 0) {
        setHoveredScreenId(selectedScreen.id);
      }
    };
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, mapScreens, isBottomSheetOpen, bottomSheetSnap]);

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
      map.fitBounds(circleRef.current.getBounds()!);
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, [map, lat, lng, radiusKm]);

  // Fallback map bounds if no lat/lng but screens exist
  useEffect(() => {
    if (!map || !window.google || (lat !== undefined && lng !== undefined) || screens.length === 0) return;

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
  }, [map, screens, lat, lng]);

  const handlePlaceSelect = (place: google.maps.places.PlaceResult | null, inputValue: string) => {
    setLocationName(inputValue);
    if (place?.geometry?.location) {
      setLat(place.geometry.location.lat());
      setLng(place.geometry.location.lng());
      setFilters(prev => ({ ...prev, search: "" }));
    } else if (inputValue) {
      setLat(undefined);
      setLng(undefined);
      setFilters(prev => ({ ...prev, search: inputValue }));
    } else {
      setLat(undefined);
      setLng(undefined);
      setFilters(prev => ({ ...prev, search: "" }));
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
        setLocationName("Current Location");
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setPage(1);
      },
      (error) => {
        toast({ title: "Location Error", description: "Could not get your location.", variant: "destructive" });
      }
    );
  };

  const toggleScreenSelection = (screen: Screen) => {
    const newSet = new Set(selectedScreenIds);
    if (newSet.has(screen.id)) {
      newSet.delete(screen.id);
      toast({ title: "Removed from Campaign", description: `${screen.name} removed.` });
    } else {
      newSet.add(screen.id);
      toast({ title: "Added to Campaign", description: `${screen.name} added.` });
    }
    setSelectedScreenIds(newSet);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(Array.from(newSet)));

    // Only prompt login if adding a screen
    if (!user && !selectedScreenIds.has(screen.id)) {
      setPendingAction(() => () => setLocation("/advertiser/quick-campaign"));
      setShowAuthModal(true);
    }
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

  // Custom Map Marker Content
  const renderCustomMarker = (screen: Screen, index: number) => {
    const isHovered = hoveredScreenId === screen.id;
    const isSelected = selectedScreenIds.has(screen.id);
    
    const price = screen.pricePerDay || 0;
    let priceDisplay = `₹${price}`;
    if (price >= 1000) {
      priceDisplay = `₹${(price / 1000).toFixed(1).replace('.0', '')}k`;
    }

    return (
      <div 
        className={`relative flex items-center justify-center transition-all duration-300 cursor-pointer 
          ${isHovered ? 'scale-125 z-50' : 'scale-100 z-10'}
        `}
        onMouseEnter={() => setHoveredScreenId(screen.id)}
        onMouseLeave={() => setHoveredScreenId(null)}
        onClick={() => {
          if (isMobile) {
            setIsBottomSheetOpen(true);
            setBottomSheetSnap(0);
            setTimeout(() => emblaApi?.scrollTo(index), 50);
          } else {
            setDetailModalScreen(screen);
          }
        }}
      >
        <div className={`
          px-3 py-1.5 rounded-full font-bold text-[13px] shadow-lg border-2 whitespace-nowrap
          ${isSelected 
            ? 'bg-green-600 text-white border-white' 
            : (isHovered ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-800 border-white hover:bg-slate-50')
          }
          ${isHovered && !isSelected ? 'shadow-xl font-extrabold' : 'shadow-md'}
        `}>
          {priceDisplay}
        </div>
        <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 
          border-l-[6px] border-l-transparent 
          border-r-[6px] border-r-transparent 
          border-t-[6px] 
          ${isSelected ? 'border-t-green-600' : (isHovered ? 'border-t-slate-900' : 'border-t-white')}
        `}></div>
      </div>
    );
  };

  // Airbnb-style Screen Card Component
  const ScreenListCard = ({ screen }: { screen: Screen & { distanceKm?: number } }) => {
    const isAdded = selectedScreenIds.has(screen.id);
    
    return (
      <div 
        className="group cursor-pointer flex flex-col gap-3"
        onMouseEnter={() => setHoveredScreenId(screen.id)}
        onMouseLeave={() => setHoveredScreenId(null)}
        onClick={() => setDetailModalScreen(screen)}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-200">
          <img 
            src={screen.screenImages?.[0] || screen.images?.[0] || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=600'} 
            alt={screen.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {isAdded && (
            <div className="absolute top-3 left-3 bg-green-500 text-white px-2 py-1 rounded-full shadow-sm text-xs font-semibold flex items-center">
              <Check className="w-3 h-3 mr-1" /> Added
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Button 
              size="icon" 
              variant="secondary" 
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                toggleScreenSelection(screen);
              }}
            >
              {isAdded ? <Check className="w-4 h-4 text-green-600" /> : <ShoppingCart className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col">
          <div className="flex justify-between items-start">
            <h3 className="font-semibold text-slate-900 line-clamp-1">{screen.venueName}, {screen.city}</h3>
            {screen.distanceKm !== undefined && (
              <span className="text-sm text-slate-500 whitespace-nowrap ml-2">
                {Number(screen.distanceKm).toFixed(1)} km
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 line-clamp-1">{screen.name} • {screen.category}</p>
          <div className="flex items-center text-sm text-slate-500 mt-0.5">
            <Users className="w-3 h-3 mr-1" />
            {((screen.avgDailyFootfall || 0) / 1000).toFixed(1)}k daily footfall
          </div>
          <div className="mt-1">
            <span className="font-bold text-slate-900">₹{(screen.pricePerDay || 0).toLocaleString()}</span>
            <span className="text-slate-500 text-sm"> / day</span>
          </div>
        </div>
      </div>
    );
  };



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
                    initialValue={filters.search}
                  />
               </div>

               {/* Radius */}
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
                  {Object.values(filters).flat().some(Boolean) && (
                    <Badge className="ml-2 bg-slate-900 text-white border-0 px-1.5 py-0 min-w-0">1</Badge>
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
                        placeholder="All Venues"
                        selected={filters.venueCategories}
                        onChange={(v) => setFilters({ ...filters, venueCategories: v })}
                        options={VENUE_CATEGORIES.map(c => ({ label: c, value: c }))}
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
                    Show {screens.length} screens
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="w-px h-6 bg-slate-200 mx-1 shrink-0"></div>

            {[
              { label: 'Indoor', value: 'Indoor', type: 'env' },
              { label: 'Outdoor', value: 'Outdoor Digital', type: 'env' },
              { label: 'Corporate Park', value: 'Corporate Park', type: 'venue' },
              { label: 'Apartment', value: 'Apartment', type: 'venue' },
              { label: 'Restaurant', value: 'Restaurant', type: 'venue' },
              { label: 'Cafe', value: 'Café', type: 'venue' },
              { label: 'Mall', value: 'Mall', type: 'venue' },
              { label: 'Gym', value: 'Gym', type: 'venue' },
              { label: 'Hospital', value: 'Hospital', type: 'venue' },
              { label: 'Petrol Pump', value: 'Petrol Bunk', type: 'venue' }
            ].map(({ label, value, type }) => {
              const isActive = type === 'env' 
                ? filters.environmentTypes.includes(value)
                : filters.venueCategories.includes(value);

              return (
                <button
                  key={label}
                  onClick={() => {
                    if (type === 'env') {
                      const newEnvs = filters.environmentTypes.includes(value)
                        ? filters.environmentTypes.filter(e => e !== value)
                        : [...filters.environmentTypes, value];
                      setFilters({ ...filters, environmentTypes: newEnvs });
                    } else {
                      const newVenues = filters.venueCategories.includes(value)
                        ? filters.venueCategories.filter(v => v !== value)
                        : [...filters.venueCategories, value];
                      setFilters({ ...filters, venueCategories: newVenues });
                    }
                    setPage(1);
                  }}
                  className={`shrink-0 h-9 px-4 rounded-full text-sm font-medium border transition-colors ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Split View */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Left List Area (Grid) */}
        <div className={`
          flex flex-col bg-white overflow-y-auto z-10 transition-all duration-300
          ${isMobile ? (viewMode === 'mobile_list' ? 'absolute inset-0 w-full' : 'hidden') : 'w-[55%] relative'}
        `}>
          <div className="p-6">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isLoading ? 'Searching...' : `Over ${totalPhysicalScreensCount.toLocaleString()} screens`}
                </h2>
                {locationName && <p className="text-sm text-slate-500">{locationName}</p>}
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px] h-9 border-none bg-slate-100 text-sm font-medium rounded-full">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  {lat !== undefined && <SelectItem value="distance">Distance</SelectItem>}
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-slate-300" />
              </div>
            ) : screens.length === 0 ? (
              <div className="text-center py-20">
                <h3 className="text-lg font-medium text-slate-700">No exact matches</h3>
                <p className="text-slate-500 text-sm mt-1">Try changing or removing some of your filters.</p>
                <Button 
                  variant="outline" 
                  className="mt-4 rounded-full"
                  onClick={() => setFilters({ state: "", city: "", venueCategories: [], screenCategories: [], environmentTypes: [], trafficTypes: [], userIntents: [], locationTags: [], minPrice: "", maxPrice: "" })}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6 pb-8">
                  {screens.slice(0, page * 20).map(screen => (
                    <ScreenListCard key={screen.id} screen={screen} />
                  ))}
                </div>
                {screens.length > page * 20 && (
                  <div className="flex justify-center pb-24 sm:pb-8">
                    <Button 
                      variant="outline" 
                      className="rounded-full shadow-sm"
                      onClick={() => setPage(p => p + 1)}
                    >
                      Load More
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Map View */}
        <div className={`
          flex-1 bg-slate-50 relative p-0 sm:p-6 sm:pb-6 md:border-l border-slate-200
          ${isMobile ? (viewMode === 'mobile_map' ? 'block absolute inset-0 z-0' : 'hidden') : 'block'}
        `}>
          
          {/* Mobile Floating Search Pill */}
          {isMobile && viewMode === 'mobile_map' && (
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center gap-2">
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
          )}

          <div className="w-full h-full sm:rounded-2xl overflow-hidden shadow-none sm:shadow-md border-0 sm:border border-slate-200/60 bg-slate-200 relative z-0">
            <Map
              id="discover-screens-map"
              mapId="pixelspot-discover-map"
              defaultCenter={{ lat: 20.5937, lng: 78.9629 }}
              defaultZoom={5}
              gestureHandling="greedy"
              disableDefaultUI={true}
              zoomControl={true}
              style={{ width: '100%', height: '100%' }}
            >
              {mapScreens.map((screen, index) => (
                <AdvancedMarker
                  key={screen.id}
                  position={{ lat: parseFloat(String(screen.latitude)), lng: parseFloat(String(screen.longitude)) }}
                  zIndex={hoveredScreenId === screen.id ? 100 : 1}
                >
                  {renderCustomMarker(screen, index)}
                </AdvancedMarker>
              ))}
            </Map>
          </div>
        </div>

        {/* Mobile View Toggle */}
        {isMobile && !isBottomSheetOpen && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300">
            <div className="bg-slate-900 text-white rounded-full shadow-2xl p-1 flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-full px-6 transition-all ${viewMode === 'mobile_list' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
                onClick={() => setViewMode('mobile_list')}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`rounded-full px-6 transition-all ${viewMode === 'mobile_map' ? 'bg-slate-700 text-white' : 'text-slate-300 hover:text-white'}`}
                onClick={() => setViewMode('mobile_map')}
              >
                <MapIcon className="w-4 h-4 mr-2" />
                Map
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Map Bottom Carousel */}
      {isMobile && isBottomSheetOpen && (
        <div className="absolute bottom-4 left-0 right-0 z-40">
          <div className="flex justify-end mb-2 pr-4">
             <Button 
               variant="secondary" 
               size="icon" 
               className="h-8 w-8 rounded-full shadow-lg bg-white hover:bg-slate-100 border border-slate-200" 
               onClick={() => { setIsBottomSheetOpen(false); setHoveredScreenId(null); }}
             >
               <X className="h-4 w-4 text-slate-700" />
             </Button>
          </div>
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {mapScreens.map((screen) => (
                <div className="flex-[0_0_90%] min-w-0 pl-4 first:pl-6 last:pr-6" key={screen.id}>
                  <div 
                    className="bg-white rounded-2xl shadow-xl border border-slate-200 h-32 p-2.5 flex gap-3 cursor-pointer"
                    onClick={() => setDetailModalScreen(screen)}
                  >
                    {/* Compact Image */}
                    <div className="relative w-24 h-full shrink-0 rounded-xl overflow-hidden bg-slate-200">
                      <img 
                        src={screen.screenImages?.[0] || screen.images?.[0] || 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=600'} 
                        alt={screen.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {/* Compact Details */}
                    <div className="flex flex-col flex-1 justify-center py-1">
                      <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{screen.venueName}, {screen.city}</h3>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{screen.name} • {screen.category}</p>
                      <div className="flex items-center text-xs font-medium text-slate-500 mt-1.5">
                        <Users className="w-3 h-3 mr-1" />
                        {((screen.avgDailyFootfall || 0) / 1000).toFixed(1)}k daily
                      </div>
                      <div className="mt-auto pt-1">
                        <span className="font-bold text-slate-900">₹{(screen.pricePerDay || 0).toLocaleString()}</span>
                        <span className="text-slate-500 text-[10px]"> / day</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ScreenDetailsModal 
        isOpen={!!detailModalScreen}
        onClose={() => setDetailModalScreen(null)}
        screen={detailModalScreen}
        onAdd={toggleScreenSelection}
        isAdded={detailModalScreen ? selectedScreenIds.has(detailModalScreen.id) : false}
      />

      {/* Mobile Search Modal */}
      {isMobile && (
        <Dialog open={showMobileSearch} onOpenChange={setShowMobileSearch}>
          <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-2xl border-0 p-0 shadow-2xl mt-safe top-24 transform -translate-y-0">
            <div className="bg-white p-6 flex flex-col gap-6">
              <h2 className="text-xl font-bold text-slate-900">Where to promote?</h2>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Location</label>
                <SearchAutocomplete 
                  onPlaceSelect={(place, val) => { handlePlaceSelect(place, val); }} 
                  className="w-full h-12 text-base"
                  initialValue={filters.search}
                />
              </div>
              
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
