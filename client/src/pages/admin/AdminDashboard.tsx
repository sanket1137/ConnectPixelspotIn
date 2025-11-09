import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Monitor, FileText, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import GuidedTour from "@/components/GuidedTour";
import { Step } from "react-joyride";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface DashboardStats {
  totalUsers: number;
  totalScreens: number;
  totalCampaigns: number;
  totalRevenue: number;
  pendingScreens: number;
  pendingBookings: number;
  activeUsers: number;
  growthRate: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [runTour, setRunTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  useEffect(() => {
    if (tourCompleted) return;
    
    const params = new URLSearchParams(window.location.search);
    const shouldRunTour = params.get('tour') === 'true';
    
    if (shouldRunTour || (user && user.profileCompleted && !user.hasSeenOnboarding)) {
      setTimeout(() => setRunTour(true), 500);
      
      if (shouldRunTour) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [user, tourCompleted]);

  const handleTourComplete = async () => {
    setRunTour(false);
    setTourCompleted(true);
    try {
      await apiRequest("/api/profile/complete-onboarding", {
        method: "POST",
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    } catch (error) {
      console.error("Failed to mark onboarding complete:", error);
    }
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="admin-welcome"]',
      content: 'Welcome to Pixelspot Admin! Let me show you around the platform controls and features.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '[data-tour="stats-grid"]',
      content: 'Your dashboard shows platform-wide metrics at a glance - users, screens, active campaigns, and revenue.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="pending-screens"]',
      content: 'Monitor screens awaiting approval. Review submissions from screen owners and approve quality listings.',
      placement: 'top',
    },
    {
      target: '[data-tour="pending-bookings"]',
      content: 'Booking requests that need your attention. You can approve campaigns or bypass screen owner approval for urgent requests.',
      placement: 'top',
    },
    {
      target: '[data-tour="sidebar-manage-users"]',
      content: 'Click here to manage all platform users - advertisers and screen owners. View profiles and handle account issues.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-manage-screens"]',
      content: 'Access the complete screen directory here. Approve new screens, manage existing ones, or handle rejections.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-campaigns-&-bookings"]',
      content: 'Manage all campaign bookings from this page. Approve campaigns, track booking workflow, and monitor approvals.',
      placement: 'right',
    },
    {
      target: '[data-tour="sidebar-ai-conversations"]',
      content: 'Monitor AI chatbot usage! Track how advertisers interact with the AI Campaign Advisor and view conversation analytics.',
      placement: 'right',
    },
  ];

  const statCards = [
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      change: "+12%",
      positive: true,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Total Screens",
      value: stats?.totalScreens || 0,
      icon: Monitor,
      change: "+8%",
      positive: true,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Active Campaigns",
      value: stats?.totalCampaigns || 0,
      icon: FileText,
      change: "+15%",
      positive: true,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Total Revenue",
      value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`,
      icon: DollarSign,
      change: "+23%",
      positive: true,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div data-tour="admin-welcome">
        <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of your platform's performance and metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" data-tour="stats-grid">
        {statCards.map((stat) => (
          <Card key={stat.title} className="hover-elevate" data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                {stat.value}
              </div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                {stat.positive ? (
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
                <span className={stat.positive ? "text-chart-2" : "text-destructive"}>
                  {stat.change}
                </span>
                <span className="text-muted-foreground">from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card data-tour="pending-screens">
          <CardHeader>
            <CardTitle>Pending Screens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground mb-2" data-testid="text-pending-screens">
              {stats?.pendingScreens || 0}
            </div>
            <p className="text-sm text-muted-foreground">Screens awaiting approval</p>
          </CardContent>
        </Card>

        <Card data-tour="pending-bookings">
          <CardHeader>
            <CardTitle>Pending Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground mb-2" data-testid="text-pending-bookings">
              {stats?.pendingBookings || 0}
            </div>
            <p className="text-sm text-muted-foreground">Bookings awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-tour="quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <button className="p-6 border border-border rounded-lg hover-elevate text-left transition-all">
            <Users className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Manage Users</h3>
            <p className="text-sm text-muted-foreground">View and manage platform users</p>
          </button>

          <button className="p-6 border border-border rounded-lg hover-elevate text-left transition-all">
            <Monitor className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Add Screen</h3>
            <p className="text-sm text-muted-foreground">Add admin-owned screens</p>
          </button>

          <button className="p-6 border border-border rounded-lg hover-elevate text-left transition-all">
            <FileText className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">View Reports</h3>
            <p className="text-sm text-muted-foreground">Access analytics and insights</p>
          </button>
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
