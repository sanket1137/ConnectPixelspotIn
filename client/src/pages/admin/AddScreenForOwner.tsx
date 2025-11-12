import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ScreenForm, type ScreenFormData } from "@/components/ScreenForm";
import type { User } from "@shared/schema";

export default function AddScreenForOwner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const screenOwners = users.filter(user => user.role === "screen_owner");

  const createScreenMutation = useMutation({
    mutationFn: async (data: ScreenFormData & { screenImages: string[]; surroundingImages: string[] }) => {
      return apiRequest("POST", "/api/admin/screens/create", {
        ownerId: selectedOwnerId,
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
        imageUrl: data.screenImages[0] || null,
        screenImages: data.screenImages,
        surroundingImages: data.surroundingImages,
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

  const handleSubmit = (data: ScreenFormData & { screenImages: string[]; surroundingImages: string[] }) => {
    createScreenMutation.mutate(data);
  };

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

      <Card>
        <CardHeader>
          <CardTitle>Screen Owner</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Screen Owner</label>
            <Select onValueChange={setSelectedOwnerId} value={selectedOwnerId}>
              <SelectTrigger data-testid="select-owner">
                <SelectValue placeholder="Select a screen owner" />
              </SelectTrigger>
              <SelectContent>
                {screenOwners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name} ({owner.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedOwnerId && (
        <ScreenForm
          onSubmit={handleSubmit}
          submitButtonText="Add Screen for Owner"
          isLoading={createScreenMutation.isPending}
        />
      )}
    </div>
  );
}
