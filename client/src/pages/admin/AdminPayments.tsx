import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DollarSign, Send, RefreshCw, CheckCircle, FileText, Camera, ShieldCheck, AlertTriangle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Payment {
  id: string;
  campaignId: string | null;
  advertiserId: string | null;
  amount: number;
  status: string;
  method: string;
  gatewayPaymentId: string | null;
  createdAt: string;
}

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
  expiresAt: string | null;
  transactionRef: string | null;
  adminNotes: string | null;
  createdAt: string;
}

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function getPayoutStatusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending_admin: { label: "Pending", variant: "secondary" },
    initiated: { label: "Initiated", variant: "outline" },
    pending_owner_accept: { label: "Waiting Owner", variant: "secondary" },
    accepted: { label: "Accepted", variant: "default" },
    processed: { label: "Processed", variant: "default" },
    expired: { label: "Expired", variant: "destructive" },
    failed: { label: "Failed", variant: "destructive" },
  };
  const config = map[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function AdminPayments() {
  const { toast } = useToast();

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/admin/payments"],
  });

  const { data: payouts = [] } = useQuery<OwnerPayout[]>({
    queryKey: ["/api/admin/payouts"],
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/invoices"],
  });

  // Booking payouts (enriched per-booking payout cards)
  const { data: bookingPayouts = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/booking-payouts"],
  });

  // Proof of play entries
  const { data: allProofs = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/proof-of-play"],
  });

  // Initiate payout dialog state
  const [initiateOpen, setInitiateOpen] = useState(false);
  const [initiateForm, setInitiateForm] = useState({
    bookingId: "",
    ownerId: "",
    campaignId: "",
    screenId: "",
    payoutAmount: "",
    platformCommission: "",
    adminNotes: "",
  });

  const initiateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/payouts/initiate", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: "Payout Initiated", description: "Owner has 5 minutes to accept." });
      setInitiateOpen(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const markProcessedMutation = useMutation({
    mutationFn: async ({ id, transactionRef }: { id: string; transactionRef: string }) => {
      const res = await apiRequest("POST", `/api/admin/payouts/${id}/mark-processed`, { transactionRef });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: "Payout Processed" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/payouts/${id}/regenerate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      toast({ title: "Payout Regenerated", description: "Owner has 5 minutes to accept." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  // Set advance/final payout amounts for a booking
  const setPayoutAmountsMutation = useMutation({
    mutationFn: async ({ bookingId, ownerAdvanceAmount, ownerFinalAmount }: { bookingId: string; ownerAdvanceAmount: number; ownerFinalAmount: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/bookings/${bookingId}/payout-amounts`, { ownerAdvanceAmount, ownerFinalAmount });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/booking-payouts"] });
      toast({ title: "Payout Amounts Set" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  // Initiate advance/final payout for a booking
  const bookingPayoutMutation = useMutation({
    mutationFn: async ({ bookingId, payoutType, payoutAmount, platformCommission, adminNotes }: any) => {
      const res = await apiRequest("POST", `/api/admin/bookings/${bookingId}/payout`, {
        payoutType, payoutAmount, platformCommission, adminNotes,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payouts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/booking-payouts"] });
      toast({ title: "Payout Initiated", description: "Owner has 5 minutes to accept." });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  // Verify proof of play
  const verifyProofMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/proof/${id}/verify`, { notes });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proof-of-play"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/booking-payouts"] });
      toast({ title: "Proof Verified" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const [transactionRefInput, setTransactionRefInput] = useState<Record<string, string>>({});
  // Per-booking payout amount form state
  const [payoutAmountsForm, setPayoutAmountsForm] = useState<Record<string, { advance: string; final: string }>>({});
  // Per-booking payout initiate dialog
  const [bookingPayoutDialog, setBookingPayoutDialog] = useState<{ open: boolean; bookingId: string; payoutType: string; amount: string; commission: string; notes: string }>({
    open: false, bookingId: "", payoutType: "advance", amount: "", commission: "", notes: "",
  });

  const totalReceived = payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0);
  const totalPaidOut = payouts.filter(p => p.status === "processed").reduce((sum, p) => sum + p.payoutAmount, 0);

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payment Management</h1>
          <p className="text-muted-foreground">Manage payments, payouts, and invoices</p>
        </div>
        <Dialog open={initiateOpen} onOpenChange={setInitiateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Initiate Payout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Initiate Owner Payout</DialogTitle>
              <DialogDescription>Send a payout to a screen owner. They'll have 5 minutes to accept.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Booking ID" value={initiateForm.bookingId} onChange={e => setInitiateForm(f => ({...f, bookingId: e.target.value}))} />
              <Input placeholder="Owner ID" value={initiateForm.ownerId} onChange={e => setInitiateForm(f => ({...f, ownerId: e.target.value}))} />
              <Input placeholder="Campaign ID" value={initiateForm.campaignId} onChange={e => setInitiateForm(f => ({...f, campaignId: e.target.value}))} />
              <Input placeholder="Screen ID" value={initiateForm.screenId} onChange={e => setInitiateForm(f => ({...f, screenId: e.target.value}))} />
              <Input placeholder="Payout Amount (paise)" type="number" value={initiateForm.payoutAmount} onChange={e => setInitiateForm(f => ({...f, payoutAmount: e.target.value}))} />
              <Input placeholder="Platform Commission (paise)" type="number" value={initiateForm.platformCommission} onChange={e => setInitiateForm(f => ({...f, platformCommission: e.target.value}))} />
              <Textarea placeholder="Admin notes" value={initiateForm.adminNotes} onChange={e => setInitiateForm(f => ({...f, adminNotes: e.target.value}))} />
            </div>
            <DialogFooter>
              <Button
                onClick={() => initiateMutation.mutate({
                  bookingId: initiateForm.bookingId,
                  ownerId: initiateForm.ownerId,
                  campaignId: initiateForm.campaignId,
                  screenId: initiateForm.screenId,
                  payoutAmount: parseInt(initiateForm.payoutAmount),
                  platformCommission: parseInt(initiateForm.platformCommission) || 0,
                  adminNotes: initiateForm.adminNotes || undefined,
                })}
                disabled={initiateMutation.isPending}
              >
                Initiate Payout
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Received</CardDescription>
            <CardTitle className="text-xl text-green-600">{formatAmount(totalReceived)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Paid Out</CardDescription>
            <CardTitle className="text-xl">{formatAmount(totalPaidOut)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Platform Revenue</CardDescription>
            <CardTitle className="text-xl text-blue-600">{formatAmount(totalReceived - totalPaidOut)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-xl">{invoices.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="booking-payouts">
        <TabsList className="mb-4">
          <TabsTrigger value="booking-payouts">Booking Payouts ({bookingPayouts.length})</TabsTrigger>
          <TabsTrigger value="proof">Proof of Play ({allProofs.length})</TabsTrigger>
          <TabsTrigger value="payouts">Owner Payouts ({payouts.length})</TabsTrigger>
          <TabsTrigger value="payments">Advertiser Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
        </TabsList>

        {/* Per-Booking Payout Cards */}
        <TabsContent value="booking-payouts">
          {bookingPayouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No paid bookings yet</p>
          ) : (
            <div className="space-y-4">
              {bookingPayouts.map((bp: any) => {
                const b = bp.booking;
                const screen = b?.screen;
                const campaign = b?.campaign;
                const owner = b?.owner;
                const advertiser = b?.advertiser;
                return (
                  <Card key={b?.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">{screen?.name || "Unknown Screen"}</CardTitle>
                          <CardDescription>
                            {campaign?.name || "—"} • Owner: {owner?.name || "—"} • Advertiser: {advertiser?.name || "—"}
                          </CardDescription>
                        </div>
                        <Badge variant={b?.status === "completed" ? "default" : "secondary"}>
                          {b?.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Price and payout summary */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Booking Price</p>
                          <p className="font-medium">{formatAmount(b?.price || 0)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Advance Set</p>
                          <p className="font-medium">{bp.advanceAmount ? formatAmount(bp.advanceAmount) : "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Final Set</p>
                          <p className="font-medium">{bp.finalAmount ? formatAmount(bp.finalAmount) : "Not set"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Total Paid Out</p>
                          <p className="font-medium text-green-600">{formatAmount(bp.totalPaidOut)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Proof Status</p>
                          <p className="font-medium">
                            {bp.proofs.length === 0 ? "No proof" :
                              bp.proofs[0].status === "confirmed" ? "✅ Confirmed" :
                              bp.proofs[0].status === "admin_verified" ? "🔍 Awaiting Advertiser" :
                              bp.proofs[0].status === "disputed" ? "⚠️ Disputed" : "⏳ Pending"}
                          </p>
                        </div>
                      </div>

                      {/* Set payout amounts */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Input
                          placeholder="Advance (paise)"
                          className="w-32 h-8 text-xs"
                          type="number"
                          value={payoutAmountsForm[b?.id]?.advance ?? (bp.advanceAmount || "")}
                          onChange={e => setPayoutAmountsForm(prev => ({
                            ...prev,
                            [b?.id]: { ...prev[b?.id], advance: e.target.value, final: prev[b?.id]?.final ?? (bp.finalAmount || "") }
                          }))}
                        />
                        <Input
                          placeholder="Final (paise)"
                          className="w-32 h-8 text-xs"
                          type="number"
                          value={payoutAmountsForm[b?.id]?.final ?? (bp.finalAmount || "")}
                          onChange={e => setPayoutAmountsForm(prev => ({
                            ...prev,
                            [b?.id]: { advance: prev[b?.id]?.advance ?? (bp.advanceAmount || ""), final: e.target.value }
                          }))}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const form = payoutAmountsForm[b?.id];
                            setPayoutAmountsMutation.mutate({
                              bookingId: b?.id,
                              ownerAdvanceAmount: parseInt(form?.advance) || 0,
                              ownerFinalAmount: parseInt(form?.final) || 0,
                            });
                          }}
                          disabled={setPayoutAmountsMutation.isPending}
                        >
                          Save Amounts
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => setBookingPayoutDialog({
                            open: true,
                            bookingId: b?.id,
                            payoutType: "advance",
                            amount: String(bp.advanceAmount || ""),
                            commission: "",
                            notes: "",
                          })}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Advance Payout
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setBookingPayoutDialog({
                            open: true,
                            bookingId: b?.id,
                            payoutType: "final",
                            amount: String(bp.finalAmount || ""),
                            commission: "",
                            notes: "",
                          })}
                          disabled={!bp.proofs.some((p: any) => p.status === "confirmed")}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Final Payout
                        </Button>
                      </div>

                      {/* Existing payouts for this booking */}
                      {bp.payouts.length > 0 && (
                        <div className="border rounded-md p-2 space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Payouts History:</p>
                          {bp.payouts.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <span>#{p.payoutNumber} ({p.payoutType || "advance"}) — {formatAmount(p.payoutAmount)}</span>
                              <span>{getPayoutStatusBadge(p.status)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Proof of Play Tab */}
        <TabsContent value="proof">
          {allProofs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No proof of play submissions yet</p>
          ) : (
            <div className="space-y-3">
              {allProofs.map((proof: any) => (
                <Card key={proof.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Camera className="h-4 w-4" />
                          <p className="font-medium text-sm">Proof #{proof.id.slice(0, 8)}...</p>
                          <Badge variant={
                            proof.status === "confirmed" ? "default" :
                            proof.status === "admin_verified" ? "secondary" :
                            proof.status === "disputed" ? "destructive" : "outline"
                          }>
                            {proof.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Booking: {proof.bookingId.slice(0, 8)}... • Owner: {proof.ownerId.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {proof.fileUrls?.length || 0} files • {new Date(proof.createdAt).toLocaleDateString()}
                          {proof.ownerNotes && ` • Notes: ${proof.ownerNotes}`}
                        </p>
                        {/* Show file links */}
                        {proof.fileUrls?.map((f: any, i: number) => (
                          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline mr-2">
                            {f.caption || `File ${i + 1}`} ({f.type})
                          </a>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {proof.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => verifyProofMutation.mutate({ id: proof.id })}
                            disabled={verifyProofMutation.isPending}
                          >
                            <ShieldCheck className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        {proof.status === "disputed" && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {proof.advertiserNotes || "Disputed"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payouts">
          {payouts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No payouts yet</p>
          ) : (
            <div className="space-y-2">
              {payouts.map((payout) => (
                <Card key={payout.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{formatAmount(payout.payoutAmount)}</p>
                          {getPayoutStatusBadge(payout.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Payout #{payout.payoutNumber} • Owner: {payout.ownerId.slice(0, 8)}... • Booking: {payout.bookingId.slice(0, 8)}...
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Commission: {formatAmount(payout.platformCommission)} • {new Date(payout.createdAt).toLocaleDateString()}
                          {payout.transactionRef && ` • Ref: ${payout.transactionRef}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {payout.status === "accepted" && (
                          <div className="flex items-center gap-1">
                            <Input
                              placeholder="UTR/Ref"
                              className="w-28 h-8 text-xs"
                              value={transactionRefInput[payout.id] || ""}
                              onChange={e => setTransactionRefInput(prev => ({...prev, [payout.id]: e.target.value}))}
                            />
                            <Button
                              size="sm"
                              onClick={() => markProcessedMutation.mutate({ id: payout.id, transactionRef: transactionRefInput[payout.id] || "" })}
                              disabled={markProcessedMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {(payout.status === "expired" || payout.status === "failed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => regenerateMutation.mutate(payout.id)}
                            disabled={regenerateMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerate
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

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
                      {payment.method} • {new Date(payment.createdAt).toLocaleDateString()}
                      {payment.gatewayPaymentId && ` • ${payment.gatewayPaymentId}`}
                    </p>
                  </div>
                  <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                    {payment.status}
                  </Badge>
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
              {invoices.map((invoice: any) => (
                <Card key={invoice.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm">{formatAmount(invoice.totalAmount)} ({invoice.type})</p>
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

      {/* Booking Payout Dialog */}
      <Dialog open={bookingPayoutDialog.open} onOpenChange={(open) => setBookingPayoutDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Initiate {bookingPayoutDialog.payoutType === "advance" ? "Advance" : "Final"} Payout</DialogTitle>
            <DialogDescription>Booking {bookingPayoutDialog.bookingId?.slice(0, 8)}... — Owner has 5 minutes to accept.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Amount (paise)</Label>
              <Input type="number" value={bookingPayoutDialog.amount} onChange={e => setBookingPayoutDialog(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div>
              <Label>Commission (paise, optional)</Label>
              <Input type="number" value={bookingPayoutDialog.commission} onChange={e => setBookingPayoutDialog(prev => ({ ...prev, commission: e.target.value }))} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={bookingPayoutDialog.notes} onChange={e => setBookingPayoutDialog(prev => ({ ...prev, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingPayoutDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button
              onClick={() => {
                bookingPayoutMutation.mutate({
                  bookingId: bookingPayoutDialog.bookingId,
                  payoutType: bookingPayoutDialog.payoutType,
                  amount: parseInt(bookingPayoutDialog.amount) || 0,
                  commission: parseInt(bookingPayoutDialog.commission) || undefined,
                  notes: bookingPayoutDialog.notes || undefined,
                });
                setBookingPayoutDialog(prev => ({ ...prev, open: false }));
              }}
              disabled={bookingPayoutMutation.isPending || !bookingPayoutDialog.amount}
            >
              Initiate Payout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
