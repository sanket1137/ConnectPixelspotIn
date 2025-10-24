import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
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
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import blackLogo from "@assets/Untitled design (1)_1761332410674.png";

export function AppSidebar() {
  const { user, signOut, isAdmin, isScreenOwner, isAdvertiser } = useAuth();
  const [location, setLocation] = useLocation();

  const adminItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    { title: "Manage Users", url: "/admin/users", icon: Users },
    { title: "Manage Screens", url: "/admin/screens", icon: Monitor },
    { title: "Campaigns & Bookings", url: "/admin/bookings", icon: FileText },
    { title: "Analytics", url: "/admin/analytics", icon: TrendingUp },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ];

  const ownerItems = [
    { title: "Dashboard", url: "/owner", icon: LayoutDashboard },
    { title: "My Screens", url: "/owner/screens", icon: Monitor },
    { title: "Add Screen", url: "/owner/screens/new", icon: PlusCircle },
    { title: "Booking Requests", url: "/owner/requests", icon: Calendar },
    { title: "Earnings", url: "/owner/earnings", icon: DollarSign },
  ];

  const advertiserItems = [
    { title: "Dashboard", url: "/advertiser", icon: LayoutDashboard },
    { title: "Find Screens", url: "/advertiser/discover", icon: MapPin },
    { title: "My Campaigns", url: "/advertiser/campaigns", icon: FileText },
    { title: "Create Campaign", url: "/advertiser/campaigns/new", icon: PlusCircle },
    { title: "AI Campaign Advisor", url: "/advertiser/ai-advisor", icon: Sparkles },
    { title: "Payments", url: "/advertiser/payments", icon: CreditCard },
  ];

  const items = isAdmin ? adminItems : isScreenOwner ? ownerItems : advertiserItems;

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <img 
          src={blackLogo} 
          alt="PixelSpot" 
          className="h-8 mb-2"
          style={{ width: 'auto', maxWidth: '100%' }}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {isAdmin ? "Admin Portal" : isScreenOwner ? "Screen Owner Portal" : "Advertiser Portal"}
        </p>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={() => setLocation(item.url)}
                    isActive={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="space-y-3">
          <div className="px-3 py-2 bg-sidebar-accent rounded-lg">
            <p className="text-xs font-medium text-sidebar-accent-foreground">{user?.name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut()}
            data-testid="button-signout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
