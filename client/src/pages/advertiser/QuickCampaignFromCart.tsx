import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, ArrowRight, Target, Calendar, Check, Monitor } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Screen } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const SELECTED_SCREENS_KEY = "selectedScreenIds";

const quickCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  objective: z.string().min(1, "Objective is required"),
  startDate: z.string().min(1, "Start date is required").refine((date) => {
    const selectedDate = new Date(date);
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return selectedDate >= tomorrow;
  }, "Start date must be at least tomorrow"),
  durationMode: z.enum(["auto", "custom"]),
  customDays: z.number().min(1).optional(),
  creativeUrl: z.string().url("Please enter a valid URL").min(1, "Creative link is required"),
});

type QuickCampaignForm = z.infer<typeof quickCampaignSchema>;

const objectives = [
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "product_launch", label: "Product Launch" },
  { value: "event_promotion", label: "Event Promotion" },
  { value: "seasonal_campaign", label: "Seasonal Campaign" },
  { value: "local_promotion", label: "Local Promotion" },
];

const steps = [
  { id: 1, name: "Campaign Details", icon: Target },
  { id: 2, name: "Duration", icon: Calendar },
  { id: 3, name: "Review & Creative", icon: Check },
];

export default function QuickCampaignFromCart() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedScreens, setSelectedScreens] = useState<Screen[]>([]);
  const [campaignCreated, setCampaignCreated] = useState(false);

  const form = useForm<QuickCampaignForm>({
    resolver: zodResolver(quickCampaignSchema),
    defaultValues: {
      name: "",
      objective: "",
      startDate: (() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      })(),
      durationMode: "custom",
      customDays: 7,
      creativeUrl: "",
    },
  });

  const watchDurationMode = form.watch("durationMode");
  const watchCustomDays = form.watch("customDays");

  // Load screens from localStorage and fetch details
  useEffect(() => {
    const loadScreens = async () => {
      const saved = localStorage.getItem(SELECTED_SCREENS_KEY);
      if (!saved) {
        toast({
          title: "No Screens Selected",
          description: "Please select screens from Find Screens page first.",
          variant: "destructive",
        });
        setLocation("/advertiser/discover");
        return;
      }

      try {
        const screenIds = JSON.parse(saved);
        if (!Array.isArray(screenIds) || screenIds.length === 0) {
          toast({
            title: "No Screens Selected",
            description: "Please select screens from Find Screens page first.",
            variant: "destructive",
          });
          setLocation("/advertiser/discover");
          return;
        }

        // Fetch screen details
        const idsParam = screenIds.join(',');
        const response = await apiRequest("GET", `/api/screens/by-ids?ids=${idsParam}`);
        const screens = await response.json();
        
        setSelectedScreens(screens);
        console.log("✅ Loaded", screens.length, "screens from cart");
      } catch (error) {
        console.error("❌ Error loading screens:", error);
        toast({
          title: "Error",
          description: "Failed to load selected screens.",
          variant: "destructive",
        });
        setLocation("/advertiser/discover");
      }
    };

    loadScreens();
  }, [setLocation, toast]);

  // Calculate total budget based on duration
  const duration = watchDurationMode === "auto" ? 7 : (watchCustomDays || 7);
  const totalBudget = selectedScreens.reduce((sum, screen) => {
    const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
    return sum + (screen.pricePerDay * screenMultiplier * duration);
  }, 0);

  const createCampaignMutation = useMutation({
    mutationFn: async (data: QuickCampaignForm) => {
      const finalDuration = data.durationMode === "auto" ? 7 : data.customDays!;
      
      // Calculate end date
      const startDate = new Date(data.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + finalDuration);

      // Create campaign
      const campaignResponse = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: data.name,
        objective: data.objective,
        targetArea: {
          type: "india" as const,
        },
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
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: totalBudget,
        estimatedBudget: totalBudget,
        creativeUrl: data.creativeUrl,
      });
      
      const campaign = await campaignResponse.json();

      // Create bookings for each screen
      const bookingPromises = selectedScreens.map(screen => {
        const screenMultiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
        const price = screen.pricePerDay * screenMultiplier * finalDuration;

        return apiRequest("POST", "/api/advertiser/bookings", {
          screenId: screen.id,
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
        title: "Campaign Created Successfully!",
        description: `Campaign created with ${selectedScreens.length} booking requests.`,
      });
      setCampaignCreated(true);
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      
      // Clear localStorage
      localStorage.removeItem(SELECTED_SCREENS_KEY);
      
      // Redirect after delay
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

  const onSubmit = (data: QuickCampaignForm) => {
    if (currentStep !== 3) return;
    createCampaignMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / 3) * 100;

  if (selectedScreens.length === 0) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Loading screens...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => setLocation("/advertiser/discover")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Find Screens
        </Button>
        <h1 className="text-3xl font-bold text-foreground font-serif mt-4">Quick Campaign</h1>
        <p className="text-muted-foreground mt-1">Create a campaign for your selected screens in 3 simple steps</p>
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
                  className={`flex flex-col items-center flex-1 ${
                    currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs mt-2 text-center">{step.name}</span>
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Step 1: Campaign Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold mb-1">Campaign Details</h2>
                    <p className="text-sm text-muted-foreground">Set up your campaign basics</p>
                  </div>

                  <Alert>
                    <Monitor className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{selectedScreens.length} screen{selectedScreens.length > 1 ? 's' : ''} selected</strong> from your cart
                    </AlertDescription>
                  </Alert>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Summer Sale 2024" {...field} data-testid="input-campaign-name" />
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
                            {objectives.map((obj) => (
                              <SelectItem key={obj.value} value={obj.value}>
                                {obj.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormDescription>Campaign must start at least tomorrow</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 2: Duration */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold mb-1">Campaign Duration</h2>
                    <p className="text-sm text-muted-foreground">How long should your campaign run?</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="durationMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration Mode</FormLabel>
                        <FormControl>
                          <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-3">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="auto" id="auto" />
                              <Label htmlFor="auto" className="font-normal">
                                Auto (7 days recommended)
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="custom" id="custom" />
                              <Label htmlFor="custom" className="font-normal">
                                Custom duration
                              </Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                              data-testid="input-custom-days"
                            />
                          </FormControl>
                          <FormDescription>Enter campaign duration in days</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Duration:</span>
                          <span className="font-semibold">{duration} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Selected Screens:</span>
                          <span className="font-semibold">{selectedScreens.length}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-lg">
                          <span className="font-semibold">Total Budget:</span>
                          <span className="font-bold text-primary">₹{totalBudget.toLocaleString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Step 3: Review & Creative */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-semibold mb-1">Review & Upload Creative</h2>
                    <p className="text-sm text-muted-foreground">Final step - upload your creative and confirm</p>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Campaign Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-semibold">{form.watch("name")}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Objective:</span>
                        <span className="font-semibold">{objectives.find(o => o.value === form.watch("objective"))?.label}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Start Date:</span>
                        <span className="font-semibold">{new Date(form.watch("startDate")).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-semibold">{duration} days</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg">
                        <span className="font-semibold">Total Budget:</span>
                        <span className="font-bold text-primary">₹{totalBudget.toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Selected Screens ({selectedScreens.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedScreens.map((screen) => (
                          <div key={screen.id} className="flex items-center justify-between p-3 rounded-md bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium truncate">{screen.name}</p>
                                {screen.isMultiScreen && screen.numberOfScreens && (
                                  <Badge variant="default" className="text-xs bg-purple-600">
                                    {screen.numberOfScreens}x
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{screen.city}</p>
                              <p className="text-xs font-semibold text-primary mt-1">
                                ₹{(screen.pricePerDay * (screen.numberOfScreens || 1) * duration).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <FormField
                    control={form.control}
                    name="creativeUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Creative URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/creative.jpg" 
                            {...field} 
                            data-testid="input-creative-url" 
                          />
                        </FormControl>
                        <FormDescription>Upload your creative to a hosting service and paste the URL here</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("creativeUrl") && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Creative Preview</p>
                      <div className="border rounded-lg overflow-hidden">
                        <img 
                          src={form.watch("creativeUrl")} 
                          alt="Campaign creative" 
                          className="w-full h-auto max-h-96 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
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

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    data-testid="button-next"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={createCampaignMutation.isPending || campaignCreated}
                    data-testid="button-create-campaign"
                  >
                    {createCampaignMutation.isPending ? "Creating..." : campaignCreated ? "Created!" : "Create Campaign"}
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
