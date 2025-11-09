import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  MapPin, 
  FileText, 
  Monitor, 
  Calendar, 
  DollarSign,
  Users,
  MessageSquare,
  TrendingUp,
  ChevronRight,
  ChevronLeft
} from "lucide-react";

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  userRole: "advertiser" | "screen_owner" | "admin";
}

interface Slide {
  icon: any;
  title: string;
  description: string;
  features: string[];
}

const advertiserSlides: Slide[] = [
  {
    icon: Sparkles,
    title: "Welcome to Pixelspot!",
    description: "India's leading DOOH advertising marketplace. Let me show you around!",
    features: [
      "Find the perfect screens for your campaigns",
      "AI-powered campaign recommendations",
      "Real-time booking and analytics"
    ]
  },
  {
    icon: Sparkles,
    title: "AI Campaign Advisor",
    description: "Get intelligent recommendations for your advertising campaigns",
    features: [
      "Tell us about your business and goals",
      "AI analyzes your website and objectives",
      "Receive personalized screen recommendations",
      "Get budget and targeting suggestions"
    ]
  },
  {
    icon: MapPin,
    title: "Discover Screens",
    description: "Find digital billboards across India with powerful search tools",
    features: [
      "Interactive map view of all available screens",
      "Filter by location, price, and audience",
      "See detailed screen information and photos",
      "Compare screens side-by-side"
    ]
  },
  {
    icon: FileText,
    title: "Create Campaigns",
    description: "Launch your advertising campaigns in minutes",
    features: [
      "Set your budget and campaign dates",
      "Select screens that match your audience",
      "Upload your creative content",
      "Track campaign performance in real-time"
    ]
  }
];

const screenOwnerSlides: Slide[] = [
  {
    icon: Monitor,
    title: "Welcome to Pixelspot!",
    description: "Start earning from your digital screens today!",
    features: [
      "List your screens and reach advertisers",
      "Manage bookings and approvals",
      "Track your earnings and performance"
    ]
  },
  {
    icon: Monitor,
    title: "Add Your Screens",
    description: "List your digital billboards and start receiving bookings",
    features: [
      "Provide screen details and location",
      "Upload photos of your screen and surroundings",
      "Set your pricing and availability",
      "Admin approval within 24-48 hours"
    ]
  },
  {
    icon: Calendar,
    title: "Manage Booking Requests",
    description: "Review and approve advertiser campaigns for your screens",
    features: [
      "See incoming booking requests",
      "Review campaign details and creatives",
      "Approve, reject, or suggest alternative dates",
      "Get notified of all booking activities"
    ]
  },
  {
    icon: DollarSign,
    title: "Track Your Earnings",
    description: "Monitor your revenue and screen performance",
    features: [
      "View total earnings and pending payments",
      "See which screens perform best",
      "Track booking history and trends",
      "Download reports for your records"
    ]
  }
];

const adminSlides: Slide[] = [
  {
    icon: TrendingUp,
    title: "Welcome to Admin Portal!",
    description: "Manage the Pixelspot marketplace efficiently",
    features: [
      "Oversee users, screens, and campaigns",
      "Review and approve submissions",
      "Monitor platform analytics"
    ]
  },
  {
    icon: Users,
    title: "User Management",
    description: "Manage all users across the platform",
    features: [
      "View all advertisers and screen owners",
      "Activate or deactivate user accounts",
      "Monitor user activity and behavior",
      "Provide support when needed"
    ]
  },
  {
    icon: Monitor,
    title: "Screen Approvals",
    description: "Review and approve screen submissions",
    features: [
      "Verify screen details and locations",
      "Check uploaded photos and information",
      "Approve quality screens or reject with feedback",
      "Ensure marketplace quality standards"
    ]
  },
  {
    icon: MessageSquare,
    title: "AI Conversation Insights",
    description: "Monitor how advertisers use the AI Campaign Advisor",
    features: [
      "View all AI chatbot conversations",
      "See which features users ask about most",
      "Track AI recommendations and accuracy",
      "Improve platform based on insights"
    ]
  }
];

export default function WelcomeModal({ open, onClose, userRole }: WelcomeModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = userRole === "advertiser" 
    ? advertiserSlides 
    : userRole === "screen_owner" 
    ? screenOwnerSlides 
    : adminSlides;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <Dialog open={open} onOpenChange={handleSkip}>
      <DialogContent className="max-w-2xl" data-testid="welcome-modal">
        <DialogHeader>
          <DialogTitle className="sr-only">Welcome to Pixelspot</DialogTitle>
        </DialogHeader>

        <div className="py-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-3" data-testid="slide-title">
              {slide.title}
            </h2>
            <p className="text-muted-foreground mb-6" data-testid="slide-description">
              {slide.description}
            </p>

            {/* Features */}
            <div className="space-y-3 text-left max-w-md mx-auto">
              {slide.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                  <p className="text-sm">{feature}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-6">
            {slides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentSlide 
                    ? "bg-primary w-6" 
                    : "bg-muted-foreground/30"
                }`}
                data-testid={`progress-dot-${index}`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              data-testid="button-skip"
            >
              Skip Tour
            </Button>

            <div className="flex gap-2">
              {currentSlide > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  data-testid="button-back"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                data-testid="button-next"
              >
                {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
                {currentSlide < slides.length - 1 && (
                  <ChevronRight className="w-4 h-4 ml-1" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
