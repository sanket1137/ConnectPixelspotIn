import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, ExternalLink } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  approved:  "bg-blue-100 text-blue-700",
  live:      "bg-green-100 text-green-700",
  completed: "bg-gray-100 text-gray-600",
  rejected:  "bg-red-100 text-red-700",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AgencyCampaigns() {
  const [, setLocation] = useLocation();

  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/agency/campaigns"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/campaigns");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} created from your media plans
        </p>
      </div>

      {campaigns.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-semibold text-lg">No campaigns yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Execute a media plan to automatically create campaigns and bookings.
            </p>
            <Button onClick={() => setLocation("/agency/media-plans")}>View Media Plans</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any) => (
            <Card key={c.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-sm truncate">{c.name}</h2>
                      <Badge className={`text-xs ${STATUS_STYLE[c.status] || ""}`}>{c.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                    </p>
                    {c.summary && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">{c.summary}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-violet-700">₹{(c.budget || 0).toLocaleString("en-IN")}</p>
                    <Button
                      variant="ghost" size="sm" className="h-7 text-xs gap-1 mt-1"
                      onClick={() => setLocation(`/agency/campaigns/${c.id}`)}
                    >
                      <ExternalLink className="w-3 h-3" /> Details
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
