import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { MapPin, Upload, Check, Users, DollarSign, Monitor } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { 
  INDIAN_STATES,
  STATE_CITIES,
  VISIBILITY_LEVELS, 
  OPERATING_HOURS_PRESETS, 
  DETAILED_AGE_GROUPS,
  GENDER_ORIENTATIONS,
  INCOME_LEVELS,
  LIFESTYLE_TAGS,
  LOCATION_TAGS
} from "@shared/constants";

const screenFormSchema = z.object({
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
  latitude: z.string()
    .min(1, "Latitude is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= -90 && num <= 90;
    }, "Latitude must be between -90 and 90"),
  longitude: z.string()
    .min(1, "Longitude is required")
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= -180 && num <= 180;
    }, "Longitude must be between -180 and 180"),
  venueCategory: z.string().min(1, "Venue category is required"),
  avgDailyFootfall: z.string().min(1, "Average daily footfall is required"),
  trafficType: z.string().min(1, "Traffic type is required"),
  timeOfDayActivity: z.array(z.string()).min(1, "Select at least one time slot"),
  environmentType: z.string().min(1, "Environment type is required"),
  
  // Enhanced Location Context
  visibility: z.string().optional(),
  description: z.string().optional(),
  operatingHoursPreset: z.string().optional(),
  customOperatingHoursStart: z.string().optional(),
  customOperatingHoursEnd: z.string().optional(),
  customOperatingDays: z.array(z.string()).optional(),
  locationTags: z.array(z.string()).optional(),
  customLocationTags: z.string().optional(),
  
  // Section 3 - Audience Demographics
  detailedAgeGroups: z.array(z.string()).optional(),
  genderOrientation: z.string().optional(),
  incomeLevel: z.string().optional(),
  occupationMix: z.array(z.string()).min(1, "Select at least one occupation"),
  lifestyleTags: z.array(z.string()).optional(),
  avgDwellTime: z.coerce.number().min(1, "Average dwell time is required"),
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

export type ScreenFormData = z.infer<typeof screenFormSchema>;

interface ScreenFormProps {
  onSubmit: (data: ScreenFormData & { screenImages: string[]; surroundingImages: string[] }) => void;
  initialData?: Partial<ScreenFormData>;
  submitButtonText?: string;
  isLoading?: boolean;
}

export function ScreenForm({ 
  onSubmit, 
  initialData, 
  submitButtonText = "Submit Screen for Approval",
  isLoading = false 
}: ScreenFormProps) {
  const { toast } = useToast();
  const [screenImages, setScreenImages] = useState<string[]>([]);
  const [surroundingImages, setSurroundingImages] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [uploadingScreen, setUploadingScreen] = useState(false);
  const [uploadingSurrounding, setUploadingSurrounding] = useState(false);
  
  const screenInputRef = useRef<HTMLInputElement>(null);
  const surroundingInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ScreenFormData>({
    resolver: zodResolver(screenFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      category: initialData?.category || "",
      displayFormat: initialData?.displayFormat || "",
      resolution: initialData?.resolution || "",
      durationPerSlot: initialData?.durationPerSlot || "",
      venueName: initialData?.venueName || "",
      location: initialData?.location || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      pincode: initialData?.pincode || "",
      latitude: initialData?.latitude || "",
      longitude: initialData?.longitude || "",
      venueCategory: initialData?.venueCategory || "",
      avgDailyFootfall: initialData?.avgDailyFootfall || "",
      trafficType: initialData?.trafficType || "",
      timeOfDayActivity: initialData?.timeOfDayActivity || [],
      environmentType: initialData?.environmentType || "",
      visibility: initialData?.visibility || "",
      description: initialData?.description || "",
      operatingHoursPreset: initialData?.operatingHoursPreset || "",
      customOperatingHoursStart: initialData?.customOperatingHoursStart || "",
      customOperatingHoursEnd: initialData?.customOperatingHoursEnd || "",
      customOperatingDays: initialData?.customOperatingDays || [],
      locationTags: initialData?.locationTags || [],
      customLocationTags: initialData?.customLocationTags || "",
      detailedAgeGroups: initialData?.detailedAgeGroups || [],
      genderOrientation: initialData?.genderOrientation || "",
      incomeLevel: initialData?.incomeLevel || "",
      occupationMix: initialData?.occupationMix || [],
      lifestyleTags: initialData?.lifestyleTags || [],
      avgDwellTime: initialData?.avgDwellTime || 0,
      interestSegments: initialData?.interestSegments || "",
      customAudienceTags: initialData?.customAudienceTags || "",
      userIntent: initialData?.userIntent || [],
      userMood: initialData?.userMood || [],
      isMultiScreen: initialData?.isMultiScreen || false,
      numberOfScreens: initialData?.numberOfScreens || "",
      pricePerDay: initialData?.pricePerDay || "",
      minBookingDays: initialData?.minBookingDays || "1",
      playbackSlotsPerHour: initialData?.playbackSlotsPerHour || "",
      contentTypesSupported: initialData?.contentTypesSupported || [],
      type: initialData?.type || "",
      size: initialData?.size || "",
      operationalHours: initialData?.operationalHours || "",
    },
  });

  // Initialize selectedState from initialData or form state
  useEffect(() => {
    const stateValue = initialData?.state || form.getValues("state");
    if (stateValue) {
      setSelectedState(stateValue);
    }
  }, [initialData?.state]);

  // Watch state field to update selectedState and filter cities
  const watchedState = form.watch("state");
  useEffect(() => {
    if (watchedState && watchedState !== selectedState) {
      setSelectedState(watchedState);
      // Reset city when state changes (unless it's initial load)
      if (selectedState !== "") {
        form.setValue("city", "");
      }
    }
  }, [watchedState, selectedState]);

  // Get filtered cities based on selected state
  const getFilteredCities = (): string[] => {
    if (!selectedState) return [];
    return STATE_CITIES[selectedState] || [];
  };

  // Helper function to parse operating hours preset into structured data
  const parseOperatingHoursPreset = (preset: string) => {
    switch (preset) {
      case "Business hours (09:00-18:00 | Mon-Fri)":
        return {
          start: "09:00",
          end: "18:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        };
      case "Mall hours (10:00-22:00 | Mon-Sun)":
        return {
          start: "10:00",
          end: "22:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        };
      case "Retail (11:00-23:00 | Mon-Sun)":
        return {
          start: "11:00",
          end: "23:00",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        };
      case "Airport/Highways (24/7 | Mon-Sun)":
        return {
          start: "00:00",
          end: "23:59",
          days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        };
      case "Custom":
        return null;
      default:
        return null;
    }
  };

  // Watch operatingHoursPreset and auto-populate structured fields
  const operatingHoursPreset = form.watch("operatingHoursPreset");
  
  useEffect(() => {
    if (operatingHoursPreset && operatingHoursPreset !== "Custom") {
      const parsed = parseOperatingHoursPreset(operatingHoursPreset);
      if (parsed) {
        form.setValue("customOperatingHoursStart", parsed.start);
        form.setValue("customOperatingHoursEnd", parsed.end);
        form.setValue("customOperatingDays", parsed.days);
      }
    }
  }, [operatingHoursPreset]);

  const handleScreenImagesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingScreen(true);
    try {
      const uploadedPaths: string[] = [];
      const token = await auth.currentUser?.getIdToken();

      for (const file of Array.from(files)) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", "screen");

        // Upload file through backend
        const response = await fetch("/api/objects/upload-file", {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }

        const data = await response.json();
        uploadedPaths.push(data.objectPath);
      }

      setScreenImages([...screenImages, ...uploadedPaths]);
      toast({
        title: "Screen Images Uploaded",
        description: `${uploadedPaths.length} screen image(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadingScreen(false);
      // Reset input
      if (event.target) event.target.value = "";
    }
  };

  const handleSurroundingImagesChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingSurrounding(true);
    try {
      const uploadedPaths: string[] = [];
      const token = await auth.currentUser?.getIdToken();

      for (const file of Array.from(files)) {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", "screen");

        // Upload file through backend
        const response = await fetch("/api/objects/upload-file", {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Upload failed: ${response.status}`);
        }

        const data = await response.json();
        uploadedPaths.push(data.objectPath);
      }

      setSurroundingImages([...surroundingImages, ...uploadedPaths]);
      toast({
        title: "Surrounding Images Uploaded",
        description: `${uploadedPaths.length} surrounding image(s) uploaded successfully.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploadingSurrounding(false);
      // Reset input
      if (event.target) event.target.value = "";
    }
  };

  const handleFormSubmit = (data: ScreenFormData) => {
    onSubmit({
      ...data,
      screenImages,
      surroundingImages,
    });
  };

  const timeSlots = ["Morning Rush", "Lunch Hours", "Evening Leisure", "Late Night"];
  const occupations = ["Students", "Working Professionals", "Business Owners", "Homemakers"];
  const intents = ["Shopping", "Commuting", "Dining", "Fitness", "Entertainment", "Work", "Education"];
  const moods = ["Relaxed", "Rushed", "Social", "Focused", "Leisure"];
  const contentTypes = ["Static Image", "Video", "Interactive", "HTML5"];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* SECTION 1 - Screen Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-primary" />
              <CardTitle>Section 1 — Screen Identity</CardTitle>
            </div>
            <CardDescription>Basic technical specifications of your screen</CardDescription>
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

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedState}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-city">
                          <SelectValue placeholder={selectedState ? "Select city" : "Select state first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        {getFilteredCities().map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {!selectedState && "Please select a state first to see available cities"}
                    </FormDescription>
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
                <div className="space-y-4 mt-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customOperatingHoursStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-start-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="customOperatingHoursEnd"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} data-testid="input-end-time" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="customOperatingDays"
                    render={() => (
                      <FormItem>
                        <FormLabel>Operating Days</FormLabel>
                        <div className="flex flex-wrap gap-4">
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                            <FormField
                              key={day}
                              control={form.control}
                              name="customOperatingDays"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(day)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...(field.value || []), day])
                                          : field.onChange(
                                              field.value?.filter((value) => value !== day)
                                            );
                                      }}
                                      data-testid={`checkbox-day-${day.toLowerCase()}`}
                                    />
                                  </FormControl>
                                  <FormLabel className="font-normal cursor-pointer">{day}</FormLabel>
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
            <CardDescription>Target audience characteristics for precise campaign targeting</CardDescription>
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

        {/* Screen Images Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              <CardTitle>Screen Images</CardTitle>
            </div>
            <CardDescription>
              Upload up to 4 images of the actual screen/billboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={screenInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleScreenImagesChange}
                className="hidden"
                data-testid="input-screen-images"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => screenInputRef.current?.click()}
                disabled={uploadingScreen || screenImages.length >= 4}
                data-testid="button-upload-screen-images"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingScreen ? "Uploading..." : "Upload Screen Images (Max 4)"}
              </Button>
              {screenImages.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  {screenImages.length} image(s) uploaded
                </div>
              )}
            </div>
            {screenImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {screenImages.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                    <img
                      src={image}
                      alt={`Screen ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG (Max 10MB each). Upload clear photos of your screen from different angles.
            </p>
          </CardContent>
        </Card>

        {/* Surrounding Area Images Upload */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Surrounding Area Images</CardTitle>
            </div>
            <CardDescription>
              Upload up to 5 images showing the area around the screen
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <input
                ref={surroundingInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleSurroundingImagesChange}
                className="hidden"
                data-testid="input-surrounding-images"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => surroundingInputRef.current?.click()}
                disabled={uploadingSurrounding || surroundingImages.length >= 5}
                data-testid="button-upload-surrounding-images"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploadingSurrounding ? "Uploading..." : "Upload Surrounding Images (Max 5)"}
              </Button>
              {surroundingImages.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  {surroundingImages.length} image(s) uploaded
                </div>
              )}
            </div>
            {surroundingImages.length > 0 && (
              <div className="grid grid-cols-5 gap-2">
                {surroundingImages.map((image, index) => (
                  <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                    <img
                      src={image}
                      alt={`Surrounding ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Supported formats: JPG, PNG (Max 10MB each). Show nearby landmarks, traffic, and the environment.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-end">
          <Button type="submit" disabled={isLoading} data-testid="button-submit">
            {isLoading ? "Submitting..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
