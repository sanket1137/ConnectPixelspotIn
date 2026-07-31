import React, { useEffect, useState } from 'react';
import { useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDebounce } from '@/hooks/use-debounce';

interface SearchAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null, inputValue: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export function SearchAutocomplete({
  onPlaceSelect,
  placeholder = "Where to promote?",
  className = "",
  initialValue = ""
}: SearchAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const placesLib = useMapsLibrary('places');
  const map = useMap();
  
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  
  const { toast } = useToast();
  const debouncedInput = useDebounce(inputValue, 300);

  useEffect(() => {
    if (!placesLib) return;
    setAutocompleteService(new placesLib.AutocompleteService());
    
    // We need a dummy element or map for PlacesService
    if (map) {
      setPlacesService(new placesLib.PlacesService(map));
    } else {
      const dummyElement = document.createElement('div');
      setPlacesService(new placesLib.PlacesService(dummyElement));
    }
  }, [placesLib, map]);

  useEffect(() => {
    if (!autocompleteService || !debouncedInput.trim()) {
      setPredictions([]);
      return;
    }
    
    autocompleteService.getPlacePredictions({
      input: debouncedInput,
      componentRestrictions: { country: 'in' },
    }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results);
      } else {
        setPredictions([]);
      }
    });
  }, [debouncedInput, autocompleteService]);

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
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setInputValue("Current Location");
        
        // Mock a PlaceResult for location
        const mockPlace: any = {
          geometry: {
            location: {
              lat: () => lat,
              lng: () => lng,
            }
          },
          formatted_address: "Current Location",
          name: "Current Location"
        };
        
        onPlaceSelect(mockPlace, "Current Location");
      },
      (error) => {
        setIsLocating(false);
        toast({ title: "Location Error", description: "Could not get your location.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handlePredictionSelect = (prediction: google.maps.places.AutocompletePrediction) => {
    setInputValue(prediction.description);
    setIsOpen(false);
    
    if (!placesService) return;
    
    placesService.getDetails({
      placeId: prediction.place_id,
      fields: ['geometry', 'name', 'formatted_address', 'place_id', 'types']
    }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place) {
        onPlaceSelect(place, prediction.description);
      }
    });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className={`relative w-full ${className}`}>
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setIsOpen(false);
                onPlaceSelect(null, inputValue);
              }
            }}
            onClick={() => setIsOpen(true)}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            className="h-8 text-sm w-full border-0 bg-transparent shadow-none px-0 py-0 focus-visible:ring-0 text-slate-900 placeholder:text-slate-400 font-medium"
          />
        </div>
      </PopoverPrimitive.Anchor>
      
      <PopoverContent 
        className="w-[350px] p-2 rounded-2xl shadow-xl border-slate-200 mt-2 z-[9999]" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col">
          {/* Current Location Option */}
          <button 
            onMouseDown={(e) => {
              e.preventDefault();
              handleUseMyLocation();
            }}
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
              <div className="text-sm font-semibold text-slate-900">Current Location</div>
              <div className="text-xs text-slate-500 truncate">Use your device location</div>
            </div>
          </button>
          
          {predictions.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100">
              {predictions.map((pred) => (
                <button
                  key={pred.place_id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePredictionSelect(pred);
                  }}
                  className="flex items-center gap-3 w-full p-3 hover:bg-slate-50 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {pred.structured_formatting.main_text}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {pred.structured_formatting.secondary_text}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
