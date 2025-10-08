import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Monitor, Plus, Check, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import type { Screen } from "@shared/schema";

export default function ManageScreens() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  
  const { data: screens = [], isLoading } = useQuery<Screen[]>({
    queryKey: ["/api/admin/screens"],
  });

  const approveMutation = useMutation({
    mutationFn: async (screenId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/screens/${screenId}/approve`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
      toast({
        title: "Screen Approved",
        description: "The screen has been activated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (screenId: string) => {
      const response = await apiRequest("PATCH", `/api/admin/screens/${screenId}/reject`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
      toast({
        title: "Screen Rejected",
        description: "The screen has been rejected and marked as inactive.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeVariant = (status: string) => {
    if (status === "active") return "default";
    if (status === "pending") return "secondary";
    return "outline";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Manage Screens</h1>
          <p className="text-muted-foreground mt-1">View and manage all screens on the platform</p>
        </div>
        <Button onClick={() => setLocation("/admin/screens/new")} data-testid="button-add-screen">
          <Plus className="h-4 w-4 mr-2" />
          Add Screen for Owner
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading screens...</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {screens.map((screen) => (
            <Card key={screen.id} data-testid={`card-screen-${screen.id}`}>
              <CardHeader className="gap-2 space-y-0 pb-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant={getStatusBadgeVariant(screen.status)}>
                    {screen.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{screen.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {screen.location}, {screen.city}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{screen.type}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{screen.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price:</span>
                  <span className="font-bold text-primary">₹{screen.pricePerDay}/day</span>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedScreen(screen)}
                    className="flex-1"
                    data-testid={`button-view-details-${screen.id}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
                
                {screen.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(screen.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex-1"
                      data-testid={`button-approve-${screen.id}`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(screen.id)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="flex-1"
                      data-testid={`button-reject-${screen.id}`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Screen Details Dialog */}
      <Dialog open={!!selectedScreen} onOpenChange={(open) => !open && setSelectedScreen(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedScreen?.name}</DialogTitle>
            <DialogDescription>Complete screen information and specifications</DialogDescription>
          </DialogHeader>
          
          {selectedScreen && (
            <div className="space-y-6">
              {/* Section 1 - Screen Identity */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Screen Identity</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-medium">{selectedScreen.category || selectedScreen.type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Display Format:</span>
                    <p className="font-medium">{selectedScreen.displayFormat}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Resolution:</span>
                    <p className="font-medium">{selectedScreen.resolution}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration Per Slot:</span>
                    <p className="font-medium">{selectedScreen.durationPerSlot} seconds</p>
                  </div>
                </div>
              </div>

              {/* Section 2 - Location & Context */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Location & Context</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Venue Name:</span>
                    <p className="font-medium">{selectedScreen.venueName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>
                    <p className="font-medium">{selectedScreen.location}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">City:</span>
                    <p className="font-medium">{selectedScreen.city}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pincode:</span>
                    <p className="font-medium">{selectedScreen.pincode}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Coordinates:</span>
                    <p className="font-medium">{selectedScreen.latitude}, {selectedScreen.longitude}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Venue Category:</span>
                    <p className="font-medium">{selectedScreen.venueCategory}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Daily Footfall:</span>
                    <p className="font-medium">{selectedScreen.avgDailyFootfall?.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Traffic Type:</span>
                    <p className="font-medium">{selectedScreen.trafficType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Environment Type:</span>
                    <p className="font-medium">{selectedScreen.environmentType}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Time of Day Activity:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedScreen.timeOfDayActivity?.map((time) => (
                        <Badge key={time} variant="secondary" className="text-xs">{time}</Badge>
                      ))}
                    </div>
                  </div>
                  {selectedScreen.nearbyLandmarks && selectedScreen.nearbyLandmarks.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Nearby Landmarks:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedScreen.nearbyLandmarks.map((landmark) => (
                          <Badge key={landmark} variant="outline" className="text-xs">{landmark}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3 - Audience Demographics */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Audience Demographics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Primary Age Groups:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedScreen.primaryAgeGroups?.map((age) => (
                        <Badge key={age} variant="secondary" className="text-xs">{age}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender Split:</span>
                    <p className="font-medium">
                      Male: {selectedScreen.genderSplit?.male}% | Female: {selectedScreen.genderSplit?.female}%
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Affluence Level:</span>
                    <p className="font-medium">{selectedScreen.affluenceLevel}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg Dwell Time:</span>
                    <p className="font-medium">{selectedScreen.avgDwellTime} minutes</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Occupation Mix:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedScreen.occupationMix?.map((occ) => (
                        <Badge key={occ} variant="secondary" className="text-xs">{occ}</Badge>
                      ))}
                    </div>
                  </div>
                  {selectedScreen.interestSegments && selectedScreen.interestSegments.length > 0 && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Interest Segments:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedScreen.interestSegments.map((interest) => (
                          <Badge key={interest} variant="outline" className="text-xs">{interest}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Commercial & Campaign Data */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Commercial Data</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedScreen.isMultiScreen && (
                    <div>
                      <span className="text-muted-foreground">Number of Screens:</span>
                      <p className="font-medium">{selectedScreen.numberOfScreens}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Price Per Day:</span>
                    <p className="font-bold text-primary">₹{selectedScreen.pricePerDay}/day</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Min Booking Days:</span>
                    <p className="font-medium">{selectedScreen.minBookingDays} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Playback Slots Per Hour:</span>
                    <p className="font-medium">{selectedScreen.playbackSlotsPerHour}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Content Types Supported:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedScreen.contentTypesSupported?.map((type) => (
                        <Badge key={type} variant="secondary" className="text-xs">{type}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={selectedScreen.status === "active" ? "default" : "secondary"} className="ml-2">
                    {selectedScreen.status}
                  </Badge>
                </div>
                {selectedScreen.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        approveMutation.mutate(selectedScreen.id);
                        setSelectedScreen(null);
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      data-testid="dialog-button-approve"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        rejectMutation.mutate(selectedScreen.id);
                        setSelectedScreen(null);
                      }}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      data-testid="dialog-button-reject"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
