import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Screen } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { ScreenForm } from "@/components/ScreenForm";

export default function EditScreen() {
  const [, params] = useRoute("/owner/screens/edit/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const screenId = params?.id;

  const { data: screen, isLoading } = useQuery<Screen>({
    queryKey: [`/api/owner/screens/${screenId}`],
    enabled: !!screenId,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const idToken = await (await import("@/lib/firebase")).auth.currentUser?.getIdToken();
      const response = await apiRequest("PATCH", `/api/owner/screens/${screenId}`, {
        ...data,
        pricePerDay: parseInt(data.pricePerDay),
        minBookingDays: parseInt(data.minBookingDays),
        durationPerSlot: parseInt(data.durationPerSlot),
        avgDailyFootfall: parseInt(data.avgDailyFootfall),
        avgDwellTime: data.avgDwellTime,
        playbackSlotsPerHour: parseInt(data.playbackSlotsPerHour),
        numberOfScreens: data.numberOfScreens ? parseInt(data.numberOfScreens) : null,
        interestSegments: data.interestSegments ? data.interestSegments.split(',').map((s: string) => s.trim()) : [],
        customLocationTags: data.customLocationTags ? data.customLocationTags.split(',').map((s: string) => s.trim()) : [],
        customAudienceTags: data.customAudienceTags ? data.customAudienceTags.split(',').map((s: string) => s.trim()) : [],
        userIntent: data.userIntent,
        userMood: data.userMood,
        type: data.category,
        size: data.resolution,
        screenImages: data.screenImages,
        surroundingImages: data.surroundingImages,
        imageUrl: data.screenImages.length > 0 ? data.screenImages[0] : null,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/screens"] });
      queryClient.invalidateQueries({ queryKey: [`/api/owner/screens/${screenId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/screens/locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/screens/in-area"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
      toast({
        title: "Screen Updated",
        description: "Your screen has been updated successfully.",
      });
      setLocation("/owner/screens");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Screen not found.</p>
        <Button onClick={() => setLocation("/owner/screens")} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Screens
        </Button>
      </div>
    );
  }

  // Transform screen data to match form structure
  const initialData = {
    name: screen.name,
    category: screen.category,
    displayFormat: screen.displayFormat,
    resolution: screen.resolution,
    durationPerSlot: screen.durationPerSlot.toString(),
    venueName: screen.venueName,
    location: screen.location,
    city: screen.city,
    state: screen.state || "",
    pincode: screen.pincode,
    latitude: screen.latitude,
    longitude: screen.longitude,
    venueCategory: screen.venueCategory,
    avgDailyFootfall: screen.avgDailyFootfall.toString(),
    trafficType: screen.trafficType,
    timeOfDayActivity: screen.timeOfDayActivity || [],
    environmentType: screen.environmentType,
    visibility: screen.visibility || "",
    description: screen.description || "",
    operatingHoursPreset: screen.operatingHoursPreset || "",
    customOperatingHoursStart: screen.customOperatingHoursStart || "",
    customOperatingHoursEnd: screen.customOperatingHoursEnd || "",
    customOperatingDays: screen.customOperatingDays || [],
    locationTags: screen.locationTags || [],
    customLocationTags: screen.customLocationTags?.join(", ") || "",
    detailedAgeGroups: screen.detailedAgeGroups || [],
    genderOrientation: screen.genderOrientation || "",
    incomeLevel: screen.incomeLevel || "",
    occupationMix: screen.occupationMix || [],
    lifestyleTags: screen.lifestyleTags || [],
    avgDwellTime: screen.avgDwellTime,
    interestSegments: screen.interestSegments?.join(", ") || "",
    customAudienceTags: screen.customAudienceTags?.join(", ") || "",
    userIntent: screen.userIntent || [],
    userMood: screen.userMood || [],
    isMultiScreen: screen.isMultiScreen,
    numberOfScreens: screen.numberOfScreens?.toString() || "",
    pricePerDay: screen.pricePerDay.toString(),
    minBookingDays: screen.minBookingDays.toString(),
    playbackSlotsPerHour: screen.playbackSlotsPerHour.toString(),
    contentTypesSupported: screen.contentTypesSupported || [],
    type: screen.type,
    size: screen.size,
    operationalHours: screen.operationalHours || "",
    existingScreenImages: screen.screenImages || [],
    existingSurroundingImages: screen.surroundingImages || [],
  };

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        onClick={() => setLocation("/owner/screens")}
        className="mb-6"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Screens
      </Button>

      <div className="mb-6">
        <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Edit Screen</h1>
        <p className="text-muted-foreground">Update your screen details</p>
      </div>

      <ScreenForm
        onSubmit={(data) => updateMutation.mutate(data)}
        initialData={initialData}
        submitButtonText="Update Screen"
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
