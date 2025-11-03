import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, MapPin, Edit, Trash2, Eye, Plus, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Screen } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScreensList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [screenToDelete, setScreenToDelete] = useState<string | null>(null);
  
  const { data: screens = [], isLoading } = useQuery<Screen[]>({
    queryKey: ["/api/owner/screens"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (screenId: string) => {
      const response = await apiRequest("DELETE", `/api/owner/screens/${screenId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/screens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      toast({
        title: "Screen Deleted",
        description: "The screen has been deleted successfully.",
      });
      setScreenToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "pending":
        return "secondary";
      case "inactive":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground font-serif mb-2">My Screens</h1>
          <p className="text-muted-foreground">Manage your digital advertising screens</p>
        </div>
        <Button onClick={() => setLocation("/owner/screens/new")} size="lg" data-testid="button-add-screen">
          <Plus className="mr-2 h-5 w-5" />
          Add New Screen
        </Button>
      </div>

      {screens.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Monitor className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No screens yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start monetizing your digital displays by adding your first screen to the platform.
              </p>
            </div>
            <Button onClick={() => setLocation("/owner/screens/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add Your First Screen
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {screens.map((screen) => (
            <Card key={screen.id} className="overflow-hidden hover-elevate" data-testid={`card-screen-${screen.id}`}>
              <div className="aspect-video bg-muted flex items-center justify-center">
                {(screen.screenImages && screen.screenImages[0]) || (screen.images && screen.images[0]) ? (
                  <img
                    src={(screen.screenImages?.[0] ?? screen.images?.[0]) || ''}
                    alt={screen.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Monitor className="h-16 w-16 text-muted-foreground" />
                )}
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-foreground text-lg">{screen.name}</h3>
                    <Badge variant={getStatusColor(screen.status)}>{screen.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <span>{screen.location}, {screen.city}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{screen.type} • {screen.size}</p>
                </div>

                {screen.status === "inactive" && screen.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong className="block mb-1">Rejected by Admin:</strong>
                      {screen.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-bold text-foreground">₹{screen.pricePerDay}/day</p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setSelectedScreen(screen)}
                      data-testid={`button-view-${screen.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setLocation(`/owner/screens/edit/${screen.id}`)}
                      data-testid={`button-edit-${screen.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setScreenToDelete(screen.id)}
                      data-testid={`button-delete-${screen.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
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
                    <span className="text-muted-foreground">Venue Category:</span>
                    <p className="font-medium">{selectedScreen.venueCategory}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Traffic Type:</span>
                    <p className="font-medium">{selectedScreen.trafficType}</p>
                  </div>
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
                </div>
              </div>

              {/* Commercial Data */}
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
              <div className="pt-4 border-t space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={selectedScreen.status === "active" ? "default" : "secondary"} className="ml-2">
                    {selectedScreen.status}
                  </Badge>
                </div>
                {selectedScreen.status === "inactive" && selectedScreen.rejectionReason && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong className="block mb-1">Rejection Reason:</strong>
                      {selectedScreen.rejectionReason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!screenToDelete} onOpenChange={(open) => !open && setScreenToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Screen</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this screen? This action cannot be undone and will remove the screen from your listings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => screenToDelete && deleteMutation.mutate(screenToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-screen"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
