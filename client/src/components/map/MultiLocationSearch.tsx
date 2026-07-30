import React, { useEffect, useState, useCallback } from 'react';
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2, Search, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export interface LocationItem {
  type: 'city' | 'map';
  label: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  city?: string;
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
        const request = {
          input: debouncedInput,
          region: 'in',
          language: 'en',
        };
        // @ts-ignore – new API
        const { suggestions: results } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        if (!cancelled && results) {
          setSuggestions(
            results
              .filter((s: any) => s.placePrediction)
              .map((s: any) => ({
                placeId: s.placePrediction.placeId,
                mainText: s.placePrediction.mainText?.text || s.placePrediction.text?.text || '',
                secondaryText: s.placePrediction.secondaryText?.text || '',
              }))
          );
        }
      } catch {
        // Fallback to legacy AutocompleteService
        try {
          const service = new (placesLib as any).AutocompleteService();
          service.getPlacePredictions(
            { input: debouncedInput, componentRestrictions: { country: 'in' } },
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
      } finally {
        if (!cancelled) setIsLoadingSuggestions(false);
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

    try {
      // Use new Place API
      // @ts-ignore – new API
      const place = new google.maps.places.Place({ id: suggestion.placeId });
      await place.fetchFields({ fields: ['location'] });
      if (place.location) {
        addLocation({
          type: 'map',
          label: suggestion.mainText,
          lat: place.location.lat(),
          lng: place.location.lng(),
          radiusKm: 5,
        });
        return;
      }
    } catch {
      // Fallback to legacy PlacesService
    }

    try {
      const dummyEl = document.createElement('div');
      const service = new (placesLib as any).PlacesService(dummyEl);
      service.getDetails(
        { placeId: suggestion.placeId, fields: ['geometry', 'name'] },
        (place: any, status: any) => {
          if (status === 'OK' && place?.geometry?.location) {
            addLocation({
              type: 'map',
              label: suggestion.mainText,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              radiusKm: 5,
            });
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

  return (
    <div className={`space-y-4 ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            {isLoadingSuggestions && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
            )}
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="h-14 pl-12 text-base w-full rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-primary focus-visible:border-primary text-slate-900 font-medium"
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[calc(100vw-3rem)] sm:w-[400px] p-2 rounded-2xl shadow-xl border-slate-200 mt-2 z-[9999]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex flex-col">
            {/* Current Location Option */}
            <button
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                {isLocating ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900">Current Location / Nearby</div>
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

      {/* Selected Locations Chips */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((loc, index) => (
            <Badge
              key={`${loc.label}-${index}`}
              variant={activeLocationIndex === index ? "default" : "secondary"}
              className={`px-3 py-1.5 text-sm font-medium border-none gap-2 flex items-center rounded-lg cursor-pointer transition-colors ${
                activeLocationIndex === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800"
              }`}
              onClick={() => {
                setActiveLocationIndex(index);
                if (loc.lat && loc.lng) onLocationFocus?.(loc);
              }}
            >
              <MapPin className={`h-3.5 w-3.5 ${activeLocationIndex === index ? "text-primary-foreground" : "text-primary"}`} />
              {loc.label}
              {loc.type === 'map' && loc.radiusKm && activeLocationIndex !== index && (
                <span className="text-[10px] opacity-60">· {loc.radiusKm}km</span>
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
          ))}
        </div>
      )}

      {/* Single Radius Slider for the active map location */}
      {activeLocation && activeLocation.type === 'map' && activeLocationIndex !== null && (
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold flex items-center gap-1.5 text-slate-700">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              {activeLocation.label} — Radius
            </Label>
            <span className="text-sm text-primary font-bold bg-primary/10 px-2.5 py-0.5 rounded-md">
              {activeLocation.radiusKm || 5} km
            </span>
          </div>
          <Slider
            min={1}
            max={50}
            step={1}
            value={[activeLocation.radiusKm || 5]}
            onValueChange={([val]) => handleRadiusChange(activeLocationIndex, val)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 km</span>
            <span>50 km</span>
          </div>
        </div>
      )}
    </div>
  );
}
