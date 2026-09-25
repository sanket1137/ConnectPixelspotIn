import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Mail, Search, CheckCircle2, XCircle, Calendar, Clock,
  MapPin, Globe, Phone, Building2, Eye, Shield, CreditCard, FileText, ChevronLeft, ChevronRight
} from "lucide-react";
import type { User } from "@shared/schema";
import { ROLE_LABELS, type UserRole } from "@shared/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  return new Date(date).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function VerificationBadge({ verified, label }: { verified: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
      verified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
    }`}>
      {verified ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

// Client-side IP geolocation cache to avoid redundant API calls
const ipLocationCache = new Map<string, string>();

function useIpLocation(ip: string | null | undefined) {
  const [location, setLocation] = useState<string | null>(null);

  useEffect(() => {
    if (!ip || ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
      setLocation(ip ? "Localhost" : null);
      return;
    }
    if (ipLocationCache.has(ip)) {
      setLocation(ipLocationCache.get(ip)!);
      return;
    }
    let cancelled = false;
    // Use ip-api free tier (no API key, 45 req/min)
    fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.status === "success") {
          const loc = [data.city, data.regionName, data.country].filter(Boolean).join(", ");
          ipLocationCache.set(ip, loc);
          setLocation(loc);
        } else {
          setLocation("Unknown");
        }
      })
      .catch(() => { if (!cancelled) setLocation("Unknown"); });
    return () => { cancelled = true; };
  }, [ip]);

  return location;
}

function DetailRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium break-words">{value || "—"}</div>
      </div>
    </div>
  );
}

function UserDetailDialog({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const ipLocation = useIpLocation(user.lastLoginIp);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        {/* Verification Status */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Shield className="w-4 h-4" /> Verification Status</h4>
          <div className="flex flex-wrap gap-2">
            <VerificationBadge verified={user.emailVerified} label="Email" />
            <VerificationBadge verified={user.mobileVerified} label="Mobile" />
            <VerificationBadge verified={user.profileCompleted} label="Profile" />
          </div>
        </div>

        <Separator />

        {/* Account Info */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Account Info</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <DetailRow label="Role" value={
              <Badge variant={user.role === "admin" ? "default" : user.role === "screen_owner" ? "secondary" : "outline"}>
                {ROLE_LABELS[user.role as UserRole] ?? user.role}
              </Badge>
            } />
            <DetailRow label="Status" value={
              <Badge variant={user.status === "active" ? "default" : "destructive"}>
                {user.status}
              </Badge>
            } />
            <DetailRow label="Created" value={formatDateTime(user.createdAt)} icon={<Calendar className="w-4 h-4" />} />
            <DetailRow label="Last Login" value={formatDateTime(user.lastLoginAt)} icon={<Clock className="w-4 h-4" />} />
            {user.lastLoginIp && (
              <>
                <DetailRow label="Last Login IP" value={user.lastLoginIp} icon={<Globe className="w-4 h-4" />} />
                <DetailRow label="Last Login Location" value={ipLocation ?? "Loading..."} icon={<MapPin className="w-4 h-4" />} />
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Contact & Company */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Building2 className="w-4 h-4" /> Contact & Company</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <DetailRow label="Phone" value={user.phone} icon={<Phone className="w-4 h-4" />} />
            <DetailRow label="Mobile" value={user.mobileNumber} icon={<Phone className="w-4 h-4" />} />
            <DetailRow label="Company" value={user.companyName} icon={<Building2 className="w-4 h-4" />} />
            <DetailRow label="Industry" value={user.industry} />
            <DetailRow label="GST Number" value={user.gstNumber} icon={<FileText className="w-4 h-4" />} />
            <DetailRow label="Account Type" value={user.accountType} />
            {user.accountType === "brand" && <DetailRow label="Brand Name" value={user.brandName} />}
            {user.accountType === "agency" && <DetailRow label="Agency Name" value={user.agencyName} />}
          </div>
        </div>

        <Separator />

        {/* Address */}
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Address</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <DetailRow label="Address" value={user.address} />
            <DetailRow label="City" value={user.city} />
            <DetailRow label="State" value={user.state} />
          </div>
        </div>

        {/* Bank Details (for screen owners) */}
        {(user.bankAccountName || user.bankAccountNumber || user.upiId) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><CreditCard className="w-4 h-4" /> Bank Details</h4>
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Account Name" value={user.bankAccountName} />
                <DetailRow label="Account Number" value={user.bankAccountNumber} />
                <DetailRow label="IFSC Code" value={user.bankIfscCode} />
                <DetailRow label="Bank Name" value={user.bankName} />
                <DetailRow label="UPI ID" value={user.upiId} />
              </div>
            </div>
          </>
        )}

        <Separator />
        <div className="text-xs text-muted-foreground">User ID: {user.id}</div>
      </DialogContent>
    </Dialog>
  );
}

export default function ManageUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Role Updated",
        description: "User role has been successfully updated.",
      });
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    if (role === "admin") return "default";
    if (role === "screen_owner") return "secondary";
    return "outline";
  };

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      user.role.toLowerCase().includes(query) ||
      (user.companyName && user.companyName.toLowerCase().includes(query)) ||
      (user.mobileNumber && user.mobileNumber.includes(query))
    );
  });

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Manage Users</h1>
          <p className="text-muted-foreground mt-1">View and manage all platform users</p>
        </div>
      </div>

      {/* Search Box */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, role, company, or phone..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="pl-10"
          data-testid="input-search-users"
        />
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading users...</div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((user) => (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.companyName && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {user.companyName}
                      </div>
                    )}
                    {user.mobileNumber && (
                      <div className="text-sm text-muted-foreground">
                        {user.mobileNumber}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={getRoleBadgeVariant(user.role)}>
                    {ROLE_LABELS[user.role as UserRole] ?? user.role}
                  </Badge>
                  <Select
                    value={user.role}
                    onValueChange={(role) => 
                      updateRoleMutation.mutate({ userId: user.id, role })
                    }
                    disabled={updateRoleMutation.isPending}
                  >
                    <SelectTrigger className="w-40" data-testid={`select-role-${user.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="advertiser">Advertiser</SelectItem>
                      <SelectItem value="screen_owner">Screen Owner</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
                  {/* Verification badges */}
                  <VerificationBadge verified={user.emailVerified} label="Email" />
                  <VerificationBadge verified={user.mobileVerified} label="Mobile" />
                  <VerificationBadge verified={user.profileCompleted} label="Profile" />

                  <span className="text-border">|</span>

                  {/* Dates */}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Joined {formatDate(user.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {user.lastLoginAt ? `Last login ${timeAgo(user.lastLoginAt)}` : "Never logged in"}
                  </span>

                  {user.lastLoginIp && user.lastLoginIp !== "unknown" && (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      IP: {user.lastLoginIp}
                    </span>
                  )}

                  <span className="ml-auto">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedUser(user)}>
                      <Eye className="w-3 h-3 mr-1" />
                      View Details
                    </Button>
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching "{searchQuery}"
            </div>
          )}
          
          {filteredUsers.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between mt-6 pt-4">
              <span className="text-sm text-muted-foreground">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(Math.ceil(filteredUsers.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={page >= Math.ceil(filteredUsers.length / ITEMS_PER_PAGE)}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Detail Dialog */}
      {selectedUser && (
        <UserDetailDialog
          user={selectedUser}
          open={!!selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}
