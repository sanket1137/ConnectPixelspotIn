import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, MapPin, Edit, Trash2, Eye, Plus } from "lucide-react";
import { useLocation } from "wouter";
import type { Screen } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScreensList() {
  const [, setLocation] = useLocation();
  const { data: screens = [], isLoading } = useQuery<Screen[]>({
    queryKey: ["/api/owner/screens"],
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
                {screen.images && screen.images[0] ? (
                  <img
                    src={screen.images[0]}
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

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-bold text-foreground">₹{screen.pricePerDay}/day</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" data-testid={`button-view-${screen.id}`}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" data-testid={`button-edit-${screen.id}`}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" data-testid={`button-delete-${screen.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
