import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MapPin, CreditCard, TrendingUp, Play, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface AdvertiserStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalSpent: number;
  pendingBookings: number;
}

export default function AdvertiserDashboard() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<AdvertiserStats>({
    queryKey: ["/api/advertiser/stats"],
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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
          <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Advertiser Dashboard</h1>
          <p className="text-muted-foreground">Create campaigns and discover advertising screens</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/advertiser/discover")} data-testid="button-find-screens">
            <MapPin className="mr-2 h-5 w-5" />
            Find Screens
          </Button>
          <Button onClick={() => setLocation("/advertiser/campaigns/new")} size="lg" data-testid="button-create-campaign">
            <Play className="mr-2 h-5 w-5" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
            <FileText className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-total-campaigns">
              {stats?.totalCampaigns || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
            <Play className="h-5 w-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-active-campaigns">
              {stats?.activeCampaigns || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
            <CheckCircle2 className="h-5 w-5 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-completed-campaigns">
              {stats?.completedCampaigns || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <CreditCard className="h-5 w-5 text-chart-4" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground" data-testid="text-total-spent">
              ₹{((stats?.totalSpent || 0) / 1000).toFixed(1)}K
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-foreground">Summer Sale Campaign</h3>
                  <Badge variant="default">Live</Badge>
                </div>
                <p className="text-sm text-muted-foreground">3 screens • Bangalore, Mumbai</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">₹75,000</p>
                <p className="text-sm text-muted-foreground">Budget</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg hover-elevate">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-foreground">Product Launch - Delhi NCR</h3>
                  <Badge variant="secondary">Scheduled</Badge>
                </div>
                <p className="text-sm text-muted-foreground">5 screens • Delhi, Noida, Gurgaon</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">₹1.2L</p>
                <p className="text-sm text-muted-foreground">Budget</p>
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-6" onClick={() => setLocation("/advertiser/campaigns")}>
            View All Campaigns
          </Button>
        </CardContent>
      </Card>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="p-6 border border-border rounded-lg space-y-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">1. Discover Screens</h3>
              <p className="text-sm text-muted-foreground">Browse available screens on the interactive map</p>
            </div>
          </div>

          <div className="p-6 border border-border rounded-lg space-y-3">
            <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-chart-2" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">2. Create Campaign</h3>
              <p className="text-sm text-muted-foreground">Set objectives, budget, and upload creatives</p>
            </div>
          </div>

          <div className="p-6 border border-border rounded-lg space-y-3">
            <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-chart-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">3. Track Performance</h3>
              <p className="text-sm text-muted-foreground">Monitor campaign status and bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
