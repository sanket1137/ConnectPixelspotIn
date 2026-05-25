import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, TrendingUp, Monitor, DollarSign, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgencyDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/agency/media-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/media-plans");
      return res.json();
    },
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["/api/agency/campaigns"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/campaigns");
      return res.json();
    },
  });

  const draftPlans    = plans.filter((p: any) => p.status === "draft").length;
  const executedPlans = plans.filter((p: any) => p.status === "executed").length;
  const totalSpend    = campaigns.reduce((s: number, c: any) => s + (c.budget || 0), 0);

  const statusColor: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-700",
    sent: "bg-blue-100 text-blue-700",
    executed: "bg-green-100 text-green-700",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">Agency Portal · Manage your media plans &amp; campaigns</p>
        </div>
        <Button onClick={() => setLocation("/agency/media-plans/new")} className="gap-2">
          <Plus className="w-4 h-4" /> New Media Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Total Plans"    value={plans.length}   color="bg-violet-500" />
        <StatCard icon={ClipboardList} label="Draft Plans"    value={draftPlans}     color="bg-yellow-500" />
        <StatCard icon={Monitor}       label="Live Campaigns" value={executedPlans}  color="bg-green-500" />
        <StatCard icon={DollarSign}    label="Total Spend"    value={`₹${totalSpend.toLocaleString("en-IN")}`} color="bg-blue-500" />
      </div>

      {/* Recent Plans */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">Recent Media Plans</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/agency/media-plans")} className="gap-1 text-xs">
            View all <ArrowRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No media plans yet</p>
              <p className="text-sm mt-1">Create your first plan to start media buying for your clients.</p>
              <Button className="mt-4 gap-2" onClick={() => setLocation("/agency/media-plans/new")}>
                <Plus className="w-4 h-4" /> Create Plan
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {plans.slice(0, 5).map((plan: any) => (
                <div
                  key={plan.id}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-muted/40 px-2 rounded-lg transition-colors"
                  onClick={() => setLocation(`/agency/media-plans/${plan.id}`)}
                >
                  <div>
                    <p className="font-medium text-sm">{plan.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Client: {plan.clientBrand}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">₹{(plan.budget || 0).toLocaleString("en-IN")}</span>
                    <Badge className={`text-xs ${statusColor[plan.status] || ""}`}>{plan.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Browse Screens", desc: "Find screens for your clients", href: "/agency/discover", icon: Monitor },
          { label: "Media Plans", desc: "View & manage all plans", href: "/agency/media-plans", icon: ClipboardList },
          { label: "Campaigns", desc: "Track executed campaigns", href: "/agency/campaigns", icon: TrendingUp },
        ].map((a) => (
          <Card
            key={a.href}
            className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation(a.href)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <a.icon className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
