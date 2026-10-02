import React from "react";
import { Check, Layers } from "lucide-react";
import { formatRupeesShort, type VenueGroup } from "@/lib/venueGroups";

interface VenueMarkerProps {
  venue: VenueGroup;
  isActive: boolean;
  isHovered: boolean;
  addedCount: number;
  isHighlightedZone?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

// Map pin for a venue with more than one listing. Default: lowest price + total screen count.
// Selected: venue name in blue (matches the open side panel). In cart: green with a tick.
export function VenueMarker({ venue, isActive, isHovered, addedCount, isHighlightedZone = false, onClick, onMouseEnter, onMouseLeave }: VenueMarkerProps) {
  const hovered = isHovered && !isActive;
  const pill = isActive
    ? "bg-primary text-primary-foreground border-white shadow-xl ring-4 ring-primary/25"
    : addedCount > 0
      ? "bg-green-600 text-white border-white"
      : isHighlightedZone
        ? "bg-amber-500 text-white border-white"
        : hovered
          ? "bg-slate-900 text-white border-slate-900 shadow-xl"
          : "bg-white text-slate-800 border-white hover:bg-slate-50";
  const caret = isActive
    ? "border-t-primary"
    : addedCount > 0
      ? "border-t-green-600"
      : isHighlightedZone
        ? "border-t-amber-500"
        : hovered
          ? "border-t-slate-900"
          : "border-t-white";
  const badge = isActive
    ? "bg-white text-primary"
    : addedCount > 0 || isHighlightedZone || hovered
      ? "bg-white/95 text-slate-900"
      : "bg-slate-900 text-white";

  return (
    <div
      className={`relative flex flex-col items-center transition-transform duration-200 cursor-pointer ${isActive || hovered ? "scale-110" : "scale-100"}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      title={`${venue.name} · ${venue.totalScreens} screens`}
    >
      <div className={`flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full font-bold text-[13px] shadow-md border-2 whitespace-nowrap ${pill}`}>
        {isActive ? (
          <span className="max-w-[160px] truncate">{venue.name}</span>
        ) : (
          <span>
            <span className="font-medium opacity-80 text-[11px]">from </span>
            {formatRupeesShort(venue.minPrice)}
          </span>
        )}
        <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold ${badge}`}>
          {addedCount > 0 && !isActive ? <Check className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
          {venue.totalScreens}
        </span>
      </div>
      <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] ${caret}`} />
    </div>
  );
}
