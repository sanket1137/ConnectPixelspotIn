import { useAuth } from "@/contexts/AuthContext";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Monitor, TrendingUp, MapPin, Building2, Megaphone, Mail, Briefcase } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import logo from "@assets/pixelspot-logo.png";

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"screen_owner" | "advertiser" | "agency" | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { toast } = useToast();
  
  // Check for role parameter in URL
  const urlParams = new URLSearchParams(window.location.search);
  const roleParam = urlParams.get('role');
  const defaultTab = roleParam === 'advertiser' ? 'signup' : 'login';
  
  // Handle OAuth callback with custom token
  const tokenParam = urlParams.get('token');
  const errorParam = urlParams.get('error');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupRole, setSignupRole] = useState<"screen_owner" | "advertiser" | "agency">(
    roleParam === 'advertiser' ? 'advertiser' : 'advertiser'
  );

  useEffect(() => {
    if (user) {
      // Redirect based on role
      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "screen_owner") setLocation("/owner");
      else if (user.role === "agency") setLocation("/agency");
      else setLocation("/advertiser");
    }
  }, [user, setLocation]);
  
  // Handle OAuth callback
  useEffect(() => {
    if (tokenParam) {
      // Sign in with custom token from backend OAuth
      (async () => {
        try {
          const { signInWithCustomToken } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          await signInWithCustomToken(auth, tokenParam);
          
          // Clear token from URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error: any) {
          console.error('OAuth token sign-in error:', error);
          toast({
            title: "Authentication failed",
            description: "Failed to complete Google sign-in. Please try again.",
            variant: "destructive",
          });
        }
      })();
    }
    
    if (errorParam) {
      toast({
        title: "Authentication failed",
        description: decodeURIComponent(errorParam),
        variant: "destructive",
      });
      // Clear error from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [tokenParam, errorParam, toast]);

  const handleGoogleSignUp = () => {
    setShowRoleSelection(true);
  };

  const handleGoogleLogin = () => {
    // Redirect to backend OAuth endpoint (no role specified for login)
    window.location.href = '/auth/google';
  };

  const handleRoleSelect = async (role: "screen_owner" | "advertiser" | "agency") => {
    setSelectedRole(role);
    window.location.href = `/auth/google?role=${role}`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const email = loginEmail.trim();
    const password = loginPassword;
    
    if (!email || !password) {
      toast({
        title: "Missing fields",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      const message = error.message || "Invalid email or password";
      const isRateLimited = message.toLowerCase().includes('too many');
      toast({
        title: isRateLimited ? "Account temporarily locked" : "Login failed",
        description: message,
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions to reset your password.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Hero Section */}
          <div className="space-y-8">
            <div className="space-y-4">
              <img 
                src={logo} 
                alt="PixelSpot" 
                className="h-16 w-auto"
              />
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
            <Tabs defaultValue={defaultTab} className="space-y-6">
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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-xs text-primary hover:underline"
                        data-testid="button-forgot-password"
                      >
                        Forgot Password?
                      </button>
                    </div>
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
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignupRole("advertiser")}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          signupRole === "advertiser" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        data-testid="button-role-advertiser-signup"
                      >
                        <Megaphone className="w-4 h-4 text-chart-2 mb-1" />
                        <p className="text-xs font-semibold">Advertiser</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole("screen_owner")}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          signupRole === "screen_owner" ? "border-primary bg-primary/5" : "border-border"
                        }`}
                        data-testid="button-role-owner-signup"
                      >
                        <Building2 className="w-4 h-4 text-primary mb-1" />
                        <p className="text-xs font-semibold">Screen Owner</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole("agency")}
                        className={`p-3 border-2 rounded-lg text-left transition-all ${
                          signupRole === "agency" ? "border-violet-500 bg-violet-50" : "border-border"
                        }`}
                        data-testid="button-role-agency-signup"
                      >
                        <Briefcase className="w-4 h-4 text-violet-600 mb-1" />
                        <p className="text-xs font-semibold">Agency</p>
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
              <p className="text-xs text-muted-foreground text-center">
                By continuing, you agree to Pixelspot's{' '}
                <Link href="/terms"><span className="text-primary hover:underline cursor-pointer">Terms of Service</span></Link>{' '}
                and{' '}
                <Link href="/privacy"><span className="text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>
              </p>
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

            <button
              onClick={() => handleRoleSelect("agency")}
              disabled={loading}
              className="group relative p-6 border-2 border-border rounded-lg hover-elevate active-elevate-2 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-role-agency"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-violet-100 rounded-lg">
                  <Briefcase className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Agency</h3>
                  <p className="text-sm text-muted-foreground">
                    I manage media buying and campaigns for multiple clients
                  </p>
                </div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif">Reset Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                data-testid="input-reset-email"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForgotPassword(false)}
                className="flex-1"
                data-testid="button-cancel-reset"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={resetLoading}
                data-testid="button-send-reset"
              >
                {resetLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
