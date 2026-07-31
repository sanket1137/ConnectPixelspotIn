import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Users, Monitor, Eye, Navigation } from 'lucide-react';
import { Link } from 'wouter';
import type { Screen } from '@shared/schema';
import { getScreenCountDisplay, calculateScreenPricePerDay } from '@shared/utils';

interface ScreenCardProps {
  screen: Screen & { distanceKm?: number };
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  /** Show distance badge (for nearby screens) */
  showDistance?: boolean;
}

export default function ScreenCard({
  screen,
  isHovered = false,
  onMouseEnter,
  onMouseLeave,
  showDistance = false,
}: ScreenCardProps) {
  return (
    <Card
      id={`screen-${screen.id}`}
      className={`hover-elevate overflow-hidden transition-all ${
        isHovered ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      data-testid={`card-screen-${screen.id}`}
    >
      {/* Screen Image */}
      <div className="relative h-40 sm:h-48 bg-muted overflow-hidden cursor-pointer group">
        {(screen.screenImages && screen.screenImages.length > 0) || (screen.images && screen.images.length > 0) ? (
          <img
            src={(screen.screenImages?.[0] ?? screen.images?.[0]) || ''}
            alt={screen.name}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = 'https://placehold.co/600x400/1a1a1a/666?text=No+Image';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <MapPin className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        <Badge className="absolute top-2 right-2 text-xs" variant="secondary">{screen.category}</Badge>
        {screen.venueCategory && (
          <Badge className="absolute top-2 left-2 text-xs bg-primary/90 backdrop-blur-sm">
            {screen.venueCategory}
          </Badge>
        )}
        {showDistance && screen.distanceKm !== undefined && screen.distanceKm > 0 && (
          <Badge className="absolute bottom-2 right-2 text-xs bg-black/70 backdrop-blur-sm text-white border-none">
            <Navigation className="w-3 h-3 mr-1" />
            {screen.distanceKm < 1
              ? `${Math.round(screen.distanceKm * 1000)}m`
              : `${screen.distanceKm.toFixed(1)}km`}
          </Badge>
        )}
        {screen.isMultiScreen && screen.numberOfScreens && screen.numberOfScreens > 1 && (
          <Badge className={`absolute bottom-2 left-2 text-[10px] uppercase font-bold border-0 shadow-md ${screen.bulkBookingMandatory ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-primary/90 text-primary-foreground backdrop-blur-sm'}`}>
            {getScreenCountDisplay(screen)} {screen.bulkBookingMandatory ? '(All Required)' : ''}
          </Badge>
        )}
      </div>

      <CardContent className="p-3 sm:p-4 space-y-2.5">
        <div>
          <h3 className="font-bold text-sm sm:text-base leading-tight mb-1 line-clamp-1">{screen.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {screen.venueName}, {screen.city}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span className="text-xs">{screen.avgDailyFootfall?.toLocaleString()}/day</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Monitor className="w-3 h-3" />
            <span className="text-xs">{screen.displayFormat}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Per day</p>
            <p className="font-bold text-lg sm:text-xl text-primary">₹{calculateScreenPricePerDay(screen).toLocaleString()}</p>
          </div>
          <Link href="/register?role=advertiser">
            <Button size="sm" data-testid={`button-book-${screen.id}`}>
              <Eye className="w-3 h-3 mr-1" />
              <span className="text-xs">View</span>
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
