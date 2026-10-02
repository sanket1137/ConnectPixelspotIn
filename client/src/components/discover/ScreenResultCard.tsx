import React from "react";
import { Check, Clock, Layers, Plus, Monitor, MapPin } from "lucide-react";
import type { Screen } from "@shared/schema";
import { VENUE_FAMILY_LABELS, formatCompact } from "@shared/venueTypes";
import type { DisplayFact } from "@/lib/venueFacts";
import { formatRupees } from "@/lib/venueGroups";
import { footfallValue, formatLine, localityLine, primaryPhoto, priceInfo, screenFamily } from "@/lib/screenInfo";
import { ScreenPhoto } from "@/components/discover/VenueTypeIcon";
import { getScreenCountDisplay } from "@shared/utils";

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
  const rawFootfall = footfallValue(screen);
  const format = formatLine(screen);
  const locality = localityLine(screen);
  const screenCountLabel = getScreenCountDisplay(screen);

  return (
    <div
      ref={cardRef}
      className={`group relative flex flex-col rounded-2xl border bg-white overflow-hidden transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? "border-primary ring-2 ring-primary/30 shadow-md"
          : isHighlighted
          ? "border-slate-300 shadow-md"
          : "border-slate-200 hover:border-slate-300"
      }`}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <button
        type="button"
        onClick={onOpen}
        className="text-left flex flex-col flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
        aria-label={`Open ${screen.venueName}`}
      >
        {/* Bigger, High-impact Image */}
        <div className="relative w-full overflow-hidden bg-slate-100">
          <ScreenPhoto
            src={primaryPhoto(screen)}
            family={family}
            alt={screen.venueName}
            className="h-48 sm:h-52 w-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            iconClassName="w-12 h-12"
          />

          {/* Top badges */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap max-w-[80%]">
            <span className="rounded-full bg-white/95 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-sm border border-slate-200/50">
              {VENUE_FAMILY_LABELS[family]}
            </span>
            {screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1 && (
              <span className="rounded-full bg-slate-900/85 backdrop-blur-sm px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm flex items-center gap-1 border border-white/20">
                <Monitor className="w-3 h-3 text-amber-400" />
                {screen.numberOfScreens} Screens
              </span>
            )}
          </div>

          {isAdded && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
              <Check className="h-3 w-3" /> In campaign
            </span>
          )}
        </div>

        {/* Content Under Image */}
        <div className="flex flex-col flex-1 p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors">
              {screen.venueName}
            </h3>
            {screen.distanceKm !== undefined && screen.distanceKm !== null && (
              <span className="shrink-0 text-xs font-medium text-slate-500 mt-0.5">
                {Number(screen.distanceKm).toFixed(1)} km
              </span>
            )}
          </div>

          {locality && (
            <p className="text-xs text-slate-500 line-clamp-1 flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
              <span className="truncate">{locality}</span>
            </p>
          )}

          {/* Quick specs pills: Number of Screens & Min Booking Days */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-slate-100">
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100/80 px-2.5 py-1 text-xs font-medium text-slate-700">
              <Monitor className="h-3.5 w-3.5 text-slate-500" />
              {screenCountLabel}
            </span>

            {price.minDays !== null && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/60 px-2.5 py-1 text-xs font-medium text-amber-800">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Min {price.minDays} {price.minDays === 1 ? "day" : "days"}
              </span>
            )}

            {format && (
              <span className="inline-flex items-center rounded-md bg-slate-50 border border-slate-200/50 px-2 py-1 text-xs text-slate-600">
                {format}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Bottom Bar: Price & Add Button */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/60 mt-auto">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-slate-900 leading-tight">
              {formatRupees(price.total)}
            </span>
            <span className="text-xs font-normal text-slate-500">/ day</span>
          </div>
          {price.isBulkMandatory && price.screens > 1 ? (
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {formatRupees(price.perScreen)}/screen · {price.screens} screens pkg
            </p>
          ) : showValue && rawFootfall && price.total > 0 ? (
            <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
              {formatRupees(Math.max(1, (price.total / rawFootfall) * 1000))} / 1k people
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleAdd();
          }}
          aria-pressed={isAdded}
          aria-label={isAdded ? `Remove ${screen.venueName} from campaign` : `Add ${screen.venueName} to campaign`}
          className={`shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl text-xs font-semibold shadow-sm transition-all ${
            isAdded
              ? "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow"
              : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow"
          }`}
        >
          {isAdded ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              <span>Add Screen</span>
            </>
          )}
        </button>
      </div>

      {/* Additional screens at the same venue link */}
      {moreAtVenue > 0 && onOpenVenue && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenVenue();
          }}
          className="flex items-center justify-center gap-1.5 h-8 border-t border-slate-200/80 bg-slate-100/70 text-xs font-semibold text-primary hover:bg-slate-200/80 transition-colors"
        >
          <Layers className="h-3.5 w-3.5" /> +{moreAtVenue} more {moreAtVenue === 1 ? "screen" : "screens"} at this venue
        </button>
      )}
    </div>
  );
}
