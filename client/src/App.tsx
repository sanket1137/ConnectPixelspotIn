import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { AppSidebar } from "@/components/AppSidebar";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import ManageUsers from "@/pages/admin/ManageUsers";
import ManageScreens from "@/pages/admin/ManageScreens";
import AddScreenForOwner from "@/pages/admin/AddScreenForOwner";
import ManageBookings from "@/pages/admin/ManageBookings";
import Analytics from "@/pages/admin/Analytics";
import AIConversations from "@/pages/admin/AIConversations";
import Settings from "@/pages/admin/Settings";
import OwnerDashboard from "@/pages/owner/OwnerDashboard";
import ScreensList from "@/pages/owner/ScreensList";
import AddScreen from "@/pages/owner/AddScreen";
import EditScreen from "@/pages/owner/EditScreen";
import BookingRequests from "@/pages/owner/BookingRequests";
import AdvertiserDashboard from "@/pages/advertiser/AdvertiserDashboard";
import DiscoverScreens from "@/pages/advertiser/DiscoverScreens";
import CampaignsList from "@/pages/advertiser/CampaignsList";
import CampaignDetails from "@/pages/advertiser/CampaignDetails";
import CreateCampaign from "@/pages/advertiser/CreateCampaign";
import BookingManagement from "@/pages/advertiser/BookingManagement";
import AICampaignAdvisor from "@/pages/advertiser/AICampaignAdvisor";
import ComingSoon from "@/pages/ComingSoon";
import ProfileCompletion from "@/pages/ProfileCompletion";
import EmailVerification from "@/pages/EmailVerification";
import Profile from "@/pages/Profile";
import PublicHome from "@/pages/PublicHome";
import PasswordReset from "@/pages/PasswordReset";

function Router() {
  return (
    <Switch>
      {/* Public Home Page (no authentication required) */}
      <Route path="/" component={PublicHome} />
      
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Login} />
      <Route path="/auth/action" component={PasswordReset} />
      
      {/* Email Verification Route (requires auth but not verified email) */}
      <Route path="/verify-email" component={EmailVerification} />
      
      {/* Profile Completion Route (requires auth and verified email but not full profile) */}
      <Route path="/complete-profile" component={ProfileCompletion} />
      
      {/* Admin Routes */}
      <Route path="/admin">
        <AuthGuard allowedRoles={["admin"]}>
          <AdminDashboard />
        </AuthGuard>
      </Route>
      <Route path="/admin/users">
        <AuthGuard allowedRoles={["admin"]}>
          <ManageUsers />
        </AuthGuard>
      </Route>
      <Route path="/admin/screens">
        <AuthGuard allowedRoles={["admin"]}>
          <ManageScreens />
        </AuthGuard>
      </Route>
      <Route path="/admin/screens/new">
        <AuthGuard allowedRoles={["admin"]}>
          <AddScreenForOwner />
        </AuthGuard>
      </Route>
      <Route path="/admin/bookings">
        <AuthGuard allowedRoles={["admin"]}>
          <ManageBookings />
        </AuthGuard>
      </Route>
      <Route path="/admin/analytics">
        <AuthGuard allowedRoles={["admin"]}>
          <Analytics />
        </AuthGuard>
      </Route>
      <Route path="/admin/ai-conversations">
        <AuthGuard allowedRoles={["admin"]}>
          <AIConversations />
        </AuthGuard>
      </Route>
      <Route path="/admin/settings">
        <AuthGuard allowedRoles={["admin"]}>
          <Settings />
        </AuthGuard>
      </Route>
      <Route path="/admin/profile">
        <AuthGuard allowedRoles={["admin"]}>
          <Profile />
        </AuthGuard>
      </Route>
      
      {/* Screen Owner Routes */}
      <Route path="/owner">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <OwnerDashboard />
        </AuthGuard>
      </Route>
      <Route path="/owner/screens">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <ScreensList />
        </AuthGuard>
      </Route>
      <Route path="/owner/screens/new">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <AddScreen />
        </AuthGuard>
      </Route>
      <Route path="/owner/screens/edit/:id">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <EditScreen />
        </AuthGuard>
      </Route>
      <Route path="/owner/requests">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <BookingRequests />
        </AuthGuard>
      </Route>
      <Route path="/owner/earnings">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <ComingSoon 
            title="Earnings & Payouts"
            description="Track your earnings from screen bookings and manage payouts"
            backLink="/owner"
            backLabel="Back to Dashboard"
          />
        </AuthGuard>
      </Route>
      <Route path="/owner/profile">
        <AuthGuard allowedRoles={["screen_owner"]}>
          <Profile />
        </AuthGuard>
      </Route>
      
      {/* Advertiser Routes */}
      <Route path="/advertiser">
        <AuthGuard allowedRoles={["advertiser"]}>
          <AdvertiserDashboard />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/discover">
        <AuthGuard allowedRoles={["advertiser"]}>
          <DiscoverScreens />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns">
        <AuthGuard allowedRoles={["advertiser"]}>
          <CampaignsList />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns/new">
        <AuthGuard allowedRoles={["advertiser"]}>
          <CreateCampaign />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns/:id">
        <AuthGuard allowedRoles={["advertiser"]}>
          <CampaignDetails />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/bookings">
        <AuthGuard allowedRoles={["advertiser"]}>
          <BookingManagement />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/ai-advisor">
        <AuthGuard allowedRoles={["advertiser"]}>
          <AICampaignAdvisor />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/payments">
        <AuthGuard allowedRoles={["advertiser"]}>
          <ComingSoon 
            title="Payments & Billing"
            description="View your payment history and manage billing information"
            backLink="/advertiser"
            backLabel="Back to Dashboard"
          />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/profile">
        <AuthGuard allowedRoles={["advertiser"]}>
          <Profile />
        </AuthGuard>
      </Route>
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedLayout() {
  const { user } = useAuth();
  
  if (!user) {
    return <Router />;
  }

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 bg-background">
          <Router />
        </main>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthenticatedLayout />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
