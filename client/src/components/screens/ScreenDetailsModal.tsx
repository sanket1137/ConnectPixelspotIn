import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Screen } from '@shared/schema';
import { MapPin, Users, Monitor, Clock, PlayCircle, Eye, CalendarDays, ExternalLink, X, PlusCircle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ScreenDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: Screen | null;
  onAdd: (screen: Screen) => void;
  isAdded: boolean;
}

export function ScreenDetailsModal({
  isOpen,
  onClose,
  screen,
  onAdd,
  isAdded
}: ScreenDetailsModalProps) {
  if (!screen) return null;

  const getPrimaryImage = (screen: Screen) => {
    if (screen.screenImages && screen.screenImages.length > 0) return screen.screenImages[0];
    if (screen.images && screen.images.length > 0) return screen.images[0];
    return 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?auto=format&fit=crop&q=80&w=800';
  };

  const getMapsUrl = () => {
    return `https://www.google.com/maps/dir/?api=1&destination=${screen.latitude},${screen.longitude}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border-0 rounded-2xl shadow-2xl flex flex-col sm:flex-row h-[90vh] sm:h-auto sm:max-h-[85vh]">
        
        {/* Left Column - Image & Quick Info (Scrollable on mobile) */}
        <div className="w-full sm:w-2/5 bg-slate-50 flex flex-col relative h-[40vh] sm:h-auto shrink-0">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 z-10 sm:hidden bg-black/20 text-white hover:bg-black/40 rounded-full"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="relative h-full w-full min-h-[250px]">
            <img 
              src={getPrimaryImage(screen)} 
              alt={screen.name} 
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Screen Type Strip at top-left */}
            {screen.type && (
              <div className="absolute top-6 left-6 z-10">
                <Badge className="bg-teal-500 hover:bg-teal-600 text-white border-0 shadow-xl px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-md backdrop-blur-md">
                  {screen.type}
                </Badge>
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
              <Badge variant="secondary" className="w-fit mb-3 bg-white/20 text-white hover:bg-white/30 border-0 backdrop-blur-sm shadow-sm">
                {screen.category}
              </Badge>
              <h2 className="text-2xl font-bold text-white leading-tight mb-2">{screen.name}</h2>
              <div className="flex items-center text-slate-200 text-sm">
                <MapPin className="h-4 w-4 mr-1 shrink-0" />
                <span className="truncate">{screen.venueName}, {screen.city}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Details */}
        <div className="w-full sm:w-3/5 flex flex-col overflow-y-auto">
          
          <div className="p-6 sm:p-8 flex-1">
            <div className="flex justify-between items-start mb-6 hidden sm:flex">
              <DialogTitle className="text-xl text-slate-800 font-semibold sr-only">
                {screen.name} Details
              </DialogTitle>
              <DialogDescription className="sr-only">Detailed advertising metrics for {screen.name}</DialogDescription>
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" size="sm" onClick={() => window.open(getMapsUrl(), '_blank')} className="rounded-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Directions
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-100">
                  <X className="h-5 w-5 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center text-slate-500 mb-1">
                  <Users className="h-4 w-4 mr-2" />
                  <span className="text-xs font-medium uppercase tracking-wider">Daily Footfall</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {(screen.avgDailyFootfall || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-center text-slate-500 mb-1">
                  <Eye className="h-4 w-4 mr-2" />
                  <span className="text-xs font-medium uppercase tracking-wider">Visibility</span>
                </div>
                <div className="text-lg font-semibold text-slate-900 capitalize">
                  {screen.visibility || 'High'}
                </div>
              </div>
            </div>

            {/* Advertising Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <Monitor className="h-4 w-4 mr-2 text-teal-600" />
                  Screen Specifications
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><span className="text-slate-500">Resolution:</span> <span className="font-medium">{screen.resolution}</span></div>
                  <div><span className="text-slate-500">Format:</span> <span className="font-medium">{screen.displayFormat}</span></div>
                  <div><span className="text-slate-500">Environment:</span> <span className="font-medium">{screen.environmentType}</span></div>
                  <div><span className="text-slate-500">Traffic:</span> <span className="font-medium">{screen.trafficType}</span></div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center">
                  <PlayCircle className="h-4 w-4 mr-2 text-teal-600" />
                  Advertising Details
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><span className="text-slate-500">Ad Slot:</span> <span className="font-medium">{screen.durationPerSlot} Seconds</span></div>
                  <div><span className="text-slate-500">Loop Time:</span> <span className="font-medium">{screen.loopDuration || (screen.durationPerSlot * (screen.maxBrandsPerLoop || 1))} Seconds</span></div>
                  <div><span className="text-slate-500">Max Brands:</span> <span className="font-medium">{screen.maxBrandsPerLoop || '-'}</span></div>
                  <div><span className="text-slate-500">Plays/Hour:</span> <span className="font-medium">{screen.playbackSlotsPerHour || '-'}</span></div>
                </div>
              </div>
              
              <Separator />

              {/* Tags */}
              {(screen.lifestyleTags || screen.locationTags) && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Audience & Location Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {screen.lifestyleTags?.map(tag => (
                      <Badge key={tag} variant="secondary" className="bg-slate-100 text-slate-700 font-normal">
                        {tag}
                      </Badge>
                    ))}
                    {screen.locationTags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-slate-600 font-normal border-slate-200">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="p-4 sm:p-6 bg-white border-t border-slate-100 sticky bottom-0 z-10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-2xl font-bold text-slate-900">
                  ₹{(screen.pricePerDay || 0).toLocaleString()}
                  <span className="text-sm font-normal text-slate-500"> /day</span>
                </div>
                <div className="text-xs font-medium text-slate-500 flex items-center mt-1">
                  <CalendarDays className="h-3 w-3 mr-1" />
                  Min. {screen.minBookingDays} days booking
                </div>
              </div>
              
              <Button 
                size="lg" 
                className={`w-full sm:w-auto min-w-[200px] rounded-xl font-medium transition-all ${isAdded ? 'bg-green-600 hover:bg-green-700' : 'bg-teal-600 hover:bg-teal-700'}`}
                onClick={() => onAdd(screen)}
              >
                {isAdded ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Added to Campaign
                  </>
                ) : (
                  <>
                    <PlusCircle className="h-5 w-5 mr-2" />
                    Add to Campaign
                  </>
                )}
              </Button>
            </div>
          </div>
          
        </div>
      </DialogContent>
    </Dialog>
  );
}
