import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
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
import { ArrowLeft, MapPin, Upload, Check, Users, DollarSign, Monitor, Crosshair } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { Screen } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

const editScreenSchema = z.object({
  // Section 1 - Screen Identity
  name: z.string().min(3, "Screen name must be at least 3 characters"),
  category: z.string().min(1, "Screen category is required"),
  displayFormat: z.string().min(1, "Display format is required"),
  resolution: z.string().min(1, "Resolution is required"),
  durationPerSlot: z.string().min(1, "Duration per slot is required"),
  
  // Section 2 - Location & Context
  venueName: z.string().min(3, "Venue name is required"),
  location: z.string().min(3, "Address is required"),
  city: z.string().min(2, "City is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  venueCategory: z.string().min(1, "Venue category is required"),
  avgDailyFootfall: z.string().min(1, "Average daily footfall is required"),
  trafficType: z.string().min(1, "Traffic type is required"),
  timeOfDayActivity: z.array(z.string()).min(1, "Select at least one time slot"),
  environmentType: z.string().min(1, "Environment type is required"),
  nearbyLandmarks: z.string().optional(),
  
  // Section 3 - Audience Demographics
  primaryAgeGroups: z.array(z.string()).min(1, "Select at least one age group"),
  genderMale: z.number().min(0).max(100),
  genderFemale: z.number().min(0).max(100),
  affluenceLevel: z.string().min(1, "Affluence level is required"),
  occupationMix: z.array(z.string()).min(1, "Select at least one occupation"),
  avgDwellTime: z.string().min(1, "Average dwell time is required"),
  interestSegments: z.string().optional(),
  
  // Commercial & Campaign Data
  isMultiScreen: z.boolean(),
  numberOfScreens: z.string().optional(),
  pricePerDay: z.string().min(1, "Price per day is required"),
  minBookingDays: z.string().min(1, "Minimum booking days required"),
  playbackSlotsPerHour: z.string().min(1, "Playback slots per hour is required"),
  contentTypesSupported: z.array(z.string()).min(1, "Select at least one content type"),
  
  // Legacy fields (auto-populated from other fields)
  type: z.string().optional(),
  size: z.string().optional(),
  operationalHours: z.string().optional(),
}).refine((data) => {
  if (data.isMultiScreen && !data.numberOfScreens) {
    return false;
  }
  return true;
}, {
  message: "Number of screens is required when multi-screen is enabled",
  path: ["numberOfScreens"],
});

type EditScreenForm = z.infer<typeof editScreenSchema>;

export default function EditScreen() {
  const [, params] = useRoute("/owner/screens/edit/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImageURL, setUploadedImageURL] = useState<string | null>(null);

  const screenId = params?.id;

  const { data: screen, isLoading } = useQuery<Screen>({
    queryKey: [`/api/owner/screens/${screenId}`],
    enabled: !!screenId,
  });

  const form = useForm<EditScreenForm>({
    resolver: zodResolver(editScreenSchema),
    defaultValues: {
      name: "",
      category: "",
      displayFormat: "",
      resolution: "",
      durationPerSlot: "",
      venueName: "",
      location: "",
      city: "",
      pincode: "",
      latitude: "",
      longitude: "",
      venueCategory: "",
      avgDailyFootfall: "",
      trafficType: "",
      timeOfDayActivity: [],
      environmentType: "",
      nearbyLandmarks: "",
      primaryAgeGroups: [],
      genderMale: 50,
      genderFemale: 50,
      affluenceLevel: "",
      occupationMix: [],
      avgDwellTime: "",
      interestSegments: "",
      isMultiScreen: false,
      numberOfScreens: "",
      pricePerDay: "",
      minBookingDays: "1",
      playbackSlotsPerHour: "",
      contentTypesSupported: [],
      type: "",
      size: "",
      operationalHours: "",
    },
  });

  useEffect(() => {
    if (screen) {
      form.reset({
        name: screen.name,
        category: screen.category || screen.type || "",
        displayFormat: screen.displayFormat || "",
        resolution: screen.resolution || "",
        durationPerSlot: screen.durationPerSlot?.toString() || "",
        venueName: screen.venueName || "",
        location: screen.location,
        city: screen.city,
        pincode: screen.pincode,
        latitude: screen.latitude?.toString() || "",
        longitude: screen.longitude?.toString() || "",
        venueCategory: screen.venueCategory || "",
        avgDailyFootfall: screen.avgDailyFootfall?.toString() || "",
        trafficType: screen.trafficType || "",
        timeOfDayActivity: screen.timeOfDayActivity || [],
        environmentType: screen.environmentType || "",
        nearbyLandmarks: screen.nearbyLandmarks?.join(", ") || "",
        primaryAgeGroups: screen.primaryAgeGroups || [],
        genderMale: screen.genderSplit?.male || 50,
        genderFemale: screen.genderSplit?.female || 50,
        affluenceLevel: screen.affluenceLevel || "",
        occupationMix: screen.occupationMix || [],
        avgDwellTime: screen.avgDwellTime?.toString() || "",
        interestSegments: screen.interestSegments?.join(", ") || "",
        isMultiScreen: screen.isMultiScreen || false,
        numberOfScreens: screen.numberOfScreens?.toString() || "",
        pricePerDay: screen.pricePerDay?.toString() || "",
        minBookingDays: screen.minBookingDays?.toString() || "1",
        playbackSlotsPerHour: screen.playbackSlotsPerHour?.toString() || "",
        contentTypesSupported: screen.contentTypesSupported || [],
      });
      
      if (screen.images && screen.images.length > 0) {
        setUploadedImageURL(screen.images[0]);
      }
    }
  }, [screen, form]);

  const updateScreenMutation = useMutation({
    mutationFn: async (data: EditScreenForm) => {
      const payload = {
        ...data,
        pricePerDay: parseInt(data.pricePerDay),
        minBookingDays: parseInt(data.minBookingDays),
        durationPerSlot: parseInt(data.durationPerSlot),
        avgDailyFootfall: parseInt(data.avgDailyFootfall),
        avgDwellTime: parseInt(data.avgDwellTime),
        playbackSlotsPerHour: parseInt(data.playbackSlotsPerHour),
        numberOfScreens: data.numberOfScreens && data.numberOfScreens.trim() ? parseInt(data.numberOfScreens) : null,
        genderSplit: { male: data.genderMale, female: data.genderFemale },
        nearbyLandmarks: data.nearbyLandmarks ? data.nearbyLandmarks.split(",").map(l => l.trim()).filter(l => l) : [],
        interestSegments: data.interestSegments ? data.interestSegments.split(",").map(s => s.trim()).filter(s => s) : [],
        images: uploadedImageURL ? [uploadedImageURL] : (screen?.images || []),
        type: data.category,
        size: `${data.resolution}`,
        operationalHours: JSON.stringify({ start: "08:00", end: "22:00" }),
      };
      console.log("Sending update payload:", payload);
      return apiRequest("PATCH", `/api/owner/screens/${screenId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/screens"] });
      queryClient.invalidateQueries({ queryKey: [`/api/owner/screens/${screenId}`] });
      toast({
        title: "Screen Updated",
        description: "Your screen has been updated successfully",
      });
      setLocation("/owner/screens");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update screen",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditScreenForm) => {
    console.log("Form submitted with data:", data);
    updateScreenMutation.mutate(data);
  };

  const handleFormError = (errors: any) => {
    console.log("Form validation errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check all required fields and fix any errors.",
      variant: "destructive",
    });
  };

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
        entityType: "screen",
      });
      const data = await response.json();
      setUploadedImageURL(data.objectPath);

      toast({
        title: "Image Uploaded",
        description: "Screen image uploaded successfully",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="p-8">
        <p>Screen not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setLocation("/owner/screens")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-4xl font-bold text-foreground font-serif">Edit Screen</h1>
            <p className="text-muted-foreground">Update your screen information</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit, handleFormError)} className="space-y-6">
            
            {/* Section 1 - Screen Identity */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  <CardTitle>Screen Identity</CardTitle>
                </div>
                <CardDescription>Basic technical specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screen Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Phoenix Mall - Food Court Display 1" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screen Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Digital Display">Digital Display</SelectItem>
                            <SelectItem value="LED Video Wall">LED Video Wall</SelectItem>
                            <SelectItem value="Kiosk">Kiosk</SelectItem>
                            <SelectItem value="Mall LED">Mall LED</SelectItem>
                            <SelectItem value="Lift Display">Lift Display</SelectItem>
                            <SelectItem value="Transit Display">Transit Display</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="displayFormat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Format *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-display-format">
                              <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Portrait">Portrait</SelectItem>
                            <SelectItem value="Landscape">Landscape</SelectItem>
                            <SelectItem value="Square">Square</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="resolution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resolution *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 1920x1080" {...field} data-testid="input-resolution" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationPerSlot"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration Per Slot (seconds) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="10" {...field} data-testid="input-duration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Section 2 - Location & Context */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <CardTitle>Location & Context</CardTitle>
                </div>
                <CardDescription>Venue details and location information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="venueName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Phoenix Mall – Food Court" {...field} data-testid="input-venue-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Full address" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="City" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode *</FormLabel>
                        <FormControl>
                          <Input placeholder="560001" {...field} data-testid="input-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude *</FormLabel>
                        <FormControl>
                          <Input placeholder="12.9716" {...field} data-testid="input-latitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude *</FormLabel>
                        <FormControl>
                          <Input placeholder="77.5946" {...field} data-testid="input-longitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="venueCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue Category *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-venue-category">
                              <SelectValue placeholder="Select venue type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Café">Café</SelectItem>
                            <SelectItem value="Mall">Mall</SelectItem>
                            <SelectItem value="Apartment">Apartment</SelectItem>
                            <SelectItem value="Gym">Gym</SelectItem>
                            <SelectItem value="Co-working">Co-working</SelectItem>
                            <SelectItem value="Airport">Airport</SelectItem>
                            <SelectItem value="Metro">Metro</SelectItem>
                            <SelectItem value="Salon">Salon</SelectItem>
                            <SelectItem value="Cinema">Cinema</SelectItem>
                            <SelectItem value="Hospital">Hospital</SelectItem>
                            <SelectItem value="College">College</SelectItem>
                            <SelectItem value="Corporate Park">Corporate Park</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avgDailyFootfall"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avg Daily Footfall *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} data-testid="input-footfall" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="trafficType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Traffic Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-traffic-type">
                              <SelectValue placeholder="Select traffic type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pedestrian">Pedestrian</SelectItem>
                            <SelectItem value="Seated Audience">Seated Audience</SelectItem>
                            <SelectItem value="Transit">Transit</SelectItem>
                            <SelectItem value="Mixed">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="environmentType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Environment Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-environment">
                              <SelectValue placeholder="Select environment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Indoor">Indoor</SelectItem>
                            <SelectItem value="Semi-Outdoor">Semi-Outdoor</SelectItem>
                            <SelectItem value="Outdoor Digital">Outdoor Digital</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="timeOfDayActivity"
                  render={() => (
                    <FormItem>
                      <FormLabel>Time of Day Activity *</FormLabel>
                      <FormDescription>Select peak activity times</FormDescription>
                      <div className="grid grid-cols-2 gap-4">
                        {["Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"].map((time) => (
                          <FormField
                            key={time}
                            control={form.control}
                            name="timeOfDayActivity"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(time)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, time]
                                        : current.filter((v) => v !== time);
                                      field.onChange(updated);
                                    }}
                                    data-testid={`checkbox-time-${time.toLowerCase().replace(/\s/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0 font-normal">{time}</FormLabel>
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
                  name="nearbyLandmarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nearby Landmarks (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Comma-separated: MG Road Metro, Commercial Street" {...field} data-testid="input-landmarks" />
                      </FormControl>
                      <FormDescription>Enter landmarks separated by commas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3 - Audience Demographics */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Audience Demographics</CardTitle>
                </div>
                <CardDescription>Target audience characteristics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="primaryAgeGroups"
                  render={() => (
                    <FormItem>
                      <FormLabel>Primary Age Groups *</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {["18-25", "25-40", "40-60", "60+"].map((age) => (
                          <FormField
                            key={age}
                            control={form.control}
                            name="primaryAgeGroups"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(age)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, age]
                                        : current.filter((v) => v !== age);
                                      field.onChange(updated);
                                    }}
                                    data-testid={`checkbox-age-${age}`}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0 font-normal">{age}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Gender Split *</FormLabel>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormField
                      control={form.control}
                      name="genderMale"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-sm">Male: {field.value}%</FormLabel>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(value) => {
                                field.onChange(value[0]);
                                form.setValue("genderFemale", 100 - value[0]);
                              }}
                              data-testid="slider-male"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="genderFemale"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel className="text-sm">Female: {field.value}%</FormLabel>
                          </div>
                          <FormControl>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[field.value]}
                              onValueChange={(value) => {
                                field.onChange(value[0]);
                                form.setValue("genderMale", 100 - value[0]);
                              }}
                              data-testid="slider-female"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="affluenceLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Affluence Level *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-affluence">
                              <SelectValue placeholder="Select level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Premium">Premium</SelectItem>
                            <SelectItem value="Mid">Mid</SelectItem>
                            <SelectItem value="Budget">Budget</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="avgDwellTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Avg Dwell Time (minutes) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="15" {...field} data-testid="input-dwell-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="occupationMix"
                  render={() => (
                    <FormItem>
                      <FormLabel>Occupation Mix *</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {["Students", "Working Professionals", "Business Owners", "Homemakers"].map((occupation) => (
                          <FormField
                            key={occupation}
                            control={form.control}
                            name="occupationMix"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(occupation)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, occupation]
                                        : current.filter((v) => v !== occupation);
                                      field.onChange(updated);
                                    }}
                                    data-testid={`checkbox-occupation-${occupation.toLowerCase().replace(/\s/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0 font-normal">{occupation}</FormLabel>
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
                  name="interestSegments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Interest Segments (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Comma-separated: Fitness, Coffee, Tech, Fashion" {...field} data-testid="input-interests" />
                      </FormControl>
                      <FormDescription>Enter interests separated by commas</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Commercial & Campaign Data */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle>Commercial & Campaign Data</CardTitle>
                </div>
                <CardDescription>Pricing and campaign specifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="isMultiScreen"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Multi-Screen Listing</FormLabel>
                        <FormDescription>
                          Does this listing contain multiple screens?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-multi-screen"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("isMultiScreen") && (
                  <FormField
                    control={form.control}
                    name="numberOfScreens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Screens *</FormLabel>
                        <FormControl>
                          <Input type="number" min="2" placeholder="e.g., 5" {...field} data-testid="input-num-screens" />
                        </FormControl>
                        <FormDescription>How many screens are included in this listing?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Day (₹) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="5000" {...field} data-testid="input-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minBookingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Min Booking Days *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="7" {...field} data-testid="input-min-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="playbackSlotsPerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Playback Slots Per Hour *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="6" {...field} data-testid="input-slots" />
                      </FormControl>
                      <FormDescription>Number of ad slots played per hour</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contentTypesSupported"
                  render={() => (
                    <FormItem>
                      <FormLabel>Content Types Supported *</FormLabel>
                      <div className="grid grid-cols-2 gap-4">
                        {["Static Image", "Video", "Interactive", "HTML5"].map((type) => (
                          <FormField
                            key={type}
                            control={form.control}
                            name="contentTypesSupported"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(type)}
                                    onCheckedChange={(checked) => {
                                      const current = field.value || [];
                                      const updated = checked
                                        ? [...current, type]
                                        : current.filter((v) => v !== type);
                                      field.onChange(updated);
                                    }}
                                    data-testid={`checkbox-content-${type.toLowerCase().replace(/\s/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0 font-normal">{type}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Screen Images */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <CardTitle>Screen Images</CardTitle>
                </div>
                <CardDescription>Upload images of your screen (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    allowedFileTypes={["image/*"]}
                    onGetUploadParameters={handleGetUploadParameters}
                    onComplete={handleUploadComplete}
                    buttonVariant="outline"
                    buttonTestId="button-upload-screen-image"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Screen Image
                  </ObjectUploader>
                  {uploadedImageURL && (
                    <div className="flex items-center gap-2 text-sm text-chart-2">
                      <Check className="h-4 w-4" />
                      <span>Image uploaded successfully</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Supported formats: JPG, PNG (Max 10MB)
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/owner/screens")}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={updateScreenMutation.isPending}
                data-testid="button-update"
              >
                {updateScreenMutation.isPending ? "Updating..." : "Update Screen"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
