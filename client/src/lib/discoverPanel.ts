import { useCallback, useEffect, useRef, useState } from "react";

// What the Discover sidebar is showing. Mirrored in the URL so browser Back/Forward and shared
// links work: ?screen=<id>[&place=<venueKey>] for a screen (place = the venue it was opened from),
// ?place=<venueKey> for a venue. (`venue` is already taken — it pre-fills the venue-type filter.)
export type DiscoverPanel =
  | { kind: "results" }
  | { kind: "screen"; id: string; fromVenue?: string }
  | { kind: "venue"; key: string };

const SCREEN_PARAM = "screen";
const PLACE_PARAM = "place";

function readPanel(): DiscoverPanel {
  if (typeof window === "undefined") return { kind: "results" };
  const params = new URLSearchParams(window.location.search);
  const screen = params.get(SCREEN_PARAM);
  const place = params.get(PLACE_PARAM);
  if (screen) return { kind: "screen", id: screen, fromVenue: place || undefined };
  if (place) return { kind: "venue", key: place };
  return { kind: "results" };
}

function panelUrl(panel: DiscoverPanel): string {
  const url = new URL(window.location.href);
  url.searchParams.delete(SCREEN_PARAM);
  url.searchParams.delete(PLACE_PARAM);
  if (panel.kind === "screen") {
    url.searchParams.set(SCREEN_PARAM, panel.id);
    if (panel.fromVenue) url.searchParams.set(PLACE_PARAM, panel.fromVenue);
  } else if (panel.kind === "venue") {
    url.searchParams.set(PLACE_PARAM, panel.key);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function samePanel(a: DiscoverPanel, b: DiscoverPanel): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "screen" && b.kind === "screen") return a.id === b.id && a.fromVenue === b.fromVenue;
  if (a.kind === "venue" && b.kind === "venue") return a.key === b.key;
  return true;
}

export function useDiscoverPanel() {
  const [panel, setPanelState] = useState<DiscoverPanel>(readPanel);
  const current = useRef(panel);

  useEffect(() => {
    const onPop = () => {
      current.current = readPanel();
      setPanelState(current.current);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // push: a new history entry (opening something); replace: swap in place (e.g. closing a panel
  // whose venue vanished from the results — Back shouldn't bring it back)
  const setPanel = useCallback((next: DiscoverPanel, mode: "push" | "replace" = "push") => {
    if (samePanel(current.current, next)) return;
    const url = panelUrl(next);
    if (mode === "push") window.history.pushState(window.history.state, "", url);
    else window.history.replaceState(window.history.state, "", url);
    current.current = next;
    setPanelState(next);
  }, []);

  return { panel, setPanel };
}

// One level up: screen opened from a venue → that venue; everything else → results.
export function parentPanel(panel: DiscoverPanel): DiscoverPanel {
  if (panel.kind === "screen" && panel.fromVenue) return { kind: "venue", key: panel.fromVenue };
  return { kind: "results" };
}
