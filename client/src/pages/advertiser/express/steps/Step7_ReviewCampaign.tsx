import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  MapPin, Calendar, Monitor, IndianRupee, Eye, Loader2, CheckCircle2
} from "lucide-react";
import type { Screen } from "@shared/schema";

import { LocationItem } from "@/components/map/MultiLocationSearch";

interface Props {
  campaignName: string;
  locations: LocationItem[];
  campaignDays: number;
  startDate: string;
  creativeUrl: string;
  selectedScreenIds: string[];
  screensData: Screen[];
  isSubmitting: boolean;
  isSuccess: boolean;
  onSubmit: () => void;
}

export default function Step7_ReviewCampaign({
  campaignName,
  locations,
  campaignDays,
  startDate,
  creativeUrl,
  selectedScreenIds,
  screensData,
  isSubmitting,
  isSuccess,
  onSubmit,
}: Props) {
  const [reach, setReach] = useState<{ reach: number; impressions: number } | null>(null);
  const [reachLoading, setReachLoading] = useState(false);

  const selectedScreens = screensData.filter((s) => selectedScreenIds.includes(s.id));

  const totalCostPerDay = selectedScreens.reduce(
    (sum, s) => sum + s.pricePerDay * (s.isMultiScreen && s.numberOfScreens ? s.numberOfScreens : 1),
    0
  );
  const totalCost = totalCostPerDay * campaignDays;

  const endDateStr = startDate
    ? (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + campaignDays);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      })()
    : "";

  const startDateStr = startDate
    ? new Date(startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  // Fetch reach estimate
  useEffect(() => {
    if (selectedScreenIds.length === 0 || !campaignDays) return;
    const fetchReach = async () => {
      setReachLoading(true);
      try {
        const res = await apiRequest("POST", "/api/campaign/calculate-reach", {
          screenIds: selectedScreenIds,
          duration: campaignDays,
        });
        const data = await res.json();
        setReach(data);
      } catch (e) {
        console.error("Reach calc error:", e);
      } finally {
        setReachLoading(false);
      }
    };
    fetchReach();
  }, [selectedScreenIds, campaignDays]);

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold">Campaign Created!</h2>
        <p className="text-muted-foreground max-w-sm">
          Your campaign <strong>"{campaignName}"</strong> has been created with {selectedScreenIds.length} booking
          request{selectedScreenIds.length !== 1 ? "s" : ""}. Redirecting to your campaigns…
        </p>
      </div>
    );
  }

  const locationLabel = locations.length > 0 
    ? locations.map(l => l.label).join(", ") 
    : "No locations selected";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Review your campaign</h2>
        <p className="text-sm text-muted-foreground">Check everything before launching</p>
      </div>

      {/* Campaign overview */}
      <div className="rounded-xl border bg-card divide-y">
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Campaign Name</span>
          <span className="font-semibold text-sm">{campaignName}</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> Location
          </span>
          <span className="font-semibold text-sm">{locationLabel}</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Duration
          </span>
          <span className="font-semibold text-sm">{campaignDays} days</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground">Dates</span>
          <span className="font-semibold text-sm">{startDateStr} → {endDateStr}</span>
        </div>
        <div className="flex items-center justify-between p-4">
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Monitor className="h-3.5 w-3.5" /> Screens
          </span>
          <span className="font-semibold text-sm">{selectedScreenIds.length} selected</span>
        </div>
        {reach && (
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Est. Impressions
            </span>
            <span className="font-semibold text-sm text-amber-600">
              {reach.impressions.toLocaleString()}
            </span>
          </div>
        )}
        {reachLoading && (
          <div className="flex items-center justify-between p-4">
            <span className="text-sm text-muted-foreground">Est. Impressions</span>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Selected screens list */}
      <div>
        <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
          Selected Screens ({selectedScreens.length})
        </p>
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {selectedScreens.map((screen) => {
            const multiplier = screen.isMultiScreen && screen.numberOfScreens ? screen.numberOfScreens : 1;
            const cost = screen.pricePerDay * multiplier * campaignDays;
            return (
              <div key={screen.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-md overflow-hidden shrink-0 border bg-muted">
                  {screen.screenImages && screen.screenImages.length > 0 ? (
                    <img
                      src={screen.screenImages[0]}
                      alt={screen.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <Monitor className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{screen.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{screen.city}</p>
                </div>
                <p className="text-sm font-semibold text-amber-600">₹{cost.toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Creative preview */}
      {creativeUrl && (
        <div>
          <p className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Creative</p>
          <div className="rounded-xl overflow-hidden border bg-muted/30 flex items-center justify-center h-32">
            <img
              src={creativeUrl}
              alt="Creative"
              className="max-h-full w-auto object-contain"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        </div>
      )}

      {/* Cost summary */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Booking Subtotal</span>
          <span className="font-semibold">₹{totalCost.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">GST (18%)</span>
          <span className="font-semibold">₹{(totalCost * 0.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <Separator className="bg-amber-500/10" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-bold text-foreground">Grand Total</p>
            <p className="text-[10px] text-muted-foreground">{selectedScreens.length} screens × {campaignDays} days</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-amber-600">₹{(totalCost * 1.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* Submit */}
      <Button
        size="lg"
        className="w-full h-14 text-base bg-amber-500 hover:bg-amber-600 text-white"
        onClick={onSubmit}
        disabled={isSubmitting || isSuccess}
        data-testid="button-create-campaign"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Creating campaign…
          </>
        ) : (
          <>
            🚀 Create Campaign — ₹{(totalCost * 1.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Campaign status will be <strong>Pending Review</strong> until approved by admin.
      </p>
    </div>
  );
}
