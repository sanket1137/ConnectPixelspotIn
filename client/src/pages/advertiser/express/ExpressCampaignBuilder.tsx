import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Zap, FileEdit, Trash2 } from "lucide-react";
import type { Screen } from "@shared/schema";

import Step1_CampaignName from "./steps/Step1_CampaignName";
import Step2_LocationSelect from "./steps/Step2_LocationSelect";
import Step3_ScreenDiscovery from "./steps/Step3_ScreenDiscovery";
import Step4_Duration from "./steps/Step4_Duration";
import Step5_MinBookingValidation from "./steps/Step5_MinBookingValidation";
import Step6_UploadCreative from "./steps/Step6_UploadCreative";
import Step7_ReviewCampaign from "./steps/Step7_ReviewCampaign";

const STEPS = [
  { id: 1, label: "Name" },
  { id: 2, label: "Location" },
  { id: 3, label: "Screens" },
  { id: 4, label: "Duration" },
  { id: 5, label: "Validate" },
  { id: 6, label: "Creative" },
  { id: 7, label: "Review" },
];

const LS_KEY = "express_draft";

interface ExpressState {
  campaignName: string;
  locationMode: "city" | "pin";
  targetCity: string;
  pinLat: number;
  pinLng: number;
  radiusKm: number;
  selectedScreenIds: string[];
  screensData: Screen[];
  campaignDays: number;
  startDate: string;
  creativeUrl: string;
}

const DEFAULT_STATE: ExpressState = {
  campaignName: "",
  locationMode: "city",
  targetCity: "",
  pinLat: 0,
  pinLng: 0,
  radiusKm: 5,
  selectedScreenIds: [],
  screensData: [],
  campaignDays: 7,
  startDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })(),
  creativeUrl: "",
};

/** Returns a version of the state safe to serialize (no circular refs) */
function serializeState(state: ExpressState) {
  return {
    ...state,
    // Don't persist full screen objects — too large; re-fetched on load
    screensData: [],
    selectedScreenIds: state.selectedScreenIds,
  };
}

export default function ExpressCampaignBuilder() {
  const [step, setStep] = useState(1);
  const [state, setState] = useState<ExpressState>(DEFAULT_STATE);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [savedDraftId, setSavedDraftId] = useState<string | null>(null);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasProgress = state.campaignName.trim().length >= 3;

  // ── On mount: check for localStorage draft to offer resume ───────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.campaignName?.trim().length >= 3) {
          setShowResumeBanner(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const update = (patch: Partial<ExpressState>) =>
    setState((s) => ({ ...s, ...patch }));
  const clearError = (key: string) =>
    setErrors((e) => { const n = { ...e }; delete n[key]; return n; });

  // ── Auto-save to localStorage on every state change ─────────────────────
  useEffect(() => {
    if (!hasProgress) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ ...serializeState(state), _step: step }));
        setDraftSaveStatus("saved");
        setTimeout(() => setDraftSaveStatus("idle"), 2000);
      } catch { /* ignore */ }
    }, 1500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [state, step]);

  // ── Save to DB on unmount if user abandons mid-flow ─────────────────────
  const saveDraftToDb = useCallback(async (currentState: ExpressState, currentStep: number, existingDraftId: string | null) => {
    if (!currentState.campaignName?.trim()) return;
    const startDate = new Date(currentState.startDate || Date.now());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (currentState.campaignDays || 7));
    try {
      const res = await apiRequest("PUT", "/api/advertiser/campaigns/draft", {
        draftId: existingDraftId || undefined,
        name: currentState.campaignName || "Untitled Campaign",
        _step: currentStep,
        locationMode: currentState.locationMode,
        targetCity: currentState.targetCity,
        pinLat: currentState.pinLat,
        pinLng: currentState.pinLng,
        radiusKm: currentState.radiusKm,
        selectedScreenIds: currentState.selectedScreenIds,
        campaignDays: currentState.campaignDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: 0,
        creativeUrl: currentState.creativeUrl || null,
        targetArea: currentState.locationMode === "city"
          ? { type: "city", city: currentState.targetCity }
          : { type: "map", latitude: currentState.pinLat, longitude: currentState.pinLng, radiusKm: currentState.radiusKm },
      });
      const draft = await res.json();
      if (draft?.id) setSavedDraftId(draft.id);
    } catch { /* silently fail — user won't see this */ }
  }, []);

  // Save to DB on component unmount
  const stateRef = useRef(state);
  const stepRef = useRef(step);
  const savedDraftIdRef = useRef(savedDraftId);
  stateRef.current = state;
  stepRef.current = step;
  savedDraftIdRef.current = savedDraftId;

  useEffect(() => {
    return () => {
      if (stateRef.current.campaignName?.trim().length >= 3) {
        saveDraftToDb(stateRef.current, stepRef.current, savedDraftIdRef.current);
      }
    };
  }, []); // eslint-disable-line

  // ── Resume draft from localStorage ───────────────────────────────────────
  const handleResumeDraft = () => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      setState({ ...DEFAULT_STATE, ...parsed });
      if (parsed._step) setStep(parsed._step);
      setShowResumeBanner(false);
    } catch { /* ignore */ }
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem(LS_KEY);
    setShowResumeBanner(false);
    // Also delete from DB if we know the id
    if (savedDraftId) {
      apiRequest("DELETE", `/api/advertiser/campaigns/draft/${savedDraftId}`).catch(() => {});
      setSavedDraftId(null);
    }
  };

  // Clear draft & localStorage on successful submit
  const clearDraft = () => {
    localStorage.removeItem(LS_KEY);
    if (savedDraftId) {
      apiRequest("DELETE", `/api/advertiser/campaigns/draft/${savedDraftId}`).catch(() => {});
      setSavedDraftId(null);
    }
  };

  // ── Validation per step ──────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (step === 1) {
      if (!state.campaignName || state.campaignName.trim().length < 3)
        errs.campaignName = "Name must be at least 3 characters";
    }
    if (step === 2) {
      if (state.locationMode === "city" && !state.targetCity)
        errs.location = "Please select a city";
      if (state.locationMode === "pin" && state.pinLat === 0)
        errs.location = "Please drop a pin on the map";
    }
    if (step === 3) {
      if (state.selectedScreenIds.length === 0)
        errs.screens = "Please select at least one screen";
    }
    if (step === 4) {
      if (!state.campaignDays || state.campaignDays < 1)
        errs.days = "Duration must be at least 1 day";
      if (!state.startDate)
        errs.startDate = "Please select a start date";
    }
    if (step === 5) {
      const violations = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .filter((s) => s.minBookingDays && s.minBookingDays > state.campaignDays);
      if (violations.length > 0) {
        errs.validation = "Please resolve booking duration conflicts before continuing";
      }
    }
    if (step === 6) {
      if (!state.creativeUrl) {
        errs.creativeUrl = "Creative URL is required";
      } else {
        try {
          new URL(state.creativeUrl);
        } catch {
          errs.creativeUrl = "Please enter a valid URL";
        }
      }
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
      if (violations.length === 0) {
        setStep(6);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const handleBack = () => {
    if (step === 6) {
      const violations = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .filter((s) => s.minBookingDays && s.minBookingDays > state.campaignDays);
      if (violations.length === 0) {
        setStep(4);
        return;
      }
    }
    setStep((s) => Math.max(s - 1, 1));
  };

  // ── Campaign submission ──────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      const startDate = new Date(state.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + state.campaignDays);

      const targetArea =
        state.locationMode === "city"
          ? { type: "city" as const, city: state.targetCity }
          : { type: "map" as const, latitude: state.pinLat, longitude: state.pinLng, radiusKm: state.radiusKm };

      const totalCost = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .reduce(
          (sum, s) =>
            sum + s.pricePerDay * (s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1) * state.campaignDays,
          0
        );

      const campaignRes = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: state.campaignName,
        objective: "brand_awareness",
        targetArea,
        targetLocationType: state.locationMode === "city" ? "city" : "india",
        targetCities: state.locationMode === "city" ? [state.targetCity] : [],
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
        budget: totalCost,
        estimatedBudget: totalCost,
        creativeUrl: state.creativeUrl,
      });

      const campaign = await campaignRes.json();

      const bookingPromises = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .map((screen) => {
          const multiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
          const price = screen.pricePerDay * multiplier * state.campaignDays;
          return apiRequest("POST", "/api/advertiser/bookings", {
            screenId: screen.id,
            campaignId: campaign.id,
            price,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
        });

      await Promise.all(bookingPromises);
      return campaign;
    },
    onSuccess: () => {
      clearDraft();
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/advertiser/campaigns/new")}
            className="gap-1.5 shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold">Express Campaign</span>
                {state.campaignName && (
                  <span className="text-xs text-muted-foreground">— {state.campaignName}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* Draft save indicator */}
                {draftSaveStatus === "saving" && (
                  <span className="text-xs text-muted-foreground">Saving…</span>
                )}
                {draftSaveStatus === "saved" && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Draft saved
                  </span>
                )}
                <span className="text-xs text-muted-foreground">Step {step} of {STEPS.length}</span>
              </div>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* Step labels */}
        <div className="max-w-4xl mx-auto px-6 pb-2 flex gap-1 overflow-x-auto scrollbar-none">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                s.id === step
                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  : s.id < step
                  ? "text-muted-foreground line-through"
                  : "text-muted-foreground/50"
              }`}
            >
              {s.id < step ? "✓" : s.id}. {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Resume draft banner */}
      {showResumeBanner && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
          <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                You have an unfinished campaign draft
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleDiscardDraft} className="gap-1.5 text-xs h-7">
                <Trash2 className="h-3 w-3" />
                Discard
              </Button>
              <Button size="sm" onClick={handleResumeDraft} className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5 text-xs h-7">
                Resume Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {step === 1 && (
          <Step1_CampaignName
            campaignName={state.campaignName}
            onChange={(v) => { update({ campaignName: v }); clearError("campaignName"); }}
            error={errors.campaignName}
          />
        )}
        {step === 2 && (
          <Step2_LocationSelect
            locationMode={state.locationMode}
            targetCity={state.targetCity}
            pinLat={state.pinLat}
            pinLng={state.pinLng}
            radiusKm={state.radiusKm}
            onLocationModeChange={(mode) => update({ locationMode: mode, screensData: [], selectedScreenIds: [] })}
            onCityChange={(city) => { update({ targetCity: city, screensData: [], selectedScreenIds: [] }); clearError("location"); }}
            onPinChange={(lat, lng) => { update({ pinLat: lat, pinLng: lng, screensData: [], selectedScreenIds: [] }); clearError("location"); }}
            onRadiusChange={(km) => update({ radiusKm: km, screensData: [], selectedScreenIds: [] })}
            error={errors.location}
          />
        )}
        {step === 3 && (
          <Step3_ScreenDiscovery
            locationMode={state.locationMode}
            targetCity={state.targetCity}
            pinLat={state.pinLat}
            pinLng={state.pinLng}
            radiusKm={state.radiusKm}
            selectedScreenIds={state.selectedScreenIds}
            screensData={state.screensData}
            onScreensLoaded={(screens) => {
              update({ screensData: screens, selectedScreenIds: screens.map((s) => s.id) });
            }}
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
        {step === 5 && (
          <Step5_MinBookingValidation
            campaignDays={state.campaignDays}
            selectedScreenIds={state.selectedScreenIds}
            screensData={state.screensData}
            onExtendDuration={(days) => {
              update({ campaignDays: days });
              setErrors({});
            }}
            onRemoveScreens={(ids) => {
              update({ selectedScreenIds: state.selectedScreenIds.filter((id) => !ids.includes(id)) });
              setErrors({});
            }}
          />
        )}
        {step === 6 && (
          <Step6_UploadCreative
            creativeUrl={state.creativeUrl}
            onChange={(url) => { update({ creativeUrl: url }); clearError("creativeUrl"); }}
            error={errors.creativeUrl}
          />
        )}
        {step === 7 && (
          <Step7_ReviewCampaign
            campaignName={state.campaignName}
            locationMode={state.locationMode}
            targetCity={state.targetCity}
            pinLat={state.pinLat}
            pinLng={state.pinLng}
            radiusKm={state.radiusKm}
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

        {/* Validation error */}
        {errors.validation && (
          <p className="mt-4 text-sm text-destructive text-center">{errors.validation}</p>
        )}

        {/* Navigation */}
        {step < 7 && (
          <div className="flex justify-between mt-10">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
              data-testid="button-previous"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              className="bg-amber-500 hover:bg-amber-600 text-white"
              data-testid="button-next"
            >
              {step === 6 ? "Review Campaign" : "Continue"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
