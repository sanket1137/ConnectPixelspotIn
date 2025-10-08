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
import { MapPin, Upload, Check, Users, DollarSign, Monitor } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import type { User } from "@shared/schema";

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
  
  // Legacy fields
  type: z.string().min(1),
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
        genderSplit: { male: data.genderMale, female: data.genderFemale },
        nearbyLandmarks: data.nearbyLandmarks ? data.nearbyLandmarks.split(',').map(s => s.trim()) : [],
        interestSegments: data.interestSegments ? data.interestSegments.split(',').map(s => s.trim()) : [],
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

              <div className="grid md:grid-cols-3 gap-4">
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

              <div className="grid md:grid-cols-2 gap-4">
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

                <FormField
                  control={form.control}
                  name="nearbyLandmarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nearby Landmarks (comma-separated)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Metro Station, Starbucks" {...field} data-testid="input-landmarks" />
                      </FormControl>
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
                name="primaryAgeGroups"
                render={() => (
                  <FormItem>
                    <FormLabel>Primary Audience Age Groups</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {ageGroups.map((age) => (
                        <FormField
                          key={age}
                          control={form.control}
                          name="primaryAgeGroups"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(age)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, age])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== age)
                                        );
                                  }}
                                  data-testid={`checkbox-age-${age}`}
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

              <div>
                <FormLabel>Gender Split (%)</FormLabel>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                  <FormField
                    control={form.control}
                    name="genderMale"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-sm font-normal">Male</FormLabel>
                          <span className="text-sm font-semibold">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => {
                              field.onChange(vals[0]);
                              form.setValue("genderFemale", 100 - vals[0]);
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
                          <FormLabel className="text-sm font-normal">Female</FormLabel>
                          <span className="text-sm font-semibold">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(vals) => {
                              field.onChange(vals[0]);
                              form.setValue("genderMale", 100 - vals[0]);
                            }}
                            data-testid="slider-female"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="affluenceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Audience Affluence Level</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-affluence">
                            <SelectValue placeholder="Select" />
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
                      <FormLabel>Avg. Dwell Time (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 15" {...field} data-testid="input-dwell-time" />
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
                      <Input placeholder="e.g., Fitness, Coffee, Tech" {...field} data-testid="input-interests" />
                    </FormControl>
                    <FormDescription>Tags for targeting specific interests</FormDescription>
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
