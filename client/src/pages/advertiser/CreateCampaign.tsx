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
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, ArrowRight, Target, MapPin, Calendar, Filter, Monitor as MonitorIcon, Upload, Check, List as ListIcon, Map as MapIcon, TrendingUp, DollarSign, Users, Clock, AlertTriangle, Eye, X } from "lucide-react";
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
import { GoogleMap, useLoadScript, Marker, InfoWindow, Circle } from "@react-google-maps/api";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const mapContainerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 12.9716,
  lng: 77.5946
};

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  objective: z.string().min(1, "Objective is required"),
  budget: z.number().min(1000, "Minimum budget is ₹1,000"),
  
  // Area targeting
  areaType: z.enum(["map", "city"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusKm: z.number().min(1).max(10).optional(),
  targetCity: z.string().optional(),
  targetState: z.string().optional(),
  
  // Duration
  durationMode: z.enum(["auto", "custom"]),
  customDays: z.number().min(1).optional(),
  
  // Optional filters
  venueTypeFilters: z.array(z.string()).optional(),
  targetAgeGroups: z.array(z.string()).optional(),
  targetGender: z.string().optional(),
  targetAffluence: z.array(z.string()).optional(),
  timePreference: z.array(z.string()).optional(),
  
  // Dates (calculated from duration)
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type CreateCampaignForm = z.infer<typeof createCampaignSchema>;

const steps = [
  { id: 1, name: "Goal & Budget", icon: Target },
  { id: 2, name: "Choose Area", icon: MapPin },
  { id: 3, name: "Set Duration", icon: Calendar },
  { id: 4, name: "Filters", icon: Filter },
  { id: 5, name: "Smart Plan", icon: MonitorIcon },
  { id: 6, name: "Review", icon: Upload },
];

const objectives = [
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "product_launch", label: "Product Launch" },
  { value: "event_promotion", label: "Event Promotion" },
  { value: "seasonal_campaign", label: "Seasonal Campaign" },
  { value: "local_promotion", label: "Local Promotion" },
];

const venueTypes = [
  "Airport", "Apartment", "Bus Stop", "Café", "Cinema", "Co-working", 
  "College", "Corporate Park", "Flyover", "Gym", "Highway", "Hospital", 
  "Mall", "Metro", "Office Building", "Restaurant", "Retail Store", 
  "Road Junction", "Road Side", "Salon", "Shopping Complex", "Stadium"
];

// Match database values from shared/constants.ts
const ageGroups = [
  "Children (5-12)",
  "Teenagers (13-17)",
  "Young Adults (18-25)",
  "Adults (26-40)",
  "Middle Age (41-55)",
  "Seniors (55+)"
];

const affluenceLevels = [
  "Budget Conscious",
  "Middle Income",
  "Premium Audience",
  "Luxury Buyers"
];

const timePreferences = ["Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"];

export default function CreateCampaign() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [uploadedCreativeURL, setUploadedCreativeURL] = useState<string | null>(null);
  const [screensInArea, setScreensInArea] = useState<Screen[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [selectedMapScreen, setSelectedMapScreen] = useState<Screen | null>(null);
  const [planMode, setPlanMode] = useState<"smart" | "customize">("smart");
  const [calculatedDuration, setCalculatedDuration] = useState<number | null>(null);
  const [estimatedReach, setEstimatedReach] = useState<{ reach: number; impressions: number; screenCount: number } | null>(null);
  const [screenDetailsDialog, setScreenDetailsDialog] = useState<Screen | null>(null);
  const [campaignCreated, setCampaignCreated] = useState(false);
  const [campaignDrafted, setCampaignDrafted] = useState(false);
  
  // Map state
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [markerPosition, setMarkerPosition] = useState(defaultCenter);

  // Fetch available cities
  const { data: locationsData } = useQuery<{ states: string[]; cities: Record<string, string[]>; allCities: string[] }>({
    queryKey: ["/api/screens/locations"],
  });

  const allCities = locationsData?.allCities || [];

  const form = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      objective: "",
      budget: 10000,
      areaType: "map",
      latitude: defaultCenter.lat,
      longitude: defaultCenter.lng,
      radiusKm: 5,
      targetCity: "",
      targetState: "",
      durationMode: "auto",
      customDays: 7,
      venueTypeFilters: [],
      targetAgeGroups: [],
      targetGender: "all",
      targetAffluence: [],
      timePreference: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
    },
  });

  const watchBudget = form.watch("budget");
  const watchAreaType = form.watch("areaType");
  const watchRadius = form.watch("radiusKm");
  const watchTargetCity = form.watch("targetCity");
  const watchDurationMode = form.watch("durationMode");
  const watchCustomDays = form.watch("customDays");
  const watchVenueTypeFilters = form.watch("venueTypeFilters");
  const watchTargetAgeGroups = form.watch("targetAgeGroups");
  const watchTargetGender = form.watch("targetGender");
  const watchTargetAffluence = form.watch("targetAffluence");
  const watchTimePreference = form.watch("timePreference");

  // Fetch screens in area when area changes (filtered by budget)
  useEffect(() => {
    const fetchScreensInArea = async () => {
      const budget = watchBudget;
      // Use calculated duration in auto mode (fallback to default 7 days if not calculated yet)
      // Use custom days in custom mode
      const duration = watchDurationMode === "auto" ? (calculatedDuration || 7) : watchCustomDays;
      
      if (watchAreaType === "map") {
        const lat = form.getValues("latitude");
        const lng = form.getValues("longitude");
        const radiusKm = form.getValues("radiusKm");
        
        if (lat && lng && radiusKm) {
          try {
            let url = `/api/screens/in-area?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`;
            // Apply budget filter from Step 2 onwards if we have both budget and duration
            // This ensures consistent screen counts across all steps
            if (budget && duration && currentStep >= 2) {
              url += `&budget=${budget}&duration=${duration}`;
            }
            const response = await apiRequest("GET", url);
            const data = await response.json();
            setScreensInArea(data);
            if (planMode === "smart") {
              setSelectedScreenIds(data.map((s: Screen) => s.id));
            }
          } catch (error) {
            console.error("Error fetching screens:", error);
          }
        }
      } else if (watchAreaType === "city" && watchTargetCity) {
        try {
          let url = `/api/screens/in-area?city=${watchTargetCity}`;
          // Apply budget filter from Step 2 onwards if we have both budget and duration
          // This ensures consistent screen counts across all steps
          if (budget && duration && currentStep >= 2) {
            url += `&budget=${budget}&duration=${duration}`;
          }
          const response = await apiRequest("GET", url);
          const data = await response.json();
          setScreensInArea(data);
          if (planMode === "smart") {
            setSelectedScreenIds(data.map((s: Screen) => s.id));
          }
        } catch (error) {
          console.error("Error fetching screens:", error);
        }
      }
    };

    if (currentStep >= 2) {
      fetchScreensInArea();
    }
  }, [watchAreaType, watchRadius, watchTargetCity, currentStep, watchBudget, calculatedDuration, watchDurationMode, watchCustomDays]);

  // Calculate duration when in auto mode
  useEffect(() => {
    const calculateAutoDuration = async () => {
      if (watchDurationMode === "auto" && selectedScreenIds.length > 0 && watchBudget) {
        try {
          const response = await apiRequest("POST", "/api/campaign/calculate-duration", {
            budget: watchBudget,
            screenIds: selectedScreenIds,
          });
          const data = await response.json();
          setCalculatedDuration(data.days);
        } catch (error) {
          console.error("Error calculating duration:", error);
        }
      }
    };

    if (currentStep >= 3 && watchDurationMode === "auto") {
      calculateAutoDuration();
    }
  }, [watchDurationMode, selectedScreenIds, watchBudget, currentStep]);

  // Apply demographic filters from Step 4 to screens
  const filteredScreensInArea = screensInArea.filter((screen) => {
    // Venue type filter (single value match)
    if (watchVenueTypeFilters && watchVenueTypeFilters.length > 0) {
      if (!watchVenueTypeFilters.includes(screen.venueCategory || "")) {
        return false;
      }
    }
    
    // Age groups filter (array intersection) - check if any target age group matches screen's age groups
    if (watchTargetAgeGroups && watchTargetAgeGroups.length > 0) {
      const screenAgeGroups = screen.detailedAgeGroups || [];
      const hasMatchingAge = watchTargetAgeGroups.some(targetAge => 
        screenAgeGroups.includes(targetAge)
      );
      if (!hasMatchingAge) {
        return false;
      }
    }
    
    // Gender filter (single value match with logic mapping)
    if (watchTargetGender && watchTargetGender !== "all") {
      const genderMap: Record<string, string[]> = {
        "male": ["Male Dominant", "Mixed Gender", "Family Oriented"],
        "female": ["Female Dominant", "Mixed Gender", "Family Oriented"],
      };
      const acceptableGenders = genderMap[watchTargetGender] || [];
      if (!acceptableGenders.includes(screen.genderOrientation || "")) {
        return false;
      }
    }
    
    // Affluence filter (single screen value must be in target array)
    if (watchTargetAffluence && watchTargetAffluence.length > 0) {
      if (!watchTargetAffluence.includes(screen.incomeLevel || "")) {
        return false;
      }
    }
    
    // Time preference filter (array intersection) - check if any target time matches screen's time of day activity
    if (watchTimePreference && watchTimePreference.length > 0) {
      const screenTimeActivities = screen.timeOfDayActivity || [];
      const hasMatchingTime = watchTimePreference.some(targetTime => 
        screenTimeActivities.includes(targetTime)
      );
      if (!hasMatchingTime) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate reach estimate
  useEffect(() => {
    const calculateReach = async () => {
      const duration = watchDurationMode === "auto" ? calculatedDuration : watchCustomDays;
      
      if (selectedScreenIds.length > 0 && duration) {
        try {
          const response = await apiRequest("POST", "/api/campaign/calculate-reach", {
            screenIds: selectedScreenIds,
            duration: duration,
          });
          const data = await response.json();
          setEstimatedReach(data);
        } catch (error) {
          console.error("Error calculating reach:", error);
        }
      }
    };

    if (currentStep >= 3) {
      calculateReach();
    }
  }, [selectedScreenIds, calculatedDuration, watchDurationMode, watchCustomDays, currentStep]);

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      if (selectedScreenIds.length === 0) {
        throw new Error("No screens selected for the campaign");
      }

      const duration = data.durationMode === "auto" ? calculatedDuration : data.customDays;
      if (!duration) {
        throw new Error("Duration not calculated");
      }

      // Calculate end date
      const startDate = new Date(data.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + duration);

      // Create campaign with targetArea
      const targetArea = data.areaType === "map" 
        ? {
            type: "map" as const,
            latitude: data.latitude,
            longitude: data.longitude,
            radiusKm: data.radiusKm,
          }
        : {
            type: "city" as const,
            city: data.targetCity,
            state: data.targetState,
          };

      const campaignResponse = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: data.name,
        objective: data.objective,
        targetArea,
        // Legacy fields for backward compatibility
        targetLocationType: data.areaType === "city" ? "city" : "india",
        targetCities: data.areaType === "city" ? [data.targetCity || ""] : [],
        targetState: data.targetState || null,
        targetPincodes: [],
        targetAgeGroups: data.targetAgeGroups || [],
        targetGender: data.targetGender || "all",
        targetAffluence: data.targetAffluence || [],
        targetOccupations: [],
        targetIntent: [],
        targetMood: [],
        venueTypeFilters: data.venueTypeFilters || [],
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: data.budget,
        estimatedBudget: data.budget,
        creativeUrl: uploadedCreativeURL || null,
      });
      
      const campaign = await campaignResponse.json();

      // Create bookings for each selected screen
      const bookingPromises = selectedScreenIds.map(screenId => {
        const screen = screensInArea.find(s => s.id === screenId);
        if (!screen) throw new Error(`Screen ${screenId} not found`);

        const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
        const price = screen.pricePerDay * screenMultiplier * duration;

        return apiRequest("POST", "/api/advertiser/bookings", {
          screenId,
          campaignId: campaign.id,
          price,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });
      });

      await Promise.all(bookingPromises);
      return campaign;
    },
    onSuccess: () => {
      toast({
        title: "Campaign Created",
        description: `Campaign created successfully with ${selectedScreenIds.length} booking requests.`,
      });
      setCampaignCreated(true);
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      
      // Reset form and state after short delay
      setTimeout(() => {
        resetFormAndState();
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

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const fileURL = uploadedFile.uploadURL;

      const response = await apiRequest("PUT", "/api/objects/entity", {
        fileURL,
        entityType: "campaign",
      });
      const data = await response.json();
      setUploadedCreativeURL(data.objectPath);

      toast({
        title: "Creative Uploaded",
        description: "Campaign creative uploaded successfully.",
      });
    }
  };

  const onSubmit = (data: CreateCampaignForm) => {
    if (currentStep !== steps.length) {
      return;
    }
    
    if (selectedScreenIds.length === 0) {
      toast({
        title: "No Screens Selected",
        description: "Please select at least one screen for your campaign.",
        variant: "destructive",
      });
      return;
    }
    
    createCampaignMutation.mutate(data);
  };

  const handleSaveDraft = () => {
    toast({
      title: "Saved as Draft",
      description: "Your campaign has been saved as a draft.",
    });
    setCampaignDrafted(true);
    
    // Reset form and state after short delay
    setTimeout(() => {
      resetFormAndState();
    }, 2000);
  };

  const resetFormAndState = () => {
    // Reset form to defaults
    form.reset({
      name: "",
      objective: "",
      budget: 10000,
      areaType: "map",
      latitude: defaultCenter.lat,
      longitude: defaultCenter.lng,
      radiusKm: 5,
      targetCity: "",
      targetState: "",
      durationMode: "auto",
      customDays: 7,
      venueTypeFilters: [],
      targetAgeGroups: [],
      targetGender: "all",
      targetAffluence: [],
      timePreference: [],
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
    });
    
    // Reset all state
    setCurrentStep(1);
    setUploadedCreativeURL(null);
    setScreensInArea([]);
    setSelectedScreenIds([]);
    setViewMode("list");
    setSelectedMapScreen(null);
    setPlanMode("smart");
    setCalculatedDuration(null);
    setEstimatedReach(null);
    setScreenDetailsDialog(null);
    setCampaignCreated(false);
    setCampaignDrafted(false);
    setMapCenter(defaultCenter);
    setMarkerPosition(defaultCenter);
  };

  const nextStep = async () => {
    // Validate current step
    if (currentStep === 1) {
      const isValid = await form.trigger(["name", "objective", "budget"]);
      if (!isValid) {
        toast({
          title: "Incomplete Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 2) {
      if (watchAreaType === "map") {
        const isValid = await form.trigger(["latitude", "longitude", "radiusKm"]);
        if (!isValid) {
          toast({
            title: "Invalid Area",
            description: "Please select a valid area on the map.",
            variant: "destructive",
          });
          return;
        }
      } else {
        const isValid = await form.trigger(["targetCity"]);
        if (!isValid || !watchTargetCity) {
          toast({
            title: "No City Selected",
            description: "Please select a city.",
            variant: "destructive",
          });
          return;
        }
      }
      
      if (screensInArea.length === 0) {
        toast({
          title: "No Screens Available",
          description: "No screens found in the selected area. Please choose a different area.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 3) {
      const isValid = await form.trigger(["startDate"]);
      if (!isValid) {
        toast({
          title: "Invalid Date",
          description: "Please select a valid start date.",
          variant: "destructive",
        });
        return;
      }

      if (watchDurationMode === "custom") {
        const customDaysValid = await form.trigger(["customDays"]);
        if (!customDaysValid || !watchCustomDays) {
          toast({
            title: "Invalid Duration",
            description: "Please enter a valid number of days.",
            variant: "destructive",
          });
          return;
        }
      }

      // Set end date based on duration
      const duration = watchDurationMode === "auto" ? calculatedDuration : watchCustomDays;
      if (duration) {
        const startDate = new Date(form.getValues("startDate"));
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + duration);
        form.setValue("endDate", endDate.toISOString().split('T')[0]);
      }
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / steps.length) * 100;

  const toggleScreen = (screenId: string) => {
    setSelectedScreenIds(prev => 
      prev.includes(screenId) 
        ? prev.filter(id => id !== screenId)
        : [...prev, screenId]
    );
  };

  const totalBudget = watchBudget;
  const duration = watchDurationMode === "auto" ? calculatedDuration : watchCustomDays;
  const spentBudget = selectedScreenIds.reduce((sum, screenId) => {
    const screen = screensInArea.find(s => s.id === screenId);
    if (!screen) return sum;
    const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
    return sum + (screen.pricePerDay * screenMultiplier * (duration || 1));
  }, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => setLocation("/advertiser")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-foreground font-serif mt-4">Create Smart Campaign</h1>
        <p className="text-muted-foreground mt-1">AI-powered campaign creation in 6 simple steps</p>
      </div>

      <Card>
        <CardHeader>
          <Progress value={progress} className="mb-4" data-testid="progress-campaign" />
          <div className="flex justify-between">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-2 ${
                    currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg ${
                      currentStep >= step.id ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium hidden lg:inline">{step.name}</span>
                </div>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
              }} 
              className="space-y-6"
            >
              {/* Step 1: Campaign Goal & Budget */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Campaign Goal & Budget</h2>
                    <p className="text-muted-foreground">
                      Tell us your goal and budget — we'll show what's possible near you.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Summer Festival Promotion 2024" {...field} data-testid="input-campaign-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="objective"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Objective</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-objective">
                              <SelectValue placeholder="Select your goal" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {objectives.map(obj => (
                              <SelectItem key={obj.value} value={obj.value}>{obj.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budget"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Budget (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g., 50000" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            data-testid="input-budget"
                          />
                        </FormControl>
                        <FormDescription>
                          Minimum budget: ₹1,000
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Choose Area */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Choose Your Target Area</h2>
                    <p className="text-muted-foreground">
                      Select an area using the map or choose a specific city.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="areaType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selection Method</FormLabel>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="map" id="map" data-testid="radio-area-map" />
                            <Label htmlFor="map">Map & Radius</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="city" id="city" data-testid="radio-area-city" />
                            <Label htmlFor="city">City Search</Label>
                          </div>
                        </RadioGroup>
                      </FormItem>
                    )}
                  />

                  {watchAreaType === "map" && (
                    <div className="space-y-4">
                      {isLoaded && (
                        <div className="border rounded-lg overflow-hidden">
                          <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={mapCenter}
                            zoom={12}
                            onClick={(e) => {
                              if (e.latLng) {
                                const lat = e.latLng.lat();
                                const lng = e.latLng.lng();
                                setMarkerPosition({ lat, lng });
                                form.setValue("latitude", lat);
                                form.setValue("longitude", lng);
                              }
                            }}
                          >
                            <Marker
                              position={markerPosition}
                              draggable={true}
                              onDragEnd={(e) => {
                                if (e.latLng) {
                                  const lat = e.latLng.lat();
                                  const lng = e.latLng.lng();
                                  setMarkerPosition({ lat, lng });
                                  form.setValue("latitude", lat);
                                  form.setValue("longitude", lng);
                                }
                              }}
                            />
                            {watchRadius && (
                              <Circle
                                center={markerPosition}
                                radius={watchRadius * 1000}
                                options={{
                                  fillColor: "#3b82f6",
                                  fillOpacity: 0.1,
                                  strokeColor: "#3b82f6",
                                  strokeOpacity: 0.8,
                                  strokeWeight: 2,
                                }}
                              />
                            )}
                          </GoogleMap>
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="radiusKm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Radius: {field.value} km</FormLabel>
                            <FormControl>
                              <Slider
                                min={1}
                                max={10}
                                step={0.5}
                                value={[field.value || 5]}
                                onValueChange={(value) => field.onChange(value[0])}
                                data-testid="slider-radius"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchAreaType === "city" && (
                    <FormField
                      control={form.control}
                      name="targetCity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select City</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-city">
                                <SelectValue placeholder="Choose a city" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[300px]">
                              {allCities.map((city) => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Live Estimate Card */}
                  {screensInArea.length > 0 && (
                    <Card className="bg-primary/5 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-5 w-5 text-primary mt-1" />
                          <div>
                            <p className="font-medium text-foreground">
                              In {watchAreaType === "map" 
                                ? `selected area (${watchRadius} km radius)` 
                                : watchTargetCity}, ₹{totalBudget.toLocaleString()} can reach ~
                              {filteredScreensInArea.reduce((sum, s) => sum + s.avgDailyFootfall, 0).toLocaleString()} people 
                              across {filteredScreensInArea.length} LED screens.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Step 3: Set Duration */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Set Campaign Duration</h2>
                    <p className="text-muted-foreground">
                      Want to maximize your impact? Let Pixelspot auto-plan your duration — or choose days manually.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationMode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Auto decide for me
                          </FormLabel>
                          <FormDescription>
                            Let AI optimize your campaign duration based on budget
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === "auto"}
                            onCheckedChange={(checked) => field.onChange(checked ? "auto" : "custom")}
                            data-testid="switch-duration-mode"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {watchDurationMode === "auto" && calculatedDuration && (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertDescription>
                        Recommended duration: <strong>{calculatedDuration} days</strong> to maximize reach with your budget.
                      </AlertDescription>
                    </Alert>
                  )}

                  {watchDurationMode === "custom" && (
                    <FormField
                      control={form.control}
                      name="customDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Number of Days</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="e.g., 7" 
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-custom-days"
                            />
                          </FormControl>
                          <FormDescription>
                            Choose how many days you want your campaign to run
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Step 4: Audience & Location Filters (Optional) */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Audience & Location Filters</h2>
                    <p className="text-muted-foreground">
                      Optional: Refine your audience targeting (most users skip this)
                    </p>
                  </div>

                  <Accordion type="single" collapsible data-testid="accordion-filters">
                    <AccordionItem value="venue-types">
                      <AccordionTrigger>Venue Types</AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name="venueTypeFilters"
                          render={() => (
                            <FormItem>
                              <div className="grid grid-cols-2 gap-3">
                                {venueTypes.map((venue) => (
                                  <FormField
                                    key={venue}
                                    control={form.control}
                                    name="venueTypeFilters"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(venue)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), venue])
                                                : field.onChange(field.value?.filter((value) => value !== venue))
                                            }}
                                            data-testid={`checkbox-venue-${venue.toLowerCase().replace(' ', '-')}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">{venue}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="age-groups">
                      <AccordionTrigger>Age Groups</AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name="targetAgeGroups"
                          render={() => (
                            <FormItem>
                              <div className="grid grid-cols-2 gap-3">
                                {ageGroups.map((age) => (
                                  <FormField
                                    key={age}
                                    control={form.control}
                                    name="targetAgeGroups"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(age)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), age])
                                                : field.onChange(field.value?.filter((value) => value !== age))
                                            }}
                                            data-testid={`checkbox-age-${age}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">{age}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="gender">
                      <AccordionTrigger>Gender</AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name="targetGender"
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-gender">
                                    <SelectValue placeholder="Select gender" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="all">All</SelectItem>
                                  <SelectItem value="male">Male</SelectItem>
                                  <SelectItem value="female">Female</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="affluence">
                      <AccordionTrigger>Income Levels</AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name="targetAffluence"
                          render={() => (
                            <FormItem>
                              <div className="grid grid-cols-2 gap-3">
                                {affluenceLevels.map((level) => (
                                  <FormField
                                    key={level}
                                    control={form.control}
                                    name="targetAffluence"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(level)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), level])
                                                : field.onChange(field.value?.filter((value) => value !== level))
                                            }}
                                            data-testid={`checkbox-affluence-${level.toLowerCase()}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">{level}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="time">
                      <AccordionTrigger>Time Preference</AccordionTrigger>
                      <AccordionContent>
                        <FormField
                          control={form.control}
                          name="timePreference"
                          render={() => (
                            <FormItem>
                              <div className="grid grid-cols-2 gap-3">
                                {timePreferences.map((time) => (
                                  <FormField
                                    key={time}
                                    control={form.control}
                                    name="timePreference"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(time)}
                                            onCheckedChange={(checked) => {
                                              return checked
                                                ? field.onChange([...(field.value || []), time])
                                                : field.onChange(field.value?.filter((value) => value !== time))
                                            }}
                                            data-testid={`checkbox-time-${time.toLowerCase().replace(' ', '-')}`}
                                          />
                                        </FormControl>
                                        <FormLabel className="font-normal">{time}</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              )}

              {/* Step 5: Smart Plan Suggestions */}
              {currentStep === 5 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Smart Plan Suggestions</h2>
                    <p className="text-muted-foreground">
                      With your ₹{totalBudget.toLocaleString()}, you can either spread your reach for {duration} days or go big for premium screens.
                    </p>
                  </div>

                  {/* Plan Mode Toggle */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={planMode === "smart" ? "default" : "outline"}
                      onClick={() => {
                        setPlanMode("smart");
                        setSelectedScreenIds(filteredScreensInArea.map(s => s.id));
                      }}
                      className="flex-1"
                      data-testid="button-smart-plan"
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Smart Plan (Auto-optimized)
                    </Button>
                    <Button
                      type="button"
                      variant={planMode === "customize" ? "default" : "outline"}
                      onClick={() => setPlanMode("customize")}
                      className="flex-1"
                      data-testid="button-customize-plan"
                    >
                      Customize Plan
                    </Button>
                  </div>

                  {/* Smart Plan Preview */}
                  {planMode === "smart" && (
                    <div className="space-y-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center space-y-2">
                            <p className="text-4xl font-bold text-primary">
                              {(() => {
                                const totalScreens = filteredScreensInArea.reduce((sum, s) => {
                                  const screenMultiplier = s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1;
                                  return sum + screenMultiplier;
                                }, 0);
                                const venueCount = filteredScreensInArea.length;
                                return venueCount === 1 && totalScreens > 1 
                                  ? `${totalScreens} screens (1 venue) × ${duration} days`
                                  : totalScreens === venueCount
                                    ? `${totalScreens} screens × ${duration} days`
                                    : `${totalScreens} screens (${venueCount} venues) × ${duration} days`;
                              })()}
                            </p>
                            <p className="text-muted-foreground">
                              Estimated Reach: <strong className="text-foreground">{estimatedReach?.reach.toLocaleString() || 0}</strong> people
                            </p>
                            <p className="text-muted-foreground">
                              Total Impressions: <strong className="text-foreground">{estimatedReach?.impressions.toLocaleString() || 0}</strong>
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Selected Screens Breakdown */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Selected Screens Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {filteredScreensInArea.map((screen, index) => (
                            <div key={screen.id} className="border rounded-lg p-4 space-y-2 hover-elevate cursor-pointer" data-testid={`screen-breakdown-${screen.id}`} onClick={() => setScreenDetailsDialog(screen)}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                                      {index + 1}
                                    </span>
                                    <h4 className="font-semibold text-foreground">{screen.name}</h4>
                                    {screen.isMultiScreen && screen.numberOfScreens && (
                                      <Badge variant="default" className="ml-2 bg-purple-600 hover:bg-purple-700">
                                        🖥️ Multi-Venue: {screen.numberOfScreens} screens
                                      </Badge>
                                    )}
                                    <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
                                  </div>
                                  <div className="mt-2 space-y-1 text-sm text-muted-foreground ml-8">
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4" />
                                      <span>{screen.location}, {screen.city}, {screen.state} - {screen.pincode}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <MonitorIcon className="h-4 w-4" />
                                      <span>{screen.type} • {screen.resolution}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      <span>Daily Footfall: {screen.avgDailyFootfall.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      <span>{screen.playbackSlotsPerHour} slots/hour • {screen.avgDwellTime} min avg dwell time</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-semibold text-primary">
                                    ₹{(() => {
                                      const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
                                      return (screen.pricePerDay * screenMultiplier * (duration || 1)).toLocaleString();
                                    })()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {screen.isMultiScreen && screen.numberOfScreens ? (
                                      <>₹{screen.pricePerDay.toLocaleString()}/day per screen × {screen.numberOfScreens} screens × {duration || 1} days</>
                                    ) : (
                                      <>₹{screen.pricePerDay.toLocaleString()}/day × {duration || 1} days</>
                                    )}
                                  </div>
                                  <div className="mt-2 text-xs font-medium text-foreground">
                                    ~{(() => {
                                      const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
                                      return (screen.avgDailyFootfall * screenMultiplier * (duration || 1)).toLocaleString();
                                    })()} reach
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Total Summary */}
                          <div className="border-t pt-4 mt-4">
                            <div className="flex items-center justify-between text-lg font-semibold">
                              <span>Total Campaign Cost</span>
                              <span className="text-primary">
                                ₹{filteredScreensInArea.reduce((sum, s) => {
                                  const screenMultiplier = s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1;
                                  return sum + (s.pricePerDay * screenMultiplier * (duration || 1));
                                }, 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                              <span>Your Budget</span>
                              <span>₹{totalBudget.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm font-medium text-foreground mt-1">
                              <span>Remaining</span>
                              <span className={totalBudget - filteredScreensInArea.reduce((sum, s) => {
                                const screenMultiplier = s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1;
                                return sum + (s.pricePerDay * screenMultiplier * (duration || 1));
                              }, 0) >= 0 ? "text-green-600" : "text-red-600"}>
                                ₹{(totalBudget - filteredScreensInArea.reduce((sum, s) => {
                                  const screenMultiplier = s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1;
                                  return sum + (s.pricePerDay * screenMultiplier * (duration || 1));
                                }, 0)).toLocaleString()}
                              </span>
                            </div>
                            
                            {/* Budget Warning */}
                            {(() => {
                              const totalCost = filteredScreensInArea.reduce((sum, s) => {
                                const screenMultiplier = s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1;
                                return sum + (s.pricePerDay * screenMultiplier * (duration || 1));
                              }, 0);
                              const overBudget = totalCost > totalBudget;
                              
                              if (overBudget) {
                                const suggestedBudget = Math.ceil(totalCost / 1000) * 1000; // Round up to nearest 1000
                                return (
                                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="alert-budget-exceeded">
                                    <div className="flex items-start gap-3">
                                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                      <div className="flex-1 space-y-2">
                                        <h4 className="font-semibold text-destructive">Budget Exceeded</h4>
                                        <p className="text-sm text-foreground">
                                          The selected screens cost ₹{totalCost.toLocaleString()}, which exceeds your budget of ₹{totalBudget.toLocaleString()}.
                                        </p>
                                        <p className="text-sm text-foreground">
                                          <strong>Suggestion:</strong> Increase your budget to at least ₹{suggestedBudget.toLocaleString()} to proceed with these screens.
                                        </p>
                                        <Button
                                          type="button"
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => {
                                            form.setValue("budget", suggestedBudget);
                                            setCurrentStep(1);
                                          }}
                                          className="mt-2"
                                          data-testid="button-increase-budget"
                                        >
                                          Increase Budget to ₹{suggestedBudget.toLocaleString()}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Customize Plan */}
                  {planMode === "customize" && (
                    <div className="space-y-4">
                      {/* View Toggle */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={viewMode === "list" ? "default" : "outline"}
                          onClick={() => setViewMode("list")}
                          size="sm"
                          data-testid="button-view-list"
                        >
                          <ListIcon className="mr-2 h-4 w-4" />
                          List View
                        </Button>
                        <Button
                          type="button"
                          variant={viewMode === "map" ? "default" : "outline"}
                          onClick={() => setViewMode("map")}
                          size="sm"
                          data-testid="button-view-map"
                        >
                          <MapIcon className="mr-2 h-4 w-4" />
                          Map View
                        </Button>
                      </div>

                      {/* Budget Indicator */}
                      <Card>
                        <CardContent className="pt-6">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Budget Used</span>
                              <span className="font-semibold">
                                ₹{spentBudget.toLocaleString()} / ₹{totalBudget.toLocaleString()}
                              </span>
                            </div>
                            <Progress value={(spentBudget / totalBudget) * 100} data-testid="progress-budget" />
                          </div>
                        </CardContent>
                      </Card>

                      {/* List View */}
                      {viewMode === "list" && (
                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                          {filteredScreensInArea.map((screen) => (
                            <Card key={screen.id} className={selectedScreenIds.includes(screen.id) ? "border-primary" : ""}>
                              <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                  <Checkbox
                                    checked={selectedScreenIds.includes(screen.id)}
                                    onCheckedChange={() => toggleScreen(screen.id)}
                                    data-testid={`checkbox-screen-${screen.id}`}
                                  />
                                  <div className="flex-1 cursor-pointer" onClick={() => setScreenDetailsDialog(screen)}>
                                    <div className="flex items-center gap-2">
                                      <h3 className="font-semibold">{screen.name}</h3>
                                      {screen.isMultiScreen && screen.numberOfScreens && (
                                        <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                                          🖥️ Multi-Venue: {screen.numberOfScreens} screens
                                        </Badge>
                                      )}
                                      <Eye className="h-4 w-4 ml-auto text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground">{screen.location}</p>
                                    <div className="flex gap-2 mt-2">
                                      <Badge variant="outline">{screen.venueCategory}</Badge>
                                      <Badge variant="outline">{screen.avgDailyFootfall.toLocaleString()} daily footfall</Badge>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">
                                      {screen.isMultiScreen && screen.numberOfScreens ? (
                                        <>₹{screen.pricePerDay.toLocaleString()}/day × {screen.numberOfScreens} screens</>
                                      ) : (
                                        <>₹{screen.pricePerDay.toLocaleString()}/day</>
                                      )}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                      ₹{(() => {
                                        const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
                                        return (screen.pricePerDay * screenMultiplier * (duration || 1)).toLocaleString();
                                      })()} total
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}

                      {/* Map View */}
                      {viewMode === "map" && isLoaded && (
                        <div className="border rounded-lg overflow-hidden">
                          <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={markerPosition}
                            zoom={12}
                          >
                            {filteredScreensInArea.map((screen) => (
                              <Marker
                                key={screen.id}
                                position={{
                                  lat: parseFloat(screen.latitude.toString()),
                                  lng: parseFloat(screen.longitude.toString()),
                                }}
                                onClick={() => setSelectedMapScreen(screen)}
                                icon={{
                                  path: window.google.maps.SymbolPath.CIRCLE,
                                  scale: 8,
                                  fillColor: selectedScreenIds.includes(screen.id) ? "#3b82f6" : "#6b7280",
                                  fillOpacity: 1,
                                  strokeColor: "#ffffff",
                                  strokeWeight: 2,
                                }}
                              />
                            ))}
                            
                            {selectedMapScreen && (
                              <InfoWindow
                                position={{
                                  lat: parseFloat(selectedMapScreen.latitude.toString()),
                                  lng: parseFloat(selectedMapScreen.longitude.toString()),
                                }}
                                onCloseClick={() => setSelectedMapScreen(null)}
                              >
                                <div className="p-2">
                                  <h3 className="font-semibold">{selectedMapScreen.name}</h3>
                                  <p className="text-sm text-muted-foreground mb-2">{selectedMapScreen.location}</p>
                                  <p className="text-sm font-medium">₹{selectedMapScreen.pricePerDay.toLocaleString()}/day</p>
                                  <Button
                                    size="sm"
                                    className="mt-2 w-full"
                                    onClick={() => toggleScreen(selectedMapScreen.id)}
                                    data-testid={`button-toggle-screen-${selectedMapScreen.id}`}
                                  >
                                    {selectedScreenIds.includes(selectedMapScreen.id) ? "Remove" : "Add"}
                                  </Button>
                                </div>
                              </InfoWindow>
                            )}
                          </GoogleMap>
                        </div>
                      )}

                      {/* Reach Stats */}
                      {estimatedReach && (
                        <Card className="bg-primary/5 border-primary/20">
                          <CardContent className="pt-6">
                            <div className="grid grid-cols-3 gap-4 text-center">
                              <div>
                                <p className="text-2xl font-bold text-primary">{selectedScreenIds.length}</p>
                                <p className="text-sm text-muted-foreground">Screens</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-primary">{estimatedReach.reach.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Reach</p>
                              </div>
                              <div>
                                <p className="text-2xl font-bold text-primary">{estimatedReach.impressions.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Impressions</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 6: Upload Creative & Review */}
              {currentStep === 6 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Upload Creative & Review</h2>
                    <p className="text-muted-foreground">
                      Upload your creative assets and review your campaign before launching.
                    </p>
                  </div>

                  {/* Creative Upload */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Campaign Creative</CardTitle>
                      <CardDescription>Upload your image or video creative (recommended: 1920x1080)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ObjectUploader
                        onComplete={handleUploadComplete}
                        onGetUploadParameters={handleGetUploadParameters}
                        allowedFileTypes={["image/*", "video/*"]}
                        maxFileSize={50 * 1024 * 1024}
                        buttonTestId="button-upload-creative"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Creative
                      </ObjectUploader>
                      {uploadedCreativeURL && (
                        <Alert className="mt-4">
                          <Check className="h-4 w-4" />
                          <AlertDescription>
                            Creative uploaded successfully!
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>

                  {/* Summary Card */}
                  <Card className="border-2 border-primary/20">
                    <CardHeader>
                      <CardTitle>Campaign Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">🎯 Campaign Goal</p>
                          <p className="font-semibold" data-testid="text-summary-objective">
                            {objectives.find(o => o.value === form.getValues("objective"))?.label}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">💰 Budget</p>
                          <p className="font-semibold" data-testid="text-summary-budget">₹{totalBudget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">📍 Target Area</p>
                          <p className="font-semibold" data-testid="text-summary-area">
                            {watchAreaType === "map" 
                              ? `${watchRadius} km radius` 
                              : watchTargetCity}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">📅 Duration</p>
                          <p className="font-semibold" data-testid="text-summary-duration">{duration} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">🖥️ Screens</p>
                          <p className="font-semibold" data-testid="text-summary-screens">{selectedScreenIds.length} screens</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">👁️ Est. Reach</p>
                          <p className="font-semibold" data-testid="text-summary-reach">
                            {estimatedReach?.reach.toLocaleString() || 0} people
                          </p>
                        </div>
                      </div>

                      {uploadedCreativeURL && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">🖼 Creative Preview</p>
                          <div className="border rounded-lg overflow-hidden">
                            <img 
                              src={`/objects${uploadedCreativeURL}`} 
                              alt="Campaign creative" 
                              className="w-full h-auto"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  data-testid="button-previous"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {currentStep === steps.length && !campaignCreated && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSaveDraft}
                      disabled={campaignDrafted}
                      data-testid="button-save-draft"
                    >
                      {campaignDrafted ? "Saved" : "Save as Draft"}
                    </Button>
                  )}
                  
                  {currentStep < steps.length ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      data-testid="button-next"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : !campaignDrafted && (
                    <Button
                      type="button"
                      onClick={() => form.handleSubmit(onSubmit)()}
                      disabled={createCampaignMutation.isPending || campaignCreated}
                      data-testid="button-create-campaign"
                    >
                      {createCampaignMutation.isPending ? "Creating..." : campaignCreated ? "Created" : "Create Campaign"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Screen Details Dialog */}
      <Dialog open={!!screenDetailsDialog} onOpenChange={() => setScreenDetailsDialog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {screenDetailsDialog && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DialogTitle className="text-2xl">{screenDetailsDialog.name}</DialogTitle>
                    {screenDetailsDialog.isMultiScreen && screenDetailsDialog.numberOfScreens && (
                      <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">
                        🖥️ Multi-Venue: {screenDetailsDialog.numberOfScreens} screens
                      </Badge>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Images Gallery */}
                {screenDetailsDialog.images && screenDetailsDialog.images.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Images</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {screenDetailsDialog.images.map((image, idx) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`${screenDetailsDialog.name} - Image ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src = 'https://placehold.co/400x300/1a1a1a/666?text=No+Image';
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Basic Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-semibold">{screenDetailsDialog.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Size</p>
                      <p className="font-semibold">{screenDetailsDialog.size}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resolution</p>
                      <p className="font-semibold">{screenDetailsDialog.resolution}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Visibility</p>
                      <p className="font-semibold">{screenDetailsDialog.visibility}</p>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Location</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{screenDetailsDialog.location}</p>
                        <p className="text-muted-foreground">{screenDetailsDialog.city}, {screenDetailsDialog.state} - {screenDetailsDialog.pincode}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-muted-foreground">Venue Category</p>
                        <p className="font-semibold">{screenDetailsDialog.venueCategory}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Display Format</p>
                        <p className="font-semibold">{screenDetailsDialog.displayFormat}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audience Demographics */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Audience Demographics</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Daily Footfall</p>
                      <p className="font-semibold">{screenDetailsDialog.avgDailyFootfall.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender Orientation</p>
                      <p className="font-semibold">{screenDetailsDialog.genderOrientation}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Income Level</p>
                      <p className="font-semibold">{screenDetailsDialog.incomeLevel}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">User Intent</p>
                      <p className="font-semibold">{screenDetailsDialog.userIntent ? screenDetailsDialog.userIntent.join(", ") : "N/A"}</p>
                    </div>
                  </div>
                  {screenDetailsDialog.detailedAgeGroups && screenDetailsDialog.detailedAgeGroups.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2">Age Groups</p>
                      <div className="flex flex-wrap gap-2">
                        {screenDetailsDialog.detailedAgeGroups.map((age) => (
                          <Badge key={age} variant="outline">{age}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {screenDetailsDialog.lifestyleTags && screenDetailsDialog.lifestyleTags.length > 0 && (
                    <div>
                      <p className="text-muted-foreground mb-2">Lifestyle Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {screenDetailsDialog.lifestyleTags.map((tag) => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Technical Specs */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Technical Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Playback Slots/Hour</p>
                      <p className="font-semibold">{screenDetailsDialog.playbackSlotsPerHour}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Dwell Time</p>
                      <p className="font-semibold">{screenDetailsDialog.avgDwellTime} minutes</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Time of Day Activity</p>
                      <p className="font-semibold">{screenDetailsDialog.timeOfDayActivity ? screenDetailsDialog.timeOfDayActivity.join(", ") : "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Operating Hours</p>
                      <p className="font-semibold">{screenDetailsDialog.operationalHours}</p>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Pricing</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Price Per Day</p>
                      <p className="font-semibold text-primary text-lg">
                        {screenDetailsDialog.isMultiScreen && screenDetailsDialog.numberOfScreens ? (
                          <>₹{screenDetailsDialog.pricePerDay.toLocaleString()} × {screenDetailsDialog.numberOfScreens} screens</>
                        ) : (
                          <>₹{screenDetailsDialog.pricePerDay.toLocaleString()}</>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Min Booking Days</p>
                      <p className="font-semibold">{screenDetailsDialog.minBookingDays} days</p>
                    </div>
                  </div>
                  {screenDetailsDialog.isMultiScreen && screenDetailsDialog.numberOfScreens && (
                    <Alert className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
                      <AlertDescription className="text-sm">
                        This is a multi-venue location with <strong>{screenDetailsDialog.numberOfScreens} screens</strong>. 
                        Total daily cost: <strong>₹{(screenDetailsDialog.pricePerDay * screenDetailsDialog.numberOfScreens).toLocaleString()}</strong>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
