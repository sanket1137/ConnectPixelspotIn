import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { MapPin, Upload, Check, Users, DollarSign, Monitor, Crosshair } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import type { User } from "@shared/schema";
import { 
  INDIAN_STATES, 
  VISIBILITY_LEVELS, 
  OPERATING_HOURS_PRESETS, 
  DETAILED_AGE_GROUPS,
  GENDER_ORIENTATIONS,
  INCOME_LEVELS,
  LIFESTYLE_TAGS,
  LOCATION_TAGS
} from "@shared/constants";

const addScreenSchema = z.object({
  ownerId: z.string().min(1, "Screen owner is required"),
  
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
  state: z.string().min(2, "State is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  venueCategory: z.string().min(1, "Venue category is required"),
  avgDailyFootfall: z.string().min(1, "Average daily footfall is required"),
  trafficType: z.string().min(1, "Traffic type is required"),
  timeOfDayActivity: z.array(z.string()).min(1, "Select at least one time slot"),
  environmentType: z.string().min(1, "Environment type is required"),
  
  // Enhanced Location Context
  visibility: z.string().optional(),
  description: z.string().optional(),
  operatingHoursPreset: z.string().optional(),
  customOperatingHours: z.string().optional(),
  customOperatingDays: z.string().optional(),
  locationTags: z.array(z.string()).optional(),
  customLocationTags: z.string().optional(),
  
  // Section 3 - Audience Demographics
  detailedAgeGroups: z.array(z.string()).optional(),
  genderOrientation: z.string().optional(),
  incomeLevel: z.string().optional(),
  occupationMix: z.array(z.string()).min(1, "Select at least one occupation"),
  lifestyleTags: z.array(z.string()).optional(),
  avgDwellTime: z.string().min(1, "Average dwell time is required"),
  interestSegments: z.string().optional(),
  customAudienceTags: z.string().optional(),
  userIntent: z.array(z.string()).min(1, "Select at least one user intent"),
  userMood: z.array(z.string()).min(1, "Select at least one user mood"),
  
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
});

type AddScreenForm = z.infer<typeof addScreenSchema>;

export default function AddScreenForOwner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImageURL, setUploadedImageURL] = useState<string | null>(null);

  const form = useForm<AddScreenForm>({
    resolver: zodResolver(addScreenSchema),
    defaultValues: {
      ownerId: "",
      name: "",
      category: "",
      displayFormat: "",
      resolution: "",
      durationPerSlot: "",
      venueName: "",
      location: "",
      city: "",
      state: "",
      pincode: "",
      latitude: "",
      longitude: "",
      venueCategory: "",
      avgDailyFootfall: "",
      trafficType: "",
      timeOfDayActivity: [],
      environmentType: "",
      visibility: "",
      description: "",
      operatingHoursPreset: "",
      customOperatingHours: "",
      customOperatingDays: "",
      locationTags: [],
      customLocationTags: "",
      detailedAgeGroups: [],
      genderOrientation: "",
      incomeLevel: "",
      occupationMix: [],
      lifestyleTags: [],
      avgDwellTime: "",
      interestSegments: "",
      customAudienceTags: "",
      userIntent: [],
      userMood: [],
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

  // Fetch all screen owners
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const screenOwners = users.filter(user => user.role === "screen_owner");

  const createScreenMutation = useMutation({
    mutationFn: async (data: AddScreenForm) => {
      return apiRequest("POST", "/api/admin/screens/create", {
        ...data,
        pricePerDay: parseInt(data.pricePerDay),
        minBookingDays: parseInt(data.minBookingDays),
        durationPerSlot: parseInt(data.durationPerSlot),
        avgDailyFootfall: parseInt(data.avgDailyFootfall),
        avgDwellTime: parseInt(data.avgDwellTime),
        playbackSlotsPerHour: parseInt(data.playbackSlotsPerHour),
        numberOfScreens: data.numberOfScreens ? parseInt(data.numberOfScreens) : null,
        interestSegments: data.interestSegments ? data.interestSegments.split(',').map(s => s.trim()) : [],
        customLocationTags: data.customLocationTags ? data.customLocationTags.split(',').map(s => s.trim()) : [],
        customAudienceTags: data.customAudienceTags ? data.customAudienceTags.split(',').map(s => s.trim()) : [],
        userIntent: data.userIntent,
        userMood: data.userMood,
        type: data.category,
        size: data.resolution,
        imageUrl: uploadedImageURL || null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Screen Added",
        description: "Screen has been successfully added for the owner.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
      setLocation("/admin/screens");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add screen. Please try again.",
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
        entityType: "screen",
      });
      const data = await response.json();
      setUploadedImageURL(data.objectPath);

      toast({
        title: "Image Uploaded",
        description: "Screen image has been uploaded successfully.",
      });
    }
  };

  const onSubmit = (data: AddScreenForm) => {
    createScreenMutation.mutate(data);
  };

  const timeSlots = ["Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"];
  const ageGroups = ["18-25", "25-40", "40-60", "60+"];
  const occupations = ["Students", "Working Professionals", "Business Owners", "Homemakers"];
  const intents = ["Shopping", "Commuting", "Dining", "Fitness", "Entertainment", "Work", "Education"];
  const moods = ["Relaxed", "Rushed", "Social", "Focused", "Leisure"];
  const contentTypes = ["Static Image", "Video", "Interactive", "HTML5"];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Add Screen for Owner</h1>
          <p className="text-muted-foreground mt-1">Comprehensive screen details for better targeting</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/admin/screens")} data-testid="button-back">
          Back
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Screen Owner Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Screen Owner</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Screen Owner</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-owner">
                          <SelectValue placeholder="Select a screen owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {screenOwners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name} ({owner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* SECTION 1 - Screen Identity */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                <CardTitle>Section 1 — Screen Identity</CardTitle>
              </div>
              <CardDescription>Basic technical specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Screen Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Café Coffee Day – Indiranagar 1" {...field} data-testid="input-screen-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screen Category</FormLabel>
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
                      <FormLabel>Display Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-format">
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

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="resolution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution (px)</FormLabel>
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
                      <FormLabel>Duration per Slot (seconds)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 10" {...field} data-testid="input-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2 - Location & Context */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <CardTitle>Section 2 — Location & Context</CardTitle>
              </div>
              <CardDescription>Venue details and geographic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="venueName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Phoenix Mall – Food Court" {...field} data-testid="input-venue-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Near Metro Station, MG Road" {...field} data-testid="input-location" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Bangalore" {...field} data-testid="input-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Union Territory</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-state">
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 560001" {...field} data-testid="input-pincode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="venueCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venue Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-venue-category">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[300px]">
                          <SelectItem value="Airport">Airport</SelectItem>
                          <SelectItem value="Apartment">Apartment</SelectItem>
                          <SelectItem value="Bus Stop">Bus Stop</SelectItem>
                          <SelectItem value="Café">Café</SelectItem>
                          <SelectItem value="Cinema">Cinema</SelectItem>
                          <SelectItem value="Co-working">Co-working</SelectItem>
                          <SelectItem value="College">College</SelectItem>
                          <SelectItem value="Corporate Park">Corporate Park</SelectItem>
                          <SelectItem value="Flyover">Flyover</SelectItem>
                          <SelectItem value="Gym">Gym</SelectItem>
                          <SelectItem value="Highway">Highway</SelectItem>
                          <SelectItem value="Hospital">Hospital</SelectItem>
                          <SelectItem value="Mall">Mall</SelectItem>
                          <SelectItem value="Metro">Metro</SelectItem>
                          <SelectItem value="Office Building">Office Building</SelectItem>
                          <SelectItem value="Restaurant">Restaurant</SelectItem>
                          <SelectItem value="Retail Store">Retail Store</SelectItem>
                          <SelectItem value="Road Junction">Road Junction</SelectItem>
                          <SelectItem value="Road Side">Road Side</SelectItem>
                          <SelectItem value="Salon">Salon</SelectItem>
                          <SelectItem value="Shopping Complex">Shopping Complex</SelectItem>
                          <SelectItem value="Stadium">Stadium</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 12.9716" {...field} data-testid="input-latitude" />
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
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 77.5946" {...field} data-testid="input-longitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="avgDailyFootfall"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Average Daily Footfall</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5000" {...field} data-testid="input-footfall" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="trafficType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Traffic Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-traffic-type">
                            <SelectValue placeholder="Select" />
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
              </div>

              <FormField
                control={form.control}
                name="timeOfDayActivity"
                render={() => (
                  <FormItem>
                    <FormLabel>Time-of-Day Activity</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {timeSlots.map((slot) => (
                        <FormField
                          key={slot}
                          control={form.control}
                          name="timeOfDayActivity"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(slot)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, slot])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== slot)
                                        );
                                  }}
                                  data-testid={`checkbox-time-${slot.toLowerCase().replace(/\s/g, '-')}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">{slot}</FormLabel>
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
                name="environmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-environment">
                          <SelectValue placeholder="Select" />
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

              {/* Enhanced Location Context */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Enhanced Location Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="visibility"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Visibility Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-visibility">
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VISIBILITY_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>Based on footfall and screen position</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="operatingHoursPreset"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operating Hours</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-operating-hours">
                              <SelectValue placeholder="Select operating hours" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {OPERATING_HOURS_PRESETS.map((preset) => (
                              <SelectItem key={preset} value={preset}>{preset}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("operatingHoursPreset") === "Custom" && (
                  <div className="grid md:grid-cols-2 gap-4 mt-4">
                    <FormField
                      control={form.control}
                      name="customOperatingHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Hours</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 09:00-18:00" {...field} data-testid="input-custom-hours" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customOperatingDays"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Days</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Mon-Fri" {...field} data-testid="input-custom-days" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Screen Description</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          rows={3}
                          placeholder="Describe the screen, surroundings, and justification for pricing..."
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormDescription>Provide context about location and pricing</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="locationTags"
                  render={() => (
                    <FormItem className="mt-4">
                      <FormLabel>Nearby Facilities & Points of Interest</FormLabel>
                      <div className="space-y-3">
                        {Object.entries(LOCATION_TAGS).map(([category, tags]) => (
                          <div key={category} className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground">{category}</p>
                            <div className="flex flex-wrap gap-3">
                              {(tags as readonly string[]).map((tag: string) => (
                                <FormField
                                  key={tag}
                                  control={form.control}
                                  name="locationTags"
                                  render={({ field }) => (
                                    <FormItem className="flex items-center space-x-2 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(tag)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...(field.value || []), tag])
                                              : field.onChange(
                                                  field.value?.filter((value) => value !== tag)
                                                );
                                          }}
                                          data-testid={`checkbox-location-${tag.toLowerCase().replace(/[\/\s]/g, '-')}`}
                                        />
                                      </FormControl>
                                      <FormLabel className="text-sm font-normal cursor-pointer">{tag}</FormLabel>
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customLocationTags"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Custom Location Tags (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Tech Park, Beach View, Heritage Site" {...field} data-testid="input-custom-location-tags" />
                      </FormControl>
                      <FormDescription>Add custom tags to increase targeting accuracy</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* SECTION 3 - Audience Demographics */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Section 3 — Audience Demographics</CardTitle>
              </div>
              <CardDescription>Target audience characteristics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="avgDwellTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avg. Dwell Time (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 15" {...field} data-testid="input-dwell-time" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occupationMix"
                render={() => (
                  <FormItem>
                    <FormLabel>Occupation Mix</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {occupations.map((occupation) => (
                        <FormField
                          key={occupation}
                          control={form.control}
                          name="occupationMix"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(occupation)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, occupation])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== occupation)
                                        );
                                  }}
                                  data-testid={`checkbox-occupation-${occupation.toLowerCase().replace(/\s/g, '-')}`}
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

              <FormField
                control={form.control}
                name="interestSegments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Audience Interest Segments (comma-separated)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Fitness, Coffee, Tech, Luxury Cars" {...field} data-testid="input-interests" />
                    </FormControl>
                    <FormDescription>Tags for targeting specific audience interests</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Enhanced Demographics */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Enhanced Audience Demographics</h3>
                
                <FormField
                  control={form.control}
                  name="detailedAgeGroups"
                  render={() => (
                    <FormItem>
                      <FormLabel>Detailed Age Groups (Optional)</FormLabel>
                      <FormDescription>Select more granular age segments for better targeting</FormDescription>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {DETAILED_AGE_GROUPS.map((age) => (
                          <FormField
                            key={age}
                            control={form.control}
                            name="detailedAgeGroups"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(age)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), age])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== age)
                                          );
                                    }}
                                    data-testid={`checkbox-detailed-age-${age.toLowerCase().replace(/[()]/g, '').replace(/\s/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">{age}</FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <FormField
                    control={form.control}
                    name="genderOrientation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender Orientation</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-gender-orientation">
                              <SelectValue placeholder="Select orientation" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GENDER_ORIENTATIONS.map((orientation) => (
                              <SelectItem key={orientation} value={orientation}>{orientation}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incomeLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Income Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-income-level">
                              <SelectValue placeholder="Select income level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INCOME_LEVELS.map((level) => (
                              <SelectItem key={level} value={level}>{level}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="lifestyleTags"
                  render={() => (
                    <FormItem className="mt-4">
                      <FormLabel>Lifestyle Tags</FormLabel>
                      <FormDescription>Describe the lifestyle characteristics of your audience</FormDescription>
                      <div className="flex flex-wrap gap-4 mt-2">
                        {LIFESTYLE_TAGS.map((tag) => (
                          <FormField
                            key={tag}
                            control={form.control}
                            name="lifestyleTags"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(tag)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), tag])
                                        : field.onChange(
                                            field.value?.filter((value) => value !== tag)
                                          );
                                    }}
                                    data-testid={`checkbox-lifestyle-${tag.toLowerCase().replace(/\s/g, '-')}`}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">{tag}</FormLabel>
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
                  name="customAudienceTags"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Custom Audience Tags (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Young Entrepreneurs, Digital Nomads, Pet Owners" {...field} data-testid="input-custom-audience-tags" />
                      </FormControl>
                      <FormDescription>Add custom tags to increase targeting accuracy</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="userIntent"
                render={() => (
                  <FormItem>
                    <FormLabel>User Intent at This Location</FormLabel>
                    <FormDescription>What are people typically doing here? (Select all that apply)</FormDescription>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {intents.map((intent) => (
                        <FormField
                          key={intent}
                          control={form.control}
                          name="userIntent"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(intent)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, intent])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== intent)
                                        );
                                  }}
                                  data-testid={`checkbox-intent-${intent.toLowerCase()}`}
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
                name="userMood"
                render={() => (
                  <FormItem>
                    <FormLabel>User Mood/State of Mind</FormLabel>
                    <FormDescription>What's the typical mood of people at this location? (Select all that apply)</FormDescription>
                    <div className="flex flex-wrap gap-4 mt-2">
                      {moods.map((mood) => (
                        <FormField
                          key={mood}
                          control={form.control}
                          name="userMood"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(mood)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, mood])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== mood)
                                        );
                                  }}
                                  data-testid={`checkbox-mood-${mood.toLowerCase()}`}
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
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Multi-Screen Listing</FormLabel>
                      <FormDescription>
                        Does this listing have multiple screens?
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
                      <FormLabel>Number of Screens</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5" {...field} data-testid="input-number-screens" />
                      </FormControl>
                      <FormDescription>Total number of screens in this listing</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per Day (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 5000" {...field} data-testid="input-price" />
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
                      <FormLabel>Minimum Booking Duration (days)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1" {...field} data-testid="input-min-days" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="playbackSlotsPerHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Playback Slots per Hour</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 6" {...field} data-testid="input-slots" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="contentTypesSupported"
                render={() => (
                  <FormItem>
                    <FormLabel>Content Types Supported</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {contentTypes.map((type) => (
                        <FormField
                          key={type}
                          control={form.control}
                          name="contentTypesSupported"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(type)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, type])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== type)
                                        );
                                  }}
                                  data-testid={`checkbox-content-${type.toLowerCase().replace(/\s/g, '-')}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">{type}</FormLabel>
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

          {/* Screen Image Upload */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                <CardTitle>Screen Image</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Image uploaded successfully
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Supported formats: JPG, PNG (Max 10MB)
              </p>
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/admin/screens")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createScreenMutation.isPending} data-testid="button-submit">
              {createScreenMutation.isPending ? "Creating..." : "Create Screen"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
