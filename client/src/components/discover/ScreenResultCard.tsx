import React from "react";
import { Check, Clock, Layers, Plus, Users } from "lucide-react";
import type { Screen } from "@shared/schema";
import { VENUE_FAMILY_LABELS, formatCompact } from "@shared/venueTypes";
import type { DisplayFact } from "@/lib/venueFacts";
import { formatRupees } from "@/lib/venueGroups";
import { footfallValue, formatLine, localityLine, primaryPhoto, priceInfo, screenFamily } from "@/lib/screenInfo";
import { ScreenPhoto } from "@/components/discover/VenueTypeIcon";

interface ScreenResultCardProps {
  screen: Screen & { distanceKm?: number };
  typeFacts: DisplayFact[]; // venue-type facts (flats, seats, employees…) from all listings at the venue
  isAdded: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  moreAtVenue: number; // other screens at the same venue
  priceOverride?: number; // zone price share, when booked as part of a zone
  showValue?: boolean; // "Best value" sort: show ₹ per 1,000 daily footfall
  onOpen: () => void;
  onToggleAdd: () => void;
  onOpenVenue?: () => void;
  onHoverChange: (hovered: boolean) => void;
  cardRef: (el: HTMLDivElement | null) => void;
}

export function ScreenResultCard({
  screen,
  typeFacts,
  isAdded,
  isHighlighted,
  isSelected,
  moreAtVenue,
  priceOverride,
  showValue = false,
  onOpen,
  onToggleAdd,
  onOpenVenue,
  onHoverChange,
  cardRef,
}: ScreenResultCardProps) {
  const family = screenFamily(screen);
  const price = priceInfo(screen, priceOverride);
  const facts = typeFacts.slice(0, 2);
  // Footfall: hidden when it's a placeholder and the venue has its own facts; skipped when it just
  // repeats a fact ("5,800 employees" / "5,800 daily footfall")
  const rawFootfall = screen.footfallNote === "hidden" && facts.length > 0 ? null : footfallValue(screen);
  const footfall = rawFootfall && !facts.some((f) => f.value === formatCompact(rawFootfall)) ? rawFootfall : null;
  const format = formatLine(screen);
  const locality = localityLine(screen);

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-shadow ${
        isSelected ? "border-primary ring-2 ring-primary/30" : isHighlighted ? "border-slate-300 shadow-md" : "border-slate-200 hover:shadow-md"
      }`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <button type="button" onClick={onOpen} className="text-left flex flex-col flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" aria-label={`Open ${screen.venueName}`}>
        <div className="relative">
          <ScreenPhoto src={primaryPhoto(screen)} family={family} alt={screen.venueName} className="h-32 w-full" iconClassName="w-9 h-9" />
          <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm">
            {VENUE_FAMILY_LABELS[family]}
          </span>
          {isAdded && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              <Check className="h-3 w-3" /> In your campaign
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-slate-900 leading-snug line-clamp-1">{screen.venueName}</h3>
            {screen.distanceKm !== undefined && screen.distanceKm !== null && (
              <span className="shrink-0 text-xs text-slate-500 mt-0.5">{Number(screen.distanceKm).toFixed(1)} km</span>
            )}
          </div>
          {locality && <p className="text-xs text-slate-500 line-clamp-1">{locality}</p>}

          {facts.length > 0 && (
            <p className="text-[13px] text-slate-800 mt-1 line-clamp-1">
              {facts.map((f, i) => (
                <React.Fragment key={f.key}>
                  {i > 0 && <span className="text-slate-300"> · </span>}
                  <b className="font-semibold" title={f.formula}>{f.value}</b> <span className="text-slate-500">{f.label.toLowerCase()}</span>
                  {f.estimate && <span className="ml-0.5 text-[10px] font-medium text-slate-400" title={f.formula}>Est.</span>}
                </React.Fragment>
              ))}
            </p>
          )}
          {footfall && (
            <p className="text-xs text-slate-600 flex items-center gap-1">
              <Users className="h-3 w-3 text-slate-400" /> {formatCompact(footfall)} daily footfall
            </p>
          )}
          {format && <p className="text-xs text-slate-500 line-clamp-1">{format}</p>}
        </div>
      </button>

      <div className="flex items-end justify-between gap-3 px-4 pb-4 mt-auto">
        <div className="min-w-0">
          <div className="text-base font-bold text-slate-900 leading-tight">
            {formatRupees(price.total)}
            <span className="text-xs font-normal text-slate-500"> / day</span>
            {price.isBulkMandatory && price.screens > 1 && (
              <span className="text-xs font-medium text-slate-600"> · {price.screens} screens pkg</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mt-0.5">
            {showValue && rawFootfall && price.total > 0 && (
              <span className="font-semibold text-slate-700">{formatRupees(Math.max(1, (price.total / rawFootfall) * 1000))} per 1,000 people</span>
            )}
            {price.isBulkMandatory && price.screens > 1 && <span>{formatRupees(price.perScreen)} per screen</span>}
            {price.minDays !== null && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" /> Min {price.minDays} days
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleAdd}
          aria-pressed={isAdded}
          aria-label={isAdded ? `Remove ${screen.venueName} from campaign` : `Add ${screen.venueName} to campaign`}
          className={`shrink-0 inline-flex items-center gap-1 h-9 px-3.5 rounded-full text-sm font-semibold border transition-colors ${
            isAdded ? "bg-green-600 border-green-600 text-white hover:bg-green-700" : "bg-white border-slate-300 text-slate-800 hover:border-slate-400"
          }`}
        >
          {isAdded ? <><Check className="h-4 w-4" /> Added</> : <><Plus className="h-4 w-4" /> Add</>}
        </button>
      </div>

      {moreAtVenue > 0 && onOpenVenue && (
        <button
          type="button"
          onClick={onOpenVenue}
          className="flex items-center justify-center gap-1.5 h-9 border-t border-slate-100 bg-slate-50 text-xs font-semibold text-primary hover:bg-slate-100"
        >
          <Layers className="h-3.5 w-3.5" /> +{moreAtVenue} more {moreAtVenue === 1 ? "screen" : "screens"} here
        </button>
      )}
    </div>
  );
}
