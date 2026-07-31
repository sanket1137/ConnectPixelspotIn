import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Bot, Sparkles } from "lucide-react";
import { calculateScreenPricePerDay } from "@shared/utils";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Screen } from "@shared/schema";

import Step1_CampaignName from "../express/steps/Step1_CampaignName";
import AIStep2_Conversation from "./AIStep2_Conversation";
import AIStep3_ScreenResults from "./AIStep3_ScreenResults";
import Step4_Duration from "../express/steps/Step4_Duration";
import Step5_MinBookingValidation from "../express/steps/Step5_MinBookingValidation";
import Step6_UploadCreative from "../express/steps/Step6_UploadCreative";
import Step7_ReviewCampaign from "../express/steps/Step7_ReviewCampaign";

const STEPS = [
  { id: 1, label: "Name" },
  { id: 2, label: "AI Chat" },
  { id: 3, label: "Screens" },
  { id: 4, label: "Duration" },
  { id: 5, label: "Validate" },
  { id: 6, label: "Creative" },
  { id: 7, label: "Review" },
];

interface MatchReason { screenId: string; reasons: string[]; }
interface BudgetWarning { screenId: string; minCost: number; shortfall: number; }

interface AIState {
  campaignName: string;
  locationText: string;
  audienceText: string;
  budget: number;
  screensData: Screen[];
  selectedScreenIds: string[];
  matchReasons: MatchReason[];
  budgetWarnings: BudgetWarning[];
  campaignDays: number;
  startDate: string;
  creativeUrl: string;
}

const DEFAULT_STATE: AIState = {
  campaignName: "",
  locationText: "",
  audienceText: "",
  budget: 0,
  screensData: [],
  selectedScreenIds: [],
  matchReasons: [],
  budgetWarnings: [],
  campaignDays: 7,
  startDate: (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split("T")[0]; })(),
  creativeUrl: "",
};

export default function AICampaignBuilder() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<AIState>(DEFAULT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMatchLoading, setIsMatchLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const update = (patch: Partial<AIState>) => setState((s) => ({ ...s, ...patch }));
  const clearError = (key: string) => setErrors((e) => { const n = { ...e }; delete n[key]; return n; });

  // Step 2 → trigger AI match when conversation finishes
  const handleConversationComplete = useCallback(async (
    locationText: string,
    audienceText: string,
    budget: number
  ) => {
    setIsMatchLoading(true);
    update({ locationText, audienceText, budget });
    try {
      const res = await apiRequest("POST", "/api/advertiser/campaigns/ai-match", {
        location: locationText,
        audience: audienceText,
        budget,
        campaignName: state.campaignName,
      });
      const data = await res.json();
      update({
        screensData: data.screens || [],
        selectedScreenIds: (data.screens || []).map((s: Screen) => s.id),
        matchReasons: data.matchReasons || [],
        budgetWarnings: data.budgetWarnings || [],
      });
      setStep(3);
    } catch (err: any) {
      toast({ title: "Matching failed", description: err.message || "Could not find screens. Please try again.", variant: "destructive" });
    } finally {
      setIsMatchLoading(false);
    }
  }, [state.campaignName, toast]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1 && state.campaignName.trim().length < 3) errs.campaignName = "Name must be at least 3 characters";
    if (step === 3 && state.selectedScreenIds.length === 0) errs.screens = "Select at least one screen";
    if (step === 4) {
      if (!state.campaignDays || state.campaignDays < 1) errs.days = "Duration must be at least 1 day";
      if (!state.startDate) errs.startDate = "Select a start date";
    }
    if (step === 6) {
      if (!state.creativeUrl) errs.creativeUrl = "Creative URL is required";
      else { try { new URL(state.creativeUrl); } catch { errs.creativeUrl = "Enter a valid URL"; } }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    if (step === 4) {
      const violations = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .filter((s) => s.minBookingDays && s.minBookingDays > state.campaignDays);
      if (violations.length === 0) { setStep(6); return; }
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    if (step === 6) {
      const violations = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .filter((s) => s.minBookingDays && s.minBookingDays > state.campaignDays);
      if (violations.length === 0) { setStep(4); return; }
    }
    // Going back from step 3 resets to step 2 (re-runs conversation)
    setStep((s) => Math.max(s - 1, 1));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(state.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + state.campaignDays);

      const totalCost = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .reduce((sum, s) => sum + calculateScreenPricePerDay(s) * state.campaignDays, 0);

      const campRes = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: state.campaignName,
        objective: "brand_awareness",
        targetArea: { type: "ai", location: state.locationText, audience: state.audienceText },
        targetLocationType: "india",
        targetCities: [],
        targetState: null,
        targetPincodes: [], targetAgeGroups: [], targetGender: "all",
        targetAffluence: [], targetOccupations: [], targetIntent: [], targetMood: [], venueTypeFilters: [],
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: totalCost,
        estimatedBudget: totalCost,
        creativeUrl: state.creativeUrl,
      });
      const campaign = await campRes.json();

      await Promise.all(state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .map((screen) => apiRequest("POST", "/api/advertiser/bookings", {
          screenId: screen.id, campaignId: campaign.id,
          price: calculateScreenPricePerDay(screen) * state.campaignDays,
          startDate: startDate.toISOString(), endDate: endDate.toISOString(),
        }))
      );
      return campaign;
    },
    onSuccess: () => {
      setIsSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setTimeout(() => setLocation("/advertiser/campaigns"), 2500);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to create campaign", variant: "destructive" });
    },
  });

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/advertiser/campaigns/new")} className="gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-500" />
                <span className="text-sm font-semibold">AI Campaign Builder</span>
                {state.campaignName && <span className="text-xs text-muted-foreground">— {state.campaignName}</span>}
              </div>
              <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
            </div>
            <Progress value={progress} className="h-1.5 [&>div]:bg-violet-500" />
          </div>
        </div>
        {/* Step labels */}
        <div className="max-w-4xl mx-auto px-6 pb-2 flex gap-1 overflow-x-auto scrollbar-none">
          {STEPS.map((s) => (
            <div key={s.id} className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              s.id === step ? "bg-violet-500/10 text-violet-700 dark:text-violet-400"
              : s.id < step ? "text-muted-foreground line-through"
              : "text-muted-foreground/50"
            }`}>
              {s.id < step ? "✓" : s.id}. {s.label}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step 1 */}
        {step === 1 && (
          <Step1_CampaignName
            campaignName={state.campaignName}
            onChange={(v) => { update({ campaignName: v }); clearError("campaignName"); }}
            error={errors.campaignName}
          />
        )}

        {/* Step 2 — AI conversation */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                <Bot className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Tell Me About Your Campaign</h1>
                <p className="text-sm text-muted-foreground">3 quick questions to find the best screens for you</p>
              </div>
            </div>
            <AIStep2_Conversation onMatchReady={handleConversationComplete} />
            {isMatchLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-violet-600">
                <span className="text-sm font-medium">Matching screens to your criteria…</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — screen results */}
        {step === 3 && (
          <AIStep3_ScreenResults
            screens={state.screensData}
            matchReasons={state.matchReasons}
            budgetWarnings={state.budgetWarnings}
            budget={state.budget}
            selectedScreenIds={state.selectedScreenIds}
            onToggleScreen={(id) => {
              const ids = state.selectedScreenIds.includes(id)
                ? state.selectedScreenIds.filter((x) => x !== id)
                : [...state.selectedScreenIds, id];
              update({ selectedScreenIds: ids });
              clearError("screens");
            }}
            onSelectAll={() => update({ selectedScreenIds: state.screensData.map((s) => s.id) })}
            onClearAll={() => update({ selectedScreenIds: [] })}
            error={errors.screens}
          />
        )}

        {/* Step 4 — Duration (reused from Express) */}
        {step === 4 && (
          <Step4_Duration
            campaignDays={state.campaignDays}
            startDate={state.startDate}
            screensData={state.screensData}
            selectedScreenIds={state.selectedScreenIds}
            onDaysChange={(d) => { update({ campaignDays: d }); clearError("days"); }}
            onStartDateChange={(date) => { update({ startDate: date }); clearError("startDate"); }}
            daysError={errors.days}
            dateError={errors.startDate}
          />
        )}

        {/* Step 5 — Min booking validation */}
        {step === 5 && (
          <Step5_MinBookingValidation
            campaignDays={state.campaignDays}
            selectedScreenIds={state.selectedScreenIds}
            screensData={state.screensData}
            onExtendDuration={(days) => { update({ campaignDays: days }); setErrors({}); }}
            onRemoveScreens={(ids) => { update({ selectedScreenIds: state.selectedScreenIds.filter((id) => !ids.includes(id)) }); setErrors({}); }}
          />
        )}

        {/* Step 6 — Creative upload */}
        {step === 6 && (
          <Step6_UploadCreative
            creativeUrl={state.creativeUrl}
            onChange={(url) => { update({ creativeUrl: url }); clearError("creativeUrl"); }}
            error={errors.creativeUrl}
          />
        )}

        {/* Step 7 — Review & Submit */}
        {step === 7 && (
          <Step7_ReviewCampaign
            campaignName={state.campaignName}
            locationMode="city"
            targetCity={state.locationText}
            pinLat={0}
            pinLng={0}
            radiusKm={5}
            campaignDays={state.campaignDays}
            startDate={state.startDate}
            creativeUrl={state.creativeUrl}
            selectedScreenIds={state.selectedScreenIds}
            screensData={state.screensData}
            isSubmitting={createMutation.isPending}
            isSuccess={isSuccess}
            onSubmit={() => createMutation.mutate()}
          />
        )}

        {errors.validation && <p className="mt-4 text-sm text-destructive text-center">{errors.validation}</p>}

        {/* Navigation */}
        {step !== 2 && step < 7 && (
          <div className={`flex mt-10 ${step === 1 ? "justify-end" : "justify-between"}`}>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            <Button onClick={handleNext} className="bg-violet-600 hover:bg-violet-700 text-white">
              {step === 6 ? "Review Campaign" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
