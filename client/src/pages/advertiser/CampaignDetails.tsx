import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Monitor, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  XCircle,
  Check,
  X,
  Camera,
  ShieldCheck,
  AlertTriangle 
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRazorpayCheckout } from "@/hooks/use-razorpay";
import { Textarea } from "@/components/ui/textarea";

interface BookingWithScreen {
  id: string;
  screenId: string;
  campaignId: string;
  price: number;
  status: string;
  ownerApproved: boolean;
  approvedByAdmin: boolean;
  ownerResponse: string | null;
  ownerRespondedAt: string | null;
  alternativeDates: { startDate: string; endDate: string } | null;
  adminNotes: string | null;
  startDate: string;
  endDate: string;
  screen: {
    id: string;
    name: string;
    location: string;
    city: string;
    venueCategory: string;
  };
}

interface CampaignWithBookings {
  id: string;
  name: string;
  objective: string;
  status: string;
  startDate: string;
  endDate: string;
  budget: number;
  createdAt: string;
  paymentStatus: string | null;
  bookings: BookingWithScreen[];
}

export default function CampaignDetails() {
  const [, params] = useRoute("/advertiser/campaigns/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [alternativeDateDialog, setAlternativeDateDialog] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithScreen | null>(null);
  const [disputeDialog, setDisputeDialog] = useState<{ open: boolean; proofId: string; reason: string }>({ open: false, proofId: "", reason: "" });
  const { initiatePayment, isProcessing: isPaymentProcessing } = useRazorpayCheckout();

  const { data: campaign, isLoading } = useQuery<CampaignWithBookings>({
    queryKey: [`/api/advertiser/campaigns/${params?.id}`],
    enabled: !!params?.id,
  });

  // Fetch proofs for all bookings in this campaign
  const bookingIds = campaign?.bookings?.map(b => b.id) || [];
  const proofQueries = useQuery<any[]>({
    queryKey: [`/api/advertiser/campaign-proofs`, params?.id],
    queryFn: async () => {
      const results: any[] = [];
      for (const bid of bookingIds) {
        try {
          const res = await fetch(`/api/bookings/${bid}/proof-of-play`, { credentials: "include" });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) results.push(...data);
          }
        } catch {}
      }
      return results;
    },
    enabled: bookingIds.length > 0,
  });
  const allProofs = proofQueries.data || [];

  const confirmProofMutation = useMutation({
    mutationFn: async (proofId: string) => {
      return apiRequest("PATCH", `/api/advertiser/proof/${proofId}/confirm`, {});
    },
    onSuccess: () => {
      proofQueries.refetch();
      queryClient.invalidateQueries({ queryKey: [`/api/advertiser/campaigns/${params?.id}`] });
      toast({ title: "Proof Confirmed", description: "Thank you for confirming the proof of play." });
    },
  });

  const disputeProofMutation = useMutation({
    mutationFn: async ({ proofId, reason }: { proofId: string; reason: string }) => {
      return apiRequest("PATCH", `/api/advertiser/proof/${proofId}/dispute`, { reason });
    },
    onSuccess: () => {
      proofQueries.refetch();
      setDisputeDialog({ open: false, proofId: "", reason: "" });
      toast({ title: "Dispute Submitted", description: "Your dispute has been logged. Admin will review." });
    },
  });

  const acceptAlternativeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/advertiser/bookings/${bookingId}/accept-alternative`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/advertiser/campaigns/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setAlternativeDateDialog(false);
      toast({
        title: "Alternative Dates Accepted",
        description: "The booking has been updated with new dates and sent back to the owner for approval.",
      });
    },
  });

  const rejectAlternativeMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/advertiser/bookings/${bookingId}/reject-alternative`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/advertiser/campaigns/${params?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setAlternativeDateDialog(false);
      toast({
        title: "Alternative Dates Rejected",
        description: "The alternative dates have been declined.",
      });
    },
  });

  const handleAcceptAlternative = (booking: BookingWithScreen) => {
    setSelectedBooking(booking);
    setAlternativeDateDialog(true);
  };

  const confirmAcceptAlternative = () => {
    if (selectedBooking) {
      acceptAlternativeMutation.mutate(selectedBooking.id);
    }
  };

  const confirmRejectAlternative = () => {
    if (selectedBooking) {
      rejectAlternativeMutation.mutate(selectedBooking.id);
    }
  };

  const getStatusBadge = (booking: BookingWithScreen) => {
    switch (booking.status) {
      case "pending_owner":
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending Owner</Badge>;
      case "owner_approved":
        return <Badge className="bg-yellow-500"><Clock className="mr-1 h-3 w-3" />Awaiting Admin</Badge>;
      case "owner_rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Owner Rejected</Badge>;
      case "approved":
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case "active":
        return <Badge className="bg-blue-500"><CheckCircle className="mr-1 h-3 w-3" />Active</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge>{booking.status}</Badge>;
    }
  };

  const calculateCampaignStatus = () => {
    if (!campaign || !campaign.bookings || !Array.isArray(campaign.bookings)) {
      return { text: "Unknown", variant: "secondary" as const };
    }
    
    const total = campaign.bookings.length;
    const approved = campaign.bookings.filter(b => 
      b.status === "approved" || b.status === "active"
    ).length;
    const rejected = campaign.bookings.filter(b => 
      b.status === "owner_rejected" || b.status === "rejected"
    ).length;
    const pending = campaign.bookings.filter(b => 
      b.status === "pending_owner" || b.status === "owner_approved"
    ).length;

    if (approved === total) {
      return { text: `Fully Approved (${approved}/${total})`, variant: "default" as const };
    } else if (rejected === total) {
      return { text: `All Rejected (${rejected}/${total})`, variant: "destructive" as const };
    } else if (approved > 0) {
      return { text: `Partially Approved (${approved}/${total} screens)`, variant: "secondary" as const };
    } else {
      return { text: `Pending Approval (${pending}/${total})`, variant: "secondary" as const };
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="text-center py-12">Loading campaign details...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-8 space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Campaign not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = calculateCampaignStatus();

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation("/advertiser/campaigns")}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>

        <div>
          <h1 className="text-4xl font-bold text-foreground font-serif mb-2">{campaign.name}</h1>
          <p className="text-muted-foreground capitalize">{campaign.objective ? campaign.objective.replace(/_/g, " ") : "N/A"}</p>
        </div>

        {/* Campaign Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge variant={status.variant}>{status.text}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Created</p>
                <p className="text-sm font-medium">
                  {campaign.createdAt ? format(new Date(campaign.createdAt), "MMM d, yyyy") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Duration</p>
                <p className="text-sm font-medium">
                  {campaign.startDate && campaign.endDate 
                    ? `${format(new Date(campaign.startDate), "MMM d")} - ${format(new Date(campaign.endDate), "MMM d, yyyy")}`
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Campaign Cost</p>
                <p className="text-sm font-bold text-primary">₹{campaign.budget.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">+GST</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Section */}
      {!(["advertiser_paid", "partially_released", "fully_settled"] as string[]).includes(campaign.paymentStatus || "") && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Payment Required</h3>
                <p className="text-sm text-muted-foreground">
                  Complete payment to confirm your campaign bookings
                </p>
                <div className="mt-1 space-y-0.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Booking Subtotal:</span>
                    <span className="font-medium text-foreground">₹{campaign.budget.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span className="font-medium text-foreground">₹{(campaign.budget * 0.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">Grand Total:</span>
                    <span className="text-2xl font-bold text-primary">₹{(campaign.budget * 1.18).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
              <Button
                size="lg"
                onClick={() => {
                  initiatePayment({
                    campaignId: campaign.id,
                    amount: Math.round(campaign.budget * 118), // Convert to paise (including 18% GST)
                    campaignName: campaign.name,
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: [`/api/advertiser/campaigns/${params?.id}`] });
                      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/payments"] });
                    },
                  });
                }}
                disabled={isPaymentProcessing}
              >
                <DollarSign className="mr-2 h-5 w-5" />
                {isPaymentProcessing ? "Processing..." : "Pay Now"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {(["advertiser_paid", "partially_released", "fully_settled"] as string[]).includes(campaign.paymentStatus || "") && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Payment completed for this campaign.</AlertDescription>
        </Alert>
      )}

      {/* Bookings List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Screen Bookings ({campaign.bookings?.length || 0})</h2>

        {!campaign.bookings || campaign.bookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No bookings for this campaign
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {campaign.bookings?.map((booking) => (
              <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
                <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Monitor className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <CardTitle className="text-lg">{booking.screen.name}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {booking.screen.location}, {booking.screen.city}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {booking.screen.venueCategory}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-medium">
                              {booking.startDate && booking.endDate 
                                ? `${format(new Date(booking.startDate), "MMM d")} - ${format(new Date(booking.endDate), "MMM d")}`
                                : "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-bold text-primary">₹{booking.price.toLocaleString()}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Status</p>
                          {getStatusBadge(booking)}
                        </div>
                      </div>

                      {/* Owner Rejection with Alternative Dates */}
                      {booking.status === "owner_rejected" && booking.alternativeDates && (
                        <Alert className="bg-yellow-500/10 border-yellow-500/50">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <AlertDescription className="space-y-3">
                            <div>
                              <p className="font-semibold text-yellow-900 dark:text-yellow-100">Owner Suggested Alternative Dates</p>
                              {booking.ownerResponse && (
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">{booking.ownerResponse}</p>
                              )}
                              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mt-2">
                                New Dates: {booking.alternativeDates.startDate && booking.alternativeDates.endDate
                                  ? `${format(new Date(booking.alternativeDates.startDate), "MMM d, yyyy")} - ${format(new Date(booking.alternativeDates.endDate), "MMM d, yyyy")}`
                                  : "N/A"}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptAlternative(booking)}
                                disabled={acceptAlternativeMutation.isPending || rejectAlternativeMutation.isPending}
                                data-testid={`button-accept-alternative-${booking.id}`}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Accept New Dates
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  rejectAlternativeMutation.mutate(booking.id);
                                }}
                                disabled={acceptAlternativeMutation.isPending || rejectAlternativeMutation.isPending}
                                data-testid={`button-reject-alternative-${booking.id}`}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Decline
                              </Button>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Owner Rejection without Alternative Dates */}
                      {booking.status === "owner_rejected" && !booking.alternativeDates && booking.ownerResponse && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold">Rejection Reason:</p>
                            <p className="text-sm mt-1">{booking.ownerResponse}</p>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Admin Rejection */}
                      {booking.status === "rejected" && booking.adminNotes && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            <p className="font-semibold">Admin Rejection:</p>
                            <p className="text-sm mt-1">{booking.adminNotes}</p>
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Proof of Play Review Section */}
                      {(() => {
                        const bookingProofs = allProofs.filter((p: any) => p.bookingId === booking.id);
                        if (bookingProofs.length === 0) return null;
                        return (
                          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
                            <div className="flex items-center gap-2">
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Proof of Play</span>
                            </div>
                            {bookingProofs.map((proof: any) => (
                              <div key={proof.id} className="p-2 border rounded-md bg-background space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium">Proof #{proof.id.slice(0, 8)}...</span>
                                  <Badge variant={
                                    proof.status === "confirmed" ? "default" :
                                    proof.status === "admin_verified" ? "secondary" :
                                    proof.status === "disputed" ? "destructive" : "outline"
                                  } className="text-xs">
                                    {proof.status === "admin_verified" ? "Ready for Review" : proof.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {proof.fileUrls?.length || 0} files • {new Date(proof.createdAt).toLocaleDateString()}
                                  {proof.ownerNotes && ` • ${proof.ownerNotes}`}
                                </div>
                                {/* File links */}
                                <div className="flex flex-wrap gap-1">
                                  {proof.fileUrls?.map((f: any, i: number) => (
                                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                                      {f.caption || `File ${i + 1}`} ({f.type})
                                    </a>
                                  ))}
                                </div>
                                {/* Actions for admin_verified proofs */}
                                {proof.status === "admin_verified" && (
                                  <div className="flex gap-2 mt-1">
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => confirmProofMutation.mutate(proof.id)}
                                      disabled={confirmProofMutation.isPending}
                                    >
                                      <ShieldCheck className="mr-1 h-3 w-3" />
                                      Confirm Proof
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-7 text-xs"
                                      onClick={() => setDisputeDialog({ open: true, proofId: proof.id, reason: "" })}
                                    >
                                      <AlertTriangle className="mr-1 h-3 w-3" />
                                      Dispute
                                    </Button>
                                  </div>
                                )}
                                {proof.status === "confirmed" && (
                                  <p className="text-xs text-green-600">✅ You confirmed this proof</p>
                                )}
                                {proof.status === "disputed" && proof.advertiserNotes && (
                                  <p className="text-xs text-destructive">Your dispute: {proof.advertiserNotes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Alternative Dates Confirmation Dialog */}
      <Dialog open={alternativeDateDialog} onOpenChange={setAlternativeDateDialog}>
        <DialogContent data-testid="dialog-alternative-dates">
          <DialogHeader>
            <DialogTitle>Accept Alternative Dates?</DialogTitle>
            <DialogDescription>
              {selectedBooking && selectedBooking.alternativeDates && (
                <div className="space-y-3 mt-4">
                  <p>The screen owner has suggested new dates for this booking:</p>
                  <div className="p-4 bg-muted rounded-md">
                    <p className="font-semibold">Original Dates:</p>
                    <p className="text-sm">
                      {format(new Date(selectedBooking.startDate), "MMM d, yyyy")} - {format(new Date(selectedBooking.endDate), "MMM d, yyyy")}
                    </p>
                    <p className="font-semibold mt-3">New Proposed Dates:</p>
                    <p className="text-sm">
                      {format(new Date(selectedBooking.alternativeDates.startDate), "MMM d, yyyy")} - {format(new Date(selectedBooking.alternativeDates.endDate), "MMM d, yyyy")}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    If you accept, the booking will be updated with these new dates and sent back to the owner for approval.
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAlternativeDateDialog(false)}
              data-testid="button-cancel-alternative"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAcceptAlternative}
              disabled={acceptAlternativeMutation.isPending}
              data-testid="button-confirm-accept-alternative"
            >
              {acceptAlternativeMutation.isPending ? "Accepting..." : "Accept New Dates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Proof Dialog */}
      <Dialog open={disputeDialog.open} onOpenChange={(open) => setDisputeDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute Proof of Play</DialogTitle>
            <DialogDescription>
              Please provide a reason for disputing this proof. The admin and screen owner will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe the issue with this proof..."
            value={disputeDialog.reason}
            onChange={e => setDisputeDialog(prev => ({ ...prev, reason: e.target.value }))}
            className="min-h-[80px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeDialog({ open: false, proofId: "", reason: "" })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disputeProofMutation.mutate({ proofId: disputeDialog.proofId, reason: disputeDialog.reason })}
              disabled={disputeProofMutation.isPending || !disputeDialog.reason.trim()}
            >
              {disputeProofMutation.isPending ? "Submitting..." : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
