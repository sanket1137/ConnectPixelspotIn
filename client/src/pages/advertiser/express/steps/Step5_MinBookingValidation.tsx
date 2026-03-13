import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock, Trash2, TrendingUp } from "lucide-react";
import type { Screen } from "@shared/schema";

interface Props {
  campaignDays: number;
  selectedScreenIds: string[];
  screensData: Screen[];
  onExtendDuration: (days: number) => void;
  onRemoveScreens: (screenIds: string[]) => void;
}

export default function Step5_MinBookingValidation({
  campaignDays,
  selectedScreenIds,
  screensData,
  onExtendDuration,
  onRemoveScreens,
}: Props) {
  const selectedScreens = screensData.filter((s) => selectedScreenIds.includes(s.id));

  // Find screens with min booking > campaignDays
  const violations = selectedScreens.filter(
    (s) => s.minBookingDays && s.minBookingDays > campaignDays
  );

  const maxRequired = violations.length > 0 ? Math.max(...violations.map((s) => s.minBookingDays!)) : 0;
  const violatingIds = violations.map((s) => s.id);
  const allValid = violations.length === 0;

  if (allValid) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-1">Booking Validation</h2>
          <p className="text-sm text-muted-foreground">Checking minimum booking requirements</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold mb-2">All screens valid!</h3>
          <p className="text-muted-foreground text-sm max-w-sm">
            Your {campaignDays}-day campaign meets the minimum booking requirements for all {selectedScreens.length}{" "}
            selected screen{selectedScreens.length !== 1 ? "s" : ""}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Booking Validation</h2>
        <p className="text-sm text-muted-foreground">Some screens have minimum booking requirements</p>
      </div>

      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {violations.length} screen{violations.length !== 1 ? "s" : ""} require a minimum of{" "}
            <strong>{maxRequired} days</strong>
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
            Your current campaign duration is <strong>{campaignDays} days</strong>. Choose one of the options below.
          </p>
        </div>
      </div>

      {/* Violating screens list */}
      <div className="space-y-2">
        {violations.map((screen) => (
          <div
            key={screen.id}
            className="flex items-center justify-between p-3 rounded-lg border-2 border-amber-500/40 bg-amber-500/5"
          >
            <div>
              <p className="font-medium text-sm">{screen.name}</p>
              <p className="text-xs text-muted-foreground">{screen.city}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 gap-1">
                <Clock className="h-3 w-3" />
                Min {screen.minBookingDays} days
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Option A: Extend duration */}
        <div className="p-4 border-2 border-border rounded-xl space-y-3 hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="font-semibold text-sm">Extend Duration</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Increase campaign to <strong>{maxRequired} days</strong> to include all selected screens.
          </p>
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onExtendDuration(maxRequired)}
            data-testid="button-extend-duration"
          >
            Set to {maxRequired} days
          </Button>
        </div>

        {/* Option B: Remove violating screens */}
        <div className="p-4 border-2 border-border rounded-xl space-y-3 hover:border-destructive/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-4 w-4 text-destructive" />
            </div>
            <p className="font-semibold text-sm">Remove These Screens</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Remove {violations.length} screen{violations.length !== 1 ? "s" : ""} and keep {campaignDays} days.
          </p>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onRemoveScreens(violatingIds)}
            data-testid="button-remove-violations"
          >
            Remove {violations.length} screen{violations.length !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </div>
  );
}
