import { createContext, useContext, useEffect, useState } from "react";
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut, 
  onAuthStateChanged
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: "screen_owner" | "advertiser" | "agency") => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isScreenOwner: boolean;
  isAdvertiser: boolean;
  isAgency: boolean;
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
  // Use returnNull on 401 (normal unauthenticated state) and allow retry
  // to handle token propagation delays after sign-in
  const { data: user, isLoading: isUserLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!firebaseUser,
    retry: 2,
    retryDelay: 1000,
  });


  const signInEmailMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const trimmedEmail = email.trim().toLowerCase();
      
      let result;
      try {
        result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      } catch (firebaseError: any) {
        // Parse Firebase error codes into user-friendly messages
        const code = firebaseError?.code || '';
        switch (code) {
          case 'auth/too-many-requests':
            throw new Error('Too many failed login attempts. Your account is temporarily locked. Please wait a few minutes or reset your password.');
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            throw new Error('Incorrect email or password. Please check and try again.');
          case 'auth/user-not-found':
            throw new Error('No account found with this email address.');
          case 'auth/user-disabled':
            throw new Error('This account has been disabled. Please contact support.');
          case 'auth/network-request-failed':
            throw new Error('Network error. Please check your internet connection.');
          case 'auth/invalid-email':
            throw new Error('Please enter a valid email address.');
          default:
            console.error('Firebase auth error:', code, firebaseError.message);
            throw new Error('Login failed. Please try again.');
        }
      }
      
      const token = await result.user.getIdToken();
      
      // Send token to backend to fetch/create user
      const response = await apiRequest("POST", "/api/auth/signin", {
        token,
        email: result.user.email,
        name: result.user.displayName || result.user.email,
      });
      
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Please clear your browser cache and try again.");
      }
      const data = await response.json();
      return data.user as User;
    },
    onSuccess: (backendUser: User) => {
      // Set query data directly from the sign-in response — eliminates
      // the race condition where /api/auth/me fires before the backend
      // user record is ready or the token has propagated
      queryClient.setQueryData(["/api/auth/me"], backendUser);
    },
  });

  const signUpEmailMutation = useMutation({
    mutationFn: async ({ email, password, name, role }: { 
      email: string; 
      password: string; 
      name: string; 
      role: "screen_owner" | "advertiser" | "agency"
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
      
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server returned an unexpected response. Please clear your browser cache and try again.");
      }
      const data = await response.json();
      
      // Automatically send email OTP for verification (manual signup only)
      try {
        await apiRequest("POST", "/api/auth/send-email-otp", {
          email: result.user.email,
        });
      } catch (error) {
        console.error("Failed to send email OTP:", error);
      }
      
      return data.user as User;
    },
    onSuccess: (backendUser: User) => {
      queryClient.setQueryData(["/api/auth/me"], backendUser);
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
    loading: loading || signInEmailMutation.isPending || signUpEmailMutation.isPending || (!!firebaseUser && isUserLoading),
    signInWithEmail: async (email: string, password: string) => { 
      await signInEmailMutation.mutateAsync({ email, password });
    },
    signUpWithEmail: async (email: string, password: string, name: string, role: "screen_owner" | "advertiser" | "agency") => {
      await signUpEmailMutation.mutateAsync({ email, password, name, role });
    },
    resetPassword: async (email: string) => {
      await apiRequest("POST", "/api/auth/request-password-reset", {
        email,
        origin: window.location.origin,
      });
    },
    signOut: async () => {
      await signOutMutation.mutateAsync();
    },
    isAdmin: user?.role === "admin",
    isScreenOwner: user?.role === "screen_owner",
    isAdvertiser: user?.role === "advertiser",
    isAgency: user?.role === "agency",
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
