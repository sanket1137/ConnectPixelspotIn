import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import { Monitor, MapPin, Users, Clock, Check, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import type { Screen } from "@shared/schema";
import { calculateTotalPhysicalScreens, calculateScreenPricePerDay } from "@shared/utils";

interface MatchReason {
  screenId: string;
  reasons: string[];
}

interface BudgetWarning {
  screenId: string;
  minCost: number;
  shortfall: number;
}

interface Props {
  screens: Screen[];
  matchReasons: MatchReason[];
  budgetWarnings: BudgetWarning[];
  budget: number;
  selectedScreenIds: string[];
  onToggleScreen: (id: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  error?: string;
}

function MapController({ target }: { target: { lat: number; lng: number; zoom?: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    if (target.zoom) map.setZoom(target.zoom);
  }, [map, target]);
  return null;
}

function AvailabilityBadge({ available }: { available: boolean | null | undefined }) {
  if (available === false)
    return <Badge variant="destructive" className="text-xs">Unavailable</Badge>;
  return <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-700">Available</Badge>;
}

export default function AIStep3_ScreenResults({
  screens,
  matchReasons,
  budgetWarnings,
  budget,
  selectedScreenIds,
  onToggleScreen,
  onSelectAll,
  onClearAll,
  error,
}: Props) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [infoWindowScreen, setInfoWindowScreen] = useState<Screen | null>(null);
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const firstWithCoords = screens.find((s) => s.latitude && Number(s.latitude) !== 0);
  const defaultCenter = firstWithCoords
    ? { lat: Number(firstWithCoords.latitude), lng: Number(firstWithCoords.longitude) }
    : { lat: 20.5937, lng: 78.9629 };

  const reasonsMap: Record<string, string[]> = {};
  matchReasons.forEach((r) => { reasonsMap[r.screenId] = r.reasons; });

  const warningsMap: Record<string, BudgetWarning> = {};
  budgetWarnings.forEach((w) => { warningsMap[w.screenId] = w; });

  const selectedCost = screens
    .filter((s) => selectedScreenIds.includes(s.id))
    .reduce((sum, s) => sum + s.pricePerDay, 0);

  const overBudget = budget > 0 && selectedCost > budget / 30; // rough daily check

  const handleCardClick = (screen: Screen) => {
    onToggleScreen(screen.id);
    setHighlightedId(screen.id);
    if (screen.latitude && Number(screen.latitude) !== 0) {
      setPanTarget({ lat: Number(screen.latitude), lng: Number(screen.longitude), zoom: 14 });
    }
  };

  const handlePinClick = (screen: Screen) => {
    setInfoWindowScreen(screen);
    setHighlightedId(screen.id);
    setTimeout(() => cardRefs.current[screen.id]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recommendations</h2>
          <p className="text-sm text-muted-foreground">
            <Sparkles className="inline h-3.5 w-3.5 text-violet-500 mr-1" />
            {(() => {
              const total = calculateTotalPhysicalScreens(screens);
              return `${total} screen${total !== 1 ? "s" : ""} matched your criteria`;
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onSelectAll} disabled={screens.length === 0}>Select All</Button>
          <Button size="sm" variant="ghost" onClick={onClearAll}>Clear</Button>
        </div>
      </div>

      {overBudget && (
        <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Daily cost of selected screens (₹{selectedCost.toLocaleString()}/day) may exceed your budget. Consider reducing selection.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {screens.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl">
          <Monitor className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground font-medium">No matching screens found</p>
          <p className="text-sm text-muted-foreground">Try a different location, audience, or increase budget</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[520px]">
          {/* Left: screen list */}
          <div className="overflow-y-auto space-y-2 pr-1">
            {screens.map((screen) => {
              const isSelected = selectedScreenIds.includes(screen.id);
              const isHighlighted = highlightedId === screen.id;
              const reasons = reasonsMap[screen.id] || [];
              const warning = warningsMap[screen.id];

              return (
                <div
                  key={screen.id}
                  ref={(el) => { cardRefs.current[screen.id] = el; }}
                  onClick={() => handleCardClick(screen)}
                  onMouseEnter={() => setHighlightedId(screen.id)}
                  onMouseLeave={() => setHighlightedId(null)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                    isHighlighted && !isSelected
                      ? "border-violet-500 bg-violet-500/5 shadow-md"
                      : isSelected
                      ? "border-amber-500 bg-amber-500/5 shadow-sm"
                      : "border-border hover:border-violet-400/40 bg-card"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Screen Image */}
                    <div className="w-32 h-24 rounded-lg overflow-hidden shrink-0 border bg-muted group overflow-hidden relative">
                      {screen.screenImages && screen.screenImages.length > 0 ? (
                        <img
                          src={screen.screenImages[0]}
                          alt={screen.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                          <Monitor className="h-8 w-8" />
                        </div>
                      )}
                      {screen.environmentType && (
                        <div className="absolute top-1 left-1">
                           <Badge variant="secondary" className="px-1 py-0 h-4 text-[9px] bg-black/60 text-white border-0 backdrop-blur-sm uppercase">
                             {screen.environmentType.split(' ')[0]}
                           </Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-sm truncate">{screen.name}</p>
                            {isSelected && <Check className="h-4 w-4 text-amber-500 shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mb-2">
                            <MapPin className="inline h-3 w-3 mr-0.5" />
                            {screen.location}, {screen.city}
                          </p>

                          {/* AI reasons */}
                          {reasons.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-1">
                              {reasons.map((r) => (
                                <span key={r} className="inline-flex items-center gap-0.5 bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-xs px-1.5 py-0.5 rounded-md border border-violet-200 dark:border-violet-800">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  {r}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-xs gap-1">
                              <Monitor className="h-2.5 w-2.5" />
                              {screen.venueCategory || screen.type}
                            </Badge>
                            {screen.avgDailyFootfall && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Users className="h-2.5 w-2.5" />
                                {Number(screen.avgDailyFootfall).toLocaleString()}
                              </Badge>
                            )}
                            <AvailabilityBadge available={screen.status === "active"} />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-muted-foreground">per day</p>
                          <p className="font-bold text-sm text-amber-600">
                            ₹{calculateScreenPricePerDay(screen).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: map */}
          <div className="rounded-xl overflow-hidden border h-full">
            <Map
              mapId="ai-screens-map"
              defaultCenter={defaultCenter}
              defaultZoom={12}
              gestureHandling="greedy"
              disableDefaultUI
              zoomControl
              style={{ width: "100%", height: "100%" }}
            >
              <MapController target={panTarget} />
              {screens
                .filter((s) => s.latitude && Number(s.latitude) !== 0)
                .map((screen) => {
                  const isSelected = selectedScreenIds.includes(screen.id);
                  const isHighlighted = highlightedId === screen.id;
                  return (
                    <AdvancedMarker
                      key={screen.id}
                      position={{ lat: Number(screen.latitude), lng: Number(screen.longitude) }}
                      onClick={() => handlePinClick(screen)}
                    >
                      <div
                        className="flex items-center justify-center rounded-full border-2 shadow-lg cursor-pointer transition-all duration-150"
                        style={{
                          width: isHighlighted ? 36 : isSelected ? 30 : 26,
                          height: isHighlighted ? 36 : isSelected ? 30 : 26,
                          backgroundColor: isHighlighted ? "#7c3aed" : isSelected ? "#f59e0b" : "#ffffff",
                          borderColor: "#fff",
                          boxShadow: isHighlighted ? "0 0 0 4px rgba(124,58,237,0.3)" : isSelected ? "0 0 0 3px rgba(245,158,11,0.3)" : undefined,
                        }}
                      >
                        <Sparkles style={{ width: isHighlighted ? 16 : 12, height: isHighlighted ? 16 : 12, color: isHighlighted || isSelected ? "#fff" : "#7c3aed" }} />
                      </div>
                    </AdvancedMarker>
                  );
                })}

              {infoWindowScreen && (
                <InfoWindow
                  position={{ lat: Number(infoWindowScreen.latitude), lng: Number(infoWindowScreen.longitude) }}
                  onCloseClick={() => { setInfoWindowScreen(null); setHighlightedId(null); }}
                >
                  <div className="p-1 min-w-56">
                    {infoWindowScreen.screenImages && infoWindowScreen.screenImages.length > 0 && (
                      <div className="w-full h-28 rounded-md overflow-hidden mb-2 border">
                        <img 
                          src={infoWindowScreen.screenImages[0]} 
                          alt={infoWindowScreen.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className="font-bold text-sm">{infoWindowScreen.name}</p>
                    <p className="text-xs text-gray-500 mb-1">{infoWindowScreen.city}</p>
                    {(reasonsMap[infoWindowScreen.id] || []).slice(0, 2).map((r) => (
                      <p key={r} className="text-xs text-violet-600">✦ {r}</p>
                    ))}
                    <p className="text-sm font-semibold text-amber-600 mt-1">₹{calculateScreenPricePerDay(infoWindowScreen).toLocaleString()}/day</p>
                    <button
                      onClick={() => { onToggleScreen(infoWindowScreen.id); setInfoWindowScreen(null); }}
                      className={`mt-2 w-full text-xs px-3 py-1.5 rounded font-medium ${
                        selectedScreenIds.includes(infoWindowScreen.id) ? "bg-gray-100 text-gray-700" : "bg-violet-600 text-white"
                      }`}
                    >
                      {selectedScreenIds.includes(infoWindowScreen.id) ? "✓ Selected" : "+ Select"}
                    </button>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </div>
        </div>
      )}

      {/* Selected count sticky bar */}
      {selectedScreenIds.length > 0 && (
        <div className="sticky bottom-0 bg-background border-t pt-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {(() => {
                const total = calculateTotalPhysicalScreens(screens.filter((s) => selectedScreenIds.includes(s.id)));
                return (
                  <>
                    <span className="text-amber-600 font-bold">{total}</span>{" "}
                    screen{total !== 1 ? "s" : ""} selected
                  </>
                );
              })()}
            </p>
            <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
              ₹{screens.filter((s) => selectedScreenIds.includes(s.id)).reduce((sum, s) => sum + s.pricePerDay, 0).toLocaleString()}/day
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
