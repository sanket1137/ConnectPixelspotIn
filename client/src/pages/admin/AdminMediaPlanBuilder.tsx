import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  Sparkles,
  Percent,
  Eye,
  EyeOff,
  Building2,
  Save,
  Layers,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { printMediaPlan } from "@/lib/mediaPlanPdf";
import { ScreenPickerModal } from "@/pages/agency/MediaPlanBuilder";

type UserResult = {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  companyName?: string;
  brandName?: string;
  agencyName?: string;
  role?: string;
  accountType?: string;
  status?: string;
  isRegistered?: boolean;
};

// Helper: Calculate inclusive campaign duration in days
function getCampaignDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

// Helper: Format currency INR
function fmtINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function AdminMediaPlanBuilder() {
  const { id } = useParams<{ id?: string }>();
  const isNew = !id || id === "new";
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(isNew ? null : (id || null));
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  // Client Info State (Always Editable & Search-fillable)
  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isClientRegistered, setIsClientRegistered] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Plan Details state
  const [planName, setPlanName] = useState("");
  const [clientBrand, setClientBrand] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [agencyMargin, setAgencyMargin] = useState(0);
  const [showMargin, setShowMargin] = useState(false);
  const [notes, setNotes] = useState("");

  // Items & Screen Picker state
  const [selectedScreens, setSelectedScreens] = useState<any[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing plan if editing
  const { data: planData, isLoading: loadingPlan } = useQuery<any>({
    queryKey: [`/api/admin/media-plans/${id}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/media-plans/${id}/pdf-data`);
      return res.json();
    },
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (planData && planData.plan) {
      if (planData.plan.id) setCurrentPlanId(planData.plan.id);
      setPlanName(planData.plan.name || "");
      setClientBrand(planData.plan.clientBrand || "");
      setClientName(planData.plan.clientName || planData.plan.clientBrand || "");
      setClientMobile(planData.plan.clientMobile || "");
      setSelectedUserId(planData.plan.clientUserId || null);
      setIsClientRegistered(!!planData.plan.isClientRegistered);

      if (planData.plan.startDate) setStartDate(planData.plan.startDate.split("T")[0]);
      if (planData.plan.endDate) setEndDate(planData.plan.endDate.split("T")[0]);
      setAgencyMargin(planData.plan.agencyMargin || 0);
      setNotes(planData.plan.notes || "");

      if (Array.isArray(planData.items)) {
        setSelectedScreens(
          planData.items.map((it: any) => ({
            id: it.screenId || it.id,
            name: it.screenName || it.name,
            venueName: it.venueName,
            city: it.city,
            venueCategory: it.venueCategory,
            size: it.size || "Standard",
            pricePerDay: it.pricePerDay || 0,
            avgDailyFootfall: it.avgDailyFootfall || 0,
            zoneName: it.zoneName,
            zoneId: it.zoneId,
          }))
        );
      }
    }
  }, [planData]);

  // Load users database for 0ms instant local search
  const { data: allUsersData = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/users");
        return await res.json();
      } catch (err) {
        console.warn("Failed to fetch admin users list:", err);
        return [];
      }
    },
  });

  const allUsers = Array.isArray(allUsersData) ? allUsersData : [];

  // Instant local search across name, mobile, phone, company, brand, agency, email
  const userSearchResults = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const qDigits = userSearch.replace(/\D/g, "");
    if (!q) return [];

    return allUsers
      .filter((u: any) => {
        if (u.name && u.name.toLowerCase().includes(q)) return true;
        if (u.companyName && u.companyName.toLowerCase().includes(q)) return true;
        if (u.brandName && u.brandName.toLowerCase().includes(q)) return true;
        if (u.agencyName && u.agencyName.toLowerCase().includes(q)) return true;
        if (u.email && u.email.toLowerCase().includes(q)) return true;
        if (u.mobileNumber && u.mobileNumber.toLowerCase().includes(q)) return true;
        if (u.phone && u.phone.toLowerCase().includes(q)) return true;

        if (qDigits.length >= 1) {
          const uMobileDigits = (u.mobileNumber || "").replace(/\D/g, "");
          const uPhoneDigits = (u.phone || "").replace(/\D/g, "");
          if (uMobileDigits.includes(qDigits) || uPhoneDigits.includes(qDigits)) return true;
        }
        return false;
      })
      .slice(0, 15)
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        mobileNumber: u.mobileNumber || u.phone || "",
        email: u.email,
        companyName: u.companyName,
        brandName: u.brandName,
        agencyName: u.agencyName,
        role: u.role,
        accountType: u.accountType,
        status: u.status,
        isRegistered: !!u.firebaseUid && !u.firebaseUid.startsWith("unregistered_"),
      }));
  }, [allUsers, userSearch]);

  // Select client from search results — pre-fills fields
  const selectClientFromSearch = (u: UserResult) => {
    setSelectedUserId(u.id);
    setClientName(u.name);
    setClientMobile(u.mobileNumber);
    setIsClientRegistered(u.isRegistered || false);
    if (!clientBrand) setClientBrand(u.companyName || u.brandName || u.name);
    setUserSearch("");
    toast({ title: `Client auto-filled: ${u.name}` });
  };

  // Calculations
  const campaignDays = getCampaignDays(startDate, endDate);

  const netTotal = selectedScreens.reduce(
    (sum, s) => sum + (s.pricePerDay || 0) * campaignDays,
    0
  );
  const marginMultiplier = 1 + (agencyMargin || 0) / 100;
  const clientTotal = Math.round(netTotal * marginMultiplier);

  // Core Save Media Plan function (handles both creation & update)
  const savePlan = async (): Promise<any> => {
    if (!clientName.trim()) {
      toast({ title: "Please enter the Client Name", variant: "destructive" });
      return null;
    }
    const cleanMobile = clientMobile.replace(/\D/g, "").slice(-10);
    if (cleanMobile.length < 10) {
      toast({ title: "Please enter a valid 10-digit Client Mobile Number", variant: "destructive" });
      return null;
    }

    setIsSaving(true);
    try {
      // First ensure a lead/user record exists in database
      let finalUserId = selectedUserId;
      if (!finalUserId) {
        try {
          const leadRes = await apiRequest("POST", "/api/admin/users/create-unregistered", {
            name: clientName.trim(),
            mobileNumber: cleanMobile,
          });
          const leadData = await leadRes.json();
          if (leadData?.user?.id) finalUserId = leadData.user.id;
        } catch {
          // Best effort lead creation
        }
      }

      const itemsPayload = selectedScreens.map((s) => ({
        screenId: s.id,
        days: campaignDays,
      }));

      const payload = {
        clientUserId: finalUserId,
        clientName: clientName.trim(),
        clientMobile: cleanMobile,
        name: planName || `DOOH Media Plan – ${clientBrand || clientName.trim()}`,
        clientBrand: clientBrand || clientName.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        agencyMargin: Number(agencyMargin) || 0,
        notes,
        items: itemsPayload,
      };

      let savedPlan;
      const targetUrl = currentPlanId
        ? `/api/admin/media-plans/${currentPlanId}`
        : "/api/admin/media-plans";
      const targetMethod = currentPlanId ? "PUT" : "POST";

      const res = await apiRequest(targetMethod, targetUrl, payload);
      const text = await res.text();
      try {
        savedPlan = JSON.parse(text);
      } catch {
        throw new Error("Server returned invalid response format: " + text.slice(0, 120));
      }

      if (savedPlan?.id && !currentPlanId) {
        setCurrentPlanId(savedPlan.id);
        window.history.replaceState(null, "", `/admin/media-plans/${savedPlan.id}`);
      }

      qc.invalidateQueries({ queryKey: ["/api/admin/media-plans"] });
      return savedPlan;
    } catch (err: any) {
      console.error("Save media plan error:", err);
      toast({
        title: "Failed to save media plan",
        description: err.message || "An unexpected error occurred while saving.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOnly = async () => {
    const saved = await savePlan();
    if (saved) {
      toast({ title: "Media plan saved successfully! ✓" });
    }
  };

  const handleSaveAndGenerate = async () => {
    const saved = await savePlan();
    if (saved) {
      toast({ title: "Media plan saved! Exporting PDF proposal... ✓" });
      try {
        const pdfRes = await apiRequest("GET", `/api/admin/media-plans/${saved.id}/pdf-data`);
        const pdfData = await pdfRes.json();
        printMediaPlan(pdfData);
      } catch (pdfErr) {
        console.error("PDF generation error:", pdfErr);
      }
    }
  };

  const removeScreen = (screenId: string) => {
    setSelectedScreens((prev) => prev.filter((s) => s.id !== screenId));
  };

  if (loadingPlan) {
    return (
      <div className="p-6 space-y-4 max-w-6xl mx-auto">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  // ── EXACT AGENCY MAP-BASED SCREEN PICKER (Full-window ScreenPickerModal) ──
  if (pickerOpen) {
    const existingIds = new Set(selectedScreens.map((s) => s.id));
    return (
      <div className="h-[calc(100vh-64px)] w-full relative bg-slate-50 p-2 md:p-4">
        <ScreenPickerModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onAdd={(screen) => {
            setSelectedScreens((prev) => {
              if (prev.some((s) => s.id === screen.id)) return prev;
              return [...prev, screen];
            });
            toast({ title: `Added ${screen.name || "screen"} to proposal ✓` });
          }}
          onAddZone={(zoneScreensToAdd, zoneObj) => {
            const count = zoneScreensToAdd.length || 1;
            const zonePrice = zoneObj?.pricePerDay ? Math.round(zoneObj.pricePerDay / count) : undefined;
            const existingSet = new Set(selectedScreens.map((s) => s.id));
            const toAdd = zoneScreensToAdd
              .filter((s) => !existingSet.has(s.id))
              .map((s) => ({
                ...s,
                pricePerDay: zonePrice !== undefined ? zonePrice : s.pricePerDay,
                zoneName: zoneObj?.zoneName,
                zoneId: zoneObj?.id || s.zoneId,
              }));
            if (toAdd.length === 0) {
              toast({ title: `Zone "${zoneObj?.zoneName || ""}" is already added to proposal!` });
              return;
            }
            setSelectedScreens((prev) => [...prev, ...toAdd]);
            toast({ title: `Added ${toAdd.length} screens from ${zoneObj?.zoneName || "zone"} package ✓` });
          }}
          existingIds={existingIds}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/admin/media-plans")}
          className="hover:bg-slate-200"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {isNew && !currentPlanId ? "Create Media Plan" : planName || "Edit Media Plan"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Full-window DOOH proposal builder for admin & agency client proposals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/admin/media-plans")}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveOnly}
            disabled={isSaving || !clientName.trim() || clientMobile.replace(/\D/g, "").length < 10}
            className="gap-1.5 font-semibold text-slate-700 hover:bg-slate-100"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 text-slate-600" />
            )}
            Save Plan
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAndGenerate}
            disabled={isSaving || !clientName.trim() || clientMobile.replace(/\D/g, "").length < 10}
            className="gap-1.5 font-semibold bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Save & Generate PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Main 2-Column Grid Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ── LEFT COLUMN: Client Selection + Plan Details + Budget Summary ── */}
        <div className="lg:col-span-1 space-y-5">
          
          {/* Card 1: Client Information */}
          <Card className="border-2 border-slate-200 shadow-sm">
            <CardHeader className="pb-3 bg-slate-50 border-b">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>1. Client Information *</span>
                {selectedUserId && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                    {isClientRegistered ? "Registered User" : "Lead Matched"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 space-y-3.5">
              {/* Instant Search Bar */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700">Search Existing Client (Auto-fill)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search name, mobile, company..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-8 text-xs bg-white"
                  />
                  {loadingUsers && (
                    <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Search Results Dropdown List */}
              {userSearchResults.length > 0 && (
                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y bg-white shadow-md">
                  <div className="px-3 py-1.5 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                    Click client to auto-fill details below
                  </div>
                  {userSearchResults.map((u) => {
                    const org = u.companyName || u.brandName || u.agencyName;
                    return (
                      <div
                        key={u.id}
                        onClick={() => selectClientFromSearch(u)}
                        className="p-2.5 hover:bg-blue-50 cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {u.mobileNumber} {org ? `· ${org}` : ""}
                          </p>
                        </div>
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary">
                          Auto-fill →
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              {userSearch.trim().length > 0 && userSearchResults.length === 0 && !loadingUsers && (
                <p className="text-[11px] text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  No matching user found for "{userSearch}". You can enter client name & mobile below directly.
                </p>
              )}

              {/* Always Editable Client Name & Mobile Fields */}
              <div className="space-y-3 pt-1 border-t">
                <div>
                  <Label className="text-xs font-semibold text-slate-800">Client Name *</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma / Zomato Media"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      setSelectedUserId(null);
                    }}
                    className="text-xs bg-white font-medium"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-800">Mobile Number *</Label>
                  <Input
                    placeholder="10-digit mobile number"
                    value={clientMobile}
                    onChange={(e) => {
                      setClientMobile(e.target.value);
                      setSelectedUserId(null);
                    }}
                    className="text-xs font-mono bg-white"
                    maxLength={15}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Campaign Details */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 bg-slate-50 border-b">
              <CardTitle className="text-sm font-bold">2. Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label className="text-xs font-semibold">Media Plan Name</Label>
                <Input
                  placeholder="e.g. Diwali DOOH Outdoor Campaign"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Client Brand *</Label>
                <Input
                  placeholder="e.g. Cult.fit / Zomato / Nike"
                  value={clientBrand}
                  onChange={(e) => setClientBrand(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Start Date *</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">End Date *</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium flex items-center justify-between">
                <span>Campaign Duration: <strong>{campaignDays} Days</strong></span>
                <span className="text-[11px] text-blue-700">Auto-applies to all screens</span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Special Client Directives / Notes</Label>
                <Textarea
                  placeholder="Optional notes or custom terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Agency Margin */}
          <Card className="border-0 shadow-sm border-l-4 border-l-amber-400">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-bold">Agency Margin Markup (%)</p>
                  <p className="text-[10px] text-muted-foreground">Hidden from final client PDF</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowMargin((v) => !v)}
                >
                  {showMargin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showMargin ? "number" : "password"}
                    min={0}
                    max={99}
                    value={agencyMargin}
                    onChange={(e) => setAgencyMargin(Math.min(99, Math.max(0, Number(e.target.value))))}
                    className="pr-8 h-8 text-xs font-mono"
                  />
                  <Percent className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>
                {marginMultiplier > 1 && (
                  <span className="text-xs text-amber-600 font-bold">
                    +{fmtINR(clientTotal - netTotal)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Summary Card */}
          <Card className="border-0 shadow-sm bg-slate-900 text-white">
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Net Screen Rates ({selectedScreens.length} screens × {campaignDays} days)</span>
                <span className="font-semibold">{fmtINR(netTotal)}</span>
              </div>
              {agencyMargin > 0 && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Agency Markup ({agencyMargin}%)</span>
                  <span className="font-semibold">+{fmtINR(clientTotal - netTotal)}</span>
                </div>
              )}
              <Separator className="bg-slate-700" />
              <div className="flex justify-between text-sm font-bold text-white">
                <span>Total Client Proposal Budget</span>
                <span className="text-primary text-base">{fmtINR(clientTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT COLUMN: Selected Screens Inventory Table & Picker ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-3 bg-slate-50 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <span>3. Selected Inventory ({selectedScreens.length})</span>
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Screens will auto-calculate for campaign duration ({campaignDays} days).
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setPickerOpen(true)}
                className="gap-1 text-xs"
              >
                <Plus className="h-4 w-4" /> Add Screens
              </Button>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col p-0">
              {selectedScreens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground space-y-3 p-6">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-800">No screens added to proposal yet</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click the "Add Screens" button above to pick digital displays from your inventory.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} className="gap-1.5 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Select Screens from Inventory
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs">Screen Name & Venue</TableHead>
                        <TableHead className="text-xs">Category</TableHead>
                        <TableHead className="text-xs">Size</TableHead>
                        <TableHead className="text-right text-xs">Days</TableHead>
                        <TableHead className="text-right text-xs">Daily Rate</TableHead>
                        <TableHead className="text-right text-xs">Total Rate</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedScreens.map((s) => {
                        const itemTotal = (s.pricePerDay || 0) * campaignDays;
                        return (
                          <TableRow key={s.id} className="hover:bg-slate-50">
                            <TableCell>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <p className="font-bold text-xs text-slate-900">{s.name}</p>
                                {s.zoneName && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300 font-semibold flex items-center gap-1">
                                    <Layers className="w-3 h-3" /> Zone: {s.zoneName}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{s.city} • {s.venueName || s.location}</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px]">{s.venueCategory}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">{s.size || "Standard"}</TableCell>
                            <TableCell className="text-right text-xs font-semibold">{campaignDays} Days</TableCell>
                            <TableCell className="text-right text-xs font-mono">{fmtINR(s.pricePerDay || 0)}</TableCell>
                            <TableCell className="text-right text-xs font-bold text-primary font-mono">{fmtINR(itemTotal)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeScreen(s.id)}
                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
