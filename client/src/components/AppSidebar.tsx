import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Monitor,
  Users,
  FileText,
  Settings,
  MapPin,
  PlusCircle,
  Calendar,
  CreditCard,
  LogOut,
  TrendingUp,
  DollarSign,
  Sparkles,
  UserCircle,
  MessageSquare,
  Shield,
  Briefcase,
  ClipboardList,
  Menu,
  LifeBuoy,
} from "lucide-react";

import logo from "@assets/pixelspot-logo.png";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppSidebar() {
  const { user, signOut, isAdmin, isScreenOwner, isAdvertiser, isAgency } = useAuth();
  const [location, setLocation] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Manage Users", url: "/admin/users", icon: Users },
    { title: "Manage Screens", url: "/admin/screens", icon: Monitor },
    { title: "Campaigns & Bookings", url: "/admin/bookings", icon: FileText },
    { title: "Agency Media Plans", url: "/admin/media-plans", icon: ClipboardList },
    { title: "Payments & Payouts", url: "/admin/payments", icon: CreditCard },
    { title: "AI Conversations", url: "/admin/ai-conversations", icon: MessageSquare },
    { title: "AI Security", url: "/admin/ai-security", icon: Shield },
    { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
    { title: "Settings", url: "/admin/settings", icon: Settings },
    { title: "Support Tickets", url: "/admin/support", icon: LifeBuoy },
    { title: "Profile", url: "/admin/profile", icon: UserCircle },
  ];

  const ownerItems = [
    { title: "Dashboard", url: "/owner", icon: LayoutDashboard },
    { title: "My Screens", url: "/owner/screens", icon: Monitor },
    { title: "Add Screen", url: "/owner/screens/new", icon: PlusCircle },
    { title: "Booking Requests", url: "/owner/requests", icon: Calendar },
    { title: "Earnings", url: "/owner/earnings", icon: DollarSign },
    { title: "Support", url: "/tickets", icon: LifeBuoy },
    { title: "Profile", url: "/owner/profile", icon: UserCircle },
  ];

  const advertiserItems = [
    { title: "Dashboard", url: "/advertiser", icon: LayoutDashboard },
    { title: "Find Screens", url: "/advertiser/discover", icon: MapPin },
    { title: "My Campaigns", url: "/advertiser/campaigns", icon: FileText },
    { title: "Create Campaign", url: "/advertiser/campaigns/new", icon: PlusCircle },
    { title: "AI Campaign Advisor", url: "/advertiser/ai-advisor", icon: Sparkles },
    { title: "Payments", url: "/advertiser/payments", icon: CreditCard },
    { title: "Support", url: "/tickets", icon: LifeBuoy },
    { title: "Profile", url: "/advertiser/profile", icon: UserCircle },
  ];

  const agencyItems = [
    { title: "Dashboard", url: "/agency", icon: LayoutDashboard },
    { title: "Media Plans", url: "/agency/media-plans", icon: ClipboardList },
    { title: "Find Screens", url: "/agency/discover", icon: MapPin },
    { title: "My Campaigns", url: "/agency/campaigns", icon: Briefcase },
    { title: "AI Campaign Advisor", url: "/agency/ai-advisor", icon: Sparkles },
    { title: "Payments", url: "/agency/payments", icon: CreditCard },
    { title: "Support", url: "/tickets", icon: LifeBuoy },
    { title: "Profile", url: "/agency/profile", icon: UserCircle },
  ];

  const items = isAdmin ? adminItems : isScreenOwner ? ownerItems : isAgency ? agencyItems : advertiserItems;
  const portalName = isAdmin ? "Admin Portal" : isScreenOwner ? "Owner Portal" : isAgency ? "Agency Portal" : "Advertiser Portal";

  const handleNavigation = (url: string) => {
    setLocation(url);
    setIsMobileOpen(false);
  };

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-1">
        {items.map((item) => {
          const isActive = location === item.url;
          return (
            <Button
              key={item.title}
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start overflow-hidden group/item h-11 ${
                isActive ? "bg-slate-100 text-primary" : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => handleNavigation(item.url)}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "text-primary" : "text-slate-400 group-hover/item:text-slate-600"}`} />
              {/* Opacity zero when collapsed (md only), shown on hover. On mobile sheet, always full width so opacity-100 */}
              <span className="ml-3 font-medium truncate md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto transition-all duration-300 md:-translate-x-4 md:group-hover/sidebar:translate-x-0">
                {item.title}
              </span>
            </Button>
          );
        })}
      </div>
      <div className="px-2 pt-4 border-t mt-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 overflow-hidden group/item h-11"
          onClick={() => signOut()}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="ml-3 font-medium truncate md:opacity-0 md:w-0 md:group-hover/sidebar:opacity-100 md:group-hover/sidebar:w-auto transition-all duration-300 md:-translate-x-4 md:group-hover/sidebar:translate-x-0">
            Sign Out
          </span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar (Sheet) */}
      <div className="md:hidden">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 fixed top-2 left-4 z-[60]">
              <Menu className="h-5 w-5 text-slate-700" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <SheetHeader className="p-4 border-b text-left">
              <div className="flex items-center mb-2">
                <img src={logo} alt="Pixelspot" className="h-8 w-auto" />
              </div>
              <SheetTitle className="text-lg font-bold">{portalName}</SheetTitle>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </SheetHeader>
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Persistent Mini-Sidebar */}
      <aside 
        className="hidden md:flex flex-col group/sidebar fixed top-14 bottom-0 left-0 z-50 w-16 hover:w-64 border-r bg-background shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
      >
        <div className="flex-1 overflow-hidden hover:overflow-y-auto custom-scrollbar pt-2">
          <NavContent />
        </div>
      </aside>
    </>
  );
}
