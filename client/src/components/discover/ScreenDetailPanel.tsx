import React, { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Check, CheckCircle2, ExternalLink, Layers, MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Screen, ZoneInfo } from "@shared/schema";
import { VENUE_FAMILY_LABELS, getOperatingHoursLabel } from "@shared/venueTypes";
import { customDetailsFor, detailFactsFor, footfallToShow } from "@/lib/venueFacts";
import { formatRupees, shortListingName, type VenueGroup } from "@/lib/venueGroups";
import { directionsUrl, playsPerHour, priceInfo, screenFamily, screenPhotos, screenTypeLabel, primaryPhoto } from "@/lib/screenInfo";
import { ScreenPhoto } from "@/components/discover/VenueTypeIcon";

interface ScreenDetailPanelProps {
  screen: Screen & { distanceKm?: number };
  venue: VenueGroup | null;
  similar: Array<{ screen: Screen; km: number | null }>;
  isAdded: boolean;
  priceOverride?: number;
  backLabel: string;
  onBack: () => void;
  onClose?: () => void; // mobile: close the whole sheet
  onToggle: () => void;
  onOpenScreen: (screen: Screen) => void;
  onOpenVenue?: () => void;
  zoneInfo?: ZoneInfo | null;
  isZoneBooked?: boolean;
  onViewZone?: () => void;
  onBookZone?: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-[12px] font-bold tracking-wider uppercase text-slate-500">{title}</h3>
      {children}
    </section>
  );
}

// Label/value rows; rows without a value are dropped so nothing shows blank or "N/A"
function Rows({ rows }: { rows: Array<[string, React.ReactNode | null | undefined | false]> }) {
  const filled = rows.filter(([, v]) => v !== null && v !== undefined && v !== false && v !== "");
  if (!filled.length) return null;
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
      {filled.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="font-medium text-slate-900 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <span key={t} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
          {t}
        </span>
      ))}
    </div>
  );
}

function uniq(values: Array<string | null | undefined> | null | undefined): string[] {
  return Array.from(new Set((values || []).map((v) => (v || "").trim()).filter(Boolean)));
}

function Gallery({ screen, family }: { screen: Screen; family: ReturnType<typeof screenFamily> }) {
  // Photos whose links are broken drop out; if none load, the venue-type icon shows instead
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const all = screenPhotos(screen);
  const photos = { screen: all.screen.filter((p) => !broken.has(p)), surroundings: all.surroundings.filter((p) => !broken.has(p)) };
  const hasBoth = photos.screen.length > 0 && photos.surroundings.length > 0;
  const [tab, setTab] = useState<"screen" | "surroundings">(all.screen.length ? "screen" : "surroundings");
  const list = (tab === "screen" && photos.screen.length) || !photos.surroundings.length ? photos.screen : photos.surroundings;
  const markBroken = (src: string) => setBroken((prev) => new Set(prev).add(src));

  if (!photos.screen.length && !photos.surroundings.length) {
    return <ScreenPhoto src={null} family={family} alt={screen.venueName} className="h-40 w-full rounded-2xl" iconClassName="w-12 h-12" />;
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-2xl [scrollbar-width:thin]">
        {list.map((src, i) => (
          <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="snap-start shrink-0 w-[85%] first:w-full only:w-full">
            <img src={src} alt={`${screen.venueName} — photo ${i + 1}`} loading="lazy" onError={() => markBroken(src)} className="h-52 w-full object-cover rounded-2xl bg-slate-100" />
          </a>
        ))}
      </div>
      {hasBoth && (
        <div className="flex gap-1.5" role="tablist" aria-label="Photos">
          {(["screen", "surroundings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-8 px-3 rounded-full text-xs font-semibold border ${tab === t ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200"}`}
            >
              {t === "screen" ? `Screen (${photos.screen.length})` : `Surroundings (${photos.surroundings.length})`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScreenDetailPanel({
  screen,
  venue,
  similar,
  isAdded,
  priceOverride,
  backLabel,
  onBack,
  onClose,
  onToggle,
  onOpenScreen,
  onOpenVenue,
  zoneInfo,
  isZoneBooked = false,
  onViewZone,
  onBookZone,
}: ScreenDetailPanelProps) {
  const family = screenFamily(screen);
  const typeLabel = screenTypeLabel(screen);
  const price = priceInfo(screen, priceOverride);
  const [showFullAbout, setShowFullAbout] = useState(false);

  // Venue facts from stored attributes (flats, seats, employees…) + footfall/dwell + Est. metrics.
  // The venue's listings from the map are slim rows, so this screen's full row is used for itself.
  const factListings = useMemo(
    () => (venue ? [screen, ...venue.listings.filter((l) => l.id !== screen.id)] : [screen]),
    [venue, screen]
  );
  const facts = useMemo(
    () => detailFactsFor(factListings, family, venue ? venue.totalScreens : price.screens).slice(0, 8),
    [factListings, family, venue, price.screens]
  );
  const customDetails = customDetailsFor(screen);
  // Same rule as the facts: placeholder footfall only shows when the venue has no facts of its own
  const shownFootfall = footfallToShow([screen], facts.some((f) => !["footfall", "dwell", "hours", "screens"].includes(f.key)));

  const listingName = venue ? shortListingName(screen, venue.name) : screen.name;
  const showListingName = listingName && listingName.toLowerCase() !== (screen.venueName || "").toLowerCase();
  const otherScreensHere = venue ? venue.totalScreens - price.screens : 0;
  const plays = playsPerHour(screen);
  const hours = getOperatingHoursLabel(screen);
  const footfall = shownFootfall;
  const address = uniq([screen.location, [screen.city, screen.state].filter(Boolean).join(", "), screen.pincode]).join(" · ");

  const audienceChips = uniq([
    ...(screen.detailedAgeGroups || []),
    screen.genderOrientation,
    screen.incomeLevel,
    ...(screen.occupationMix || []),
    ...(screen.lifestyleTags || []),
    ...(screen.interestSegments || []),
    ...(screen.customAudienceTags || []),
  ]);
  const moments = uniq([...(screen.userIntent || []), ...(screen.userMood || []), ...(screen.timeOfDayActivity || [])]);
  const nearby = uniq([...(screen.locationTags || []), ...(screen.customLocationTags || [])]);
  const about = (screen.description || "").trim();

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      <div className="flex items-center justify-between gap-2 px-5 sm:px-6 h-14 border-b border-slate-100 shrink-0">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 -ml-1 px-1 py-2 min-w-0">
          <ArrowLeft className="w-4 h-4 shrink-0" /> <span className="truncate">{backLabel}</span>
        </button>
        {onClose && (
          <Button variant="ghost" size="icon" className="rounded-full" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-5 sm:px-6 pt-5 pb-8 flex flex-col gap-6">
          <Gallery screen={screen} family={family} />

          {/* Identity */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wider uppercase text-primary">
              {VENUE_FAMILY_LABELS[family]}
              {typeLabel && typeLabel.toLowerCase() !== VENUE_FAMILY_LABELS[family].toLowerCase() ? ` · ${typeLabel}` : ""}
            </span>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{screen.venueName}</h2>
            {showListingName && <p className="text-sm font-medium text-slate-700">{listingName}</p>}
            {address && (
              <p className="text-sm text-slate-500 flex items-start gap-1">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  {address}
                  {screen.distanceKm !== undefined && screen.distanceKm !== null ? ` · ${Number(screen.distanceKm).toFixed(1)} km away` : ""}
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <a
                href={directionsUrl(screen)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Get directions
              </a>
              {otherScreensHere > 0 && onOpenVenue && (
                <button type="button" onClick={onOpenVenue} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/15">
                  <Layers className="w-3.5 h-3.5" /> {otherScreensHere} more {otherScreensHere === 1 ? "screen" : "screens"} at this venue
                </button>
              )}
            </div>
          </div>

          {/* Who sees it */}
          {(facts.length > 0 || audienceChips.length > 0 || moments.length > 0) && (
            <Section title="Audience">
              {facts.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {facts.map((f) => (
                    <div key={f.key} className="rounded-xl bg-slate-50 px-3.5 py-3" title={f.formula}>
                      <div className="text-lg font-bold text-slate-900 leading-tight">{f.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {f.label}
                        {f.estimate && <span className="ml-1 rounded bg-slate-200/70 px-1 py-px text-[10px] font-medium text-slate-500">Est.</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {audienceChips.length > 0 && <Chips items={audienceChips} />}
              {moments.length > 0 && (
                <p className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-600">When they're here: </span>
                  {moments.join(", ")}
                </p>
              )}
            </Section>
          )}

          <Section title="Screen & ad slot">
            <Rows
              rows={[
                ["Format", screen.category],
                ["Orientation", screen.displayFormat],
                ["Size", screen.size && /\d/.test(screen.size) ? screen.size : null],
                ["Resolution", screen.resolution && /\d/.test(screen.resolution) ? screen.resolution : null],
                ["Setting", screen.environmentType],
                ["Audience flow", screen.trafficType],
                ["Ad length", screen.durationPerSlot ? `${screen.durationPerSlot} sec` : null],
                ["Loop", screen.loopDuration ? `${screen.loopDuration} sec` : null],
                ["Your ad plays", plays ? `~${plays}× an hour` : null],
                ["Brands per loop", screen.maxBrandsPerLoop],
                ["Screen hours", hours],
                ["Content", uniq(screen.contentTypesSupported).join(", ") || null],
                ["Daily footfall", footfall ? footfall.toLocaleString("en-IN") : null],
                ["Avg time spent", screen.avgDwellTime ? `${screen.avgDwellTime} min` : null],
              ]}
            />
          </Section>

          {customDetails.length > 0 && (
            <Section title="More about this venue">
              <Rows rows={customDetails.map((d) => [d.label, d.value] as [string, string])} />
            </Section>
          )}

          {nearby.length > 0 && (
            <Section title="Nearby">
              <Chips items={nearby} />
            </Section>
          )}

          {about && (
            <Section title="About this screen">
              <p className={`text-sm text-slate-600 leading-relaxed whitespace-pre-line ${showFullAbout ? "" : "line-clamp-4"}`}>{about}</p>
              {about.length > 260 && (
                <button type="button" onClick={() => setShowFullAbout((v) => !v)} className="self-start text-xs font-semibold text-primary hover:underline">
                  {showFullAbout ? "Show less" : "Show more"}
                </button>
              )}
            </Section>
          )}

          {similar.length > 0 && (
            <Section title="Similar screens">
              <div className="flex flex-col divide-y divide-slate-100 rounded-2xl border border-slate-200 overflow-hidden">
                {similar.map(({ screen: s, km }) => {
                  const p = priceInfo(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onOpenScreen(s)}
                      className="flex items-center gap-3 px-3.5 py-3 text-left bg-white hover:bg-slate-50 focus-visible:outline-none focus-visible:bg-slate-50"
                    >
                      <ScreenPhoto src={primaryPhoto(s)} family={screenFamily(s)} alt={s.venueName} className="w-14 h-11 rounded-lg shrink-0" iconClassName="w-5 h-5" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">{s.venueName}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">
                          {[screenTypeLabel(s), km !== null ? `${km.toFixed(1)} km away` : s.city].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-slate-900 shrink-0">
                        {formatRupees(p.total)}
                        <span className="text-[11px] font-normal text-slate-500">/day</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* Sticky footer: price + add, or the zone booking actions */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-5 sm:px-6 py-3.5">
        {zoneInfo ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <Layers className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="min-w-0 text-xs text-amber-800">
                <p className="text-sm font-semibold text-amber-900">{zoneInfo.zoneName}</p>
                This screen is booked as part of a zone — {zoneInfo.screenIds.length} {zoneInfo.screenIds.length === 1 ? "screen" : "screens"} together.
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-bold text-slate-900 leading-tight">
                  {formatRupees(Math.round((zoneInfo.pricePerDay || 0) / (zoneInfo.screenIds.length || 1)))}
                  <span className="text-sm font-normal text-slate-500"> / screen / day</span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {formatRupees(zoneInfo.pricePerDay || 0)} / day total ({zoneInfo.screenIds.length} screens)
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <CalendarDays className="h-3 w-3" /> Min {zoneInfo.minBookingDays} days · All screens booked together
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" className="rounded-full h-10 border-amber-300 text-amber-800 hover:bg-amber-50" onClick={onViewZone}>
                  <MapPin className="h-4 w-4 mr-1" /> View zone
                </Button>
                <Button
                  size="sm"
                  className={`rounded-full h-10 text-white ${isZoneBooked ? "bg-green-600 hover:bg-green-700" : "bg-amber-500 hover:bg-amber-600"}`}
                  onClick={onBookZone}
                  disabled={isZoneBooked}
                >
                  {isZoneBooked ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Zone booked</> : <><Layers className="h-4 w-4 mr-1" /> Book zone</>}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900 leading-tight">
                {formatRupees(price.total)}
                <span className="text-sm font-normal text-slate-500"> / day</span>
                {price.isBulkMandatory && price.screens > 1 && <span className="text-sm font-medium text-slate-600"> · {price.screens} screens pkg</span>}
              </div>
              <div className="flex flex-wrap gap-x-2 text-[11px] text-slate-500 mt-0.5">
                {price.isBulkMandatory && price.screens > 1 && <span>{formatRupees(price.perScreen)} per screen</span>}
                {price.minDays !== null && <span>Min {price.minDays} days</span>}
              </div>
            </div>
            <Button
              className={`rounded-full h-11 px-5 font-semibold shrink-0 ${isAdded ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
              onClick={onToggle}
              aria-pressed={isAdded}
            >
              {isAdded ? <><Check className="w-4 h-4 mr-1.5" /> Added</> : <><Plus className="w-4 h-4 mr-1.5" /> Add to campaign</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
