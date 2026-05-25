// Agency Discover — browse screens and add them to a media plan
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Plus, ClipboardList } from "lucide-react";

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }

export default function AgencyDiscover() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: screens = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/agency/screens"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/screens");
      return res.json();
    },
  });

  const { data: plans = [] } = useQuery<any[]>({
    queryKey: ["/api/agency/media-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/media-plans");
      return res.json();
    },
  });

  const cities = ["all", ...Array.from(new Set(screens.map((s: any) => s.city).filter(Boolean)))].sort();

  const filtered = screens.filter((s: any) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q) || s.venueName?.toLowerCase().includes(q);
    const matchCity = cityFilter === "all" || s.city === cityFilter;
    return matchSearch && matchCity;
  });

  const draftPlans = plans.filter((p: any) => p.status !== "executed");

  const addToPlan = async (screen: any, planId: string) => {
    try {
      await apiRequest("POST", `/api/agency/media-plans/${planId}/items`, { screenId: screen.id, days: 1 });
      toast({ title: `${screen.name} added to plan` });
    } catch {
      toast({ title: "Failed to add screen", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Find Screens</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse {screens.length} available screens</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => setLocation("/agency/media-plans")}>
          <ClipboardList className="w-4 h-4" /> My Plans
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search screens…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All cities" />
          </SelectTrigger>
          <SelectContent>
            {cities.map((c) => (
              <SelectItem key={c} value={c}>{c === "all" ? "All Cities" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((screen: any) => (
            <Card key={screen.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="font-semibold text-sm leading-tight">{screen.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {screen.city}{screen.venueName ? ` – ${screen.venueName}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {screen.venueCategory && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{screen.venueCategory}</Badge>}
                  {screen.environmentType && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{screen.environmentType}</Badge>}
                  {screen.category && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{screen.category}</Badge>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <p className="text-base font-bold text-violet-700">{fmt(screen.pricePerDay)}<span className="text-xs font-normal text-muted-foreground">/day</span></p>
                    <p className="text-[10px] text-muted-foreground">{screen.avgDailyFootfall?.toLocaleString("en-IN")} daily footfall</p>
                  </div>
                  {draftPlans.length > 0 ? (
                    <Select onValueChange={(planId) => addToPlan(screen, planId)}>
                      <SelectTrigger className="w-32 h-8 text-xs gap-1">
                        <Plus className="w-3 h-3" />
                        <SelectValue placeholder="Add to plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {draftPlans.map((p: any) => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                      onClick={() => setLocation("/agency/media-plans/new")}>
                      <Plus className="w-3 h-3" /> New Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-16 text-muted-foreground">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No screens match your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
