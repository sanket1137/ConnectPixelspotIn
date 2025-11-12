import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MapPin, CreditCard, TrendingUp, Play, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import GuidedTour from "@/components/GuidedTour";
import { Step } from "react-joyride";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AdvertiserStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalSpent: number;
  pendingBookings: number;
}

export default function AdvertiserDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [runTour, setRunTour] = useState(false);
  
  const { data: stats, isLoading } = useQuery<AdvertiserStats>({
    queryKey: ["/api/advertiser/stats"],
  });

  useEffect(() => {
    // Only check the database value, not local state
    if (!user || user.hasSeenOnboarding) return;
    
    const params = new URLSearchParams(window.location.search);
    const shouldRunTour = params.get('tour') === 'true';
    
    if (shouldRunTour || (user.profileCompleted && !user.hasSeenOnboarding)) {
      setTimeout(() => setRunTour(true), 500);
      
      if (shouldRunTour) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user]);

  const handleTourComplete = () => {
    setRunTour(false);
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="advertiser-welcome"]',
      content: 'Welcome to Pixelspot! Let me show you how to launch powerful DOOH advertising campaigns across India.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="create-campaign-btn"]',
      content: 'Start here! Launch campaigns with our AI-powered 6-step workflow - set budget, select areas, target audience, and upload creatives.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="find-screens-btn"]',
      content: 'Discover screens! Browse our network on an interactive map or list view to find perfect advertising locations.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="stats-grid"]',
      content: 'Track your campaign performance, total spending, and active campaigns at a glance.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="sidebar-ai-campaign-advisor"]',
      content: 'Get expert advice! Chat with our AI advisor about targeting strategy, budget optimization, and campaign planning.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-my-campaigns"]',
      content: 'Manage all your campaigns here. View details, track status (pending/approved/live/completed), and edit rejected campaigns.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-find-screens"]',
      content: 'Screen discovery page with dual view - switch between interactive Google Maps and detailed list view for browsing.',
      placement: 'right',
    },
  ];

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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div data-tour="advertiser-welcome">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-serif mb-2">Advertiser Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Create campaigns and discover advertising screens</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setLocation("/advertiser/discover")} className="w-full sm:w-auto" data-testid="button-find-screens" data-tour="find-screens-btn">
            <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Find Screens
          </Button>
          <Button onClick={() => setLocation("/advertiser/campaigns/new")} className="w-full sm:w-auto" size="lg" data-testid="button-create-campaign" data-tour="create-campaign-btn">
            <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-2 md:grid-cols-4" data-tour="stats-grid">
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

      {/* Guided Tour */}
      <GuidedTour 
        steps={tourSteps}
        run={runTour}
        onFinish={handleTourComplete}
      />
    </div>
  );
}
