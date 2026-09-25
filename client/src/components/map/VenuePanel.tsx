import React, { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Clock, Info, Layers, MapPin, Monitor, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Screen } from "@shared/schema";
import { calculateScreenPricePerDay } from "@shared/utils";
import { VENUE_FAMILY_LABELS, getPlaysPerHour, getVenueKeyFacts } from "@shared/venueTypes";
import {
  type ListedScreen,
  type VenueGroup,
  formatRupees,
  screenCount,
  shortListingName,
} from "@/lib/venueGroups";

type Tab = "all" | "packages" | "singles";

interface VenuePanelProps {
  venue: VenueGroup;
  selectedIds: Set<string>;
  hoveredScreenId?: string | null;
  cartCount: number;
  onToggle: (screen: Screen) => void;
  onAddMany: (screens: Screen[]) => void;
  onOpenDetails: (screen: Screen) => void;
  onHover?: (screenId: string | null) => void;
  onBack: () => void;
  onBook: () => void;
  backLabel?: string;
  isMobile?: boolean;
}

function Thumb({ src, className = "" }: { src?: string | null; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
      {src ? (
        <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <Monitor className="w-5 h-5 text-slate-400" />
      )}
    </div>
  );
}

function listingImage(s: Screen): string | null {
  return s.screenImages?.[0] || s.images?.[0] || null;
}

// When a pin holds listings typed with different venue names, say which one each row belongs to
function venueTag(s: Screen, venueName: string): string | null {
  const own = (s.venueName || "").trim();
  return own && own.toLowerCase() !== venueName.toLowerCase() ? own : null;
}

function specLine(s: Screen): string {
  const bits: string[] = [];
  if (s.category) bits.push(s.category);
  if (s.size && /\d/.test(s.size)) bits.push(s.size);
  else if (s.displayFormat) bits.push(s.displayFormat);
  return bits.join(" · ");
}

function playLine(s: Screen): string | null {
  const plays = getPlaysPerHour(s);
  const slot = s.durationPerSlot && s.durationPerSlot > 0 ? `${s.durationPerSlot}s ad` : null;
  if (slot && plays) return `${slot} · plays ~${plays}× an hour`;
  if (slot) return slot;
  return null;
}

function MinDays({ days }: { days?: number | null }) {
  if (!days || days <= 1) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
      <Clock className="w-3 h-3" /> Min {days} days
    </span>
  );
}

export function VenuePanel({
  venue,
  selectedIds,
  hoveredScreenId,
  cartCount,
  onToggle,
  onAddMany,
  onOpenDetails,
  onHover,
  onBack,
  onBook,
  backLabel = "All results",
  isMobile = false,
}: VenuePanelProps) {
  const hasBoth = venue.packages.length > 0 && venue.singles.length > 0;
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const facts = useMemo(
    () => getVenueKeyFacts(venue.listings, venue.family, venue.totalScreens),
    [venue]
  );

  const selectedHere = venue.listings.filter((l) => selectedIds.has(l.id));
  const selectedScreens = selectedHere.reduce((sum, l) => sum + screenCount(l), 0);
  const selectedTotal = selectedHere.reduce((sum, l) => sum + calculateScreenPricePerDay(l), 0);
  const notSelected = venue.listings.filter((l) => !selectedIds.has(l.id));
  const notSelectedScreens = notSelected.reduce((sum, l) => sum + screenCount(l), 0);

  const showPackages = tab !== "singles" && venue.packages.length > 0;
  const showSingles = tab !== "packages" && venue.singles.length > 0;

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all", label: "All", count: venue.totalScreens },
    { id: "packages", label: "Packages", count: venue.packages.reduce((s, l) => s + screenCount(l), 0) },
    { id: "singles", label: "Single screens", count: venue.singles.length },
  ];

  const renderPackage = (s: ListedScreen) => {
    const added = selectedIds.has(s.id);
    const n = screenCount(s);
    const total = calculateScreenPricePerDay(s);
    const perScreen = Math.round(total / n);
    const isOpen = expanded.has(s.id);
    const plays = playLine(s);
    const img = listingImage(s);
    return (
      <div
        key={s.id}
        className={`rounded-2xl border bg-white overflow-hidden transition-shadow ${
          added ? "border-green-600 ring-1 ring-green-600" : hoveredScreenId === s.id ? "border-slate-400 shadow-sm" : "border-slate-200"
        }`}
        onMouseEnter={() => onHover?.(s.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="flex gap-4 p-4">
          {/* stacked thumbnail signals "several screens" */}
          <div className="relative w-[92px] h-[76px] shrink-0">
            <div className="absolute left-3 top-0 w-20 h-[60px] rounded-lg bg-slate-200" />
            <div className="absolute left-1.5 top-1.5 w-20 h-[60px] rounded-lg bg-slate-300" />
            <Thumb src={img} className="absolute left-0 top-3 w-20 h-[62px] rounded-lg" />
            <span className="absolute left-1 bottom-1 bg-slate-900/85 text-white text-[11px] font-bold rounded-md px-1.5 py-0.5">
              ×{n}
            </span>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {venueTag(s, venue.name) && <div className="text-[11px] text-slate-400 line-clamp-1">at {venueTag(s, venue.name)}</div>}
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                className="text-left font-semibold text-slate-900 leading-snug hover:underline line-clamp-2"
                onClick={() => onOpenDetails(s)}
              >
                {shortListingName(s, venue.name)}
              </button>
              <span className="shrink-0 text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                {n} screens
              </span>
            </div>
            {specLine(s) && <p className="text-xs text-slate-500 line-clamp-1">{specLine(s)}</p>}
            <p className="text-xs text-slate-600">Your ad plays on all {n} screens together.</p>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {plays && <span className="text-[11px] text-slate-500">{plays}</span>}
              <MinDays days={s.minBookingDays} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-4 pb-4">
          <div>
            <div className="text-lg font-bold text-slate-900 leading-none">
              {formatRupees(total)}
              <span className="text-sm font-normal text-slate-500"> / day</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              for all {n} screens{perScreen > 0 ? ` · ${formatRupees(perScreen)} per screen` : ""}
            </div>
          </div>
          <Button
            size="sm"
            variant={added ? "default" : "outline"}
            className={`rounded-full h-10 px-4 font-semibold ${added ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            onClick={() => onToggle(s)}
            aria-pressed={added}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 mr-1.5" /> Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" /> Add package
              </>
            )}
          </Button>
        </div>

        {s.description && (
          <>
            <button
              type="button"
              onClick={() => toggleExpanded(s.id)}
              className="w-full h-10 border-t border-slate-100 bg-slate-50 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              aria-expanded={isOpen}
            >
              {isOpen ? "Hide details" : "What's in this package?"}
              {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {isOpen && (
              <div className="px-4 py-3 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
                <p>{s.description}</p>
                <button type="button" className="mt-2 text-xs font-semibold text-primary hover:underline" onClick={() => onOpenDetails(s)}>
                  See photos and full details
                </button>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const renderSingle = (s: ListedScreen) => {
    const added = selectedIds.has(s.id);
    const price = calculateScreenPricePerDay(s);
    const plays = playLine(s);
    return (
      <div
        key={s.id}
        className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 last:border-b-0 cursor-pointer transition-colors ${
          added ? "bg-green-50/60" : hoveredScreenId === s.id ? "bg-slate-50" : "bg-white hover:bg-slate-50"
        }`}
        onClick={() => onOpenDetails(s)}
        onMouseEnter={() => onHover?.(s.id)}
        onMouseLeave={() => onHover?.(null)}
      >
        <Thumb src={listingImage(s)} className="w-16 h-12 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0">
          {venueTag(s, venue.name) && <div className="text-[11px] text-slate-400 line-clamp-1">at {venueTag(s, venue.name)}</div>}
          <div className="font-semibold text-sm text-slate-900 line-clamp-1">{shortListingName(s, venue.name)}</div>
          {specLine(s) && <div className="text-xs text-slate-500 line-clamp-1">{specLine(s)}</div>}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {plays && <span className="text-[11px] text-slate-500">{plays}</span>}
            <MinDays days={s.minBookingDays} />
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="text-sm font-bold text-slate-900">
            {formatRupees(price)}
            <span className="text-xs font-normal text-slate-500"> / day</span>
          </div>
          <Button
            size="sm"
            variant={added ? "default" : "outline"}
            className={`h-9 px-3.5 rounded-full font-semibold ${added ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            aria-label={added ? "Remove from campaign" : "Add to campaign"}
            aria-pressed={added}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(s);
            }}
          >
            {added ? (
              <>
                <Check className="w-4 h-4 mr-1" /> Added
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-5 sm:px-6 h-14 border-b border-slate-100 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 -ml-1 px-1 py-2"
        >
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </button>
        {isMobile && (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onBack} aria-label="Close venue">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 sm:px-6 pt-5 pb-6 flex flex-col gap-5">
          {/* Venue header */}
          <div className="flex gap-4">
            <Thumb src={venue.image} className="w-28 h-28 rounded-xl shrink-0" />
            <div className="min-w-0 flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
                {VENUE_FAMILY_LABELS[venue.family]}
                {venue.venueCategory && venue.venueCategory.toLowerCase() !== VENUE_FAMILY_LABELS[venue.family].toLowerCase()
                  ? ` · ${venue.venueCategory}`
                  : ""}
              </span>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">{venue.name}</h2>
              <p className="text-sm text-slate-500 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">
                  {venue.address || venue.city}
                  {venue.distanceKm !== undefined ? ` · ${venue.distanceKm.toFixed(1)} km away` : ""}
                </span>
              </p>
              {venue.otherNames.length > 0 && (
                <p className="text-xs text-slate-400 line-clamp-1">Also listed as {venue.otherNames.join(", ")}</p>
              )}
            </div>
          </div>

          {/* Key facts for this kind of venue */}
          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {facts.map((f) => (
                <div key={f.key} className="rounded-xl bg-slate-50 px-3.5 py-3">
                  <div className="text-lg font-bold text-slate-900 leading-tight">{f.value}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{f.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* How booking works here */}
          {hasBoth && (
            <div className="flex gap-2.5 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-600">
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <p>
                Two ways to book here: a <b className="font-semibold text-slate-800">package</b> puts your ad on several screens for one
                price, or pick <b className="font-semibold text-slate-800">single screens</b> one by one.
              </p>
            </div>
          )}

          {/* Tabs — only when the venue has both kinds of inventory */}
          {hasBoth && (
            <div className="flex gap-5 border-b border-slate-200" role="tablist">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={`h-10 -mb-px border-b-2 text-sm transition-colors ${
                    tab === t.id ? "border-slate-900 text-slate-900 font-semibold" : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t.label} <span className="text-slate-400 font-normal">{t.count}</span>
                </button>
              ))}
            </div>
          )}

          {showPackages && (
            <section className="flex flex-col gap-3">
              <div>
                <h3 className="text-[12px] font-bold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Screen packages
                </h3>
                <p className="text-xs text-slate-500 mt-1">One booking, one price — your ad runs on every screen in the package.</p>
              </div>
              {venue.packages.map(renderPackage)}
            </section>
          )}

          {showSingles && (
            <section className="flex flex-col gap-3">
              <div>
                <h3 className="text-[12px] font-bold tracking-wider uppercase text-slate-500 flex items-center gap-1.5">
                  <Monitor className="w-3.5 h-3.5" /> {venue.packages.length > 0 ? "Single screens" : venue.singles.length === 1 ? "Screen" : "Screens"}
                </h3>
                {venue.singles.length > 1 && <p className="text-xs text-slate-500 mt-1">Each screen is priced and booked on its own.</p>}
              </div>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">{venue.singles.map(renderSingle)}</div>
            </section>
          )}

          {venue.listings.length > 1 && notSelected.length > 0 && (
            <Button variant="outline" className="self-start rounded-full h-10 px-4 font-semibold" onClick={() => onAddMany(notSelected)}>
              <Plus className="w-4 h-4 mr-1.5" />
              {selectedHere.length > 0 ? `Add the remaining ${notSelectedScreens}` : `Add all ${venue.totalScreens}`}{" "}
              {(selectedHere.length > 0 ? notSelectedScreens : venue.totalScreens) === 1 ? "screen" : "screens"} at this venue
            </Button>
          )}
        </div>
      </div>

      {/* Footer: what's picked here + next step */}
      <div className={`shrink-0 border-t border-slate-200 bg-white px-5 sm:px-6 py-3.5 flex items-center justify-between gap-4 ${isMobile ? "pb-6" : ""}`}>
        {selectedHere.length > 0 ? (
          <div className="min-w-0">
            <div className="text-xs text-slate-500">
              Added here: {selectedScreens} {selectedScreens === 1 ? "screen" : "screens"}
            </div>
            <div className="text-lg font-bold text-slate-900 leading-tight">
              {formatRupees(selectedTotal)}
              <span className="text-sm font-normal text-slate-500"> / day</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            {cartCount > 0 ? "Nothing added from this venue yet." : "Add a package or a screen to start your campaign."}
          </p>
        )}
        <Button className="rounded-full h-11 px-5 font-semibold shrink-0" onClick={onBook} disabled={cartCount === 0}>
          Book campaign{cartCount > 0 ? ` (${cartCount})` : ""}
        </Button>
      </div>
    </div>
  );
}
