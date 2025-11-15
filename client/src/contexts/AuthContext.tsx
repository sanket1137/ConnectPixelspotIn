import { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser, 
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: (role?: "screen_owner" | "advertiser") => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: "screen_owner" | "advertiser") => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isScreenOwner: boolean;
  isAdvertiser: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRole, setPendingRole] = useState<"screen_owner" | "advertiser" | null>(null);
  const queryClient = useQueryClient();

  // Handle redirect result on page load
  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        console.log("🔍 Checking for redirect result...");
        const result = await getRedirectResult(auth);
        
        if (result) {
          console.log("✅ Redirect result found:", result.user.email);
          const token = await result.user.getIdToken();
          const role = localStorage.getItem('pendingRole') as "screen_owner" | "advertiser" | null;
          localStorage.removeItem('pendingRole');
          
          console.log("📤 Sending sign-in request to backend...", {
            email: result.user.email,
            name: result.user.displayName,
            role: role || 'none'
          });
          
          // Send token to backend
          const response = await apiRequest("POST", "/api/auth/signin", {
            token,
            email: result.user.email,
            name: result.user.displayName,
            role: role || undefined,
          });
          
          console.log("✅ Sign-in successful:", response);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } else {
          console.log("ℹ️ No redirect result found");
        }
      } catch (error: any) {
        console.error("❌ Redirect result error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
      }
    };
    
    handleRedirectResult();
  }, [queryClient]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("👤 Auth state changed:", user ? user.email : "null");
      
      if (user && !firebaseUser) {
        // User just signed in - send to backend
        console.log("🆕 New user detected, sending to backend...");
        try {
          const token = await user.getIdToken();
          const role = localStorage.getItem('pendingRole') as "screen_owner" | "advertiser" | null;
          localStorage.removeItem('pendingRole');
          
          console.log("📤 Sending sign-in request:", {
            email: user.email,
            name: user.displayName,
            role: role || 'default'
          });
          
          await apiRequest("POST", "/api/auth/signin", {
            token,
            email: user.email,
            name: user.displayName,
            role: role || undefined,
          });
          
          console.log("✅ Backend sign-in successful");
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } catch (error) {
          console.error("❌ Backend sign-in failed:", error);
        }
      }
      
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, [firebaseUser, queryClient]);

  // Fetch user data from our backend
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    enabled: !!firebaseUser,
  });

  const signInMutation = useMutation({
    mutationFn: async (role?: "screen_owner" | "advertiser") => {
      try {
        // Store role in localStorage for after redirect
        if (role) {
          localStorage.setItem('pendingRole', role);
        }
        // Use redirect mode instead of popup (more reliable for production)
        await signInWithRedirect(auth, googleProvider);
      } catch (error: any) {
        console.error("❌ Google Sign-in Error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        localStorage.removeItem('pendingRole');
        throw error;
      }
    },
  });

  const signInEmailMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      
      // Send token to backend to fetch user
      const response = await apiRequest("POST", "/api/auth/signin", {
        token,
        email: result.user.email,
        name: result.user.displayName || result.user.email,
      });
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signUpEmailMutation = useMutation({
    mutationFn: async ({ email, password, name, role }: { 
      email: string; 
      password: string; 
      name: string; 
      role: "screen_owner" | "advertiser" 
    }) => {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const token = await result.user.getIdToken();
      
      // Send token to backend to create user
      const response = await apiRequest("POST", "/api/auth/signin", {
        token,
        email: result.user.email,
        name,
        role,
      });
      
      // Automatically send email OTP for verification (manual signup only)
      try {
        await apiRequest("POST", "/api/auth/send-email-otp", {
          email: result.user.email,
        });
      } catch (error) {
        console.error("Failed to send email OTP:", error);
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
  });

  const signOutMutation = useMutation({
    mutationFn: async () => {
      await firebaseSignOut(auth);
      await apiRequest("POST", "/api/auth/signout", {});
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  const value: AuthContextType = {
    firebaseUser,
    user: user || null,
    loading: loading || signInMutation.isPending || signInEmailMutation.isPending || signUpEmailMutation.isPending,
    signInWithGoogle: async (role?: "screen_owner" | "advertiser") => { 
      await signInMutation.mutateAsync(role);
    },
    signInWithEmail: async (email: string, password: string) => { 
      await signInEmailMutation.mutateAsync({ email, password });
    },
    signUpWithEmail: async (email: string, password: string, name: string, role: "screen_owner" | "advertiser") => {
      await signUpEmailMutation.mutateAsync({ email, password, name, role });
    },
    resetPassword: async (email: string) => {
      await sendPasswordResetEmail(auth, email);
    },
    signOut: async () => {
      await signOutMutation.mutateAsync();
    },
    isAdmin: user?.role === "admin",
    isScreenOwner: user?.role === "screen_owner",
    isAdvertiser: user?.role === "advertiser",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
