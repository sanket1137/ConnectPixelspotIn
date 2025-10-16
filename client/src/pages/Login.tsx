import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Monitor, TrendingUp, MapPin, Building2, Megaphone, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"screen_owner" | "advertiser" | null>(null);
  const { toast } = useToast();
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"screen_owner" | "advertiser">("advertiser");

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "screen_owner") setLocation("/owner");
      else setLocation("/advertiser");
    }
  }, [user, setLocation]);

  const handleGoogleSignUp = () => {
    setShowRoleSelection(true);
  };

  const handleGoogleLogin = () => {
    signInWithGoogle();
  };

  const handleRoleSelect = async (role: "screen_owner" | "advertiser") => {
    setSelectedRole(role);
    try {
      await signInWithGoogle(role);
      setShowRoleSelection(false);
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to sign up with Google",
        variant: "destructive",
      });
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmail(loginEmail, loginPassword);
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signUpWithEmail(signupEmail, signupPassword, signupName, signupRole);
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    }
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

          {/* Login/Signup Card */}
          <Card className="p-8 shadow-xl">
            <Tabs defaultValue="login" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="signup" data-testid="tab-signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Tab */}
              <TabsContent value="login" className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground font-serif">Welcome Back</h2>
                  <p className="text-sm text-muted-foreground">Sign in to your account</p>
                </div>

                <Button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  size="lg"
                  variant="outline"
                  className="w-full"
                  data-testid="button-google-login"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      data-testid="input-login-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      data-testid="input-login-password"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                    data-testid="button-email-login"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Login with Email
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up Tab */}
              <TabsContent value="signup" className="space-y-4">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-bold text-foreground font-serif">Create Account</h2>
                  <p className="text-sm text-muted-foreground">Join PixelSpot today</p>
                </div>

                <Button
                  onClick={handleGoogleSignUp}
                  disabled={loading}
                  size="lg"
                  variant="outline"
                  className="w-full"
                  data-testid="button-google-signup"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign up with Google
                </Button>

                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    OR
                  </span>
                </div>

                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                      data-testid="input-signup-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                      data-testid="input-signup-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-signup-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">I am a...</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setSignupRole("advertiser")}
                        className={`p-4 border-2 rounded-lg hover-elevate active-elevate-2 text-left transition-all ${
                          signupRole === "advertiser" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        data-testid="button-role-advertiser-signup"
                      >
                        <Megaphone className="w-5 h-5 text-chart-2 mb-2" />
                        <p className="text-sm font-semibold">Advertiser</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole("screen_owner")}
                        className={`p-4 border-2 rounded-lg hover-elevate active-elevate-2 text-left transition-all ${
                          signupRole === "screen_owner" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        data-testid="button-role-owner-signup"
                      >
                        <Building2 className="w-5 h-5 text-primary mb-2" />
                        <p className="text-sm font-semibold">Screen Owner</p>
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                    data-testid="button-email-signup"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="text-center text-sm text-muted-foreground mt-6">
              By continuing, you agree to PixelSpot's Terms of Service and Privacy Policy
            </div>
          </Card>
        </div>
      </div>

      {/* Role Selection Dialog for Google Sign Up */}
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
