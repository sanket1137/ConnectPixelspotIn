import { APIProvider } from '@vis.gl/react-google-maps';
import type { ReactNode } from 'react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

/**
 * Shared Google Maps APIProvider — wraps the entire app so the Maps JS API
 * is loaded once and shared by every <Map> / <AdvancedMarker> on any page.
 */
export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      {children}
    </APIProvider>
  );
}
