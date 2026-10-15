import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { logActivity } from "@/lib/activityLogger";
import {
  calculateScreenPricePerDay,
  getScreenCountDisplay,
  calculateTotalPhysicalScreens,
  getScreenPricing,
  calculateInclusiveDays,
} from "@shared/utils";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Calendar,
  Check,
  Monitor,
  ShoppingCart,
  Trash2,
  RefreshCw,
  AlertCircle,
  IndianRupee,
  Link2,
  Eye,
  Plus,
  Minus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Screen } from "@shared/schema";

// ─── constants ────────────────────────────────────────────────────────────────
const SELECTED_SCREENS_KEY = "selectedScreenIds";

// ─── schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  objective: z.string().min(1, "Objective is required"),
  startDate: z
    .string()
    .min(1, "Start date is required")
    .refine((date) => {
      const selected = new Date(date);
      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return selected >= tomorrow;
    }, "Start date must be at least tomorrow"),
  customDays: z.number().min(1, "Must be at least 1 day").max(365, "Max 365 days"),
  creativeUrl: z
    .string()
    .min(1, "Creative link is required")
    .url("Please enter a valid URL"),
});

type CampaignForm = z.infer<typeof schema>;

// ─── step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 0, name: "Review Screens",     icon: ShoppingCart },
  { id: 1, name: "Campaign Details",   icon: Target       },
  { id: 2, name: "Dates & Duration",   icon: Calendar     },
  { id: 3, name: "Creative & Confirm", icon: Check        },
];

const OBJECTIVES = [
  { value: "brand_awareness", label: "Brand Awareness"  },
  { value: "product_launch",  label: "Product Launch"   },
  { value: "event_promotion", label: "Event Promotion"  },
  { value: "seasonal_campaign", label: "Seasonal Campaign" },
  { value: "local_promotion", label: "Local Promotion"  },
];

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

// ─── component ────────────────────────────────────────────────────────────────
export default function QuickCampaignFromCart() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── state
  const [step, setStep] = useState(0);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [screenQuantities, setScreenQuantities] = useState<Record<string, number>>({});
  const [loadState, setLoadState] = useState<"idle" | "loading" | "error" | "empty" | "done">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [campaignDone, setCampaignDone] = useState(false);

  // ── form
  const form = useForm<CampaignForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      objective: "",
      startDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })(),
      customDays: 14,
      creativeUrl: "",
    },
  });

  const days = form.watch("customDays") || 14;
  const totalBudget = screens.reduce((sum, s) => {
    const q = screenQuantities[s.id];
    const pricing = getScreenPricing(s, q);
    return sum + pricing.dailyTotal * days;
  }, 0);

  // ── load screens from API using IDs saved in localStorage
  const loadScreens = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage("");
    const raw = localStorage.getItem(SELECTED_SCREENS_KEY);
    let ids: string[] = [];
    const loadedQtys: Record<string, number> = {};

    try {
      const parsed = JSON.parse(raw || "[]");
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (typeof item === "string" && item) {
            ids.push(item);
          } else if (item && typeof item === "object" && item.id) {
            ids.push(item.id);
            if (item.screensRequested) {
              loadedQtys[item.id] = Number(item.screensRequested);
            }
          }
        });
      }
    } catch {
      ids = [];
    }

    if (ids.length === 0) {
      setLoadState("empty");
      return;
    }

    try {
      const res = await apiRequest("GET", `/api/screens/by-ids?ids=${encodeURIComponent(ids.join(","))}`);
      const data: Screen[] = await res.json();

      if (!Array.isArray(data) || data.length === 0) {
        localStorage.removeItem(SELECTED_SCREENS_KEY);
        setLoadState("empty");
        return;
      }

      setScreens(data);
      // Initialize quantities for multi-screens
      const initialQtys: Record<string, number> = { ...loadedQtys };
      data.forEach((s) => {
        if (!initialQtys[s.id]) {
          const pricing = getScreenPricing(s);
          initialQtys[s.id] = pricing.requestedScreens;
        }
      });
      setScreenQuantities(initialQtys);

      // Resave structured cart in localStorage
      const structuredCart = data.map((s) => ({
        id: s.id,
        screensRequested: initialQtys[s.id] || (s.bulkBookingMandatory ? (s.numberOfScreens || 1) : 1),
      }));
      localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(structuredCart));

      setLoadState("done");
    } catch (err: any) {
      console.error("Failed to load screens:", err);
      setErrorMessage(err?.message || "Could not load selected screens.");
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    loadScreens();
  }, [loadScreens]);

  const updateQuantity = (screenId: string, val: number, total: number) => {
    const clamped = Math.min(Math.max(1, Math.round(val || 1)), total);
    setScreenQuantities((prev) => {
      const next = { ...prev, [screenId]: clamped };
      const structuredCart = screens.map((s) => ({
        id: s.id,
        screensRequested: s.id === screenId ? clamped : (next[s.id] || (s.bulkBookingMandatory ? (s.numberOfScreens || 1) : 1)),
      }));
      localStorage.setItem(SELECTED_SCREENS_KEY, JSON.stringify(structuredCart));
      return next;
    });
  };

  // ── remove one screen from the selection
  const removeScreen = (id: string) => {
    const next = screens.filter((s) => s.id !== id);
    setScreens(next);
    const structuredCart = next.map((s) => ({
      id: s.id,
      screensRequested: screenQuantities[s.id] || (s.bulkBookingMandatory ? (s.numberOfScreens || 1) : 1),
    }));
    localStorage.setItem(
      SELECTED_SCREENS_KEY,
      JSON.stringify(structuredCart)
    );
    if (next.length === 0) {
      toast({ title: "No screens left", description: "Add screens from Discovery.", variant: "destructive" });
      setLocation("/advertiser/discover");
    }
  };

  // ── campaign create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CampaignForm) => {
      const startDate = new Date(data.startDate);
      const endDate = new Date(startDate);
      // Exact inclusive duration: e.g. 4 days starting Oct 11 ends on Oct 14
      endDate.setDate(endDate.getDate() + data.customDays - 1);

      const campRes = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: data.name,
        objective: data.objective,
        targetArea: { type: "india" as const },
        targetLocationType: "india",
        targetCities: [],
        targetState: null,
        targetPincodes: [],
        targetAgeGroups: [],
        targetGender: "all",
        targetAffluence: [],
        targetOccupations: [],
        targetIntent: [],
        targetMood: [],
        venueTypeFilters: [],
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: totalBudget,
        estimatedBudget: totalBudget,
        creativeUrl: data.creativeUrl,
      });
      const campaign = await campRes.json();

      await Promise.all(
        screens.map((screen) => {
          const pricing = getScreenPricing(screen, screenQuantities[screen.id]);
          const price = pricing.dailyTotal * data.customDays;
          return apiRequest("POST", "/api/advertiser/bookings", {
            screenId: screen.id,
            campaignId: campaign.id,
            price,
            screensRequested: pricing.requestedScreens,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        })
      );

      return campaign;
    },
    onSuccess: () => {
      localStorage.removeItem(SELECTED_SCREENS_KEY);
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setCampaignDone(true);
      toast({
        title: "🎉 Campaign Created!",
        description: `Booking requests sent for ${calculateTotalPhysicalScreens(screens)} screens.`,
      });
      setTimeout(() => setLocation("/advertiser/campaigns"), 2200);
    },
    onError: (err: Error) => {
      let msg = err.message || "Failed to create campaign.";
      const bodyStart = msg.indexOf(": ");
      if (bodyStart !== -1) {
        try {
          const parsed = JSON.parse(msg.slice(bodyStart + 2));
          if (parsed?.error) msg = parsed.error;
        } catch { /* not JSON */ }
      }
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  // ── step validation before advancing
  const canAdvance = async () => {
    if (step === 0) return screens.length > 0;
    if (step === 1) {
      const ok = await form.trigger(["name", "objective"]);
      return ok;
    }
    if (step === 2) {
      const ok = await form.trigger(["startDate", "customDays"]);
      return ok;
    }
    return true;
  };

  const goNext = async () => {
    const ok = await canAdvance();
    if (ok) {
      const nextStep = Math.min(step + 1, 3);
      setStep(nextStep);
      logActivity({
        actionType: "campaign_step_advance",
        actionDetails: `Advanced to Step ${nextStep + 1} (${STEPS[nextStep]?.title}) in Quick Campaign`,
        metadata: {
          step: nextStep,
          stepName: STEPS[nextStep]?.title,
          campaignName: form.getValues("name") || "Untitled",
          screensCount: screens.length,
          totalPrice: grandTotal,
        },
      });
    }
  };

  const goPrev = () => setStep((s) => Math.max(s - 1, 0));

  // ── loading / error / empty states
  if (loadState === "loading" || loadState === "idle") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Loading your selected screens…</p>
      </div>
    );
  }

  if (loadState === "empty") {
    return (
      <div className="p-6 max-w-md mx-auto text-center space-y-4 mt-16">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShoppingCart className="h-8 w-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your Cart is Empty</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You haven't selected any screens yet or your previous selection expired. Explore screens on the map to add them to your campaign.
          </p>
        </div>
        <Button onClick={() => setLocation("/advertiser/discover")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Explore & Select Screens
        </Button>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4 mt-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || "Could not load your selected screens. Please try again."}
          </AlertDescription>
        </Alert>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/advertiser/discover")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Discovery
          </Button>
          <Button onClick={loadScreens}>
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── success state
  if (campaignDone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">Campaign Created!</h2>
        <p className="text-muted-foreground">Redirecting to your campaigns…</p>
      </div>
    );
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/advertiser/discover")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Discovery
        </Button>
        <h1 className="text-2xl font-bold">Create Campaign from Cart</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Review your screens, set dates, add your creative and launch.
        </p>
      </div>

      {/* Step indicator */}
      <div className="relative">
        {/* progress bar track */}
        <div className="h-1 bg-muted rounded-full mb-5">
          <div
            className="h-1 bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = s.id === step;
            const isDone = s.id < step;
            return (
              <div key={s.id} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted border-transparent text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span
                  className={`text-[10px] text-center leading-tight hidden sm:block ${
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {s.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── STEP 0: SCREEN REVIEW ──────────────────────────────────────────── */}
      {step === 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-lg">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Your Cart — {screens.length} venue{screens.length !== 1 ? "s" : ""} selected
              </span>
              <span className="text-sm font-semibold text-primary">
                ₹{screens.reduce((sum, s) => sum + getScreenPricing(s, screenQuantities[s.id]).dailyTotal, 0).toLocaleString("en-IN")}/day
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-[56vh] overflow-y-auto pr-1">
              {screens.map((screen) => {
                const isMulti = Boolean(screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1);
                const totalScreens = isMulti ? Math.max(1, Number(screen.numberOfScreens)) : 1;
                const isBulkMandatory = isMulti && Boolean(screen.bulkBookingMandatory);
                const requestedQty = screenQuantities[screen.id] || (isBulkMandatory ? totalScreens : 1);
                const pricing = getScreenPricing(screen, requestedQty);

                return (
                  <div
                    key={screen.id}
                    className="p-3.5 rounded-xl border bg-slate-50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Monitor className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900">{screen.name}</p>
                            {isMulti && (
                              <Badge
                                variant={isBulkMandatory ? "default" : "secondary"}
                                className={`text-[10px] shrink-0 ${
                                  isBulkMandatory ? "bg-amber-500 hover:bg-amber-600 text-white" : ""
                                }`}
                              >
                                {totalScreens} Screens Network {isBulkMandatory ? "(All Required)" : ""}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[screen.city, screen.venueCategory].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-50 shrink-0"
                        onClick={() => removeScreen(screen.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Quantity controls & Line-Item Breakdown */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      {isMulti && !isBulkMandatory ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 font-medium">Screens to book:</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 rounded-md border-slate-300"
                              disabled={pricing.requestedScreens <= 1}
                              onClick={() => updateQuantity(screen.id, pricing.requestedScreens - 1, totalScreens)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Input
                              type="number"
                              min={1}
                              max={totalScreens}
                              value={pricing.requestedScreens}
                              onChange={(e) => updateQuantity(screen.id, parseInt(e.target.value, 10) || 1, totalScreens)}
                              className="h-7 w-14 text-center font-bold text-xs p-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-7 w-7 rounded-md border-slate-300"
                              disabled={pricing.requestedScreens >= totalScreens}
                              onClick={() => updateQuantity(screen.id, pricing.requestedScreens + 1, totalScreens)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-slate-500">of {totalScreens}</span>
                          {pricing.requestedScreens < totalScreens && (
                            <button
                              type="button"
                              onClick={() => updateQuantity(screen.id, totalScreens, totalScreens)}
                              className="text-[11px] text-primary hover:underline font-semibold ml-1"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                      ) : isMulti && isBulkMandatory ? (
                        <div className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] border-amber-300 bg-amber-50 text-amber-800">
                            Bulk Booking
                          </Badge>
                          All {totalScreens} screens booked together
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600">Single display</div>
                      )}

                      {/* Pricing Breakdown */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 sm:justify-end text-xs">
                          {isMulti ? (
                            <span className="text-slate-600">
                              ₹{pricing.unitPrice.toLocaleString("en-IN")}/screen × {pricing.requestedScreens} =
                            </span>
                          ) : null}
                          <span className="text-sm font-bold text-primary">
                            ₹{pricing.dailyTotal.toLocaleString("en-IN")}/day
                          </span>
                        </div>
                        {pricing.minBookingDays > 1 && (
                          <p className="text-[10px] text-amber-700">Min {pricing.minBookingDays} days booking</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                Total:{" "}
                {screens.reduce(
                  (sum, s) =>
                    sum + (screenQuantities[s.id] || (s.bulkBookingMandatory ? s.numberOfScreens || 1 : 1)),
                  0
                )}{" "}
                physical screen
                {screens.reduce(
                  (sum, s) =>
                    sum + (screenQuantities[s.id] || (s.bulkBookingMandatory ? s.numberOfScreens || 1 : 1)),
                  0
                ) !== 1
                  ? "s"
                  : ""}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground h-7"
                onClick={() => setLocation("/advertiser/discover")}
              >
                + Add more screens
              </Button>
            </div>

            <Alert className="bg-blue-50 border-blue-200 text-blue-800">
              <IndianRupee className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Pricing shown is per day. Total campaign price will be computed from your selected duration.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 1: CAMPAIGN DETAILS ──────────────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Campaign Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Summer Sale 2024" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="objective"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Objective *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select objective" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {OBJECTIVES.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: DATES & DURATION ──────────────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Campaign Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormDescription>Must be at least tomorrow</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (days) *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="365"
                            placeholder="14"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          />
                        </FormControl>
                        <FormDescription>How many days to run?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Live budget preview */}
                <div className="rounded-xl border bg-slate-50 p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Budget Preview</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{screens.length} screen{screens.length !== 1 ? "s" : ""} × {days} days</span>
                    <span className="text-xl font-bold text-primary">{fmtINR(totalBudget)}</span>
                  </div>
                  {form.watch("startDate") && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Start</span>
                      <span>{new Date(form.watch("startDate")).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </div>
                  )}
                  {form.watch("startDate") && days > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>End (Inclusive)</span>
                      <span>{(() => {
                        const d = new Date(form.watch("startDate"));
                        d.setDate(d.getDate() + days - 1);
                        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
                      })()}</span>
                    </div>
                  )}
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: CREATIVE & CONFIRM ────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* Campaign summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-semibold">{form.watch("name")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Objective</span>
                <span className="font-semibold">
                  {OBJECTIVES.find((o) => o.value === form.watch("objective"))?.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-semibold">
                  {new Date(form.watch("startDate")).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Screens</span>
                <span className="font-semibold">
                  {screens.reduce(
                    (sum, s) =>
                      sum + (screenQuantities[s.id] || (s.bulkBookingMandatory ? s.numberOfScreens || 1 : 1)),
                    0
                  )}{" "}
                  screens ({screens.length} venues)
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total Budget</span>
                <span className="font-bold text-primary text-lg">{fmtINR(totalBudget)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Creative URL */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4 text-primary" />
                Creative Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="creativeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creative URL *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://drive.google.com/… or https://dropbox.com/…"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload your creative (image/video) to Google Drive, Dropbox, or any hosting and paste the link here.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>

              {/* Preview if URL looks like image */}
              {form.watch("creativeUrl") && /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(form.watch("creativeUrl")) && (
                <div className="mt-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </div>
                  <div className="rounded-lg overflow-hidden border">
                    <img
                      src={form.watch("creativeUrl")}
                      alt="Creative preview"
                      className="w-full max-h-56 object-contain bg-slate-50"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── NAVIGATION FOOTER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={step === 0 ? () => setLocation("/advertiser/discover") : goPrev}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {step === 0 ? "Back to Discovery" : "Back"}
        </Button>

        {step < 3 ? (
          <Button onClick={goNext} className="gap-1">
            {step === 0 ? "Looks Good, Continue" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={form.handleSubmit((data) => createMutation.mutate(data))}
            disabled={createMutation.isPending || campaignDone}
            className="gap-1.5 min-w-[160px]"
          >
            {createMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Creating…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" /> Launch Campaign
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
