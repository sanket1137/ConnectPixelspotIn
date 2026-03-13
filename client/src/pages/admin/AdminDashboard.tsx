import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Monitor, FileText, DollarSign, TrendingUp, TrendingDown, Phone, Mail, Building2, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import GuidedTour from "@/components/GuidedTour";
import { Step } from "react-joyride";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface DashboardStats {
  totalUsers: number;
  totalScreens: number;
  totalCampaigns: number;
  totalRevenue: number;
  pendingScreens: number;
  pendingBookings: number;
  activeUsers: number;
  userGrowth: number;
  screenGrowth: number;
  campaignGrowth: number;
  revenueGrowth: number;
}

interface ChartData {
  activeUsersData: Array<{ date: string; users: number }>;
  screenProgressData: Array<{ status: string; count: number }>;
  advertiserVisitsData: Array<{ date: string; visits: number }>;
}

interface DraftCampaign {
  id: string;
  name: string;
  budget: number;
  createdAt: string;
  summary?: string;
  advertiser: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    company?: string;
  };
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [runTour, setRunTour] = useState(false);
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<ChartData>({
    queryKey: ["/api/admin/chart-data"],
  });

  const { data: drafts = [] } = useQuery<DraftCampaign[]>({
    queryKey: ["/api/admin/campaigns/drafts"],
    refetchInterval: 60_000, // refresh every minute
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
      change: `${stats?.userGrowth && stats.userGrowth > 0 ? '+' : ''}${stats?.userGrowth || 0}%`,
      positive: (stats?.userGrowth || 0) >= 0,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Total Screens",
      value: stats?.totalScreens || 0,
      icon: Monitor,
      change: `${stats?.screenGrowth && stats.screenGrowth > 0 ? '+' : ''}${stats?.screenGrowth || 0}%`,
      positive: (stats?.screenGrowth || 0) >= 0,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Total Campaigns",
      value: stats?.totalCampaigns || 0,
      icon: FileText,
      change: `${stats?.campaignGrowth && stats.campaignGrowth > 0 ? '+' : ''}${stats?.campaignGrowth || 0}%`,
      positive: (stats?.campaignGrowth || 0) >= 0,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Total Revenue",
      value: `₹${((stats?.totalRevenue || 0) / 1000).toFixed(1)}K`,
      icon: DollarSign,
      change: `${stats?.revenueGrowth && stats.revenueGrowth > 0 ? '+' : ''}${stats?.revenueGrowth || 0}%`,
      positive: (stats?.revenueGrowth || 0) >= 0,
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

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Active Users Trend</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData?.activeUsersData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px"
                    }}
                  />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Screen Onboarding Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Screen Onboarding</CardTitle>
            <CardDescription>Current status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData?.screenProgressData || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, count }) => `${status}: ${count}`}
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {(chartData?.screenProgressData || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Advertiser Portal Visits */}
        <Card>
          <CardHeader>
            <CardTitle>Advertiser Activity</CardTitle>
            <CardDescription>Campaigns created per day</CardDescription>
          </CardHeader>
          <CardContent>
            {chartLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData?.advertiserVisitsData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px"
                    }}
                  />
                  <Bar dataKey="visits" fill="hsl(var(--chart-3))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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

      {/* Abandoned Drafts — Sales Leads */}
      {drafts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <CardTitle>Abandoned Campaign Drafts</CardTitle>
              <span className="ml-auto bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {drafts.length} lead{drafts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <CardDescription>
              Advertisers who started a campaign but didn't finish — reach out to convert them
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {drafts.map((draft) => {
                const draftState = (() => { try { return JSON.parse(draft.summary || "{}"); } catch { return {}; } })();
                const stepLabel = ["Name","Location","Screens","Duration","Validate","Creative","Review"][((draftState._step || 1) - 1)] || "Started";
                const ago = (() => {
                  const ms = Date.now() - new Date(draft.createdAt).getTime();
                  const h = Math.floor(ms / 3_600_000);
                  if (h < 1) return "< 1 hour ago";
                  if (h < 24) return `${h}h ago`;
                  return `${Math.floor(h / 24)}d ago`;
                })();
                return (
                  <div key={draft.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-amber-700">
                        {draft.advertiser.name?.charAt(0)?.toUpperCase() || "?"}
                      </span>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm truncate">{draft.advertiser.name}</p>
                        {draft.advertiser.company && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Building2 className="h-3 w-3" />{draft.advertiser.company}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        Campaign: <span className="text-foreground font-medium">{draft.name}</span>
                        <span className="mx-1.5 text-muted-foreground/40">·</span>
                        Stopped at <span className="font-medium text-amber-600">{stepLabel}</span>
                        <span className="mx-1.5 text-muted-foreground/40">·</span>
                        {ago}
                      </p>
                    </div>
                    {/* Contact actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {draft.advertiser.mobile && (
                        <a
                          href={`tel:${draft.advertiser.mobile}`}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          Call
                        </a>
                      )}
                      <a
                        href={`mailto:${draft.advertiser.email}?subject=Your Draft Campaign on Pixelspot&body=Hi ${draft.advertiser.name}, we noticed you started a campaign "${draft.name}" on Pixelspot. Can we help you complete it?`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 transition-colors"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card data-tour="quick-actions">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <button 
            onClick={() => setLocation("/admin/users")}
            className="p-6 border border-border rounded-lg hover-elevate active-elevate-2 text-left transition-all"
            data-testid="button-quick-manage-users"
          >
            <Users className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Manage Users</h3>
            <p className="text-sm text-muted-foreground">View and manage platform users</p>
          </button>

          <button 
            onClick={() => setLocation("/admin/screens/new")}
            className="p-6 border border-border rounded-lg hover-elevate active-elevate-2 text-left transition-all"
            data-testid="button-quick-add-screen"
          >
            <Monitor className="h-8 w-8 text-primary mb-3" />
            <h3 className="font-semibold text-foreground mb-1">Add Screen</h3>
            <p className="text-sm text-muted-foreground">Add admin-owned screens</p>
          </button>

          <button 
            onClick={() => setLocation("/admin/analytics")}
            className="p-6 border border-border rounded-lg hover-elevate active-elevate-2 text-left transition-all"
            data-testid="button-quick-view-reports"
          >
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
