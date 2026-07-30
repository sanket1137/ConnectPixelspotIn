import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { MultiLocationSearch, LocationItem } from "@/components/map/MultiLocationSearch";
import { Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

function CircleOverlay({ center, radius }: { center: { lat: number; lng: number }; radius: number }) {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  React.useEffect(() => {
    if (!map || !mapsLib) return;
    const circle = new mapsLib.Circle({
      map,
      center,
      radius,
      fillColor: "#f59e0b",
      fillOpacity: 0.12,
      strokeColor: "#f59e0b",
      strokeOpacity: 0.8,
      strokeWeight: 2,
    });
    return () => circle.setMap(null);
  }, [map, mapsLib, center.lat, center.lng, radius]);
  return null;
}

// Pans map whenever panTarget changes
function MapPanner({ target }: { target: { lat: number; lng: number; radiusKm?: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    // Zoom based on radius: bigger radius = wider zoom
    const radius = target.radiusKm || 5;
    const zoom = radius <= 2 ? 15 : radius <= 5 ? 13 : radius <= 15 ? 11 : radius <= 30 ? 9 : 8;
    map.setZoom(zoom);
  }, [map, target?.lat, target?.lng, target?.radiusKm]);
  return null;
}

interface Props {
  locations: LocationItem[];
  onChange: (locations: LocationItem[]) => void;
  error?: string;
}

export default function Step2_LocationSelect({ locations, onChange, error }: Props) {
  const [panTarget, setPanTarget] = useState<{ lat: number; lng: number; radiusKm?: number } | null>(null);

  const mapLocations = locations.filter(l => l.type === 'map' && l.lat);
  const firstMapLoc = mapLocations[0];

  const handleLocationFocus = (loc: LocationItem) => {
    if (loc.lat && loc.lng) {
      setPanTarget({ lat: loc.lat, lng: loc.lng, radiusKm: loc.radiusKm });
    }
  };

  const handleLocationsChange = (locs: LocationItem[]) => {
    onChange(locs);
    // If a location was added (new item at end), pan to it
    const lastNew = locs.filter(l => l.type === 'map' && l.lat).at(-1);
    if (lastNew && locs.length > locations.length) {
      setPanTarget({ lat: lastNew.lat!, lng: lastNew.lng!, radiusKm: lastNew.radiusKm });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-1">Choose your location</h2>
        <p className="text-sm text-muted-foreground">Search and add one or more locations to target screens</p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Target Locations</Label>

        <MultiLocationSearch
          selectedLocations={locations}
          onChange={handleLocationsChange}
          onLocationFocus={handleLocationFocus}
          placeholder="Search city, locality, landmark, or PIN code..."
        />

        {error && <p className="text-sm text-destructive mt-2">{error}</p>}

        {/* Map Preview for Map-based Locations */}
        {mapLocations.length > 0 && (
          <div className="mt-4 h-[300px] w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative">
            <Map
              style={{ width: "100%", height: "100%" }}
              defaultCenter={{
                lat: firstMapLoc?.lat || 20,
                lng: firstMapLoc?.lng || 78,
              }}
              defaultZoom={12}
              mapId="step2-preview-map"
              gestureHandling="greedy"
              disableDefaultUI={true}
              zoomControl={true}
            >
              <MapPanner target={panTarget} />

              {mapLocations.map((loc, idx) => (
                <React.Fragment key={`preview-${idx}`}>
                  <AdvancedMarker
                    position={{ lat: loc.lat!, lng: loc.lng! }}
                    onClick={() => handleLocationFocus(loc)}
                  >
                    <div className="w-5 h-5 bg-amber-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    </div>
                  </AdvancedMarker>
                  <CircleOverlay
                    center={{ lat: loc.lat!, lng: loc.lng! }}
                    radius={(loc.radiusKm || 5) * 1000}
                  />
                </React.Fragment>
              ))}
            </Map>
          </div>
        )}
      </div>
    </div>
  );
}
