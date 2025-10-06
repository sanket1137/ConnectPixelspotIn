import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Monitor, Plus } from "lucide-react";
import type { Screen } from "@shared/schema";

export default function ManageScreens() {
  const [, setLocation] = useLocation();
  const { data: screens = [], isLoading } = useQuery<Screen[]>({
    queryKey: ["/api/admin/screens"],
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
