import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
    
    // Redirect to email verification if email is not verified
    if (!loading && user && !user.emailVerified) {
      setLocation("/verify-email");
      return;
    }
    
    // Redirect to profile completion if profile is not completed
    if (!loading && user && user.emailVerified && !user.profileCompleted) {
      setLocation("/complete-profile");
      return;
    }
    
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to appropriate dashboard based on role
      if (user.role === "admin") setLocation("/admin");
      else if (user.role === "screen_owner") setLocation("/owner");
      else setLocation("/advertiser");
    }
  }, [user, loading, allowedRoles, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
