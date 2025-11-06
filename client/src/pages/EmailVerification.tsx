import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Shield, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import logo from "@assets/pixelspot-logo.png";

export default function EmailVerification() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [autoSendAttempted, setAutoSendAttempted] = useState(false);

  useEffect(() => {
    // If user is already verified or not logged in, redirect
    if (!loading) {
      if (!user) {
        setLocation("/login");
      } else if (user.emailVerified) {
        // Redirect based on role
        if (user.role === "admin") setLocation("/admin");
        else if (user.role === "screen_owner") setLocation("/owner");
        else setLocation("/advertiser");
      }
    }
  }, [user, loading, setLocation]);

  // Auto-send OTP when page loads (for users coming from registration)
  useEffect(() => {
    if (user && !user.emailVerified && !otpSent && !autoSendAttempted) {
      setAutoSendAttempted(true);
      sendOtpMutation.mutate();
    }
  }, [user, otpSent, autoSendAttempted]);

  // Send OTP mutation
  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("Email not found");
      return await apiRequest("POST", "/api/auth/send-email-otp", {
        email: user.email,
      });
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "Please check your email for the verification code",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Verify OTP mutation
  const verifyOtpMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!user?.email) throw new Error("Email not found");
      return await apiRequest("POST", "/api/auth/verify-email-otp", {
        email: user.email,
        code,
      });
    },
    onSuccess: async () => {
      toast({
        title: "Email Verified",
        description: "Your email has been verified successfully!",
      });
      // Invalidate auth cache and reload
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      // Small delay to ensure cache is cleared, then reload
      setTimeout(() => {
        window.location.reload();
      }, 100);
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
    },
  });

  const handleSendOtp = () => {
    sendOtpMutation.mutate();
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a 6-digit code",
        variant: "destructive",
      });
      return;
    }
    verifyOtpMutation.mutate(otp);
  };

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        <div className="flex justify-center">
          <img 
            src={logo} 
            alt="Pixelspot" 
            className="h-12 w-auto"
          />
        </div>

        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
          <p className="text-sm text-muted-foreground">
            Please verify your email address to continue
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Email Address</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {!otpSent ? (
            <div className="space-y-4">
              {(sendOtpMutation.isPending || autoSendAttempted && !otpSent) && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  Sending verification code...
                </div>
              )}
              <Button
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending || (autoSendAttempted && !otpSent)}
                size="lg"
                className="w-full"
                data-testid="button-send-email-otp"
              >
                {sendOtpMutation.isPending || (autoSendAttempted && !otpSent) ? (
                  "Sending..."
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Enter 6-digit OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                  data-testid="input-email-otp"
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Check your email inbox for the verification code
                </p>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={verifyOtpMutation.isPending || otp.length !== 6}
                data-testid="button-verify-email-otp"
              >
                {verifyOtpMutation.isPending ? (
                  "Verifying..."
                ) : (
                  <>
                    Verify Email
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSendOtp}
                disabled={sendOtpMutation.isPending}
                className="w-full"
                data-testid="button-resend-email-otp"
              >
                Resend Code
              </Button>
            </form>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <p>Didn't receive the email? Check your spam folder.</p>
        </div>
      </Card>
    </div>
  );
}
