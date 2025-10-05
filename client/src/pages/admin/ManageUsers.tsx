import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, Mail, Shield, Edit } from "lucide-react";
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

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Manage Users</h1>
          <p className="text-muted-foreground mt-1">View and manage all platform users</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading users...</div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} data-testid={`card-user-${user.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{user.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {user.email}
                    </div>
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
        </div>
      )}
    </div>
  );
}
