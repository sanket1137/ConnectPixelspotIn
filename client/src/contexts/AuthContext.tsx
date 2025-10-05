import { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Fetch user data from our backend
  const { data: user } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    enabled: !!firebaseUser,
  });

  const signInMutation = useMutation({
    mutationFn: async () => {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      
      // Send token to backend to create/update user
      const response = await apiRequest("POST", "/api/auth/signin", {
        token,
        email: result.user.email,
        name: result.user.displayName,
      });
      
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
    loading: loading || signInMutation.isPending,
    signInWithGoogle: () => signInMutation.mutateAsync(),
    signOut: () => signOutMutation.mutateAsync(),
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
