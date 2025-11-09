import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Monitor, Calendar, DollarSign, TrendingUp, Eye, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import GuidedTour from "@/components/GuidedTour";
import { Step } from "react-joyride";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  const { user } = useAuth();
  const [runTour, setRunTour] = useState(false);
  
  const { data: stats, isLoading } = useQuery<OwnerStats>({
    queryKey: ["/api/owner/stats"],
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldRunTour = params.get('tour') === 'true';
    
    if (shouldRunTour || (user && user.profileCompleted && !user.hasSeenOnboarding)) {
      setTimeout(() => setRunTour(true), 500);
      
      if (shouldRunTour) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user]);

  const handleTourComplete = async () => {
    setRunTour(false);
    try {
      await apiRequest("/api/profile/complete-onboarding", {
        method: "POST",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Failed to mark onboarding complete:", error);
    }
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="owner-welcome"]',
      content: 'Welcome to Pixelspot Screen Owner Portal! Let me show you how to monetize your digital screens.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="add-screen-btn"]',
      content: 'Start earning! Add screens with details like location, size, audience demographics, and operating hours.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="stats-grid"]',
      content: 'Monitor your screen inventory, active bookings, and total earnings in real-time.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="pending-requests"]',
      content: 'Review booking requests from advertisers. Approve campaigns, suggest alternative dates, or decline bookings.',
      placement: 'top',
    },
    {
      target: '[data-tour="sidebar-my-screens"]',
      content: 'Manage all your screens here. View details, edit information, or check approval status from admin.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-booking-requests"]',
      content: 'Handle all booking requests in one place. Approve campaigns, negotiate dates, and track booking workflow.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-earnings"]',
      content: 'Track your revenue! View monthly earnings, payment history, and see which screens generate the most income.',
      placement: 'right',
    },
  ];

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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div data-tour="owner-welcome">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground font-serif mb-2">Screen Owner Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your screens and track earnings</p>
        </div>
        <Button onClick={() => setLocation("/owner/screens/new")} size="lg" className="w-full sm:w-auto" data-testid="button-add-screen" data-tour="add-screen-btn">
          <MapPin className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          Add New Screen
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3" data-tour="stats-grid">
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

        <Card className="hover-elevate" data-tour="pending-requests">
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

      {/* Guided Tour */}
      <GuidedTour 
        steps={tourSteps}
        run={runTour}
        onFinish={handleTourComplete}
      />
    </div>
  );
}
