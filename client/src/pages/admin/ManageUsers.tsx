import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Search } from "lucide-react";
import type { User } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ManageUsers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  
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
          onChange={(e) => setSearchQuery(e.target.value)}
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
          {filteredUsers.map((user) => (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
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
                    {user.role === "screen_owner" ? "Screen Owner" : 
                     user.role === "advertiser" ? "Advertiser" : "Admin"}
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
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
            </Card>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No users found matching "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
