import React, { useState, Suspense, lazy } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import { AppSidebar } from "@/components/AppSidebar";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { useWebSocket } from "@/hooks/use-websocket";
import { Menu, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { NotificationBell } from "@/components/NotificationBell";

// Lazy-loaded page components for code splitting
const NotFound = lazy(() => import("@/pages/not-found"));
const Login = lazy(() => import("@/pages/Login"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const ManageUsers = lazy(() => import("@/pages/admin/ManageUsers"));
const ManageScreens = lazy(() => import("@/pages/admin/ManageScreens"));
const AddScreenForOwner = lazy(() => import("@/pages/admin/AddScreenForOwner"));
const ManageBookings = lazy(() => import("@/pages/admin/ManageBookings"));
const Analytics = lazy(() => import("@/pages/admin/Analytics"));
const AIConversations = lazy(() => import("@/pages/admin/AIConversations"));
const AISecurityDashboard = lazy(() => import("@/pages/admin/AISecurityDashboard"));
const Settings = lazy(() => import("@/pages/admin/Settings"));
const OwnerDashboard = lazy(() => import("@/pages/owner/OwnerDashboard"));
const ScreensList = lazy(() => import("@/pages/owner/ScreensList"));
const AddScreen = lazy(() => import("@/pages/owner/AddScreen"));
const EditScreen = lazy(() => import("@/pages/owner/EditScreen"));
const BookingRequests = lazy(() => import("@/pages/owner/BookingRequests"));
const AdvertiserDashboard = lazy(() => import("@/pages/advertiser/AdvertiserDashboard"));
const DiscoverScreens = lazy(() => import("@/pages/advertiser/DiscoverScreens"));
const CampaignsList = lazy(() => import("@/pages/advertiser/CampaignsList"));
const CampaignDetails = lazy(() => import("@/pages/advertiser/CampaignDetails"));
const CampaignBuilderSelect = lazy(() => import("@/pages/advertiser/CampaignBuilderSelect"));
const CreateCampaign = lazy(() => import("@/pages/advertiser/CreateCampaign"));
const ExpressCampaignBuilder = lazy(() => import("@/pages/advertiser/express/ExpressCampaignBuilder"));
const AICampaignBuilder = lazy(() => import("@/pages/advertiser/ai/AICampaignBuilder"));
const QuickCampaignFromCart = lazy(() => import("@/pages/advertiser/QuickCampaignFromCart"));
const BookingManagement = lazy(() => import("@/pages/advertiser/BookingManagement"));
const AICampaignAdvisor = lazy(() => import("@/pages/advertiser/AICampaignAdvisor"));
const ComingSoon = lazy(() => import("@/pages/ComingSoon"));
const OwnerEarnings = lazy(() => import("@/pages/owner/OwnerEarnings"));
const AdvertiserPayments = lazy(() => import("@/pages/advertiser/AdvertiserPayments"));
const AdminPayments = lazy(() => import("@/pages/admin/AdminPayments"));
const ProfileCompletion = lazy(() => import("@/pages/ProfileCompletion"));
const EmailVerification = lazy(() => import("@/pages/EmailVerification"));
const Profile = lazy(() => import("@/pages/Profile"));
const PublicHome = lazy(() => import("@/pages/PublicHome"));
const PasswordReset = lazy(() => import("@/pages/PasswordReset"));
const PrivacyPolicy = lazy(() => import("@/pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/legal/TermsOfService"));
const RefundPolicy = lazy(() => import("@/pages/legal/RefundPolicy"));
const ContactUs = lazy(() => import("@/pages/legal/ContactUs"));
const AboutUs = lazy(() => import("@/pages/legal/AboutUs"));

// Loading fallback for code-split pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public Home Page (no authentication required) */}
      <Route path="/" component={PublicHome} />
      
      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Login} />
      
      {/* Legal / Policy Pages (public) */}
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/refund" component={RefundPolicy} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/about" component={AboutUs} />
      
      <Route path="/auth/action" component={PasswordReset} />
      <Route path="/reset-password" component={PasswordReset} />
      
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
      <Route path="/admin/ai-security">
        <AuthGuard allowedRoles={["admin"]}>
          <AISecurityDashboard />
        </AuthGuard>
      </Route>
      <Route path="/admin/payments">
        <AuthGuard allowedRoles={["admin"]}>
          <AdminPayments />
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
          <OwnerEarnings />
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
      <Route path="/advertiser/quick-campaign">
        <AuthGuard allowedRoles={["advertiser"]}>
          <QuickCampaignFromCart />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns">
        <AuthGuard allowedRoles={["advertiser"]}>
          <CampaignsList />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns/new">
        <AuthGuard allowedRoles={["advertiser"]}>
          <CampaignBuilderSelect />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns/new/express">
        <AuthGuard allowedRoles={["advertiser"]}>
          <ExpressCampaignBuilder />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns/new/ai">
        <AuthGuard allowedRoles={["advertiser"]}>
          <AICampaignBuilder />
        </AuthGuard>
      </Route>
      <Route path="/advertiser/campaigns/new/advanced">
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
          <AdvertiserPayments />
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
  const [location] = useLocation();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize WebSocket for real-time updates when user is authenticated
  useWebSocket();
  
  // Check if current route should show sidebar
  const shouldShowSidebar = user && (
    location.startsWith('/admin') ||
    location.startsWith('/owner') ||
    location.startsWith('/advertiser')
  );

  const style = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    // Invalidate all queries to refetch fresh data
    await queryClient.invalidateQueries();
    
    // Brief delay to show the animation
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Refreshed",
        description: "All data has been updated",
      });
    }, 500);
  };

  // If no user or route doesn't need sidebar, show router without sidebar
  if (!shouldShowSidebar) {
    return <Suspense fallback={<PageLoader />}><Router /></Suspense>;
  }

  // Show router with sidebar for dashboard routes
  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          {/* Mobile-only header with hamburger menu */}
          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 md:hidden">
            <SidebarTrigger data-testid="button-sidebar-toggle">
              <Menu className="h-6 w-6" />
            </SidebarTrigger>
            <h1 className="flex-1 text-lg font-semibold">Pixelspot</h1>
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              data-testid="button-refresh"
              className="h-9 w-9"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </header>

          {/* Desktop top bar with notification bell */}
          <header className="hidden md:flex sticky top-0 z-50 h-12 items-center justify-end gap-2 border-b bg-background px-6">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </header>
          
          {/* Main content area */}
          <main className="flex-1 bg-background">
            <Suspense fallback={<PageLoader />}>
              <Router />
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GoogleMapsProvider>
          <AuthProvider>
            <AuthenticatedLayout />
          </AuthProvider>
        </GoogleMapsProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
