import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, ArrowRight, Target, Users, Calendar, Filter, Monitor, Check, Trash2, DollarSign, MapPin, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Screen } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  objective: z.string().min(1, "Objective is required"),
  
  // Location targeting
  targetLocationType: z.string().min(1, "Location type is required"),
  targetCities: z.array(z.string()).optional(),
  targetState: z.string().optional(),
  targetPincodes: z.array(z.string()).optional(),
  
  // Demographics
  targetAgeGroups: z.array(z.string()).min(1, "Select at least one age group"),
  targetGender: z.string().min(1, "Select target gender"),
  targetAffluence: z.array(z.string()).min(1, "Select at least one affluence level"),
  targetOccupations: z.array(z.string()).min(1, "Select at least one occupation"),
  
  // Intent & Mood
  targetIntent: z.array(z.string()).min(1, "Select at least one intent"),
  targetMood: z.array(z.string()).min(1, "Select at least one mood"),
  
  // Duration
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  
  // Venue filters (optional)
  venueTypeFilters: z.array(z.string()).optional(),
});

type CreateCampaignForm = z.infer<typeof createCampaignSchema>;

const steps = [
  { id: 1, name: "Objective & Location", icon: Target },
  { id: 2, name: "Audience & Intent", icon: Users },
  { id: 3, name: "Duration", icon: Calendar },
  { id: 4, name: "Venue Filters", icon: Filter },
  { id: 5, name: "Recommended Screens", icon: Monitor },
];

const ageGroups = ["18-25", "25-40", "40-60", "60+"];
const genderOptions = ["male", "female", "all"];
const affluenceLevels = ["Premium", "Mid", "Budget"];
const occupations = ["Students", "Working Professionals", "Business Owners", "Homemakers"];
const intents = ["Shopping", "Commuting", "Dining", "Fitness", "Entertainment", "Work", "Education"];
const moods = ["Relaxed", "Rushed", "Social", "Focused", "Leisure"];
const venueTypes = ["Apartment", "Road Junction", "Highway", "Restaurant", "Cafe", "Shopping Complex", "Mall", "Corporate Park", "Airport", "Metro"];
const indianStates = ["Karnataka", "Maharashtra", "Delhi", "Tamil Nadu", "Gujarat", "Rajasthan", "West Bengal", "Uttar Pradesh", "Kerala", "Punjab"];
const indianCities = ["Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Kolkata", "Pune", "Ahmedabad", "Jaipur"];

export default function CreateCampaign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedCreativeURL, setUploadedCreativeURL] = useState<string | null>(null);
  const [recommendedScreens, setRecommendedScreens] = useState<Screen[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [pincodeInput, setPincodeInput] = useState("");
  const [cityInput, setCityInput] = useState("");

  const { data: allScreens = [] } = useQuery<Screen[]>({
    queryKey: ["/api/screens"],
  });

  const form = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      objective: "",
      targetLocationType: "",
      targetCities: [],
      targetState: "",
      targetPincodes: [],
      targetAgeGroups: [],
      targetGender: "",
      targetAffluence: [],
      targetOccupations: [],
      targetIntent: [],
      targetMood: [],
      startDate: "",
      endDate: "",
      venueTypeFilters: [],
    },
  });

  // AI-driven screen recommendation logic
  const calculateRecommendedScreens = () => {
    const formData = form.getValues();
    
    let filtered = allScreens.filter(s => s.status === "active");

    // Location filtering
    if (formData.targetLocationType === "city" && formData.targetCities && formData.targetCities.length > 0) {
      filtered = filtered.filter(s => formData.targetCities?.includes(s.city));
    } else if (formData.targetLocationType === "state" && formData.targetState) {
      // Filter by state (you'd need state info in screens - for now we'll match by city)
      filtered = filtered.filter(s => s.city.toLowerCase().includes((formData.targetState || '').toLowerCase()));
    } else if (formData.targetLocationType === "pincodes" && formData.targetPincodes && formData.targetPincodes.length > 0) {
      filtered = filtered.filter(s => formData.targetPincodes?.includes(s.pincode));
    }
    // If "india" is selected, all screens are eligible

    // Demographics filtering
    if (formData.targetAgeGroups && formData.targetAgeGroups.length > 0) {
      filtered = filtered.filter(s => 
        s.primaryAgeGroups && s.primaryAgeGroups.some(age => formData.targetAgeGroups.includes(age))
      );
    }

    if (formData.targetGender && formData.targetGender !== "all" && filtered.length > 0) {
      filtered = filtered.filter(s => {
        if (!s.genderSplit) return true;
        const split = s.genderSplit as { male: number; female: number };
        return formData.targetGender === "male" ? split.male >= 40 : split.female >= 40;
      });
    }

    if (formData.targetAffluence && formData.targetAffluence.length > 0) {
      filtered = filtered.filter(s => formData.targetAffluence.includes(s.affluenceLevel));
    }

    if (formData.targetOccupations && formData.targetOccupations.length > 0) {
      filtered = filtered.filter(s => 
        s.occupationMix && s.occupationMix.some(occ => formData.targetOccupations.includes(occ))
      );
    }

    // Intent filtering (match with userIntent)
    // Include screens without userIntent data (backward compatibility)
    if (formData.targetIntent && formData.targetIntent.length > 0) {
      filtered = filtered.filter(s => 
        !s.userIntent || s.userIntent.length === 0 || s.userIntent.some(intent => formData.targetIntent.includes(intent))
      );
    }

    // Mood filtering (match with userMood)
    // Include screens without userMood data (backward compatibility)
    if (formData.targetMood && formData.targetMood.length > 0) {
      filtered = filtered.filter(s => 
        !s.userMood || s.userMood.length === 0 || s.userMood.some(mood => formData.targetMood.includes(mood))
      );
    }

    // Venue type filtering (optional)
    if (formData.venueTypeFilters && formData.venueTypeFilters.length > 0) {
      filtered = filtered.filter(s => 
        formData.venueTypeFilters?.some(venue => 
          s.venueCategory.toLowerCase().includes(venue.toLowerCase())
        )
      );
    }

    setRecommendedScreens(filtered);
    setSelectedScreenIds(filtered.map(s => s.id)); // Auto-select all recommended
  };

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      if (selectedScreenIds.length === 0) {
        throw new Error("No screens selected for the campaign");
      }

      // First create the campaign
      const campaignResponse = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: data.name,
        objective: data.objective,
        targetLocationType: data.targetLocationType,
        targetCities: data.targetCities || [],
        targetState: data.targetState || null,
        targetPincodes: data.targetPincodes || [],
        targetAgeGroups: data.targetAgeGroups,
        targetGender: data.targetGender,
        targetAffluence: data.targetAffluence,
        targetOccupations: data.targetOccupations,
        targetIntent: data.targetIntent,
        targetMood: data.targetMood,
        venueTypeFilters: data.venueTypeFilters || [],
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        budget: calculateTotalBudget(),
        estimatedBudget: calculateTotalBudget(),
        creativeUrl: uploadedCreativeURL || null,
      });
      const campaign = await campaignResponse.json();

      // Then create bookings for each selected screen
      const bookingPromises = selectedScreenIds.map(screenId => {
        const screen = allScreens.find(s => s.id === screenId);
        if (!screen) throw new Error(`Screen ${screenId} not found`);

        const days = Math.max(1, Math.ceil(
          (new Date(data.endDate).getTime() - new Date(data.startDate).getTime()) / 
          (1000 * 60 * 60 * 24)
        ) + 1);
        const price = screen.pricePerDay * days;

        return apiRequest("POST", "/api/advertiser/bookings", {
          screenId,
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
        title: "Campaign Created",
        description: `Campaign created with ${selectedScreenIds.length} booking requests.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setLocation("/advertiser/campaigns");
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

  const calculateTotalBudget = () => {
    const startDate = form.watch("startDate");
    const endDate = form.watch("endDate");
    
    if (!startDate || !endDate) return 0;

    const days = Math.max(1, Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / 
      (1000 * 60 * 60 * 24)
    ) + 1);

    return selectedScreenIds.reduce((sum, screenId) => {
      const screen = allScreens.find(s => s.id === screenId);
      return sum + (screen ? screen.pricePerDay * days : 0);
    }, 0);
  };

  const removeScreen = (screenId: string) => {
    setSelectedScreenIds(prev => prev.filter(id => id !== screenId));
  };

  const onSubmit = (data: CreateCampaignForm) => {
    if (currentStep < steps.length) return;
    
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

  const nextStep = async () => {
    // Validate current step
    if (currentStep === 1) {
      const isValid = await form.trigger(["name", "objective", "targetLocationType"]);
      if (!isValid) {
        toast({
          title: "Incomplete Information",
          description: "Please fill in all required fields.",
          variant: "destructive",
        });
        return;
      }

      // Check location-specific fields
      const locationType = form.getValues("targetLocationType");
      if (locationType === "city" && (!form.getValues("targetCities") || form.getValues("targetCities")?.length === 0)) {
        toast({
          title: "No Cities Selected",
          description: "Please select at least one city.",
          variant: "destructive",
        });
        return;
      }
      if (locationType === "state" && !form.getValues("targetState")) {
        toast({
          title: "No State Selected",
          description: "Please select a state.",
          variant: "destructive",
        });
        return;
      }
      if (locationType === "pincodes" && (!form.getValues("targetPincodes") || form.getValues("targetPincodes")?.length === 0)) {
        toast({
          title: "No Pincodes Added",
          description: "Please add at least one pincode.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 2) {
      const isValid = await form.trigger([
        "targetAgeGroups", "targetGender", "targetAffluence", 
        "targetOccupations", "targetIntent", "targetMood"
      ]);
      if (!isValid) {
        toast({
          title: "Incomplete Targeting",
          description: "Please complete all targeting criteria.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 3) {
      const isValid = await form.trigger(["startDate", "endDate"]);
      if (!isValid) {
        toast({
          title: "Invalid Dates",
          description: "Please select valid dates.",
          variant: "destructive",
        });
        return;
      }

      const startDate = new Date(form.getValues("startDate"));
      const endDate = new Date(form.getValues("endDate"));
      if (endDate < startDate) {
        toast({
          title: "Invalid Date Range",
          description: "End date must be after start date.",
          variant: "destructive",
        });
        return;
      }
    }

    // Calculate recommendations when moving from step 4 to 5
    if (currentStep === 4) {
      calculateRecommendedScreens();
    }

    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / steps.length) * 100;
  const totalBudget = calculateTotalBudget();

  const addPincode = () => {
    if (pincodeInput.trim() && /^\d{6}$/.test(pincodeInput)) {
      const current = form.getValues("targetPincodes") || [];
      if (!current.includes(pincodeInput)) {
        form.setValue("targetPincodes", [...current, pincodeInput]);
        setPincodeInput("");
      }
    } else {
      toast({
        title: "Invalid Pincode",
        description: "Please enter a valid 6-digit pincode.",
        variant: "destructive",
      });
    }
  };

  const removePincode = (pincode: string) => {
    const current = form.getValues("targetPincodes") || [];
    form.setValue("targetPincodes", current.filter(p => p !== pincode));
  };

  const addCity = () => {
    if (cityInput.trim()) {
      const current = form.getValues("targetCities") || [];
      if (!current.includes(cityInput)) {
        form.setValue("targetCities", [...current, cityInput]);
        setCityInput("");
      }
    }
  };

  const removeCity = (city: string) => {
    const current = form.getValues("targetCities") || [];
    form.setValue("targetCities", current.filter(c => c !== city));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => setLocation("/advertiser")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-foreground font-serif mt-4">Create AI-Driven Campaign</h1>
        <p className="text-muted-foreground mt-1">Let AI recommend the best screens for your target audience</p>
      </div>

      <Card>
        <CardHeader>
          <Progress value={progress} className="mb-4" />
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Step 1: Objective & Location */}
              {currentStep === 1 && (
                <div className="space-y-4">
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
                              <SelectValue placeholder="Select objective" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                            <SelectItem value="product_launch">Product Launch</SelectItem>
                            <SelectItem value="event_promotion">Event Promotion</SelectItem>
                            <SelectItem value="seasonal_campaign">Seasonal Campaign</SelectItem>
                            <SelectItem value="local_promotion">Local Business Promotion</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator className="my-6" />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Target Location</h3>
                    <FormField
                      control={form.control}
                      name="targetLocationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-location-type">
                                <SelectValue placeholder="Select location targeting" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="city">Specific Cities</SelectItem>
                              <SelectItem value="state">Specific State</SelectItem>
                              <SelectItem value="india">All India</SelectItem>
                              <SelectItem value="pincodes">Specific Pincodes</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {form.watch("targetLocationType") === "city" && (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2">
                          <Select value={cityInput} onValueChange={setCityInput}>
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Select a city" />
                            </SelectTrigger>
                            <SelectContent>
                              {indianCities.map(city => (
                                <SelectItem key={city} value={city}>{city}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" onClick={addCity} variant="outline">
                            Add City
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(form.watch("targetCities") || []).map(city => (
                            <Badge key={city} variant="secondary" className="gap-2">
                              <MapPin className="h-3 w-3" />
                              {city}
                              <button
                                type="button"
                                onClick={() => removeCity(city)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.watch("targetLocationType") === "state" && (
                      <div className="mt-4">
                        <FormField
                          control={form.control}
                          name="targetState"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select State</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a state" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {indianStates.map(state => (
                                    <SelectItem key={state} value={state}>{state}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {form.watch("targetLocationType") === "pincodes" && (
                      <div className="mt-4 space-y-3">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter 6-digit pincode"
                            value={pincodeInput}
                            onChange={(e) => setPincodeInput(e.target.value)}
                            maxLength={6}
                          />
                          <Button type="button" onClick={addPincode} variant="outline">
                            Add Pincode
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(form.watch("targetPincodes") || []).map(pincode => (
                            <Badge key={pincode} variant="secondary" className="gap-2">
                              {pincode}
                              <button
                                type="button"
                                onClick={() => removePincode(pincode)}
                                className="ml-1 hover:text-destructive"
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {form.watch("targetLocationType") === "india" && (
                      <Alert className="mt-4">
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription>
                          All screens across India will be considered for recommendations.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Audience & Intent */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Target Demographics</h3>
                    
                    <FormField
                      control={form.control}
                      name="targetAgeGroups"
                      render={() => (
                        <FormItem>
                          <FormLabel>Age Groups</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            {ageGroups.map((age) => (
                              <FormField
                                key={age}
                                control={form.control}
                                name="targetAgeGroups"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(age)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            checked
                                              ? [...current, age]
                                              : current.filter((val) => val !== age)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">{age}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetGender"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="male">Male Dominated</SelectItem>
                              <SelectItem value="female">Female Dominated</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetAffluence"
                      render={() => (
                        <FormItem className="mt-4">
                          <FormLabel>Affluence Level</FormLabel>
                          <div className="grid grid-cols-3 gap-3">
                            {affluenceLevels.map((level) => (
                              <FormField
                                key={level}
                                control={form.control}
                                name="targetAffluence"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(level)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            checked
                                              ? [...current, level]
                                              : current.filter((val) => val !== level)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">{level}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetOccupations"
                      render={() => (
                        <FormItem className="mt-4">
                          <FormLabel>Occupation Mix</FormLabel>
                          <div className="grid grid-cols-2 gap-3">
                            {occupations.map((occupation) => (
                              <FormField
                                key={occupation}
                                control={form.control}
                                name="targetOccupations"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(occupation)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            checked
                                              ? [...current, occupation]
                                              : current.filter((val) => val !== occupation)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">{occupation}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">User Intent & Mood</h3>
                    
                    <FormField
                      control={form.control}
                      name="targetIntent"
                      render={() => (
                        <FormItem>
                          <FormLabel>User Intent</FormLabel>
                          <FormDescription>What are users doing at these locations?</FormDescription>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            {intents.map((intent) => (
                              <FormField
                                key={intent}
                                control={form.control}
                                name="targetIntent"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(intent)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            checked
                                              ? [...current, intent]
                                              : current.filter((val) => val !== intent)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">{intent}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="targetMood"
                      render={() => (
                        <FormItem className="mt-4">
                          <FormLabel>User Mood</FormLabel>
                          <FormDescription>What's the typical mood/state of mind?</FormDescription>
                          <div className="grid grid-cols-2 gap-3 mt-2">
                            {moods.map((mood) => (
                              <FormField
                                key={mood}
                                control={form.control}
                                name="targetMood"
                                render={({ field }) => (
                                  <FormItem className="flex items-center gap-2 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(mood)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          field.onChange(
                                            checked
                                              ? [...current, mood]
                                              : current.filter((val) => val !== mood)
                                          );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">{mood}</FormLabel>
                                  </FormItem>
                                )}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Duration */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Campaign Duration</h3>
                  
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 4: Venue Filters (Optional) */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Venue Type Filters (Optional)</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Narrow down to specific venue types. Leave unchecked to consider all venues.
                    </p>
                  </div>

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
                                <FormItem className="flex items-center gap-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(venue)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        field.onChange(
                                          checked
                                            ? [...current, venue]
                                            : current.filter((val) => val !== venue)
                                        );
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">{venue}</FormLabel>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 5: Recommended Screens */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">AI-Recommended Screens</h3>
                      <p className="text-sm text-muted-foreground">
                        Based on your targeting criteria, we found {recommendedScreens.length} matching screens
                      </p>
                    </div>
                    {totalBudget > 0 && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Estimated Budget</p>
                        <p className="text-2xl font-bold text-primary">₹{totalBudget.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {recommendedScreens.length === 0 ? (
                    <Alert>
                      <AlertDescription>
                        No screens match your criteria. Try adjusting your targeting parameters.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                      {recommendedScreens.map((screen) => {
                        const isSelected = selectedScreenIds.includes(screen.id);
                        const days = form.watch("startDate") && form.watch("endDate") 
                          ? Math.max(1, Math.ceil(
                              (new Date(form.watch("endDate")).getTime() - new Date(form.watch("startDate")).getTime()) / 
                              (1000 * 60 * 60 * 24)
                            ) + 1)
                          : 0;
                        const screenCost = screen.pricePerDay * days;

                        return (
                          <Card 
                            key={screen.id} 
                            className={`${isSelected ? 'border-primary' : ''}`}
                            data-testid={`card-recommended-screen-${screen.id}`}
                          >
                            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                              <div className="flex-1">
                                <CardTitle className="text-base">{screen.name}</CardTitle>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {screen.venueName} • {screen.city}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant={isSelected ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => {
                                  if (isSelected) {
                                    removeScreen(screen.id);
                                  } else {
                                    setSelectedScreenIds(prev => [...prev, screen.id]);
                                  }
                                }}
                                data-testid={`button-toggle-screen-${screen.id}`}
                              >
                                {isSelected ? (
                                  <>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Remove
                                  </>
                                ) : (
                                  <>
                                    <Check className="h-3 w-3 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground text-xs">Venue Category</p>
                                  <p className="font-medium">{screen.venueCategory}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Affluence</p>
                                  <p className="font-medium">{screen.affluenceLevel}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Footfall/Day</p>
                                  <p className="font-medium">{screen.avgDailyFootfall.toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Cost for {days} days</p>
                                  <p className="font-semibold text-primary">₹{screenCost.toLocaleString()}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold">Upload Campaign Creative</h3>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={52428800}
                      allowedFileTypes={["image/*", "video/*"]}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonVariant="outline"
                    >
                      {uploadedCreativeURL ? "Change Creative" : "Upload Creative"}
                    </ObjectUploader>
                    {uploadedCreativeURL && (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        Creative uploaded successfully
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1 || createCampaignMutation.isPending}
                  data-testid="button-previous"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                {currentStep < steps.length ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={createCampaignMutation.isPending}
                    data-testid="button-next"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createCampaignMutation.isPending || selectedScreenIds.length === 0}
                    data-testid="button-submit"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                    <Check className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
