import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Receipt } from "lucide-react";

function fmt(paise: number) { return `₹${(paise / 100).toLocaleString("en-IN")}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const PAY_STATUS: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed:    "bg-red-100 text-red-600",
  refunded:  "bg-gray-100 text-gray-600",
};

export default function AgencyPayments() {
  const { data: payments = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/agency/payments"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/payments");
      return res.json();
    },
  });

  const totalPaid = payments
    .filter((p: any) => p.status === "completed")
    .reduce((s: number, p: any) => s + p.amount, 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
        <div className="h-24 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold">{fmt(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Transactions</p>
              <p className="text-xl font-bold">{payments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No payments yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((p: any) => (
                <div key={p.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.gatewayOrderId || p.id.slice(0, 12)}</p>
                    <p className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-sm">{fmt(p.amount)}</span>
                    <Badge className={`text-xs ${PAY_STATUS[p.status] || ""}`}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
