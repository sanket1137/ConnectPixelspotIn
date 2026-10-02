import React, { useEffect, useRef, useState } from "react";

// Mobile Discover sheet that always sits over the map: peek (a strip — map fully usable),
// half, and full. Drag the handle/header, or tap the handle to cycle. The parent controls the
// snap so opening a screen can raise the sheet and an empty-map tap can lower it.
export type SheetSnap = 0 | 1 | 2;

interface MapBottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  header: React.ReactNode; // always visible (peek shows only this)
  children: React.ReactNode; // shown at half / full
  bodyRef?: React.Ref<HTMLDivElement>;
  peekHeight?: number; // px, handle + header
  topOffset?: number; // px kept free above the sheet at full (search pill)
}

export function MapBottomSheet({ snap, onSnapChange, header, children, bodyRef, peekHeight = 132, topOffset = 76 }: MapBottomSheetProps) {
  const [dragDy, setDragDy] = useState<number | null>(null);
  const start = useRef<{ y: number; t: number; moved: boolean } | null>(null);

  // Let page-level floating buttons (WhatsApp) step aside while the sheet is raised
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.discoverSheet = snap > 0 ? "raised" : "peek";
    return () => {
      delete root.dataset.discoverSheet;
    };
  }, [snap]);

  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const heights = [peekHeight, Math.round(vh * 0.52), vh - topOffset];
  const baseHeight = heights[snap];
  const height = Math.max(peekHeight * 0.6, Math.min(heights[2], baseHeight - (dragDy ?? 0)));

  const onPointerDown = (e: React.PointerEvent) => {
    // don't hijack taps on buttons/inputs inside the header
    if ((e.target as HTMLElement).closest("button, a, input, select, [role='combobox']")) return;
    start.current = { y: e.clientY, t: Date.now(), moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dy = e.clientY - start.current.y;
    if (Math.abs(dy) > 4) start.current.moved = true;
    setDragDy(dy);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const { y, t, moved } = start.current;
    start.current = null;
    setDragDy(null);
    if (!moved) {
      // tap on the handle area: peek → half → full → half
      onSnapChange(snap === 0 ? 1 : snap === 1 ? 2 : 1);
      return;
    }
    const dy = e.clientY - y;
    const velocity = dy / Math.max(1, Date.now() - t); // px/ms, + = down
    const finalHeight = baseHeight - dy;
    let next: SheetSnap;
    if (velocity > 0.6) next = (Math.max(0, snap - 1) as SheetSnap);
    else if (velocity < -0.6) next = (Math.min(2, snap + 1) as SheetSnap);
    else {
      // nearest snap point to where it was released
      next = heights.reduce((best, h, i) => (Math.abs(h - finalHeight) < Math.abs(heights[best] - finalHeight) ? i : best), 0) as SheetSnap;
    }
    onSnapChange(next);
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex flex-col bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.15)] ${dragDy === null ? "transition-[height] duration-300 ease-out" : ""}`}
      style={{ height }}
      role="region"
      aria-label="Screens"
    >
      <div
        className="shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { start.current = null; setDragDy(null); }}
      >
        <div className="flex justify-center pt-2.5 pb-1.5">
          <button
            type="button"
            aria-label={snap === 2 ? "Show map" : "Show more"}
            onClick={() => onSnapChange(snap === 2 ? 0 : ((snap + 1) as SheetSnap))}
            className="h-5 w-16 flex items-center justify-center"
          >
            <span className="block w-10 h-1.5 rounded-full bg-slate-300" />
          </button>
        </div>
        {header}
      </div>
      <div ref={bodyRef} className={`flex-1 min-h-0 flex flex-col ${snap === 0 && dragDy === null ? "invisible" : ""}`}>
        {children}
      </div>
    </div>
  );
}
