import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { printMediaPlan } from "@/lib/mediaPlanPdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Save, Send, Play, Download, Trash2, Plus, ArrowLeft, Percent,
  MapPin, Building2, Eye, EyeOff, X, RefreshCw, SlidersHorizontal, Check,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { VENUE_CATEGORIES } from "@shared/constants";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(n: number) { return `₹${Math.round(n).toLocaleString("en-IN")}`; }

function toInputDate(d: string | Date) {
  return new Date(d).toISOString().split("T")[0];
}

// ─── Map-based Screen Picker ─────────────────────────────────────────────────

function ScreenPickerModal({
  open, onClose, onAdd, existingIds,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (screen: any) => void;
  existingIds: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("all");
  const [venueCategory, setVenueCategory] = useState("all");
  const [envType, setEnvType] = useState("all");
  const [selected, setSelected] = useState<any>(null);

  const { data: screens = [] } = useQuery<any[]>({
    queryKey: ["/api/agency/screens"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/screens");
      return res.json();
    },
    enabled: open,
  });

  const cities = ["all", ...Array.from(new Set(screens.map((s: any) => s.city).filter(Boolean))).sort()];
  const envTypes = ["all", ...Array.from(new Set(screens.map((s: any) => s.environmentType).filter(Boolean))).sort()];

  const filtered = screens.filter((s: any) => {
    const q = search.toLowerCase();
    if (q && !s.name?.toLowerCase().includes(q) && !s.city?.toLowerCase().includes(q) &&
        !s.venueName?.toLowerCase().includes(q) && !s.pincode?.includes(q)) return false;
    if (city !== "all" && s.city !== city) return false;
    if (venueCategory !== "all" && s.venueCategory !== venueCategory) return false;
    if (envType !== "all" && s.environmentType !== envType) return false;
    return true;
  });

  const mapScreens = filtered.filter((s: any) => s.latitude && s.longitude);
  const defaultCenter = mapScreens.length > 0
    ? { lat: parseFloat(mapScreens[0].latitude), lng: parseFloat(mapScreens[0].longitude) }
    : { lat: 20.5937, lng: 78.9629 };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b px-4 py-3 flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        <h2 className="font-semibold text-base flex-1">Add Screens — Map View</h2>
        <span className="text-xs text-muted-foreground">{filtered.length} screens shown</span>
      </div>

      {/* Filters bar */}
      <div className="bg-background border-b px-4 py-2 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="h-8 pl-8 pr-3 text-xs rounded-md border bg-background w-44 focus:outline-none focus:ring-1 focus:ring-violet-500"
            placeholder="Search name / pincode / area…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelected(null); }}
          />
        </div>

        <Select value={city} onValueChange={(v) => { setCity(v); setSelected(null); }}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Cities" /></SelectTrigger>
          <SelectContent>
            {cities.map((c) => <SelectItem key={c} value={c} className="text-xs">{c === "all" ? "All Cities" : c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={venueCategory} onValueChange={(v) => { setVenueCategory(v); setSelected(null); }}>
          <SelectTrigger className="h-8 text-xs w-40"><SelectValue placeholder="All Venues" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Venues</SelectItem>
            {VENUE_CATEGORIES.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={envType} onValueChange={(v) => { setEnvType(v); setSelected(null); }}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Environment" /></SelectTrigger>
          <SelectContent>
            {envTypes.map((t) => <SelectItem key={t} value={t} className="text-xs">{t === "all" ? "All Environments" : t}</SelectItem>)}
          </SelectContent>
        </Select>

        {(search || city !== "all" || venueCategory !== "all" || envType !== "all") && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => { setSearch(""); setCity("all"); setVenueCategory("all"); setEnvType("all"); setSelected(null); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Map
          id="agency-screen-picker-map"
          style={{ width: "100%", height: "100%" }}
          defaultCenter={defaultCenter}
          defaultZoom={mapScreens.length === 1 ? 13 : 6}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          mapId="agency-screen-picker-map"
        >
          {mapScreens.map((s: any) => {
            const isAlreadyAdded = existingIds.has(s.id);
            const isInfoOpen = selected?.id === s.id;
            return (
              <AdvancedMarker
                key={s.id}
                position={{ lat: parseFloat(s.latitude), lng: parseFloat(s.longitude) }}
                onClick={() => setSelected(isInfoOpen ? null : s)}
              >
                <div style={{ cursor: "pointer" }}>
                  <svg width="40" height="40" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="10" width="32" height="22" rx="2"
                      fill={isAlreadyAdded ? "#10b981" : "#7c3aed"} stroke="white" strokeWidth="2" />
                    <rect x="10" y="12" width="28" height="18"
                      fill={isAlreadyAdded ? "#059669" : "#6d28d9"} rx="1" />
                    <rect x="20" y="32" width="8" height="2" fill={isAlreadyAdded ? "#10b981" : "#7c3aed"} />
                    <rect x="16" y="34" width="16" height="3" rx="1" fill={isAlreadyAdded ? "#10b981" : "#7c3aed"} />
                  </svg>
                </div>
              </AdvancedMarker>
            );
          })}

          {selected && selected.latitude && selected.longitude && (
            <InfoWindow
              position={{ lat: parseFloat(selected.latitude), lng: parseFloat(selected.longitude) }}
              onCloseClick={() => setSelected(null)}
              maxWidth={300}
              pixelOffset={[0, -12]}
            >
              <div style={{ width: 280 }}>
                {/* Screen image */}
                <div style={{ height: 140, background: "#e5e7eb", borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
                  {(selected.screenImages?.[0] || selected.images?.[0]) ? (
                    <img src={selected.screenImages?.[0] ?? selected.images?.[0]}
                      alt={selected.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => { e.currentTarget.src = "https://placehold.co/600x400/1a1a1a/666?text=No+Image"; }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <MapPin style={{ width: 36, height: 36, color: "#9ca3af" }} />
                    </div>
                  )}
                </div>

                <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "#111827" }}>{selected.name}</p>
                <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>
                  {selected.city}{selected.venueName ? ` – ${selected.venueName}` : ""}
                </p>

                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
                  {selected.venueCategory && (
                    <span style={{ fontSize: 10, border: "1px solid #d1d5db", borderRadius: 4, padding: "2px 6px", color: "#374151" }}>
                      {selected.venueCategory}
                    </span>
                  )}
                  {selected.environmentType && (
                    <span style={{ fontSize: 10, border: "1px solid #d1d5db", borderRadius: 4, padding: "2px 6px", color: "#374151" }}>
                      {selected.environmentType}
                    </span>
                  )}
                  {(selected.lifestyleTags || []).slice(0, 2).map((t: string) => (
                    <span key={t} style={{ fontSize: 10, background: "#f3f4f6", borderRadius: 4, padding: "2px 6px", color: "#374151" }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
                  <div>
                    <p style={{ fontSize: 10, color: "#6b7280" }}>Per day</p>
                    <p style={{ fontWeight: 700, fontSize: 16, color: "#7c3aed" }}>₹{selected.pricePerDay?.toLocaleString("en-IN")}</p>
                  </div>
                  {existingIds.has(selected.id) ? (
                    <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check style={{ width: 14, height: 14 }} /> Added
                    </span>
                  ) : (
                    <button
                      onClick={() => { onAdd(selected); setSelected(null); }}
                      style={{
                        background: "#7c3aed", color: "white", border: "none",
                        borderRadius: 6, padding: "7px 14px", fontSize: 12,
                        fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                      }}
                    >
                      + Add to Plan
                    </button>
                  )}
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>

        {mapScreens.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50 text-center">
            <div>
              <MapPin className="w-10 h-10 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground font-medium">No screens with location data match your filters.</p>
              <button className="text-xs text-violet-600 mt-1 underline" onClick={() => { setSearch(""); setCity("all"); setVenueCategory("all"); setEnvType("all"); }}>
                Clear filters
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MediaPlanBuilder() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Plan header state
  const [name, setName] = useState("");
  const [clientBrand, setClientBrand] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [margin, setMargin] = useState(0);
  const [notes, setNotes] = useState("");
  const [showMargin, setShowMargin] = useState(false);

  // Items state (local, synced to server)
  const [items, setItems] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [executeDialog, setExecuteDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [planId, setPlanId] = useState<string | null>(id || null);

  // Load existing plan
  const { data: planData, isLoading } = useQuery<any>({
    queryKey: [`/api/agency/media-plans/${id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agency/media-plans/${id}`);
      return res.json();
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (planData) {
      setName(planData.name || "");
      setClientBrand(planData.clientBrand || "");
      setStartDate(toInputDate(planData.startDate));
      setEndDate(toInputDate(planData.endDate));
      setBudget(String(planData.budget || 0));
      setMargin(planData.agencyMargin || 0);
      setNotes(planData.notes || "");
      setItems(planData.items || []);
    }
  }, [planData]);

  // ── Calculated values ──────────────────────────────────────────
  const netTotal = items
    .filter((i) => i.status === "included")
    .reduce((s, i) => s + (i.totalPrice || i.days * i.pricePerDay), 0);

  const multiplier = 1 + margin / 100;
  const clientTotal = Math.round(netTotal * multiplier);

  // ── Save (create or update) ────────────────────────────────────
  const savePlan = async () => {
    if (!name || !clientBrand || !startDate || !endDate) {
      toast({ title: "Please fill name, client, start & end date", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name, clientBrand,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        budget: clientTotal,
        agencyMargin: margin,
        notes: notes || null,
      };

      if (isNew && !planId) {
        // Create
        const res = await apiRequest("POST", "/api/agency/media-plans", payload);
        const created = await res.json();
        setPlanId(created.id);
        setLocation(`/agency/media-plans/${created.id}`, { replace: true });
        toast({ title: "Plan created ✓" });
      } else {
        // Update
        await apiRequest("PUT", `/api/agency/media-plans/${planId}`, payload);
        qc.invalidateQueries({ queryKey: [`/api/agency/media-plans/${planId}`] });
        qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
        toast({ title: "Plan saved ✓" });
      }
    } catch {
      toast({ title: "Failed to save plan", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Add screen to plan ─────────────────────────────────────────
  const addScreen = async (screen: any) => {
    if (!planId) {
      toast({ title: "Save the plan first before adding screens", variant: "destructive" });
      return;
    }
    // Auto-calculate days from plan date range
    const calculatedDays = (startDate && endDate)
      ? Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    try {
      const res = await apiRequest("POST", `/api/agency/media-plans/${planId}/items`, {
        screenId: screen.id, days: calculatedDays,
      });
      const item = await res.json();
      setItems((prev) => [...prev, { ...item, screen }]);
      toast({ title: `${screen.name} added (${calculatedDays} day${calculatedDays !== 1 ? "s" : ""})` });
    } catch {
      toast({ title: "Failed to add screen", variant: "destructive" });
    }
  };

  // ── Update days for an item ────────────────────────────────────
  const updateDays = async (itemId: string, days: number) => {
    if (!planId || days < 1) return;
    setItems((prev) =>
      prev.map((i) => i.id === itemId
        ? { ...i, days, totalPrice: i.pricePerDay * days }
        : i)
    );
    try {
      await apiRequest("PUT", `/api/agency/media-plans/${planId}/items/${itemId}`, { days });
    } catch {
      toast({ title: "Failed to update days", variant: "destructive" });
    }
  };

  // ── Remove screen from plan ────────────────────────────────────
  const removeItem = async (itemId: string) => {
    if (!planId) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    try {
      await apiRequest("DELETE", `/api/agency/media-plans/${planId}/items/${itemId}`);
    } catch {
      toast({ title: "Failed to remove screen", variant: "destructive" });
    }
  };

  // ── Mark as sent ───────────────────────────────────────────────
  const markSent = async () => {
    if (!planId) { await savePlan(); return; }
    try {
      await apiRequest("POST", `/api/agency/media-plans/${planId}/send`);
      qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
      toast({ title: "Plan marked as sent" });
      // Auto-print
      handleDownload();
    } catch {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  // ── Execute plan ───────────────────────────────────────────────
  const executePlan = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agency/media-plans/${planId}/execute`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `Campaign created — ${data.bookingsCreated} bookings submitted ✓` });
      qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
      setLocation("/agency/campaigns");
    },
    onError: () => toast({ title: "Failed to execute plan", variant: "destructive" }),
  });

  // ── Download / Print ───────────────────────────────────────────
  const handleDownload = () => {
    printMediaPlan({
      plan: {
        name, clientBrand,
        startDate: startDate || new Date().toISOString(),
        endDate: endDate || new Date().toISOString(),
        notes,
        agencyMargin: margin,
        agencyName: user?.companyName || user?.name || "Agency",
      },
      items: items
        .filter((i) => i.status === "included")
        .map((i) => ({
          screenName: i.screen?.name || i.screenId,
          venueName: i.screen?.venueName || "",
          city: i.screen?.city || "",
          state: i.screen?.state || "",
          location: i.screen?.location || "",
          venueCategory: i.screen?.venueCategory || "",
          environmentType: i.screen?.environmentType || "",
          category: i.screen?.category || "",
          days: i.days,
          pricePerDay: i.pricePerDay,
          totalPrice: i.totalPrice || i.days * i.pricePerDay,
          notes: i.notes,
        })),
    });
  };

  const existingIds = new Set(items.map((i) => i.screenId));
  const isExecuted = planData?.status === "executed";

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-48 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/agency/media-plans")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{isNew ? "New Media Plan" : name || "Media Plan"}</h1>
          {planData?.status && (
            <Badge variant="outline" className="mt-0.5 text-xs">
              {planData.status}
            </Badge>
          )}
        </div>
        {/* Action buttons */}
        {!isExecuted && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={savePlan} disabled={isSaving}>
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload} disabled={!planId}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 border-blue-300 text-blue-600 hover:bg-blue-50"
              onClick={markSent} disabled={!planId || items.length === 0}>
              <Send className="w-3.5 h-3.5" /> Send to Client
            </Button>
            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700"
              onClick={() => setExecuteDialog(true)} disabled={!planId || items.length === 0}>
              <Play className="w-3.5 h-3.5" /> Execute
            </Button>
          </div>
        )}
        {isExecuted && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
              <Download className="w-3.5 h-3.5" /> Download
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left col: Plan details + margin ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Plan Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q3 Launch – Nike" disabled={isExecuted} />
              </div>
              <div>
                <Label className="text-xs">Client / Brand *</Label>
                <Input value={clientBrand} onChange={(e) => setClientBrand(e.target.value)}
                  placeholder="Client or brand name" disabled={isExecuted} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Date *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={isExecuted} />
                </div>
                <div>
                  <Label className="text-xs">End Date *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={isExecuted} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Client Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes for the client…" rows={2} disabled={isExecuted} />
              </div>
            </CardContent>
          </Card>

          {/* Margin — internal only, never in PDF */}
          {!isExecuted && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">Agency Margin</p>
                    <p className="text-[11px] text-muted-foreground">Hidden from client PDF</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    onClick={() => setShowMargin((v) => !v)}>
                    {showMargin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showMargin ? "number" : "password"}
                      min={0} max={99}
                      value={margin}
                      onChange={(e) => setMargin(Math.min(99, Math.max(0, Number(e.target.value))))}
                      className="pr-8"
                    />
                    <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  </div>
                  {showMargin && margin > 0 && (
                    <span className="text-xs text-amber-600 font-medium">
                      +{fmt(clientTotal - netTotal)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget summary */}
          <Card className="border-0 shadow-sm bg-violet-50">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net (screens)</span>
                <span className="font-medium">{fmt(netTotal)}</span>
              </div>
              {margin > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Margin ({margin}%)</span>
                  <span className="font-medium text-amber-600">+{fmt(clientTotal - netTotal)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-base font-bold">
                <span>Client Total</span>
                <span className="text-violet-700">{fmt(clientTotal)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Margin is not shown in the client PDF</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Right col: Screen line items ── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">
              Screens in Plan
              <span className="ml-2 text-muted-foreground font-normal">
                ({items.filter((i) => i.status === "included").length})
              </span>
            </h2>
            {!isExecuted && (
              <Button size="sm" variant="outline" className="gap-1.5"
                onClick={() => {
                  if (!planId) { savePlan().then(() => setPickerOpen(true)); }
                  else setPickerOpen(true);
                }}>
                <Plus className="w-4 h-4" /> Add Screen
              </Button>
            )}
          </div>

          {items.filter((i) => i.status === "included").length === 0 ? (
            <Card className="border-0 shadow-sm border-2 border-dashed">
              <CardContent className="py-12 text-center">
                <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="font-medium text-muted-foreground">No screens added yet</p>
                <p className="text-sm text-muted-foreground mt-1">Click "Add Screen" to browse and add screens.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-2 px-3 text-[11px] text-muted-foreground font-medium">
                <div className="col-span-4">Screen</div>
                <div className="col-span-3">City &amp; Area</div>
                <div className="col-span-1 text-center">Days</div>
                <div className="col-span-2 text-right">Net / Day</div>
                <div className="col-span-2 text-right">Client Total</div>
              </div>

              {items
                .filter((i) => i.status === "included")
                .map((item) => {
                  const s = item.screen || {};
                  const cityArea = `${s.city || ""}${s.venueName ? ` – ${s.venueName}` : ""}`;
                  const net = item.totalPrice || item.days * item.pricePerDay;
                  const clientAmt = Math.round(net * multiplier);

                  return (
                    <Card key={item.id} className="border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="md:grid md:grid-cols-12 md:gap-2 md:items-center space-y-2 md:space-y-0">

                          {/* Screen name + tags */}
                          <div className="md:col-span-4">
                            <p className="font-medium text-sm leading-tight">{s.name || item.screenId}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {s.venueCategory && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{s.venueCategory}</Badge>
                              )}
                              {(s.lifestyleTags || []).slice(0, 2).map((t: string) => (
                                <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0">{t}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* City & Area */}
                          <div className="md:col-span-3">
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="line-clamp-1">{cityArea}</span>
                            </p>
                            {s.environmentType && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{s.environmentType}</p>
                            )}
                          </div>

                          {/* Days input */}
                          <div className="md:col-span-1 flex items-center justify-center">
                            <Input
                              type="number" min={1}
                              value={item.days}
                              onChange={(e) => updateDays(item.id, Number(e.target.value))}
                              className="h-7 text-xs text-center w-14"
                              disabled={isExecuted}
                            />
                          </div>

                          {/* Net per day (internal reference) */}
                          <div className="md:col-span-2 text-right">
                            <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {fmt(item.pricePerDay)}
                            </p>
                          </div>

                          {/* Client-facing total + delete */}
                          <div className="md:col-span-2 flex items-center justify-end gap-1">
                            <p className="text-sm font-bold text-violet-700 whitespace-nowrap">{fmt(clientAmt)}</p>
                            {!isExecuted && (
                              <Button
                                variant="ghost" size="icon"
                                className="h-6 w-6 text-red-400 hover:text-red-500 shrink-0"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>

                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Screen Picker Modal */}
      <ScreenPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={addScreen}
        existingIds={existingIds}
      />

      {/* Execute Confirmation Dialog */}
      <AlertDialog open={executeDialog} onOpenChange={setExecuteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Execute this media plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a campaign and submit booking requests for all{" "}
              {items.filter((i) => i.status === "included").length} screen(s) at a
              client total of <strong>{fmt(clientTotal)}</strong>.<br /><br />
              The plan will be locked after execution.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => { setExecuteDialog(false); executePlan.mutate(); }}
            >
              {executePlan.isPending ? "Executing…" : "Yes, Execute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
