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
import BlogList from "@/pages/BlogList";
import BlogPost from "@/pages/BlogPost";
import ManageBlogs from "@/pages/admin/ManageBlogs";
import SEOPage from "@/pages/SEOPage";
import { SEO_PAGES_DATA } from "@/lib/seo-data";

function Router() {
  return (
    <Switch>
      {/* Public Home Page (no authentication required) */}
      <Route path="/" component={PublicHome} />

      {/* Dynamic SEO Routes */}
      {Object.entries(SEO_PAGES_DATA).map(([slug, data]) => (
        <Route key={slug} path={`/${slug}`}>
          <SEOPage {...data} />
        </Route>
      ))}

      {/* City Specific Routes (Mapping for semantic URLs) */}
      <Route path="/cities/bangalore">
        <SEOPage {...SEO_PAGES_DATA["bangalore"]} />
      </Route>
      <Route path="/cities/mumbai">
        <SEOPage {...SEO_PAGES_DATA["mumbai"]} />
      </Route>
      <Route path="/cities/delhi">
        <SEOPage {...SEO_PAGES_DATA["delhi"]} />
      </Route>
      <Route path="/cities/hyderabad">
        <SEOPage {...SEO_PAGES_DATA["hyderabad"]} />
      </Route>
      <Route path="/cities/chennai">
        <SEOPage {...SEO_PAGES_DATA["chennai"]} />
      </Route>
      <Route path="/cities/ahmedabad">
        <SEOPage {...SEO_PAGES_DATA["ahmedabad"]} />
      </Route>
      <Route path="/cities/pune">
        <SEOPage {...SEO_PAGES_DATA["pune"]} />
      </Route>
      <Route path="/cities/kolkata">
        <SEOPage {...SEO_PAGES_DATA["kolkata"]} />
      </Route>
      <Route path="/cities/surat">
        <SEOPage {...SEO_PAGES_DATA["surat"]} />
      </Route>
      <Route path="/cities/jaipur">
        <SEOPage {...SEO_PAGES_DATA["jaipur"]} />
      </Route>
      <Route path="/cities/lucknow">
        <SEOPage {...SEO_PAGES_DATA["lucknow"]} />
      </Route>
      <Route path="/cities/kanpur">
        <SEOPage {...SEO_PAGES_DATA["kanpur"]} />
      </Route>
      <Route path="/cities/nagpur">
        <SEOPage {...SEO_PAGES_DATA["nagpur"]} />
      </Route>
      <Route path="/cities/indore">
        <SEOPage {...SEO_PAGES_DATA["indore"]} />
      </Route>
      <Route path="/cities/thane">
        <SEOPage {...SEO_PAGES_DATA["thane"]} />
      </Route>
      <Route path="/cities/bhopal">
        <SEOPage {...SEO_PAGES_DATA["bhopal"]} />
      </Route>
      <Route path="/cities/visakhapatnam">
        <SEOPage {...SEO_PAGES_DATA["visakhapatnam"]} />
      </Route>
      <Route path="/cities/patna">
        <SEOPage {...SEO_PAGES_DATA["patna"]} />
      </Route>
      <Route path="/cities/vadodara">
        <SEOPage {...SEO_PAGES_DATA["vadodara"]} />
      </Route>
      <Route path="/cities/ghaziabad">
        <SEOPage {...SEO_PAGES_DATA["ghaziabad"]} />
      </Route>
      <Route path="/cities/noida">
        <SEOPage {...SEO_PAGES_DATA["noida"]} />
      </Route>
      <Route path="/cities/gurgaon">
        <SEOPage {...SEO_PAGES_DATA["gurgaon"]} />
      </Route>

      {/* Industry Specific Routes */}
      <Route path="/industries/real-estate">
        <SEOPage {...SEO_PAGES_DATA["real-estate"]} />
      </Route>
      <Route path="/industries/automobile">
        <SEOPage {...SEO_PAGES_DATA["automobile"]} />
      </Route>
      <Route path="/industries/retail">
        <SEOPage {...SEO_PAGES_DATA["retail"]} />
      </Route>

      {/* Blog Routes */}
      <Route path="/blog" component={BlogList} />
      <Route path="/blog/:slug" component={BlogPost} />


      {/* Public Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Login} />

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
      <Route path="/admin/blogs">
        <AuthGuard allowedRoles={["admin"]}>
          <ManageBlogs />
        </AuthGuard>
      </Route>
      <Route path="/admin/analytics">
        <AuthGuard allowedRoles={["admin"]}>
          <Analytics />
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
