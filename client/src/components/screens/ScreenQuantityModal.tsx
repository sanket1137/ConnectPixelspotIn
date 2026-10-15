import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Minus, Plus, Monitor, Check, Trash2, Info } from "lucide-react";
import type { Screen } from "@shared/schema";
import { getScreenPricing } from "@shared/utils";

export interface ScreenQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: (Screen & { distanceKm?: number }) | null;
  initialQuantity?: number;
  priceOverride?: number;
  isAlreadyAdded?: boolean;
  onConfirm: (screen: Screen, quantity: number) => void;
  onRemove?: (screen: Screen) => void;
}

export function ScreenQuantityModal({
  isOpen,
  onClose,
  screen,
  initialQuantity,
  priceOverride,
  isAlreadyAdded = false,
  onConfirm,
  onRemove,
}: ScreenQuantityModalProps) {
  if (!screen) return null;

  const totalScreens = Math.max(1, Number(screen.numberOfScreens || 1));
  const pricing = getScreenPricing(
    priceOverride !== undefined ? { ...screen, pricePerDay: priceOverride } : screen,
    1
  );

  const [quantity, setQuantity] = useState<number>(() => {
    if (initialQuantity && initialQuantity >= 1) {
      return Math.min(initialQuantity, totalScreens);
    }
    return 1;
  });

  const [inputVal, setInputVal] = useState<string>(() => quantity.toString());

  useEffect(() => {
    if (isOpen) {
      const q = initialQuantity && initialQuantity >= 1
        ? Math.min(initialQuantity, totalScreens)
        : 1;
      setQuantity(q);
      setInputVal(q.toString());
    }
  }, [isOpen, initialQuantity, totalScreens]);

  const applyQuantity = (val: number) => {
    const clamped = Math.min(Math.max(1, Math.round(val || 1)), totalScreens);
    setQuantity(clamped);
    setInputVal(clamped.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setInputVal(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      setQuantity(Math.min(Math.max(1, num), totalScreens));
    }
  };

  const handleInputBlur = () => {
    const num = parseInt(inputVal, 10);
    if (isNaN(num) || num < 1) {
      applyQuantity(1);
    } else if (num > totalScreens) {
      applyQuantity(totalScreens);
    } else {
      applyQuantity(num);
    }
  };

  const currentDailyTotal = pricing.unitPrice * quantity;

  const handleConfirm = () => {
    onConfirm(screen, quantity);
    onClose();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove(screen);
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Monitor className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-snug">
                Select Screens to Book
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-1">
                {screen.name} · {[screen.city, screen.venueCategory].filter(Boolean).join(" · ")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Info banner for multi-screen venues */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50/90 border border-blue-200/80 text-blue-900">
            <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-blue-800">
              This venue consists of multiple screens ({totalScreens} screens total). Please select the number of screens you would like to book for your campaign.
            </p>
          </div>

          {/* Network & Base Rate Card */}
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Rate per Screen</p>
              <p className="text-lg font-bold text-slate-900">
                ₹{pricing.unitPrice.toLocaleString("en-IN")}{" "}
                <span className="text-xs font-normal text-slate-500">/ screen / day</span>
              </p>
            </div>
            <Badge variant="secondary" className="font-semibold text-xs bg-white border-slate-200 shadow-sm">
              {totalScreens} Screens Available
            </Badge>
          </div>

          {/* Quantity Selector Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-800">
                Number of screens to book
              </label>
              <button
                type="button"
                onClick={() => applyQuantity(totalScreens)}
                className="text-xs text-primary hover:underline font-semibold"
              >
                Select All ({totalScreens})
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={quantity <= 1}
                onClick={() => applyQuantity(quantity - 1)}
                className="h-9 w-9 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Minus className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  min={1}
                  max={totalScreens}
                  value={inputVal}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  className="h-10 w-20 text-center font-bold text-base border-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-xs text-slate-500 font-medium">of {totalScreens} screens</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={quantity >= totalScreens}
                onClick={() => applyQuantity(quantity + 1)}
                className="h-9 w-9 rounded-lg border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Pricing Calculation Summary Box */}
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center justify-between">
            <span className="text-xs text-slate-700 font-medium">
              ₹{pricing.unitPrice.toLocaleString("en-IN")} × {quantity} screen{quantity !== 1 ? "s" : ""}
            </span>
            <div className="text-right">
              <span className="text-base font-bold text-primary">
                ₹{currentDailyTotal.toLocaleString("en-IN")}/day
              </span>
            </div>
          </div>

          {screen.minBookingDays && screen.minBookingDays > 1 && (
            <p className="text-[11px] text-amber-700 font-medium">
              * Minimum booking requirement for this screen is {screen.minBookingDays} days.
            </p>
          )}
        </div>

        <DialogFooter className="flex-row sm:justify-between gap-2 pt-2 border-t border-slate-100">
          {isAlreadyAdded ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleRemove}
                className="text-destructive border-red-200 hover:bg-red-50 text-xs font-semibold gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Update ({quantity} Screens)
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="text-xs text-slate-600"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirm}
                className="bg-primary hover:bg-primary/90 text-white font-semibold text-xs gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> Add {quantity} Screens
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
