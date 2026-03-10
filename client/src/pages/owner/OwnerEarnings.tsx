import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Clock, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OwnerPayout {
  id: string;
  bookingId: string;
  ownerId: string;
  campaignId: string;
  screenId: string;
  totalOwnerAmount: number;
  payoutAmount: number;
  platformCommission: number;
  payoutNumber: number;
  status: string;
  adminInitiatedAt: string | null;
  ownerAcceptedAt: string | null;
  processedAt: string | null;
  expiresAt: string | null;
  transactionRef: string | null;
  adminNotes: string | null;
  createdAt: string;
}

interface EarningsData {
  totalEarned: number;
  totalPending: number;
  totalProcessed: number;
  payoutsCount: number;
  pendingPayoutsCount: number;
  recentPayouts: OwnerPayout[];
  invoices: any[];
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_admin: { label: "Pending Admin", variant: "secondary" },
    initiated: { label: "Initiated", variant: "outline" },
    pending_owner_accept: { label: "Action Required", variant: "destructive" },
    accepted: { label: "Accepted", variant: "default" },
    processed: { label: "Processed", variant: "default" },
    expired: { label: "Expired", variant: "destructive" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const config = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function OwnerEarnings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: earnings, isLoading } = useQuery<EarningsData>({
    queryKey: ["/api/owner/earnings"],
  });

  const { data: payouts } = useQuery<OwnerPayout[]>({
    queryKey: ["/api/owner/payouts"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (payoutId: string) => {
      const res = await apiRequest("POST", `/api/owner/payouts/${payoutId}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/earnings"] });
      toast({ title: "Payout Accepted", description: "Payment will be processed shortly." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const allPayouts = payouts || [];
  const pendingPayouts = allPayouts.filter(p => p.status === "pending_owner_accept");
  const processedPayouts = allPayouts.filter(p => p.status === "processed");
  const otherPayouts = allPayouts.filter(p => !["pending_owner_accept", "processed"].includes(p.status));

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/owner")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Earnings & Payouts</h1>
          <p className="text-muted-foreground">Track your earnings from screen bookings</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earned</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              <DollarSign className="h-5 w-5 inline -mt-1" />
              {formatAmount(earnings?.totalEarned || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Payouts</CardDescription>
            <CardTitle className="text-2xl text-amber-600">
              <Clock className="h-5 w-5 inline -mt-1" />
              {formatAmount(earnings?.totalPending || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{earnings?.pendingPayoutsCount || 0} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Processed</CardDescription>
            <CardTitle className="text-2xl">
              <CheckCircle className="h-5 w-5 inline -mt-1 text-green-500" />
              {formatAmount(earnings?.totalProcessed || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{earnings?.payoutsCount || 0} total payouts</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Required Section */}
      {pendingPayouts.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Action Required — Accept Payouts
            </CardTitle>
            <CardDescription>These payouts require your acceptance within 5 minutes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPayouts.map((payout) => {
              const expiresAt = payout.expiresAt ? new Date(payout.expiresAt) : null;
              const isExpired = expiresAt && expiresAt < new Date();
              return (
                <div key={payout.id} className="flex items-center justify-between bg-white dark:bg-background rounded-lg p-3 border">
                  <div>
                    <p className="font-medium">{formatAmount(payout.payoutAmount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Payout #{payout.payoutNumber} • {payout.adminNotes || ""}
                    </p>
                    {expiresAt && !isExpired && (
                      <p className="text-xs text-amber-600 font-medium">
                        Expires: {expiresAt.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={!!isExpired || acceptMutation.isPending}
                    onClick={() => acceptMutation.mutate(payout.id)}
                  >
                    {isExpired ? "Expired" : "Accept"}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Payouts History Tabs */}
      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Payouts ({allPayouts.length})</TabsTrigger>
          <TabsTrigger value="processed">Processed ({processedPayouts.length})</TabsTrigger>
          <TabsTrigger value="other">Pending/Other ({otherPayouts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <PayoutList payouts={allPayouts} />
        </TabsContent>
        <TabsContent value="processed">
          <PayoutList payouts={processedPayouts} />
        </TabsContent>
        <TabsContent value="other">
          <PayoutList payouts={otherPayouts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PayoutList({ payouts }: { payouts: OwnerPayout[] }) {
  if (payouts.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No payouts found</p>;
  }

  return (
    <div className="space-y-2">
      {payouts.map((payout) => (
        <Card key={payout.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{formatAmount(payout.payoutAmount)}</p>
              <p className="text-xs text-muted-foreground">
                Payout #{payout.payoutNumber} • Commission: {formatAmount(payout.platformCommission)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(payout.createdAt).toLocaleDateString()}
                {payout.transactionRef && ` • Ref: ${payout.transactionRef}`}
              </p>
            </div>
            {getStatusBadge(payout.status)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
