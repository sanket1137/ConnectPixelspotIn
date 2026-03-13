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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Screen } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

// Filter Types
export type FilterConfig = {
  cities: string[];
  venueTypes: string[];
  environmentTypes: string[];
  tags: { id: string; name: string; displayName: string; category: string }[];
};

export type ActiveFilters = {
  cities: string[];
  venueTypes: string[];
  environmentTypes: string[];
  tags: string[];
  priceRange: [number, number];
  minBookingDays: number;
};

const defaultFilters: ActiveFilters = {
  cities: [],
  venueTypes: [],
  environmentTypes: [],
  tags: [],
  priceRange: [0, 100000],
  minBookingDays: 30
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
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [activeScreenIndex, setActiveScreenIndex] = useState<number | null>(null);

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
  useEffect(() => {
    const fetchFilteredScreens = async () => {
      try {
        // Build query string
        const params = new URLSearchParams();
        
        if (activeFilters.cities.length > 0) {
          activeFilters.cities.forEach(c => params.append("city", c));
        }
        if (activeFilters.venueTypes.length > 0) {
          activeFilters.venueTypes.forEach(v => params.append("venueCategories", v));
        }
        if (activeFilters.environmentTypes.length > 0) {
          activeFilters.environmentTypes.forEach(e => params.append("environmentTypes", e));
        }
        if (activeFilters.tags.length > 0) {
          activeFilters.tags.forEach(t => params.append("environmentTags", t));
        }
        if (activeFilters.priceRange[0] > 0) {
          params.append("minPrice", activeFilters.priceRange[0].toString());
        }
        if (activeFilters.priceRange[1] < 50000) {
          params.append("maxPrice", activeFilters.priceRange[1].toString());
        }
        if (activeFilters.minBookingDays > 1) {
          params.append('minBookingDays', activeFilters.minBookingDays.toString());
        }

        const queryString = params.toString();
        const url = `/api/public/screens/filters${queryString ? `?${queryString}` : ''}`;
        
        console.log("Fetching screens with filters:", url);
        // Note: We might need a slightly different endpoint that returns screens instead of filters
        // For now, let's reuse api/screens or api/screens/in-area if possible, or wait to create a new one
        // Let's assume /api/screens supports these query parameters as configured previously
        const screenResponse = await apiRequest("GET", `/api/screens${queryString ? `?${queryString}` : ''}`);
        const screenData = await screenResponse.json();
        setScreens(Array.isArray(screenData) ? screenData : []);

        // Recenter map if city is selected (simplistic logic)
        if (activeFilters.cities.length > 0 && Array.isArray(screenData) && screenData.length > 0) {
          const firstScreen = screenData[0];
          setMapCenter({
            lat: parseFloat(firstScreen.latitude.toString()),
            lng: parseFloat(firstScreen.longitude.toString())
          });
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

  const toggleArrayFilter = (key: keyof Pick<ActiveFilters, 'cities' | 'venueTypes' | 'environmentTypes' | 'tags'>, value: string) => {
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
    const multi = s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1;
    return sum + (s.pricePerDay * multi * durationDays);
  }, 0);
  
  const totalReach = selectedScreensFull.reduce((sum, s) => sum + (s.avgDailyFootfall || 0) * durationDays, 0);


  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      if (selectedScreenIds.length === 0) {
        throw new Error("No screens selected for the campaign");
      }

      // Create campaign with targeted screens (no specific area)
      const targetArea = {
        type: "india" as const, // Broadest area since we hand-picked screens
      };

      const campaignResponse = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: data.name,
        objective: data.objective,
        targetArea,
        targetLocationType: "india",
        targetCities: [],
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
        const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
        const price = screen.pricePerDay * screenMultiplier * durationDays;

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
        description: `Campaign created successfully with ${selectedScreenIds.length} booking request(s).`,
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
            {/* Search (Optional enhancement) */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search locations..." className="pl-9 h-9" />
            </div>

            <Accordion type="multiple" defaultValue={["city", "venue", "price"]} className="w-full">
              
              {/* City Filter */}
              <AccordionItem value="city" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  City
                  {activeFilters.cities.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.cities.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {filterConfig.cities.map(city => (
                      <div key={city} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`city-${city}`} 
                          checked={activeFilters.cities.includes(city)}
                          onCheckedChange={() => toggleArrayFilter('cities', city)}
                        />
                        <label htmlFor={`city-${city}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                          {city}
                        </label>
                      </div>
                    ))}
                  </div>
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
                    {activeFilters.minBookingDays}d
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
                    <span>90 days</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">Shows screens accepting bookings up to this duration.</p>
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
                <AccordionContent className="pt-2 pb-0 px-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {filterConfig.venueTypes.map(venue => (
                      <div key={venue} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`venue-${venue}`} 
                          checked={activeFilters.venueTypes.includes(venue)}
                          onCheckedChange={() => toggleArrayFilter('venueTypes', venue)}
                        />
                        <label htmlFor={`venue-${venue}`} className="text-sm font-medium leading-none cursor-pointer">
                          {venue}
                        </label>
                      </div>
                    ))}
                  </div>
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
                <AccordionContent className="pt-2 pb-0 px-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {filterConfig.environmentTypes.map(env => (
                      <div key={env} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`env-${env}`} 
                          checked={activeFilters.environmentTypes.includes(env)}
                          onCheckedChange={() => toggleArrayFilter('environmentTypes', env)}
                        />
                        <label htmlFor={`env-${env}`} className="text-sm font-medium leading-none cursor-pointer capitalize">
                          {env}
                        </label>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
              
               {/* Tags Filter */}
               <AccordionItem value="tags" className="border-b-0 mb-2">
                <AccordionTrigger className="py-2 hover:no-underline text-sm font-semibold bg-muted/50 px-3 rounded-md">
                  Tags
                  {activeFilters.tags.length > 0 && (
                    <Badge variant="secondary" className="ml-2 bg-primary/20 text-primary h-5 w-5 p-0 flex items-center justify-center rounded-full">
                      {activeFilters.tags.length}
                    </Badge>
                  )}
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-0 px-2 max-h-48 overflow-y-auto">
                  <div className="space-y-2 flex flex-wrap gap-2">
                    {filterConfig.tags.map(tag => (
                      <Badge 
                        key={tag.id} 
                        variant={activeFilters.tags.includes(tag.name) ? "default" : "outline"}
                        className="cursor-pointer font-normal rounded-sm"
                        onClick={() => toggleArrayFilter('tags', tag.name)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
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
                  {/* Render mapping markers from filtered screens */}
                  {screens.map((screen) => (
                    <AdvancedMarker
                      key={screen.id}
                      position={{
                        lat: parseFloat(screen.latitude.toString()),
                        lng: parseFloat(screen.longitude.toString()),
                      }}
                      onClick={() => setSelectedMapScreen(screen)}
                      zIndex={selectedScreenIds.includes(screen.id) ? 10 : 1}
                    >
                      <div className={`relative flex items-center justify-center rounded-full shadow-lg transition-transform ${selectedScreenIds.includes(screen.id) ? 'scale-125' : 'hover:scale-110'}`}
                           style={{
                             width: selectedScreenIds.includes(screen.id) ? 28 : 22,
                             height: selectedScreenIds.includes(screen.id) ? 28 : 22,
                             backgroundColor: selectedScreenIds.includes(screen.id) ? '#22c55e' : '#8b5cf6',
                             border: '2px solid white'
                           }}>
                         {selectedScreenIds.includes(screen.id) ? (
                           <Check className="h-3 w-3 text-white" strokeWidth={3}/>
                         ) : (
                           <div className="h-1.5 w-1.5 bg-white rounded-full" />
                         )}
                      </div>
                    </AdvancedMarker>
                  ))}

                  {/* Info Window */}
                  {selectedMapScreen && (
                    <InfoWindow
                      position={{
                        lat: parseFloat(selectedMapScreen.latitude.toString()),
                        lng: parseFloat(selectedMapScreen.longitude.toString()),
                      }}
                      onCloseClick={() => setSelectedMapScreen(null)}
                      maxWidth={300}
                    >
                      <div className="p-1 min-w-[240px]">
                        <div className="h-28 w-full bg-muted rounded-md mb-2 overflow-hidden relative">
                           {selectedMapScreen.images?.[0] ? (
                             <img src={selectedMapScreen.images[0]} className="w-full h-full object-cover" alt="Screen" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center bg-gray-100">
                               <ImageIcon className="h-6 w-6 text-gray-400" />
                             </div>
                           )}
                           <Badge className="absolute top-2 right-2 flex px-1.5 py-0 text-[10px] uppercase shadow-sm">{selectedMapScreen.environmentType || 'Indoor'}</Badge>
                        </div>
                        <h3 className="font-bold text-sm truncate">{selectedMapScreen.name}</h3>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3"/>{selectedMapScreen.location}, {selectedMapScreen.city}</p>
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Price/Day</p>
                            <p className="font-bold text-xs text-primary">₹{selectedMapScreen.pricePerDay.toLocaleString()}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant={selectedScreenIds.includes(selectedMapScreen.id) ? "destructive" : "default"}
                            className="h-7 text-xs px-3"
                            onClick={() => toggleScreenSelection(selectedMapScreen.id)}
                          >
                            {selectedScreenIds.includes(selectedMapScreen.id) ? "Remove" : "Select"}
                          </Button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
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
                              <Badge variant="secondary" className="font-semibold text-sm">{selectedScreenIds.length} Screens</Badge>
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
                    <Badge variant="secondary" className="bg-primary hover:bg-primary text-white text-xs">{selectedScreenIds.length} Screens</Badge>
                 </div>
                 
                 {selectedScreensFull.length === 0 ? (
                    <div className="text-center py-10 px-4 border-2 border-dashed border-muted-foreground/20 rounded-xl bg-background">
                       <MapIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                       <p className="text-sm font-medium text-muted-foreground">No screens selected</p>
                       <p className="text-xs text-muted-foreground mt-2 px-6">Click map markers or use <span className="font-bold text-primary">"Select All"</span> to build your network.</p>
                    </div>
                 ) : (
                    <div className="space-y-2">
                       {selectedScreensFull.map((screen, idx) => (
                          <div key={screen.id} className="bg-background border rounded-lg p-3 hover:border-primary/50 transition-colors shadow-sm group">
                             <div className="flex gap-3">
                                <div className="h-12 w-16 bg-muted rounded overflow-hidden flex-shrink-0">
                                   {screen.images?.[0] ? (
                                     <img src={screen.images[0]} alt="" className="w-full h-full object-cover" />
                                   ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                        <ImageIcon className="h-4 w-4 text-gray-300" />
                                     </div>
                                   )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                   <div className="flex justify-between items-start gap-2">
                                     <h4 className="text-sm font-bold truncate leading-none mt-1">{screen.name}</h4>
                                     <button 
                                      onClick={() => toggleScreenSelection(screen.id)}
                                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                     >
                                        <Trash2 className="h-3.5 w-3.5" />
                                     </button>
                                   </div>
                                   <p className="text-[10px] text-muted-foreground truncate">{screen.location}</p>
                                   <div className="flex justify-between items-center mt-1">
                                      <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">₹{screen.pricePerDay.toLocaleString()}/day</span>
                                      <span className="text-[10px] text-muted-foreground">👣 {screen.avgDailyFootfall ? (screen.avgDailyFootfall / 1000).toFixed(1) + 'k' : 'N/A'}</span>
                                   </div>
                                </div>
                             </div>
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
    </div>
  );
}
