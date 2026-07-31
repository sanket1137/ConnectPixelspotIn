import React, { useEffect, useState, useCallback } from 'react';
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2, Search, X, Globe, Map } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

// Intelligent location types — same logic as Discover Screens
export type LocationGranularity = 'country' | 'state' | 'city' | 'poi' | 'map';

export interface LocationItem {
  type: 'city' | 'map';           // legacy: kept for backward-compat with in-area API
  locationType?: LocationGranularity; // enriched: country / state / city / poi / map
  label: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  city?: string;
  bounds?: google.maps.LatLngBoundsLiteral; // for country/state fitBounds
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

interface MultiLocationSearchProps {
  selectedLocations: LocationItem[];
  onChange: (locations: LocationItem[]) => void;
  onLocationFocus?: (loc: LocationItem) => void;
  placeholder?: string;
  className?: string;
}

/** Detect the granularity from Google Places types array */
function detectLocationType(types: string[]): LocationGranularity {
  if (types.includes('country')) return 'country';
  if (types.includes('administrative_area_level_1')) return 'state';
  if (types.includes('locality') || types.includes('administrative_area_level_2')) return 'city';
  if (
    types.includes('sublocality') ||
    types.includes('sublocality_level_1') ||
    types.includes('neighborhood') ||
    types.includes('point_of_interest') ||
    types.includes('establishment') ||
    types.includes('transit_station') ||
    types.includes('airport')
  ) return 'poi';
  return 'map';
}

/** Default radius (km) based on granularity */
function defaultRadius(type: LocationGranularity): number {
  if (type === 'poi') return 5;
  if (type === 'city') return 15;
  return 10;
}

export function MultiLocationSearch({
  selectedLocations,
  onChange,
  onLocationFocus,
  placeholder = "Search city, locality, landmark, or PIN code...",
  className = ""
}: MultiLocationSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeLocationIndex, setActiveLocationIndex] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const placesLib = useMapsLibrary('places');
  const map = useMap();
  const { toast } = useToast();
  const debouncedInput = useDebounce(inputValue, 300);

  // Fetch autocomplete suggestions using new API
  useEffect(() => {
    if (!placesLib || !debouncedInput.trim()) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    setIsLoadingSuggestions(true);

    const fetchSuggestions = async () => {
      try {
        // Use new AutocompleteSuggestion API
        // @ts-ignore – new API may not be in types yet
        const { suggestions: newSugg } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: debouncedInput,
        });
        if (!cancelled) {
          setSuggestions(
            (newSugg || []).map((s: any) => ({
              placeId: s.placePrediction?.placeId || '',
              mainText: s.placePrediction?.mainText?.toString() || debouncedInput,
              secondaryText: s.placePrediction?.secondaryText?.toString() || '',
            }))
          );
        }
        return;
      } catch {
        // Fallback to legacy AutocompleteService
      }

      try {
        const service = new (placesLib as any).AutocompleteService();
        service.getPlacePredictions(
          { input: debouncedInput },
          (results: any[], status: any) => {
            if (!cancelled && status === 'OK' && results) {
              setSuggestions(
                results.map(r => ({
                  placeId: r.place_id,
                  mainText: r.structured_formatting.main_text,
                  secondaryText: r.structured_formatting.secondary_text || '',
                }))
              );
            } else if (!cancelled) {
              setSuggestions([]);
            }
          }
        );
        return;
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [debouncedInput, placesLib]);

  const addLocation = useCallback((loc: LocationItem) => {
    const existingIndex = selectedLocations.findIndex(existing => existing.label === loc.label);
    if (existingIndex === -1) {
      onChange([...selectedLocations, loc]);
      setActiveLocationIndex(selectedLocations.length);
    } else {
      setActiveLocationIndex(existingIndex);
    }
    // Pan map to new/existing location
    if (loc.lat && loc.lng) {
      onLocationFocus?.(loc);
    }
    setInputValue('');
    setIsOpen(false);
  }, [selectedLocations, onChange, onLocationFocus]);

  const removeLocation = (indexToRemove: number) => {
    onChange(selectedLocations.filter((_, i) => i !== indexToRemove));
    if (activeLocationIndex === indexToRemove) {
      setActiveLocationIndex(null);
    } else if (activeLocationIndex !== null && activeLocationIndex > indexToRemove) {
      setActiveLocationIndex(activeLocationIndex - 1);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not supported", variant: "destructive" });
      return;
    }
    setIsLocating(true);
    setIsOpen(false);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        addLocation({
          type: 'map',
          locationType: 'poi',
          label: 'Current Location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          radiusKm: 5,
        });
      },
      () => {
        setIsLocating(false);
        toast({ title: "Location Error", description: "Could not get your location.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSuggestionSelect = async (suggestion: Suggestion) => {
    if (!placesLib) return;

    // Try new Place API first — it provides types + viewport
    try {
      // @ts-ignore
      const place = new google.maps.places.Place({ id: suggestion.placeId });
      await place.fetchFields({ fields: ['location', 'viewport', 'types'] });

      if (place.location) {
        const types: string[] = place.types || [];
        const locType = detectLocationType(types);
        const bounds: google.maps.LatLngBoundsLiteral | undefined = place.viewport
          ? place.viewport.toJSON()
          : undefined;

        const isWide = locType === 'country' || locType === 'state';

        addLocation({
          type: isWide ? 'city' : 'map',   // use 'city' type so in-area uses bounds path
          locationType: locType,
          label: suggestion.mainText,
          lat: place.location.lat(),
          lng: place.location.lng(),
          radiusKm: isWide ? undefined : defaultRadius(locType),
          bounds: isWide ? bounds : undefined,
        });

        // Fit the map to the selected bounds immediately
        if (isWide && bounds && map) {
          map.fitBounds(bounds);
        }
        return;
      }
    } catch {
      // Fallback to legacy PlacesService
    }

    try {
      const dummyEl = document.createElement('div');
      const service = new (placesLib as any).PlacesService(dummyEl);
      service.getDetails(
        { placeId: suggestion.placeId, fields: ['geometry', 'name', 'types'] },
        (place: any, status: any) => {
          if (status === 'OK' && place?.geometry?.location) {
            const types: string[] = place.types || [];
            const locType = detectLocationType(types);
            const isWide = locType === 'country' || locType === 'state';
            const bounds: google.maps.LatLngBoundsLiteral | undefined = place.geometry.viewport
              ? place.geometry.viewport.toJSON()
              : undefined;

            addLocation({
              type: isWide ? 'city' : 'map',
              locationType: locType,
              label: suggestion.mainText,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              radiusKm: isWide ? undefined : defaultRadius(locType),
              bounds: isWide ? bounds : undefined,
            });

            if (isWide && bounds && map) {
              map.fitBounds(bounds);
            }
          }
        }
      );
    } catch {
      // silent fail
    }
  };

  const handleRadiusChange = (indexToUpdate: number, newRadius: number) => {
    onChange(
      selectedLocations.map((loc, idx) =>
        idx === indexToUpdate ? { ...loc, radiusKm: newRadius } : loc
      )
    );
  };

  const activeLocation =
    activeLocationIndex !== null && activeLocationIndex < selectedLocations.length
      ? selectedLocations[activeLocationIndex]
      : null;

  // Show radius slider only for city/poi/map locations — not for country/state
  const showRadiusSlider =
    activeLocation &&
    activeLocation.type === 'map' &&
    activeLocationIndex !== null &&
    activeLocation.locationType !== 'country' &&
    activeLocation.locationType !== 'state';

  return (
    <div className={`space-y-3 ${className}`}>
        <div className="flex flex-wrap gap-3 items-center w-full">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <div className="relative flex-[1_1_250px] w-full min-w-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <Input
                  type="text"
                  placeholder={placeholder}
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  className="pl-10 h-12 text-sm md:text-base border-slate-200 bg-slate-50 focus-visible:ring-primary/20 focus-visible:bg-white rounded-xl shadow-sm transition-all"
                />
                {isLoadingSuggestions && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
            </PopoverTrigger>
            
            <PopoverContent
              className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 shadow-xl rounded-xl border-slate-200"
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="max-h-[300px] overflow-y-auto overscroll-contain">
                <button
                  onClick={handleUseMyLocation}
                  disabled={isLocating}
                  className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    {isLocating ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Navigation className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Current Location</div>
                    <div className="text-xs text-slate-500 truncate">Use your device location</div>
                  </div>
                </button>

                {suggestions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    {suggestions.map((sugg) => (
                      <button
                        key={sugg.placeId}
                        onClick={() => handleSuggestionSelect(sugg)}
                        className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">{sugg.mainText}</div>
                          <div className="text-xs text-slate-500 truncate">{sugg.secondaryText}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Compact Single Radius Slider — only for city/poi/landmark, hidden for country/state */}
          {showRadiusSlider && (
            <div className="flex-[1_1_200px] w-full shrink-0 bg-slate-50 px-4 rounded-xl border border-slate-200 flex items-center gap-3 h-12 shadow-sm relative overflow-visible">
              <span className="text-xs font-semibold text-slate-700 shrink-0 whitespace-nowrap flex items-center gap-1.5">
                <Navigation className="h-3 w-3 text-primary" />
                Radius: <span className="text-primary">{activeLocation.radiusKm || 5} km</span>
              </span>
              <div className="flex-1 px-3 overflow-visible">
                <Slider
                  className="w-full cursor-grab active:cursor-grabbing overflow-visible"
                  min={1}
                  max={50}
                  step={1}
                  value={[activeLocation.radiusKm || 5]}
                  onValueChange={([val]) => handleRadiusChange(activeLocationIndex!, val)}
                />
              </div>
            </div>
          )}

          {/* Country / State indicator (no radius) */}
          {activeLocation && (activeLocation.locationType === 'country' || activeLocation.locationType === 'state') && (
            <div className="flex-[1_1_200px] w-full shrink-0 bg-primary/5 px-4 rounded-xl border border-primary/20 flex items-center gap-2 h-12 shadow-sm">
              <Globe className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary">
                {activeLocation.locationType === 'country' ? 'All screens in country' : 'All screens in state'}
              </span>
            </div>
          )}
        </div>

        {/* Selected Locations Chips */}
        {selectedLocations.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedLocations.map((loc, index) => {
              const isWide = loc.locationType === 'country' || loc.locationType === 'state';
              return (
                <Badge
                  key={`${loc.label}-${index}`}
                  variant={activeLocationIndex === index ? "default" : "secondary"}
                  className={`px-3 py-1.5 text-sm font-medium border-none gap-2 flex items-center rounded-lg cursor-pointer transition-colors ${
                    activeLocationIndex === index
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                  }`}
                  onClick={() => {
                    setActiveLocationIndex(index);
                    if (loc.lat && loc.lng) onLocationFocus?.(loc);
                    // Fit bounds for country/state
                    if (isWide && loc.bounds && map) {
                      map.fitBounds(loc.bounds);
                    }
                  }}
                >
                  {isWide
                    ? <Globe className={`h-3.5 w-3.5 ${activeLocationIndex === index ? "text-primary-foreground" : "text-primary"}`} />
                    : <MapPin className={`h-3.5 w-3.5 ${activeLocationIndex === index ? "text-primary-foreground" : "text-primary"}`} />
                  }
                  {loc.label}
                  {!isWide && loc.radiusKm && activeLocationIndex !== index && (
                    <span className="text-[10px] opacity-60">· {loc.radiusKm}km</span>
                  )}
                  {isWide && activeLocationIndex !== index && (
                    <span className="text-[10px] opacity-60">· {loc.locationType}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLocation(index);
                    }}
                    className={`ml-1 transition-colors focus:outline-none ${
                      activeLocationIndex === index
                        ? "text-primary-foreground/70 hover:text-primary-foreground"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}
    </div>
  );
}

