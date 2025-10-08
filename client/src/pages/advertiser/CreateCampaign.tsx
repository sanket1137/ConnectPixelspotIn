import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { ArrowLeft, ArrowRight, Calendar, Target, DollarSign, Upload, Check, Monitor, Trash2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Screen } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SELECTED_SCREENS_KEY = "selectedScreenIds";

const createCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  objective: z.string().min(1, "Objective is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  budget: z.string().min(1, "Budget is required"),
});

type CreateCampaignForm = z.infer<typeof createCampaignSchema>;

const steps = [
  { id: 1, name: "Screens", icon: Monitor },
  { id: 2, name: "Details", icon: Target },
  { id: 3, name: "Duration", icon: Calendar },
  { id: 4, name: "Creative", icon: Upload },
];

export default function CreateCampaign() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedCreativeURL, setUploadedCreativeURL] = useState<string | null>(null);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);

  const { data: allScreens = [] } = useQuery<Screen[]>({
    queryKey: ["/api/screens"],
  });

  useEffect(() => {
    const saved = localStorage.getItem(SELECTED_SCREENS_KEY);
    if (saved) {
      setSelectedScreenIds(JSON.parse(saved));
    }
  }, []);

  const selectedScreens = allScreens.filter(s => selectedScreenIds.includes(s.id));

  const form = useForm<CreateCampaignForm>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      name: "",
      objective: "",
      startDate: "",
      endDate: "",
      budget: "",
    },
  });

  const createCampaignMutation = useMutation({
    mutationFn: async (data: CreateCampaignForm) => {
      // Validate all selected screens are available
      const missingScreens = selectedScreenIds.filter(id => !allScreens.find(s => s.id === id));
      if (missingScreens.length > 0) {
        throw new Error(`Some selected screens are no longer available. Please refresh your screen selection.`);
      }

      // First create the campaign
      const campaignResponse = await apiRequest("POST", "/api/advertiser/campaigns", {
        ...data,
        budget: parseInt(data.budget),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        creativeUrl: uploadedCreativeURL || null,
      });
      const campaign = await campaignResponse.json();

      // Then create bookings for each selected screen
      const bookingPromises = selectedScreenIds.map(screenId => {
        const screen = allScreens.find(s => s.id === screenId);
        if (!screen) {
          throw new Error(`Screen ${screenId} not found. Please refresh your selection.`);
        }

        // Calculate days - ensure at least 1 day is billed (inclusive date range)
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
      localStorage.removeItem(SELECTED_SCREENS_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setLocation("/advertiser/campaigns");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign. Please try again.",
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
        description: "Campaign creative has been uploaded successfully.",
      });
    }
  };

  const removeScreen = (screenId: string) => {
    const newIds = selectedScreenIds.filter(id => id !== screenId);
    setSelectedScreenIds(newIds);
    localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(newIds));
  };

  const onSubmit = (data: CreateCampaignForm) => {
    console.log(`onSubmit called at step ${currentStep}`, data);
    
    // Prevent submission if not on final step
    if (currentStep < steps.length) {
      console.log("Prevented submission - not on final step");
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

  const nextStep = async () => {
    console.log(`NextStep called, current step: ${currentStep}`);
    
    if (currentStep === 1 && selectedScreenIds.length === 0) {
      toast({
        title: "No Screens Selected",
        description: "Please select at least one screen from the Discover page.",
        variant: "destructive",
      });
      return;
    }

    // Validate current step fields before proceeding
    if (currentStep === 2) {
      const isValid = await form.trigger(["name", "objective", "budget"]);
      if (!isValid) {
        toast({
          title: "Incomplete Details",
          description: "Please fill in all campaign details before proceeding.",
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
          description: "Please select valid start and end dates.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate date range
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

    if (currentStep < steps.length) {
      console.log(`Moving to step ${currentStep + 1}`);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const progress = (currentStep / steps.length) * 100;

  const totalCost = selectedScreens.reduce((sum, screen) => {
    if (!form.watch("startDate") || !form.watch("endDate")) return sum;
    // Calculate days - ensure at least 1 day is billed (inclusive date range)
    const days = Math.max(1, Math.ceil(
      (new Date(form.watch("endDate")).getTime() - new Date(form.watch("startDate")).getTime()) / 
      (1000 * 60 * 60 * 24)
    ) + 1);
    return sum + (screen.pricePerDay * days);
  }, 0);

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => setLocation("/advertiser/discover")} data-testid="button-back">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Discover
        </Button>
        <h1 className="text-3xl font-bold text-foreground font-serif mt-4">Create Campaign</h1>
        <p className="text-muted-foreground mt-1">Set up your advertising campaign</p>
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
                  <span className="text-sm font-medium hidden sm:inline">{step.name}</span>
                </div>
              );
            })}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form 
              onSubmit={form.handleSubmit(onSubmit)} 
              className="space-y-6"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && currentStep < steps.length) {
                  e.preventDefault();
                }
              }}
            >
              {/* Step 1: Screens */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Selected Screens ({selectedScreens.length})</h2>
                  {selectedScreens.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No screens selected. Go to the <Button variant="ghost" className="p-0 h-auto underline" onClick={() => setLocation("/advertiser/discover")}>Discover Screens</Button> page to select screens for your campaign.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedScreens.map((screen) => (
                        <Card key={screen.id} data-testid={`card-selected-screen-${screen.id}`}>
                          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
                            <div className="flex-1">
                              <CardTitle className="text-base">{screen.name}</CardTitle>
                              <p className="text-sm text-muted-foreground mt-1">{screen.city}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeScreen(screen.id)}
                              data-testid={`button-remove-screen-${screen.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-medium">{screen.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-semibold text-primary">₹{screen.pricePerDay}/day</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Campaign Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
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
                        <FormLabel>Objective</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-objective">
                              <SelectValue placeholder="Select campaign objective" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="brand_awareness">Brand Awareness</SelectItem>
                            <SelectItem value="product_launch">Product Launch</SelectItem>
                            <SelectItem value="event_promotion">Event Promotion</SelectItem>
                            <SelectItem value="seasonal_campaign">Seasonal Campaign</SelectItem>
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
                        <FormLabel>Budget (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="50000" {...field} data-testid="input-budget" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 3: Duration */}
              {currentStep === 3 && (
                <div className="space-y-4">
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

                  {totalCost > 0 && (
                    <Alert>
                      <DollarSign className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Estimated Total Cost:</strong> ₹{totalCost.toLocaleString()}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Step 4: Creative Upload */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Upload Campaign Creative</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Upload your ad creative (image or video) for the campaign
                    </p>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={52428800}
                      allowedFileTypes={["image/*", "video/*"]}
                      onGetUploadParameters={handleGetUploadParameters}
                      onComplete={handleUploadComplete}
                      buttonVariant="outline"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadedCreativeURL ? "Change Creative" : "Upload Creative"}
                    </ObjectUploader>
                    {uploadedCreativeURL && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                        <Check className="h-4 w-4" />
                        Creative uploaded successfully
                      </div>
                    )}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Summary:</strong> You're about to create a campaign for {selectedScreens.length} screen(s). 
                      Booking requests will be sent to screen owners for approval.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Navigation Buttons */}
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
                    disabled={createCampaignMutation.isPending}
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
