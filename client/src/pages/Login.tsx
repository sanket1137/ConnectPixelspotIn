import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Monitor, TrendingUp, MapPin, Building2, Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Login() {
  const { user, signInWithGoogle, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"screen_owner" | "advertiser" | null>(null);

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "screen_owner") setLocation("/owner");
      else setLocation("/advertiser");
    }
  }, [user, setLocation]);

  const handleSignUp = () => {
    setShowRoleSelection(true);
  };

  const handleLogin = () => {
    signInWithGoogle();
  };

  const handleRoleSelect = async (role: "screen_owner" | "advertiser") => {
    setSelectedRole(role);
    await signInWithGoogle(role);
    setShowRoleSelection(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold text-foreground font-serif tracking-tight">
                PixelSpot
              </h1>
              <p className="text-xl text-primary font-semibold">
                India's Smartest Outdoor Advertising Network
              </p>
              <p className="text-lg text-muted-foreground max-w-md">
                Find, Book & Run Digital Ads Anywhere. Make outdoor advertising discoverable, bookable, and measurable.
              </p>
            </div>

            <div className="grid gap-6">
              <div className="flex gap-4 items-start">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Monitor className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Screen Owners</h3>
                  <p className="text-sm text-muted-foreground">List and monetize your digital screens with complete control</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-chart-2/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-chart-2" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Advertisers</h3>
                  <p className="text-sm text-muted-foreground">Discover screens, create campaigns, and track performance</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="p-3 bg-chart-3/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-chart-3" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Map-Based Discovery</h3>
                  <p className="text-sm text-muted-foreground">Explore available screens across India with interactive maps</p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Card */}
          <Card className="p-8 space-y-6 shadow-xl">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-foreground font-serif">Get Started</h2>
              <p className="text-muted-foreground">Join India's premier DOOH marketplace</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleSignUp}
                disabled={loading}
                size="lg"
                className="w-full text-base"
                data-testid="button-signup"
              >
                Sign Up
              </Button>

              <Button
                onClick={handleLogin}
                disabled={loading}
                size="lg"
                variant="outline"
                className="w-full text-base"
                data-testid="button-login"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Signing in...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              By continuing, you agree to PixelSpot's Terms of Service and Privacy Policy
            </div>
          </Card>
        </div>
      </div>

      {/* Role Selection Dialog */}
      <Dialog open={showRoleSelection} onOpenChange={setShowRoleSelection}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Choose Your Role</DialogTitle>
            <DialogDescription>
              Select how you want to use PixelSpot
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <button
              onClick={() => handleRoleSelect("screen_owner")}
              disabled={loading}
              className="group relative p-6 border-2 border-border rounded-lg hover-elevate active-elevate-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-role-screen-owner"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Screen Owner</h3>
                  <p className="text-sm text-muted-foreground">
                    I have digital screens and want to rent them out to advertisers
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleRoleSelect("advertiser")}
              disabled={loading}
              className="group relative p-6 border-2 border-border rounded-lg hover-elevate active-elevate-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-role-advertiser"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-chart-2/10 rounded-lg">
                  <Megaphone className="w-6 h-6 text-chart-2" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Advertiser</h3>
                  <p className="text-sm text-muted-foreground">
                    I want to discover screens and run advertising campaigns
                  </p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
