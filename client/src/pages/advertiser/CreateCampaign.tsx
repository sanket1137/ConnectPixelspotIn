import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { VENUE_CATEGORIES } from "@shared/constants";
import { ArrowLeft, Target, MapPin, Filter as FilterIcon, Check, Map as MapIcon, Image as ImageIcon, X, Trash2, Search, SlidersHorizontal, ChevronRight, ChevronLeft, AlertTriangle, ArrowRight, LayoutGrid, Users } from "lucide-react";
import { calculateScreenCampaignPrice, getScreenCountDisplay, calculateTotalPhysicalScreens, calculateScreenPricePerDay } from "@shared/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Screen } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ScreenCard from "@/components/ScreenCard";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

import { LocationItem, MultiLocationSearch } from "@/components/map/MultiLocationSearch";
import { MultiSelect } from "@/components/ui/multi-select";
import { ScreenDetailsModal } from "@/components/screens/ScreenDetailsModal";

function CircleOverlay({ center, radius }: { center: { lat: number; lng: number }; radius: number }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  React.useEffect(() => {
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

function MapPanner({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom !== undefined) map.setZoom(target.zoom);
  }, [map, target?.lat, target?.lng, target?.zoom]);
  return null;
}

/** Fits map to country/state bounds — same behavior as Discover Screens */
function MapBoundsFitter({ bounds }: { bounds: google.maps.LatLngBoundsLiteral | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !bounds) return;
    map.fitBounds(bounds);
  }, [map, bounds?.north, bounds?.south, bounds?.east, bounds?.west]);
  return null;
}

// Filter Types
export type FilterConfig = {
  cities: string[];
  venueTypes: string[];
  environmentTypes: string[];
  tags: { id: string; name: string; displayName: string; category: string }[];
  types?: string[];
  occupationMixes?: string[];
  userIntents?: string[];
  userMoods?: string[];
  genderOrientations?: string[];
  incomeLevels?: string[];
};

export type ActiveFilters = {
  locations: LocationItem[];
  venueTypes: string[];
  environmentTypes: string[];
  tags: string[];
  types: string[];
  occupationMixes: string[];
  userIntents: string[];
  userMoods: string[];
  genderOrientations: string[];
  incomeLevels: string[];
  priceRange: [number, number];
  minBookingDays: number;
};

const defaultFilters: ActiveFilters = {
  locations: [],
  venueTypes: [],
  environmentTypes: [],
  tags: [],
  types: [],
  occupationMixes: [],
  userIntents: [],
  userMoods: [],
  genderOrientations: [],
  incomeLevels: [],
  priceRange: [0, 100000],
  minBookingDays: 90
};

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  objective: z.string().default("advanced"),
  // budget is auto-calculated based on selected screens and duration
  budget: z.number().optional(),
  
  // Dates
  startDate: z.string().min(1, "Start date is required").refine((date) => {
    const selectedDate = new Date(date);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return selectedDate >= tomorrow;
  }, "Start date must be at least tomorrow"),
  endDate: z.string().min(1, "End date is required").refine((date) => {
    const selectedDate = new Date(date);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return selectedDate > tomorrow;
  }, "End date must be after start date"),
  
  // Creative URL
  creativeUrl: z.string().url("Please enter a valid URL").min(1, "Creative link is required"),
  
  // Campaign summary
  summary: z.string().max(500, "Summary must be under 500 characters").optional(),
});

type CreateCampaignForm = z.infer<typeof createCampaignSchema>;

const objectives = [
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "product_launch", label: "Product Launch" },
  { value: "event_promotion", label: "Event Promotion" },
  { value: "seasonal_campaign", label: "Seasonal Campaign" },
  { value: "local_promotion", label: "Local Promotion" },
];

export default function CreateCampaign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Step Management
  // Now simpler: 1 = Build (Select Screens), 2 = Review & Confirm
  const [currentStep, setCurrentStep] = useState(1);
  
  // Screen and Map State
  const [screens, setScreens] = useState<Screen[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [selectedMapScreen, setSelectedMapScreen] = useState<Screen | null>(null);
  const [mapPanTarget, setMapPanTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [activeScreenIndex, setActiveScreenIndex] = useState<number | null>(null);
  const [hoveredScreenId, setHoveredScreenId] = useState<string | null>(null);

  // Filter State
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    cities: [],
    venueTypes: [],
    environmentTypes: [],
    tags: []
  });
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(defaultFilters);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Load Filters from API
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const response = await apiRequest("GET", "/api/public/screens/filters");
        const data = await response.json();
        setFilterConfig(data);
      } catch (error) {
        console.error("❌ Error fetching filters:", error);
        toast({
          title: "Error loading filters",
          description: "Could not load screen filter options.",
          variant: "destructive",
        });
      }
    };
    loadFilters();
  }, []);

  // Fetch Screens based on Filters
  // Uses the same intelligent location logic as Discover Screens:
  //   - Country / State → use bounding-box params (boundsN/S/E/W) via /api/screens
  //   - City / POI / map → use /api/screens/in-area with location radius JSON
  useEffect(() => {
    const fetchFilteredScreens = async () => {
      try {
        const hasLocations = activeFilters.locations.length > 0;
        const params = new URLSearchParams();

        // --- Intelligent location strategy (same as Discover Screens) ---
        // Check if any selected location is a wide-area type (country/state)
        const wideLocation = activeFilters.locations.find(
          l => l.locationType === 'country' || l.locationType === 'state'
        );
        const narrowLocations = activeFilters.locations.filter(
          l => l.locationType !== 'country' && l.locationType !== 'state'
        );

        let endpoint: string;

        if (wideLocation && wideLocation.bounds) {
          // Country/State: use bounding-box — same as Discover Screens
          params.append("boundsN", wideLocation.bounds.north.toString());
          params.append("boundsS", wideLocation.bounds.south.toString());
          params.append("boundsE", wideLocation.bounds.east.toString());
          params.append("boundsW", wideLocation.bounds.west.toString());
          params.append("sortBy", "popularity");
          params.append("sortOrder", "desc");
          // Append any other filters below, then use /api/screens
          endpoint = "bounds";
        } else if (hasLocations) {
          // City / POI / map: use radius-based in-area endpoint
          params.append("locations", JSON.stringify(
            narrowLocations.length > 0 ? narrowLocations : activeFilters.locations
          ));
          endpoint = "in-area";
        } else {
          endpoint = "all";
        }

        // Common filters for both paths
        if (activeFilters.venueTypes.length > 0) {
          activeFilters.venueTypes.forEach(v => params.append("venueCategories", v));
        }
        if (activeFilters.environmentTypes.length > 0) {
          activeFilters.environmentTypes.forEach(e => params.append("environmentTypes", e));
        }
        if (activeFilters.tags.length > 0) {
          activeFilters.tags.forEach(t => params.append("environmentTags", t));
        }
        if (activeFilters.types.length > 0) {
          activeFilters.types.forEach(v => params.append("types", v));
        }
        if (activeFilters.occupationMixes.length > 0) {
          activeFilters.occupationMixes.forEach(v => params.append("occupationMixes", v));
        }
        if (activeFilters.userIntents.length > 0) {
          activeFilters.userIntents.forEach(v => params.append("userIntents", v));
        }
        if (activeFilters.userMoods.length > 0) {
          activeFilters.userMoods.forEach(v => params.append("userMoods", v));
        }
        if (activeFilters.genderOrientations.length > 0) {
          activeFilters.genderOrientations.forEach(v => params.append("genderOrientations", v));
        }
        if (activeFilters.incomeLevels.length > 0) {
          activeFilters.incomeLevels.forEach(v => params.append("incomeLevels", v));
        }
        if (activeFilters.priceRange[0] > 0) {
          params.append("minPrice", activeFilters.priceRange[0].toString());
        }
        if (activeFilters.priceRange[1] < 100000) {
          params.append("maxPrice", activeFilters.priceRange[1].toString());
        }
        if (activeFilters.minBookingDays < 90) {
          params.append('minBookingDays', activeFilters.minBookingDays.toString());
        }

        const queryString = params.toString();

        // Choose the right API endpoint based on location type
        let apiUrl: string;
        if (endpoint === "bounds") {
          // Wide area: /api/screens supports boundsN/S/E/W
          apiUrl = `/api/screens${queryString ? `?${queryString}` : ''}`;
        } else if (endpoint === "in-area") {
          // Radius-based: use the in-area endpoint (same as Express Campaign)
          apiUrl = `/api/screens/in-area${queryString ? `?${queryString}` : ''}`;
        } else {
          // No location: fetch all with filters
          apiUrl = `/api/screens/in-area${queryString ? `?${queryString}` : ''}`;
        }

        console.log("[Advanced Builder] Fetching screens:", apiUrl);
        const screenResponse = await apiRequest("GET", apiUrl);
        const screenData = await screenResponse.json();
        // /api/screens may return {screens, total} for paginated calls; extract correctly
        const screenList: Screen[] = Array.isArray(screenData)
          ? screenData
          : (screenData?.screens ?? []);
        setScreens(screenList);

        // Map pan/zoom
        if (wideLocation?.bounds) {
          // fitBounds is handled by MapController below via mapPanTarget
          // set center to bounds center
          const b = wideLocation.bounds;
          setMapCenter({
            lat: (b.north + b.south) / 2,
            lng: (b.east + b.west) / 2,
          });
        } else if (hasLocations && screenList.length > 0) {
          const firstScreen = screenList[0];
          setMapCenter({
            lat: parseFloat(firstScreen.latitude.toString()),
            lng: parseFloat(firstScreen.longitude.toString())
          });
        } else if (hasLocations) {
          const mapLoc = activeFilters.locations.find(l => l.lat);
          if (mapLoc) setMapCenter({ lat: mapLoc.lat!, lng: mapLoc.lng! });
        }
      } catch (error) {
        console.error("❌ Error fetching filtered screens:", error);
      }
    };

    // Debounce screen fetching slightly to avoid spamming on slider drag
    const timeoutId = setTimeout(() => {
      fetchFilteredScreens();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [activeFilters]);


  const form = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      objective: "advanced",
      budget: 0,
      startDate: (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      })(),
      endDate: (() => {
        const date = new Date();
        date.setDate(date.getDate() + 8); // default 7 days
        return date.toISOString().split('T')[0];
      })(),
      creativeUrl: "",
    },
  });

  const toggleScreenSelection = (screenId: string) => {
    setSelectedScreenIds(prev => 
      prev.includes(screenId) 
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const handleFilterChange = (key: keyof ActiveFilters, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleArrayFilter = (key: keyof Pick<ActiveFilters, 'venueTypes' | 'environmentTypes' | 'tags'>, value: string) => {
    setActiveFilters(prev => {
      const currentArray = prev[key];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      return { ...prev, [key]: newArray };
    });
  };
  
  const clearFilters = () => {
    setActiveFilters(defaultFilters);
  };

  // Calculate totals
  const calculateDays = () => {
    const start = new Date(form.watch("startDate"));
    const end = new Date(form.watch("endDate"));
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  };

  const durationDays = calculateDays();
  
  const selectedScreensFull = screens.filter(s => selectedScreenIds.includes(s.id));
  const estimatedCost = selectedScreensFull.reduce((sum, s) => {
    return sum + (calculateScreenPricePerDay(s) * durationDays);
  }, 0);
  
  const totalReach = selectedScreensFull.reduce((sum, s) => sum + (s.avgDailyFootfall || 0) * durationDays, 0);


  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      if (selectedScreenIds.length === 0) {
        throw new Error("No screens selected for the campaign");
      }

      // Create campaign with targeted screens
      const targetArea = activeFilters.locations.length > 0 
        ? { type: "multiple" as const, locations: activeFilters.locations }
        : { type: "india" as const };

      const campaignResponse = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: data.name,
        objective: data.objective,
        targetArea,
        targetLocationType: activeFilters.locations.length > 0 ? "multiple" : "india",
        targetCities: activeFilters.locations.filter(l => l.type === 'city').map(l => l.city).filter(Boolean) as string[],
        targetState: null,
        targetPincodes: [],
        targetAgeGroups: [],
        targetGender: "all",
        targetAffluence: [],
        targetOccupations: [],
        targetIntent: [],
        targetMood: [],
        venueTypeFilters: [],
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        budget: Math.round(data.budget || estimatedCost),
        estimatedBudget: estimatedCost,
        creativeUrl: data.creativeUrl || null,
        summary: data.summary || null,
      });
      
      const campaign = await campaignResponse.json();

      // Create bookings for each selected screen
      const bookingPromises = selectedScreensFull.map(screen => {
        const price = calculateScreenPricePerDay(screen) * durationDays;

        return apiRequest("POST", "/api/advertiser/bookings", {
          screenId: screen.id,
          campaignId: campaign.id,
          price,
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
        });
      });

      await Promise.all(bookingPromises);
      return campaign;
    },
    onSuccess: () => {
      toast({
        title: "Campaign Submitted!",
        description: `Campaign created successfully with ${calculateTotalPhysicalScreens(screens.filter(s => selectedScreenIds.includes(s.id)))} booking request(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setTimeout(() => {
        setLocation("/advertiser/campaigns");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign.",
        variant: "destructive",
      });
    },
  });

  const onSubmitBuild = async () => {
    // Set final calculated budget before validation/submission
    form.setValue("budget", estimatedCost);
    
    // We only need to gather minimum info to proceed to the review screen.
    if (selectedScreenIds.length === 0) {
      toast({
        title: "No Screens Selected",
        description: "Please select at least one screen from the map.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate form details (name, dates) needed before moving on
    const isValid = await form.trigger(["name", "startDate", "endDate"]);
    
    if (!isValid) {
      const errors = form.control._formState.errors;
      const missingFields = Object.keys(errors)
        .filter(k => ["name", "startDate", "endDate"].includes(k))
        .map(k => k === 'startDate' ? 'Start Date' : k === 'endDate' ? 'End Date' : k.charAt(0).toUpperCase() + k.slice(1));
      
      toast({
        title: "Campaign Details Required",
        description: `Please fill in the following: ${missingFields.join(", ")}`,
        variant: "destructive"
      });
      return;
    }
    
    setCurrentStep(2);
  };

  const selectAllFiltered = () => {
    const reachableScreens = screens.map(s => s.id);
    const newSelection = Array.from(new Set([...selectedScreenIds, ...reachableScreens]));
    setSelectedScreenIds(newSelection);
    toast({
      title: "Selection Updated",
      description: `Added ${reachableScreens.length} screens to your campaign.`,
    });
  };

  const onFinalSubmit = (data: CreateCampaignForm) => {
    createCampaignMutation.mutate(data);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      
      {/* ------------------------------------------------------------- */}
      {/* LEFT PANEL: FILTERS (Only in Step 1)                           */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 1 && (
        <div 
          className={`flex-shrink-0 bg-background border-r flex flex-col transition-all duration-300 ${isFilterPanelOpen ? "w-80" : "w-0"} overflow-hidden`}
        >
          <div className="p-4 border-b flex justify-between items-center bg-card">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Screen Filters</h2>
            </div>
            {Object.entries(activeFilters).some(([k, v]) => Array.isArray(v) ? v.length > 0 : v !== defaultFilters[k as keyof ActiveFilters]) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                Clear all
              </Button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <Accordion type="multiple" defaultValue={["city", "venue", "price"]} className="w-full">
              
              {/* Location Search */}
              <AccordionItem value="city" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Location Target
                  {activeFilters.locations.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.locations.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2">
                  <MultiLocationSearch
                    selectedLocations={activeFilters.locations}
                    onChange={(locs) => handleFilterChange('locations', locs)}
                    onLocationFocus={(loc) => {
                      if (loc.lat && loc.lng) {
                        const radius = loc.radiusKm || 5;
                        const zoom = radius <= 2 ? 15 : radius <= 5 ? 13 : radius <= 15 ? 11 : radius <= 30 ? 9 : 8;
                        setMapPanTarget({ lat: loc.lat, lng: loc.lng, zoom });
                      }
                    }}
                    placeholder="Search locations..."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Price Filter */}
              <AccordionItem value="price" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                   Price Range / Day (₹)
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2 px-3">
                  <Slider
                    min={0}
                    max={100000}
                    step={100}
                    value={activeFilters.priceRange}
                    onValueChange={(val) => handleFilterChange('priceRange', val as [number, number])}
                    className="mb-6"
                  />
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Min</span>
                      <Input 
                        type="number" 
                        value={activeFilters.priceRange[0]} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          handleFilterChange('priceRange', [val, Math.max(val, activeFilters.priceRange[1])])
                        }}
                        className="w-full h-8 text-xs" 
                      />
                    </div>
                    <span className="text-muted-foreground text-sm self-end pb-1">-</span>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Max</span>
                      <Input 
                        type="number" 
                        value={activeFilters.priceRange[1]} 
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          handleFilterChange('priceRange', [Math.min(val, activeFilters.priceRange[0]), val])
                        }}
                        className="w-full h-8 text-xs" 
                      />
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Min Booking Days Filter */}
              <AccordionItem value="minBooking" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Min Booking Days (Up to)
                  <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 p-1 px-2 flex items-center justify-center rounded-full text-[10px]">
                    {activeFilters.minBookingDays >= 90 ? 'Any' : `${activeFilters.minBookingDays}d`}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent className="pt-4 pb-2 px-3">
                  <Slider
                    min={1}
                    max={90}
                    step={1}
                    value={[activeFilters.minBookingDays]}
                    onValueChange={(val) => handleFilterChange('minBookingDays', val[0])}
                    className="mb-6"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>Any (90+)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">At max (90), all screens are shown regardless of booking duration. Drag left to restrict to shorter-booking screens only.</p>
                </AccordionContent>
              </AccordionItem>

              {/* Venue Type Filter */}
              <AccordionItem value="venue" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Venue Type
                  {activeFilters.venueTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.venueTypes.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.venueTypes || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.venueTypes}
                    onChange={(val) => handleFilterChange('venueTypes', val)}
                    placeholder="Select venue types..."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Environment Type Filter */}
              <AccordionItem value="environment" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Environment
                  {activeFilters.environmentTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.environmentTypes.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.environmentTypes || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.environmentTypes}
                    onChange={(val) => handleFilterChange('environmentTypes', val)}
                    placeholder="Select environments..."
                  />
                </AccordionContent>
              </AccordionItem>
              
              {/* Advanced Target Filters */}
              {/* Screen Type */}
              <AccordionItem value="types" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Screen Type
                  {activeFilters.types.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.types.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.types || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.types}
                    onChange={(val) => handleFilterChange('types', val)}
                    placeholder="Select screen types..."
                    emptyText="No screen types found."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Audience Type */}
              <AccordionItem value="occupationMixes" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Audience Type
                  {activeFilters.occupationMixes.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.occupationMixes.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.occupationMixes || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.occupationMixes}
                    onChange={(val) => handleFilterChange('occupationMixes', val)}
                    placeholder="Select audience types..."
                    emptyText="No audience types found."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Audience Intent */}
              <AccordionItem value="userIntents" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Audience Intent
                  {activeFilters.userIntents.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.userIntents.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.userIntents || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.userIntents}
                    onChange={(val) => handleFilterChange('userIntents', val)}
                    placeholder="Select intents..."
                    emptyText="No intents found."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* User Mood */}
              <AccordionItem value="userMoods" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  User Mood
                  {activeFilters.userMoods.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.userMoods.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.userMoods || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.userMoods}
                    onChange={(val) => handleFilterChange('userMoods', val)}
                    placeholder="Select user moods..."
                    emptyText="No moods found."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Gender Orientation */}
              <AccordionItem value="genderOrientations" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Gender Orientation
                  {activeFilters.genderOrientations.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.genderOrientations.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.genderOrientations || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.genderOrientations}
                    onChange={(val) => handleFilterChange('genderOrientations', val)}
                    placeholder="Select gender orientations..."
                    emptyText="No orientations found."
                  />
                </AccordionContent>
              </AccordionItem>

              {/* Income Level */}
              <AccordionItem value="incomeLevels" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Income Level
                  {activeFilters.incomeLevels.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.incomeLevels.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-64 overflow-visible">
                  <MultiSelect
                    options={(filterConfig.incomeLevels || []).map(v => ({ value: v, label: v }))}
                    selected={activeFilters.incomeLevels}
                    onChange={(val) => handleFilterChange('incomeLevels', val)}
                    placeholder="Select income levels..."
                    emptyText="No income levels found."
                  />
                </AccordionContent>
              </AccordionItem>

            </Accordion>
          </div>
        </div>
      )}

      {/* Panel Toggle Button (When closed) */}
      {currentStep === 1 && !isFilterPanelOpen && (
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute left-4 top-[80px] z-10 bg-background shadow-md h-9 w-9 rounded-full"
          onClick={() => setIsFilterPanelOpen(true)}
        >
          <FilterIcon className="h-4 w-4" />
        </Button>
      )}

      {/* ------------------------------------------------------------- */}
      {/* CENTER PANEL: MAP                                             */}
      {/* ------------------------------------------------------------- */}
      <div className={`flex-1 relative ${currentStep === 2 ? "px-8 py-8 overflow-y-auto" : ""}`}>
        
        {currentStep === 1 ? (
          <>
            {/* Header Overlay */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
              <div className="bg-background/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border pointer-events-auto">
                <div className="flex items-center gap-3 mb-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setLocation("/advertiser")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h1 className="font-bold text-lg font-serif">Advanced Builder</h1>
                  <Badge variant="secondary" className="ml-2 bg-primary/10 text-primary border-primary/20">{screens.length} Screens Found</Badge>
                </div>
                <div className="flex items-center justify-between ml-11">
                  <p className="text-xs text-muted-foreground">Select highly targeted screens from the map or list.</p>
                  <Button 
                    size="sm" 
                    variant="default" 
                    className="h-7 rounded-full px-3 font-bold text-[10px] uppercase tracking-wider ml-4"
                    onClick={selectAllFiltered}
                    disabled={screens.length === 0}
                  >
                    <Check className="mr-1 h-3 w-3" />
                    Select All {screens.length}
                  </Button>
                </div>
              </div>
            </div>

            {/* Panel Collapse Toggles */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex">
              {isFilterPanelOpen && (
                <Button 
                  variant="outline" 
                   className="h-16 w-6 rounded-l-none rounded-r-md bg-background/90 backdrop-blur border-l-0 shadow-md p-0 flex items-center justify-center hover:bg-background group"
                  onClick={() => setIsFilterPanelOpen(false)}
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </Button>
              )}
            </div>

            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex pr-[400px]">
               {isWorkspaceOpen && (
                <Button 
                  variant="outline" 
                  className="h-16 w-6 rounded-r-none rounded-l-md bg-background/90 backdrop-blur border-r-0 shadow-md p-0 flex items-center justify-center hover:bg-background group translate-x-[400px]"
                  onClick={() => setIsWorkspaceOpen(false)}
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </Button>
              )}
            </div>

            {/* Map Container */}
            <div className="w-full h-full">
               <Map
                  style={{ width: '100%', height: '100%' }}
                  defaultCenter={mapCenter}
                  defaultZoom={12}
                  mapId="advanced-campaign-map"
                  gestureHandling="greedy"
                  disableDefaultUI={true}
                  zoomControl={true}
                >
                  <MapPanner target={mapPanTarget} />
                  {/* Fit map to country/state bounds automatically */}
                  {activeFilters.locations
                    .filter(l => (l.locationType === 'country' || l.locationType === 'state') && l.bounds)
                    .slice(-1)  // only last wide location
                    .map((loc, idx) => (
                      <MapBoundsFitter key={`bounds-${idx}`} bounds={loc.bounds!} />
                    ))
                  }
                  {/* Draw target location pins and radius circles — only for city/poi, not country/state */}
                  {activeFilters.locations
                    .filter(l => l.lat && l.lng && l.locationType !== 'country' && l.locationType !== 'state')
                    .map((loc, idx) => (
                    <React.Fragment key={`target-${idx}`}>
                      <AdvancedMarker
                        position={{ lat: loc.lat!, lng: loc.lng! }}
                        onClick={() => {
                          const radius = loc.radiusKm || 5;
                          const zoom = radius <= 2 ? 15 : radius <= 5 ? 13 : radius <= 15 ? 11 : radius <= 30 ? 9 : 8;
                          setMapPanTarget({ lat: loc.lat!, lng: loc.lng!, zoom });
                        }}
                      >
                        <div className="w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-125 transition-transform">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        </div>
                      </AdvancedMarker>
                      {loc.radiusKm && (
                        <CircleOverlay
                          center={{ lat: loc.lat!, lng: loc.lng! }}
                          radius={loc.radiusKm * 1000}
                        />
                      )}
                    </React.Fragment>
                  ))}

                  {/* Render price bubble markers — same style as Discover Screens */}
                  {screens.map((screen) => {
                    const isSelected = selectedScreenIds.includes(screen.id);
                    const isHovered = hoveredScreenId === screen.id;
                    const price = calculateScreenPricePerDay(screen) || 0;
                    const priceDisplay = price >= 1000
                      ? `₹${(price / 1000).toFixed(1).replace('.0', '')}k`
                      : `₹${price}`;

                    return (
                      <AdvancedMarker
                        key={screen.id}
                        position={{
                          lat: parseFloat(screen.latitude.toString()),
                          lng: parseFloat(screen.longitude.toString()),
                        }}
                        onClick={() => setSelectedMapScreen(screen)}
                        zIndex={isSelected ? 20 : isHovered ? 15 : 1}
                      >
                        <div
                          className={`relative flex flex-col items-center cursor-pointer transition-all duration-200 ${isHovered ? 'scale-125' : 'scale-100'}`}
                          onMouseEnter={() => setHoveredScreenId(screen.id)}
                          onMouseLeave={() => setHoveredScreenId(null)}
                        >
                          {/* Price bubble */}
                          <div className={`
                            px-3 py-1.5 rounded-full font-bold text-[13px] border-2 whitespace-nowrap
                            ${isSelected
                              ? 'bg-green-600 text-white border-white shadow-lg'
                              : isHovered
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xl'
                                : 'bg-white text-slate-800 border-white shadow-md hover:bg-slate-50'
                            }
                          `}>
                            {priceDisplay}
                          </div>
                          {/* Triangle caret */}
                          <div className={`w-0 h-0 -mt-px
                            border-l-[6px] border-l-transparent
                            border-r-[6px] border-r-transparent
                            border-t-[6px]
                            ${isSelected ? 'border-t-green-600' : isHovered ? 'border-t-slate-900' : 'border-t-white'}
                          `} />
                        </div>
                      </AdvancedMarker>
                    );
                  })}

                </Map>
            </div>
          </>
        ) : (
          /* Step 2: Review & Submit (Full Width) */
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <Button variant="ghost" onClick={() => setCurrentStep(1)} className="mb-4 pl-0" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Selection
                </Button>
                <h1 className="text-3xl font-bold font-serif">Review & Launch</h1>
                <p className="text-muted-foreground mt-1">Provide your creative and confirm your campaign details.</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onFinalSubmit)} className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary"/> Add Creative</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="creativeUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Creative URL</FormLabel>
                              <FormControl>
                                <Input placeholder="https://..." {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         {form.watch("creativeUrl") && (
                            <div className="border rounded-lg overflow-hidden relative aspect-video bg-muted flex flex-col justify-center items-center">
                              <img 
                                src={form.watch("creativeUrl")} 
                                alt="Creative preview" 
                                className="w-full h-full object-contain"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              />
                            </div>
                          )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary"/> Campaign Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                            <div className="bg-muted/50 rounded-lg p-4 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground block text-xs mb-1">Campaign Name</span>
                                  <span className="font-semibold">{form.watch("name") || "Unnamed Campaign"}</span>
                                </div>
                                <div className="hidden">
                                  <span className="text-muted-foreground block text-xs mb-1">Objective</span>
                                  <span className="font-semibold">{objectives.find(o => o.value === form.watch("objective"))?.label || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs mb-1">Dates</span>
                                  <span className="font-semibold">{new Date(form.watch("startDate")).toLocaleDateString('en-GB')} - {new Date(form.watch("endDate")).toLocaleDateString('en-GB')}</span>
                                  <span className="text-xs ml-1 text-muted-foreground">({durationDays} days)</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-xs mb-1">Cost Details</span>
                                  <div className="space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Subtotal:</span>
                                      <span className="font-semibold">₹{estimatedCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">GST (18%):</span>
                                      <span className="font-semibold">₹{(estimatedCost * 0.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t">
                                      <span className="font-bold">Total:</span>
                                      <span className="font-bold text-primary text-base">₹{(estimatedCost * 1.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                </div>
                            </div>

                            <Separator />
                            
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Screens Targeted</span>
                              <Badge variant="secondary" className="font-semibold text-sm">{calculateTotalPhysicalScreens(screens.filter(s => selectedScreenIds.includes(s.id)))} Screens</Badge>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground">Estimated Est. Reach</span>
                              <span className="font-semibold">{totalReach.toLocaleString()} views</span>
                            </div>

                            <div className="flex justify-between items-center pt-2">
                              <span className="font-semibold text-lg">Total Cost</span>
                              <div className="text-right">
                                <span className="font-bold text-2xl text-primary flex items-center gap-1">
                                  ₹{estimatedCost.toLocaleString()}
                                </span>
                                {estimatedCost > (form.watch("budget") || 0) && (
                                   <div className="flex items-center gap-1 text-destructive text-xs mt-1">
                                     <AlertTriangle className="h-3 w-3" /> Over desired budget
                                   </div>
                                )}
                              </div>
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                 </div>

                 <div className="flex justify-end pt-4">
                    <Button type="submit" size="lg" disabled={createCampaignMutation.isPending}>
                       {createCampaignMutation.isPending ? "Creating..." : "Confirm & Launch Campaign"}
                       <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                 </div>
              </form>
            </Form>
          </div>
        )}
      </div>

       {/* Panel Toggle Button (When closed) */}
       {currentStep === 1 && !isWorkspaceOpen && (
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute right-4 top-[80px] z-10 bg-background shadow-md h-9 w-9 rounded-full"
          onClick={() => setIsWorkspaceOpen(true)}
        >
           <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* ------------------------------------------------------------- */}
      {/* RIGHT PANEL: WORKSPACE (Only in Step 1)                        */}
      {/* ------------------------------------------------------------- */}
      {currentStep === 1 && (
        <div 
           className={`flex-shrink-0 bg-background border-l flex flex-col transition-all duration-300 ${isWorkspaceOpen ? "w-[400px]" : "w-0"} overflow-hidden z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.1)]`}
        >
           <div className="p-4 border-b flex flex-col gap-2 bg-card sticky top-0 z-10">
              <div className="flex justify-between items-center">
                 <h2 className="font-bold font-serif text-lg">Campaign Setup</h2>
              </div>
              
              <Form {...form}>
                 <div className="space-y-4 mt-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campaign Name</label>
                          <FormControl>
                            <Input placeholder="E.g. Summer Sale 2024" className="h-8 text-sm" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name="startDate"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</label>
                              <FormControl>
                                <Input type="date" className="h-8 text-sm px-2" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="endDate"
                          render={({ field }) => (
                            <FormItem className="space-y-1">
                              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</label>
                              <FormControl>
                                <Input type="date" className="h-8 text-sm px-2" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                    </div>
                 </div>
              </Form>
           </div>

           <div className="flex-1 overflow-y-auto bg-muted/20">
              <div className="p-4 space-y-4">
                 <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm flex items-center gap-1.5"><Target className="h-4 w-4 text-primary"/> Selected Inventory</h3>
                    <Badge variant="secondary" className="bg-primary hover:bg-primary text-white text-xs">{calculateTotalPhysicalScreens(screens.filter(s => selectedScreenIds.includes(s.id)))} Screens</Badge>
                 </div>
                 
                 {selectedScreensFull.length === 0 ? (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-background">
                       <MapIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                       <p className="text-sm font-medium text-muted-foreground">No screens selected</p>
                       <p className="text-xs text-muted-foreground mt-2 px-6">Click map markers or use <span className="font-bold text-primary">"Select All"</span> to build your network.</p>
                    </div>
                 ) : (
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {selectedScreensFull.map((screen, idx) => (
                        <div key={screen.id} className="relative group rounded-lg overflow-hidden border hover:border-primary/50 transition-colors shadow-sm">
                          <div className="pointer-events-none">
                            <ScreenCard screen={screen} />
                          </div>
                          <button 
                           onClick={() => toggleScreenSelection(screen.id)}
                           className="absolute top-2 right-2 bg-destructive/90 text-destructive-foreground p-1.5 rounded-full hover:bg-destructive opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md pointer-events-auto"
                           title="Remove from campaign"
                          >
                             <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                 )}
              </div>
           </div>

           <div className="p-4 bg-background border-t shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Est. Cost ({durationDays} days)</p>
                    <p className="text-2xl font-bold font-serif text-primary leading-none">₹{estimatedCost.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Reach</p>
                    <p className="text-sm font-semibold leading-none">{totalReach >= 1000 ? (totalReach/1000).toFixed(1) + 'k' : totalReach}</p>
                 </div>
              </div>
              <Button 
                className="w-full font-bold shadow-md" 
                size="lg"
                onClick={onSubmitBuild}
                disabled={selectedScreenIds.length === 0}
              >
                 Review & Launch
                 <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
           </div>
        </div>
      )}
      <ScreenDetailsModal
        isOpen={!!selectedMapScreen}
        onClose={() => setSelectedMapScreen(null)}
        screen={selectedMapScreen}
        onAdd={(screen) => toggleScreenSelection(screen.id)}
        isAdded={selectedMapScreen ? selectedScreenIds.includes(selectedMapScreen.id) : false}
      />
    </div>
  );
}
