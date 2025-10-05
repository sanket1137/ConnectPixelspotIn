import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Calendar, DollarSign, TrendingUp, Eye, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface OwnerStats {
  totalScreens: number;
  activeScreens: number;
  pendingRequests: number;
  totalEarnings: number;
  thisMonthEarnings: number;
  totalBookings: number;
}

export default function OwnerDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Screen Owner Dashboard</h1>
          <p className="text-muted-foreground">Manage your screens and track earnings</p>
        </div>
        <Button onClick={() => setLocation("/owner/screens/new")} size="lg" data-testid="button-add-screen">
          <MapPin className="mr-2 h-5 w-5" />
          Add New Screen
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Screens
            </CardTitle>
            <Monitor className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-total-screens">
              {stats?.totalScreens || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {stats?.activeScreens || 0} active
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Requests
            </CardTitle>
            <Calendar className="h-5 w-5 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-pending-requests">
              {stats?.pendingRequests || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Awaiting your response
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-5 w-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-total-earnings">
              ₹{((stats?.totalEarnings || 0) / 1000).toFixed(1)}K
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              <span className="text-chart-2">₹{((stats?.thisMonthEarnings || 0) / 1000).toFixed(1)}K</span>
              <span className="text-muted-foreground">this month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screen Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Screen Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Digital Billboard - MG Road</h3>
                  <p className="text-sm text-muted-foreground">Bangalore • 10x20 ft</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">₹45,000</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">LED Display - Connaught Place</h3>
                  <p className="text-sm text-muted-foreground">Delhi • 8x12 ft</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">₹38,000</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-6" onClick={() => setLocation("/owner/screens")}>
            <Eye className="mr-2 h-4 w-4" />
            View All Screens
          </Button>
        </CardContent>
      </Card>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Booking Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.pendingRequests === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No pending requests</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You have {stats?.pendingRequests} pending booking requests
              </p>
              <Button onClick={() => setLocation("/owner/requests")} className="w-full">
                View Requests
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
