import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Eye, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Monitor, 
  Calendar, 
  Building2, 
  Clock, 
  Search, 
  RefreshCw, 
  Loader2, 
  FileSpreadsheet, 
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProofStatusBadge } from "@/components/proof/ProofStatusBadge";
import { ProofFileViewer } from "@/components/proof/ProofFileViewer";
import { apiRequest } from "@/lib/queryClient";

export default function AdvertiserProofOfPlay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  // Confirm / Dispute Modals
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [proofToConfirm, setProofToConfirm] = useState<any>(null);
  const [confirmNotes, setConfirmNotes] = useState("");

  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [proofToDispute, setProofToDispute] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const { data: bookings = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/advertiser/proof-of-play"],
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PUT", `/api/advertiser/proof-of-play/${id}/confirm`, { notes });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Proof Confirmed! 🎉",
        description: "Thank you for confirming your campaign execution proof.",
      });
      setConfirmModalOpen(false);
      setProofToConfirm(null);
      setConfirmNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/proof-of-play"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Dispute Mutation
  const disputeMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await apiRequest("PUT", `/api/advertiser/proof-of-play/${id}/dispute`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Dispute Submitted",
        description: "Platform administrators and screen host have been notified.",
      });
      setDisputeModalOpen(false);
      setProofToDispute(null);
      setDisputeReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/proof-of-play"] });
    },
    onError: (err: any) => {
      toast({
        title: "Action Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const filteredBookings = bookings.filter((b) => {
    const screenName = (b.screen?.name || "").toLowerCase();
    const campaignName = (b.campaign?.name || "").toLowerCase();
    const hostName = (b.screen?.host || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    return screenName.includes(q) || campaignName.includes(q) || hostName.includes(q);
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Campaign Proof of Play</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Review screen execution photos, verification player sheets (.xlsx / .csv), and broadcast certificates across your booked screens.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* 30-Day Retention Notice Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-500/10 dark:border-amber-900/50 dark:bg-amber-950/20 p-4 text-xs text-foreground flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
            30-Day Media Retention Notice
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Proof of play media files (photos, videos, logs) are hosted on active cloud storage for <strong>30 calendar days</strong> following campaign completion. Please download and store local backup copies of your proof assets within this timeframe.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search campaign, screen, or host..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Showing {filteredBookings.length} screen executions
        </span>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading your proof of play reports...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-border p-8 bg-card/40">
          <Eye className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No Execution Proofs Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? "No screen executions match your search filter." 
              : "Once your campaign begins running and screen hosts submit verification proof, it will appear here for your review."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking) => {
            const hasProof = !!booking.latestProof;
            const proof = booking.latestProof;
            const isExpanded = expandedBookingId === booking.id;
            const fileCount = proof?.fileUrls?.length || 0;

            return (
              <Card key={booking.id} className="overflow-hidden border-border/80 shadow-xs hover:border-border transition-all">
                <div className="p-4 sm:p-5 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ProofStatusBadge 
                        status={proof ? proof.status : "no_proof"} 
                        adminVerified={proof?.adminVerified} 
                        cleanupStatus={proof?.cleanupStatus} 
                      />
                      {booking.screen?.host && (
                        <Badge variant="outline" className="bg-background text-[11px] font-medium">
                          Host: {booking.screen.host}
                        </Badge>
                      )}
                      {booking.startDate && booking.endDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary shrink-0" />
                      {booking.screen?.name || "Screen Execution"}
                      {booking.screen?.venueName && (
                        <span className="text-sm font-normal text-muted-foreground">
                          • {booking.screen.venueName}
                        </span>
                      )}
                    </h3>

                    {booking.campaign?.name && (
                      <p className="text-xs text-muted-foreground">
                        Campaign: <strong className="text-foreground">{booking.campaign.name}</strong>
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Confirm Button (if admin verified and not yet confirmed) */}
                    {hasProof && proof.status === "admin_verified" && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setProofToConfirm(proof);
                          setConfirmModalOpen(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-semibold"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Confirm Proof
                      </Button>
                    )}

                    {/* Dispute Button */}
                    {hasProof && proof.status === "admin_verified" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofToDispute(proof);
                          setDisputeModalOpen(true);
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 gap-1.5 h-8 text-xs font-medium"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Dispute
                      </Button>
                    )}

                    {/* Download ZIP */}
                    {hasProof && proof.cleanupStatus !== "purged" && (
                      <a
                        href={`/api/advertiser/proof-of-play/${proof.id}/download-zip`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background hover:bg-accent text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download ZIP
                      </a>
                    )}

                    {/* Toggle Expand Details */}
                    {hasProof && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedBookingId(isExpanded ? null : booking.id)}
                        className="h-8 px-2.5 text-xs text-muted-foreground gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Hide Files <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            View Proof ({fileCount}) <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Proof Details */}
                {isExpanded && hasProof && (
                  <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/10 space-y-4">
                    {/* Execution Summary */}
                    {(proof.summary || proof.ownerNotes || proof.adminNotes) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {(proof.summary || proof.ownerNotes) && (
                          <div className="rounded-lg bg-background p-3 border border-border/80">
                            <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">
                              Execution Report Summary
                            </p>
                            <p className="text-foreground whitespace-pre-wrap">{proof.summary || proof.ownerNotes}</p>
                          </div>
                        )}

                        {proof.adminNotes && (
                          <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-200 dark:border-blue-900/40">
                            <p className="font-semibold text-blue-700 dark:text-blue-300 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Admin Verification Seal
                            </p>
                            <p className="text-foreground whitespace-pre-wrap">{proof.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Proof Media Files */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Execution Assets & Logs ({fileCount})
                      </p>
                      <ProofFileViewer 
                        files={proof.fileUrls || []} 
                        cleanupStatus={proof.cleanupStatus} 
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              Confirm Proof of Play
            </DialogTitle>
            <DialogDescription>
              Confirm that this campaign broadcast was executed satisfactorily on this screen.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <Label className="text-xs font-semibold text-muted-foreground">Feedback or Remarks (Optional)</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Campaign looked great on venue screen. Thank you!"
              value={confirmNotes}
              onChange={(e) => setConfirmNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => {
                if (proofToConfirm) {
                  confirmMutation.mutate({ id: proofToConfirm.id, notes: confirmNotes });
                }
              }}
              disabled={confirmMutation.isPending}
            >
              {confirmMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Satisfaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute Modal */}
      <Dialog open={disputeModalOpen} onOpenChange={setDisputeModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Raise Proof Dispute
            </DialogTitle>
            <DialogDescription>
              Explain the issue with this execution proof (e.g. creative mismatch, missing daytime photo, or playback log discrepancy).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <Label className="text-xs font-semibold text-foreground">Dispute Reason *</Label>
            <Textarea
              rows={4}
              placeholder="Please describe why this proof is insufficient or inaccurate..."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
              onClick={() => {
                if (proofToDispute) {
                  disputeMutation.mutate({ id: proofToDispute.id, reason: disputeReason });
                }
              }}
              disabled={!disputeReason.trim() || disputeMutation.isPending}
            >
              {disputeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
