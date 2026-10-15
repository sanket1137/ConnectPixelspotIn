import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Monitor, Eye, Navigation, Check, Plus, Layers, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';
import type { Screen } from '@shared/schema';
import { getScreenPricing, getScreenCountDisplay, ScreenPricing } from '@shared/utils';
import { ScreenQuantityModal } from '@/components/screens/ScreenQuantityModal';

export interface ScreenCardProps {
  screen: Screen & { distanceKm?: number };
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
  /** Show distance badge (for nearby screens) */
  showDistance?: boolean;
  /** Optional price override (e.g. for zone pricing) */
  priceOverride?: number;
  /** Whether this screen is already added to campaign/cart */
  isAdded?: boolean;
  /** Quantity of screens currently selected in campaign/cart */
  selectedQuantity?: number;
  /** Callback when user adds or updates screen in campaign */
  onToggleAdd?: (screen: Screen, requestedScreens: number) => void;
  /** Custom action link or mode (e.g. for public visitors without auth) */
  actionHref?: string;
  /** Show interactive add button vs view button */
  interactive?: boolean;
}

export default function ScreenCard({
  screen,
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  showDistance = false,
  priceOverride,
  isAdded = false,
  selectedQuantity,
  onToggleAdd,
  actionHref,
  interactive = true,
}: ScreenCardProps) {
  const isMulti = Boolean(screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1);
  const totalScreens = isMulti ? Math.max(1, Number(screen.numberOfScreens)) : 1;
  const isBulkMandatory = isMulti && Boolean(screen.bulkBookingMandatory);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initial pricing
  const pricing: ScreenPricing = getScreenPricing(
    priceOverride !== undefined ? { ...screen, pricePerDay: priceOverride } : screen,
    selectedQuantity || (isBulkMandatory ? totalScreens : 1)
  );

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMulti && !isBulkMandatory) {
      setIsModalOpen(true);
    } else if (onToggleAdd) {
      const count = isBulkMandatory ? totalScreens : 1;
      onToggleAdd(screen, count);
    }
  };

  return (
    <Card
      id={`screen-${screen.id}`}
      className={`hover-elevate overflow-hidden transition-all duration-200 border border-slate-200 bg-white flex flex-col justify-between ${
        isAdded ? 'ring-2 ring-green-600 border-green-600 shadow-md' : isHovered ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      data-testid={`card-screen-${screen.id}`}
    >
      <div>
        {/* Screen Thumbnail */}
        <div className="relative h-44 sm:h-48 bg-muted overflow-hidden cursor-pointer group">
          {(screen.screenImages && screen.screenImages.length > 0) || (screen.images && screen.images.length > 0) ? (
            <img
              src={(screen.screenImages?.[0] ?? screen.images?.[0]) || ''}
              alt={screen.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.src = 'https://placehold.co/600x400/1a1a1a/666?text=No+Image';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-100">
              <MapPin className="w-12 h-12 text-slate-300" />
            </div>
          )}

          {/* Top Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[85%]">
            {screen.venueCategory && (
              <Badge className="text-[11px] bg-slate-900/80 backdrop-blur-sm text-white font-medium border-0">
                {screen.venueCategory}
              </Badge>
            )}
            {(screen.zoneId || screen.zoneName) && (
              <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white font-semibold border-0 shadow-sm flex items-center gap-1">
                <Layers className="w-2.5 h-2.5" /> Zone Inventory
              </Badge>
            )}
          </div>

          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            <Badge className="text-xs bg-white/90 backdrop-blur-sm text-slate-800 border-0 shadow-sm font-medium">
              {screen.category || "DOOH"}
            </Badge>
            {isAdded && (
              <Badge className="text-xs bg-green-600 text-white font-semibold border-0 shadow-md flex items-center gap-1">
                <Check className="w-3 h-3" /> Added
              </Badge>
            )}
          </div>

          {/* Distance Badge */}
          {showDistance && screen.distanceKm !== undefined && screen.distanceKm > 0 && (
            <Badge className="absolute bottom-2 right-2 text-xs bg-black/75 backdrop-blur-sm text-white border-0 shadow-sm">
              <Navigation className="w-3 h-3 mr-1" />
              {screen.distanceKm < 1 ? `${Math.round(screen.distanceKm * 1000)}m` : `${screen.distanceKm.toFixed(1)}km`}
            </Badge>
          )}

          {/* Network Size Pill */}
          {isMulti && (
            <Badge
              className={`absolute bottom-2 left-2 text-[11px] font-bold border-0 shadow-md ${
                isBulkMandatory
                  ? 'bg-amber-500 text-white'
                  : 'bg-primary/95 text-white'
              }`}
            >
              {totalScreens} Screens Network {isBulkMandatory ? '(All Required)' : ''}
            </Badge>
          )}
        </div>

        {/* Content Body */}
        <CardContent className="p-3 sm:p-4 space-y-2.5">
          <div>
            <h3 className="font-bold text-sm sm:text-base leading-snug mb-1 text-slate-900 line-clamp-1" title={screen.name}>
              {screen.name}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
              {screen.venueName ? `${screen.venueName}, ` : ""}{screen.city}
            </p>
          </div>

          {/* Screen Specs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap pt-0.5">
            {screen.avgDailyFootfall && screen.avgDailyFootfall > 0 ? (
              <div className="flex items-center gap-1" title="Estimated daily footfall">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{screen.avgDailyFootfall.toLocaleString('en-IN')}/day</span>
              </div>
            ) : null}
            {screen.avgDailyFootfall && screen.displayFormat && <span>•</span>}
            {screen.displayFormat && (
              <div className="flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
                <span>{screen.displayFormat}</span>
              </div>
            )}
            {screen.size && (
              <>
                <span>•</span>
                <span>{screen.size}</span>
              </>
            )}
          </div>

          {/* CLEAN PRICING DISPLAY (Correction #2: Never show pre-multiplied bundle totals upfront) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isMulti ? "Price per screen" : "Daily Rate"}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="font-bold text-lg sm:text-xl text-primary">
                    ₹{pricing.unitPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isMulti ? "/screen/day" : "/day"}
                  </span>
                </div>
              </div>

              {/* Min Booking Days Notice */}
              {pricing.minBookingDays > 1 && (
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-block">
                    Min {pricing.minBookingDays} days
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </div>

      {/* INTERACTIVE CONTROLS BAR */}
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1">
        {interactive && onToggleAdd ? (
          <div>
            {/* Action Button */}
            <Button
              type="button"
              className={`w-full font-semibold text-xs h-9 transition-all ${
                isAdded
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
              onClick={handleAddClick}
              data-testid={`button-toggle-${screen.id}`}
            >
              {isAdded ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Added ({selectedQuantity || (isBulkMandatory ? totalScreens : 1)} screens)
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add to Campaign
                </>
              )}
            </Button>
          </div>
        ) : actionHref ? (
          <Link href={actionHref}>
            <Button size="sm" className="w-full h-8 text-xs font-semibold" data-testid={`button-view-${screen.id}`}>
              <Eye className="w-3 h-3 mr-1" /> View Details
            </Button>
          </Link>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full h-8 text-xs font-semibold"
            onClick={onClick}
            data-testid={`button-view-${screen.id}`}
          >
            <Eye className="w-3 h-3 mr-1" /> View Details
          </Button>
        )}
      </div>

      {/* Screen Quantity Selection Popup Modal */}
      {isMulti && !isBulkMandatory && (
        <ScreenQuantityModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          screen={screen}
          initialQuantity={selectedQuantity || 1}
          priceOverride={priceOverride}
          isAlreadyAdded={isAdded}
          onConfirm={(_s, qty) => {
            if (onToggleAdd) onToggleAdd(screen, qty);
          }}
          onRemove={() => {
            if (onToggleAdd) onToggleAdd(screen, 0);
          }}
        />
      )}
    </Card>
  );
}
