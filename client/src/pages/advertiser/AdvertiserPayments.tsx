import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, FileText, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

interface Payment {
  id: string;
  bookingId: string | null;
  campaignId: string | null;
  advertiserId: string;
  amount: number;
  status: string;
  method: string;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  invoiceId: string | null;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  type: string;
  advertiserId: string | null;
  campaignId: string | null;
  subtotal: number;
  gstPercent: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  pdfUrl: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function getPaymentStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pending", variant: "secondary" },
    completed: { label: "Paid", variant: "default" },
    failed: { label: "Failed", variant: "destructive" },
    refunded: { label: "Refunded", variant: "outline" },
  };
  const config = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function AdvertiserPayments() {
  const [, navigate] = useLocation();

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/advertiser/payments"],
  });

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/advertiser/invoices"],
  });

  const totalPaid = payments
    .filter(p => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingPayments = payments.filter(p => p.status === "pending");

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/advertiser")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Payments & Billing</h1>
          <p className="text-muted-foreground">View your payment history and invoices</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              <CreditCard className="h-5 w-5 inline -mt-1" />
              {formatAmount(totalPaid)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Payments</CardDescription>
            <CardTitle className="text-2xl text-amber-600">{pendingPayments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-2xl">
              <FileText className="h-5 w-5 inline -mt-1" />
              {invoices.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList className="mb-4">
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          {payments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {payments.map((payment) => (
                <Card key={payment.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{formatAmount(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(payment.createdAt).toLocaleDateString()} • {payment.method}
                        {payment.gatewayPaymentId && ` • ${payment.gatewayPaymentId}`}
                      </p>
                    </div>
                    {getPaymentStatusBadge(payment.status)}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          {invoices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No invoices yet</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <Card key={invoice.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm">{formatAmount(invoice.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">
                        Subtotal: {formatAmount(invoice.subtotal)} + GST {invoice.gstPercent}%: {formatAmount(invoice.gstAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : "Draft"}
                      </p>
                    </div>
                    <Badge variant={invoice.status === "paid" ? "default" : "secondary"}>
                      {invoice.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
