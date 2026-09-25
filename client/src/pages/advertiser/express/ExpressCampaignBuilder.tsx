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
import Step8_Checkout from "./steps/Step8_Checkout";
import { calculateScreenPricePerDay, calculateTotalPhysicalScreens } from "@shared/utils";
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

import { LocationItem } from "@/components/map/MultiLocationSearch";

interface ExpressState {
  campaignName: string;
  locations: LocationItem[];
  selectedScreenIds: string[];
  screensData: Screen[];
  campaignDays: number;
  startDate: string;
  creativeUrl: string;
  zonePriceOverrides: Record<string, number>;
}

const DEFAULT_STATE: ExpressState = {
  campaignName: "",
  locations: [],
  selectedScreenIds: [],
  screensData: [],
  campaignDays: 7,
  startDate: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  })(),
  creativeUrl: "",
  zonePriceOverrides: {},
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
        locations: currentState.locations,
        selectedScreenIds: currentState.selectedScreenIds,
        campaignDays: currentState.campaignDays,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        budget: 0,
        creativeUrl: currentState.creativeUrl || null,
        targetArea: { type: "multiple", locations: currentState.locations },
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
      if (state.locations.length === 0)
        errs.location = "Please select at least one location";
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

      const targetArea = { type: "multiple" as const, locations: state.locations };

      const totalCost = state.screensData
        .filter((s) => state.selectedScreenIds.includes(s.id))
        .reduce(
          (sum, s) => {
            const basePrice = calculateScreenPricePerDay(s);
            const price = state.zonePriceOverrides[s.id] ?? basePrice;
            return sum + (price * state.campaignDays);
          },
          0
        );

      const campaignRes = await apiRequest("POST", "/api/advertiser/campaigns", {
        name: state.campaignName,
        objective: "brand_awareness",
        targetArea,
        targetLocationType: "india", // Legacy
        targetCities: state.locations.filter(l => l.type === 'city').map(l => l.city).filter(Boolean) as string[],
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
          const basePrice = calculateScreenPricePerDay(screen);
          const overridePrice = state.zonePriceOverrides[screen.id] ?? basePrice;
          const price = overridePrice * state.campaignDays;
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
      // apiRequest throws "<status>: <raw response body>" — the body is usually
      // `{"error":"..."}` from our API, so pull that message out when present.
      let description = err.message || "Failed to create campaign";
      const bodyStart = description.indexOf(": ");
      if (bodyStart !== -1) {
        try {
          const parsed = JSON.parse(description.slice(bodyStart + 2));
          if (parsed?.error) description = parsed.error;
        } catch {
          // not JSON — fall back to the raw message
        }
      }
      toast({ title: "Error", description, variant: "destructive" });
    },
  });

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar (Compressed) */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="w-full px-4 py-2 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/advertiser/campaigns/new")}
            className="gap-1.5 shrink-0 h-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="hidden sm:flex items-center gap-2 border-r pr-4">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold whitespace-nowrap">Express Campaign</span>
            {state.campaignName && (
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">— {state.campaignName}</span>
            )}
          </div>
          
          <div className="flex-1 flex flex-col justify-center max-w-xl mx-auto">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Step {step} of {STEPS.length}: {STEPS.find(s => s.id === step)?.label}
              </span>
              <div className="flex items-center gap-2">
                {draftSaveStatus === "saving" && <span className="text-[10px] text-muted-foreground">Saving…</span>}
                {draftSaveStatus === "saved" && <span className="text-[10px] text-emerald-600">Saved</span>}
              </div>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        </div>
      </div>

      {/* Resume draft banner */}
      {showResumeBanner && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
          <div className="w-full px-4 py-1.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileEdit className="h-3 w-3 text-amber-600" />
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                You have an unfinished campaign draft
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={handleDiscardDraft} className="gap-1 text-[10px] h-6 px-2">
                <Trash2 className="h-3 w-3" />
                Discard
              </Button>
              <Button size="sm" onClick={handleResumeDraft} className="bg-amber-500 hover:bg-amber-600 text-white gap-1 text-[10px] h-6 px-2">
                Resume Draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step content — Step 3 is full-bleed, all others are boxed */}
      {step === 3 ? (
        <Step3_ScreenDiscovery
          locations={state.locations}
          onChangeLocations={(locs) => {
            update({ locations: locs });
          }}
          selectedScreenIds={state.selectedScreenIds}
          screensData={state.screensData}
          onScreensLoaded={(screens) => {
            setState((prev) => {
              // Keep screens that are currently selected even if they aren't in the new fetch
              const currentlySelectedScreens = prev.screensData.filter(s => prev.selectedScreenIds.includes(s.id));
              const mergedScreens = [...screens];
              for (const s of currentlySelectedScreens) {
                if (!mergedScreens.find(ms => ms.id === s.id)) {
                  mergedScreens.push(s);
                }
              }

              if (prev.screensData.length === 0) {
                // Initial load: auto-select all
                return { ...prev, screensData: mergedScreens, selectedScreenIds: screens.map((s) => s.id) };
              }
              
              // Subsequent load: just update screensData, preserve selectedScreenIds
              return { ...prev, screensData: mergedScreens };
            });
          }}
          onToggleScreen={(id) => {
            const ids = state.selectedScreenIds.includes(id)
              ? state.selectedScreenIds.filter((x) => x !== id)
              : [...state.selectedScreenIds, id];
            const nextOverrides = { ...state.zonePriceOverrides };
            if (state.selectedScreenIds.includes(id)) {
              delete nextOverrides[id];
            }
            update({ selectedScreenIds: ids, zonePriceOverrides: nextOverrides });
            clearError("screens");
          }}
          zonePriceOverrides={state.zonePriceOverrides}
          onToggleZone={(screenIds, pricePerDay) => {
            // Adds or removes all screens in the zone
            const isAdding = !screenIds.every(id => state.selectedScreenIds.includes(id));
            let nextIds = [...state.selectedScreenIds];
            const nextOverrides = { ...state.zonePriceOverrides };

            if (isAdding) {
              screenIds.forEach(id => {
                if (!nextIds.includes(id)) nextIds.push(id);
                nextOverrides[id] = pricePerDay;
              });
            } else {
              nextIds = nextIds.filter(id => !screenIds.includes(id));
              screenIds.forEach(id => {
                delete nextOverrides[id];
              });
            }
            update({ selectedScreenIds: nextIds, zonePriceOverrides: nextOverrides });
            clearError("screens");
          }}
          onSelectAll={() => update({ selectedScreenIds: state.screensData.map((s) => s.id) })}
          onClearAll={() => update({ selectedScreenIds: [] })}
          error={errors.screens}
        />
      ) : (
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
            locations={state.locations}
            onChange={(locs) => { update({ locations: locs, screensData: [], selectedScreenIds: [] }); clearError("location"); }}
            error={errors.location}
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
            locations={state.locations}
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

        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-20">
        {/* Validation error */}
        {errors.validation && (
          <p className="mt-4 text-sm text-destructive text-center">{errors.validation}</p>
        )}
      </div>

      {/* Unified Floating Footer */}
      {step < 7 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full flex justify-center px-4">
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full p-1.5 flex items-center pointer-events-auto transition-all">
            
            {/* Optional Left Side (Summary) */}
            {step === 3 && state.selectedScreenIds.length > 0 && (
              <div className="pl-5 pr-4 border-r border-slate-200 flex items-center gap-2">
                 <span className="text-sm font-semibold text-slate-800">
                   <span className="text-amber-600">{calculateTotalPhysicalScreens(state.screensData.filter(s => state.selectedScreenIds.includes(s.id)))}</span>
                   {" "}Screens Selected
                 </span>
                 <span className="text-slate-400 text-sm">•</span>
                 <span className="text-sm font-medium text-slate-600">
                   ₹{state.screensData.filter(s => state.selectedScreenIds.includes(s.id)).reduce((sum, s) => {
                     const basePrice = calculateScreenPricePerDay(s);
                     return sum + (state.zonePriceOverrides[s.id] ?? basePrice);
                   }, 0).toLocaleString()}/day
                 </span>
              </div>
            )}
            
            {/* Actions */}
            <div className="flex items-center gap-1.5 px-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={step === 1}
                data-testid="button-previous"
                className="h-10 rounded-full px-4 text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                size="sm"
                onClick={handleNext}
                className="h-10 rounded-full px-6 bg-amber-500 hover:bg-amber-600 text-white shadow-md hover:shadow-lg transition-all"
                data-testid="button-next"
              >
                {step === 6 ? "Review Campaign" : "Continue"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
