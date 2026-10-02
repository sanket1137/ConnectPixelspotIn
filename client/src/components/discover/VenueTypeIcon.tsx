import React, { useEffect, useState } from "react";
import { Briefcase, Building2, Bus, Dumbbell, Film, GraduationCap, MapPin, Monitor, ShoppingBag, Utensils, type LucideIcon } from "lucide-react";
import type { VenueFamily } from "@shared/venueTypes";

const FAMILY_ICONS: Record<VenueFamily, LucideIcon> = {
  residential: Building2,
  cinema: Film,
  retail: ShoppingBag,
  food: Utensils,
  workplace: Briefcase,
  outdoor: MapPin,
  transit: Bus,
  lifestyle: Dumbbell,
  education: GraduationCap,
  other: Monitor,
};

export function venueFamilyIcon(family: VenueFamily): LucideIcon {
  return FAMILY_ICONS[family] || Monitor;
}

// Photo, or a calm venue-type illustration when the listing has none (most don't yet) or the
// photo link is broken.
export function ScreenPhoto({ src, family, alt, className = "", iconClassName = "w-8 h-8" }: {
  src?: string | null;
  family: VenueFamily;
  alt: string;
  className?: string;
  iconClassName?: string;
}) {
  const Icon = venueFamilyIcon(family);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  return (
    <div className={`relative overflow-hidden bg-slate-100 flex items-center justify-center ${className}`}>
      {src && !failed ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <Icon className={`text-slate-400 ${iconClassName}`} aria-hidden="true" />
      )}
    </div>
  );
}
