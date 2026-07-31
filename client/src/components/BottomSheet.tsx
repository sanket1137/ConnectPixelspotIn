import React, { useEffect, useState, useRef } from "react";
import { motion, useAnimation, useDragControls } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./ui/button";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: string[]; // e.g., ["25%", "50%", "95%"]
  initialSnap?: number; // index of snapPoints
  hideCloseButton?: boolean;
  onSnapChange?: (index: number) => void;
}

export function BottomSheet({ 
  isOpen, 
  onClose, 
  children, 
  snapPoints = ["35%", "92%"], 
  initialSnap = 0,
  hideCloseButton = false,
  onSnapChange
}: BottomSheetProps) {
  const controls = useAnimation();
  const dragControls = useDragControls();
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      controls.start("visible");
      setCurrentSnap(initialSnap);
    } else {
      controls.start("hidden");
    }
  }, [isOpen, controls, initialSnap]);

  useEffect(() => {
    if (onSnapChange) onSnapChange(currentSnap);
  }, [currentSnap, onSnapChange]);

  const handleDragEnd = (event: any, info: any) => {
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    if (velocity > 500 || offset > 100) {
      // Dragged down strongly
      if (currentSnap > 0) {
        setCurrentSnap(currentSnap - 1);
      } else {
        onClose();
      }
    } else if (velocity < -500 || offset < -100) {
      // Dragged up strongly
      if (currentSnap < snapPoints.length - 1) {
        setCurrentSnap(currentSnap + 1);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      controls.start({ y: 0, height: snapPoints[currentSnap] });
    }
  }, [currentSnap, controls, isOpen, snapPoints]);

  if (!isOpen) return null;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: currentSnap === snapPoints.length - 1 ? 0.6 : 0 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 bg-black/60 z-40 ${currentSnap === snapPoints.length - 1 ? 'pointer-events-auto' : 'pointer-events-none'}`}
        onClick={() => currentSnap === snapPoints.length - 1 ? setCurrentSnap(0) : onClose()}
      />
      <motion.div
        ref={containerRef}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        initial="hidden"
        animate={controls}
        variants={{
          visible: { y: 0, height: snapPoints[currentSnap] },
          hidden: { y: "100%", height: snapPoints[currentSnap] }
        }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] z-50 overflow-hidden flex flex-col will-change-transform"
      >
        {/* Drag Handle */}
        <div 
          className="w-full flex justify-center items-center py-3 pb-2 cursor-grab active:cursor-grabbing touch-none shrink-0"
          onPointerDown={(e) => dragControls.start(e)}
        >
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {!hideCloseButton && (
          <div className="absolute top-3 right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-slate-100 hover:bg-slate-200 h-8 w-8 text-slate-500"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 relative">
          {children}
        </div>
      </motion.div>
    </>
  );
}
