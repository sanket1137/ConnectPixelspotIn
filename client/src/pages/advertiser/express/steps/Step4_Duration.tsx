import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateScreenPricePerDay, calculateTotalPhysicalScreens } from "@shared/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, IndianRupee } from "lucide-react";
import type { Screen } from "@shared/schema";

interface Props {
  campaignDays: number;
  startDate: string;
  screensData: Screen[];
  selectedScreenIds: string[];
  onDaysChange: (days: number) => void;
  onStartDateChange: (date: string) => void;
  daysError?: string;
  dateError?: string;
}

export default function Step4_Duration({
  campaignDays,
  startDate,
  screensData,
  selectedScreenIds,
  onDaysChange,
  onStartDateChange,
  daysError,
  dateError,
}: Props) {
  const selectedScreens = screensData.filter((s) => selectedScreenIds.includes(s.id));
  const totalCostPerDay = selectedScreens.reduce(
    (sum, s) => sum + calculateScreenPricePerDay(s),
    0
  );
  const totalCost = totalCostPerDay * campaignDays;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const endDate = startDate
    ? (() => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + campaignDays);
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      })()
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Campaign Duration</h2>
        <p className="text-sm text-muted-foreground">Set how long your campaign runs and when it starts</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Start date */}
        <div className="space-y-2">
          <Label htmlFor="start-date" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-amber-500" />
            Start Date
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            min={minDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className={`h-12 ${dateError ? "border-destructive" : ""}`}
            data-testid="input-start-date"
          />
          {dateError && <p className="text-sm text-destructive">{dateError}</p>}
          <p className="text-xs text-muted-foreground">Earliest: tomorrow</p>
        </div>

        {/* Number of days */}
        <div className="space-y-2">
          <Label htmlFor="campaign-days" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-amber-500" />
            Number of Days
          </Label>
          <Input
            id="campaign-days"
            type="number"
            min={1}
            max={365}
            value={campaignDays}
            onChange={(e) => onDaysChange(Math.max(1, parseInt(e.target.value) || 1))}
            className={`h-12 text-base ${daysError ? "border-destructive" : ""}`}
            data-testid="input-campaign-days"
          />
          {daysError && <p className="text-sm text-destructive">{daysError}</p>}
          {endDate && <p className="text-xs text-muted-foreground">Ends: {endDate}</p>}
        </div>
      </div>

      {/* Quick day presets */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">Quick presets</p>
        <div className="flex flex-wrap gap-2">
          {[7, 14, 21, 30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDaysChange(d)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                campaignDays === d
                  ? "border-amber-500 bg-amber-500/10 text-amber-700"
                  : "border-border hover:border-amber-500/40"
              }`}
              data-testid={`button-preset-${d}`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Cost summary */}
      <div className="bg-muted/50 rounded-xl p-5 space-y-3">
        <p className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Cost Estimate</p>
        <div className="flex items-end justify-between">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{calculateTotalPhysicalScreens(selectedScreens)} screen{calculateTotalPhysicalScreens(selectedScreens) !== 1 ? "s" : ""} × {campaignDays} days</p>
            <p>₹{totalCostPerDay.toLocaleString()} / day</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground mb-0.5">Total</p>
            <p className="text-2xl font-bold text-foreground flex items-center gap-1">
              <IndianRupee className="h-5 w-5" />
              {totalCost.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
