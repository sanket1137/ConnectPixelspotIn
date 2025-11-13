import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, Users, Monitor, DollarSign, FileText, TrendingDown, Calendar, CheckCircle, Clock, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";

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

interface AnalyticsData {
  stats: DashboardStats;
  chartData: ChartData;
  bookingsByStatus: Array<{ status: string; count: number; color: string }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  campaignsByObjective: Array<{ objective: string; count: number }>;
  usersByRole: Array<{ role: string; count: number }>;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function Analytics() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: chartData, isLoading: chartLoading } = useQuery<ChartData>({
    queryKey: ["/api/admin/chart-data"],
  });

  // Mock data for additional analytics (in real implementation, fetch from backend)
  const bookingsByStatus = [
    { status: "Approved", count: stats?.totalCampaigns ? Math.floor(stats.totalCampaigns * 0.6) : 0, color: COLORS[0] },
    { status: "Pending", count: stats?.pendingBookings || 0, color: COLORS[1] },
    { status: "Rejected", count: stats?.totalCampaigns ? Math.floor(stats.totalCampaigns * 0.1) : 0, color: COLORS[2] },
  ];

  const revenueByMonth = [
    { month: "Jul", revenue: (stats?.totalRevenue || 0) * 0.15 },
    { month: "Aug", revenue: (stats?.totalRevenue || 0) * 0.18 },
    { month: "Sep", revenue: (stats?.totalRevenue || 0) * 0.20 },
    { month: "Oct", revenue: (stats?.totalRevenue || 0) * 0.22 },
    { month: "Nov", revenue: (stats?.totalRevenue || 0) * 0.25 },
  ];

  const usersByRole = [
    { role: "Advertisers", count: stats ? Math.floor(stats.totalUsers * 0.65) : 0 },
    { role: "Screen Owners", count: stats ? Math.floor(stats.totalUsers * 0.30) : 0 },
    { role: "Admins", count: stats ? Math.floor(stats.totalUsers * 0.05) : 0 },
  ];

  const isLoading = statsLoading || chartLoading;

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Analytics</h1>
        <p className="text-muted-foreground">Platform-wide analytics and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate" data-testid="card-stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <div className="p-2 rounded-lg bg-chart-1/10">
              <DollarSign className="h-4 w-4 text-chart-1" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              ₹{((stats?.totalRevenue || 0) / 1000).toFixed(1)}K
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {(stats?.revenueGrowth || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={(stats?.revenueGrowth || 0) >= 0 ? "text-chart-2" : "text-destructive"}>
                {stats?.revenueGrowth && stats.revenueGrowth > 0 ? '+' : ''}{stats?.revenueGrowth || 0}%
              </span>
              <span className="text-muted-foreground">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-active-users">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Users
            </CardTitle>
            <div className="p-2 rounded-lg bg-chart-2/10">
              <Users className="h-4 w-4 text-chart-2" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.activeUsers || 0}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {(stats?.userGrowth || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={(stats?.userGrowth || 0) >= 0 ? "text-chart-2" : "text-destructive"}>
                {stats?.userGrowth && stats.userGrowth > 0 ? '+' : ''}{stats?.userGrowth || 0}%
              </span>
              <span className="text-muted-foreground">growth rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-screens">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Screens
            </CardTitle>
            <div className="p-2 rounded-lg bg-chart-3/10">
              <Monitor className="h-4 w-4 text-chart-3" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.totalScreens || 0}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {(stats?.screenGrowth || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={(stats?.screenGrowth || 0) >= 0 ? "text-chart-2" : "text-destructive"}>
                {stats?.screenGrowth && stats.screenGrowth > 0 ? '+' : ''}{stats?.screenGrowth || 0}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-campaigns">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Campaigns
            </CardTitle>
            <div className="p-2 rounded-lg bg-chart-4/10">
              <FileText className="h-4 w-4 text-chart-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {stats?.totalCampaigns || 0}
            </div>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {(stats?.campaignGrowth || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-chart-2" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className={(stats?.campaignGrowth || 0) >= 0 ? "text-chart-2" : "text-destructive"}>
                {stats?.campaignGrowth && stats.campaignGrowth > 0 ? '+' : ''}{stats?.campaignGrowth || 0}%
              </span>
              <span className="text-muted-foreground">campaign growth</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueByMonth}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                  formatter={(value: number) => `₹${value.toFixed(0)}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--chart-1))" 
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Growth */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Active users over last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
                <Line 
                  type="monotone" 
                  dataKey="users" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={3}
                  dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status</CardTitle>
            <CardDescription>Distribution of bookings</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={bookingsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {bookingsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Role</CardTitle>
            <CardDescription>User distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usersByRole} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="role" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Screen Onboarding */}
        <Card>
          <CardHeader>
            <CardTitle>Screen Status</CardTitle>
            <CardDescription>Onboarding progress</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData?.screenProgressData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(stats?.pendingScreens || 0) + (stats?.pendingBookings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingScreens || 0} screens, {stats?.pendingBookings || 0} bookings
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Campaigns
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {stats ? Math.floor(stats.totalCampaigns * 0.7) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently running
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Campaign Duration
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              14 days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average campaign length
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              68%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Booking approval rate
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
