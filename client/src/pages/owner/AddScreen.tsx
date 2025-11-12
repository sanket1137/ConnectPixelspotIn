import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft } from "lucide-react";
import { ScreenForm, type ScreenFormData } from "@/components/ScreenForm";

export default function AddScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createScreenMutation = useMutation({
    mutationFn: async (data: ScreenFormData & { screenImages: string[]; surroundingImages: string[] }) => {
      return apiRequest("POST", "/api/owner/screens", {
        ...data,
        pricePerDay: parseInt(data.pricePerDay),
        minBookingDays: parseInt(data.minBookingDays),
        durationPerSlot: parseInt(data.durationPerSlot),
        avgDailyFootfall: parseInt(data.avgDailyFootfall),
        avgDwellTime: data.avgDwellTime,
        playbackSlotsPerHour: parseInt(data.playbackSlotsPerHour),
        numberOfScreens: data.numberOfScreens ? parseInt(data.numberOfScreens) : null,
        interestSegments: data.interestSegments ? data.interestSegments.split(',').map(s => s.trim()) : [],
        customLocationTags: data.customLocationTags ? data.customLocationTags.split(',').map(s => s.trim()) : [],
        customAudienceTags: data.customAudienceTags ? data.customAudienceTags.split(',').map(s => s.trim()) : [],
        userIntent: data.userIntent,
        userMood: data.userMood,
        type: data.category,
        size: data.resolution,
        screenImages: data.screenImages,
        surroundingImages: data.surroundingImages,
        imageUrl: data.screenImages.length > 0 ? data.screenImages[0] : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Screen Added",
        description: "Your screen has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/screens"] });
      setLocation("/owner/screens");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ScreenFormData & { screenImages: string[]; surroundingImages: string[] }) => {
    createScreenMutation.mutate(data);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => setLocation("/owner/screens")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Screens
        </Button>
        <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Add New Screen</h1>
        <p className="text-muted-foreground">Comprehensive screen details for better targeting and campaign planning</p>
      </div>

      <ScreenForm
        onSubmit={handleSubmit}
        submitButtonText="Submit Screen for Approval"
        isLoading={createScreenMutation.isPending}
      />
    </div>
  );
}
