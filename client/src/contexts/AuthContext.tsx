import { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
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
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("👤 Auth state changed:", user ? user.email : "null");
      setFirebaseUser(user);
      setLoading(false);
      
      // Invalidate user query to refetch from backend
      if (user) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Fetch user data from our backend
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    enabled: !!firebaseUser,
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
    loading: loading || signInEmailMutation.isPending || signUpEmailMutation.isPending,
    signInWithEmail: async (email: string, password: string) => { 
      await signInEmailMutation.mutateAsync({ email, password });
    },
    signUpWithEmail: async (email: string, password: string, name: string, role: "screen_owner" | "advertiser") => {
      await signUpEmailMutation.mutateAsync({ email, password, name, role });
    },
    resetPassword: async (email: string) => {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action`,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
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
