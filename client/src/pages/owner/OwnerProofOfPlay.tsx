import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  FileCheck, 
  Upload, 
  Search, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Monitor, 
  Calendar, 
  User, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw,
  Loader2,
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProofStatusBadge } from "@/components/proof/ProofStatusBadge";
import { ProofFileViewer } from "@/components/proof/ProofFileViewer";
import { ProofUploadModal } from "@/components/proof/ProofUploadModal";

export default function OwnerProofOfPlay() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<any>(null);

  const { data: bookings = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["/api/owner/bookings-for-proof"],
  });

  const filteredBookings = bookings.filter((b) => {
    const screenName = (b.screen?.name || "").toLowerCase();
    const campaignName = (b.campaign?.name || "").toLowerCase();
    const advertiserName = (b.advertiser?.name || "").toLowerCase();
    const q = searchQuery.toLowerCase();

    return screenName.includes(q) || campaignName.includes(q) || advertiserName.includes(q);
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Proof of Play</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload daytime & nighttime screen photos, player run sheets (.xlsx / .csv), or compliance reports (.pdf) for campaigns on your screens.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Helpful Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">Why upload Proof of Play?</p>
          <p className="text-muted-foreground leading-relaxed">
            Promptly submitting clear proof of execution (photos, videos, or playback logs) ensures rapid admin verification and triggers final payout releases. Proof files remain accessible in active storage for 30 days after the campaign concludes.
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search your screens or campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Showing {filteredBookings.length} bookings
        </span>
      </div>

      {/* Bookings List */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p>Loading your screen bookings...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-border p-8 bg-card/40">
          <FileCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-base font-semibold">No Bookings Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery 
              ? "No screen bookings match your search query." 
              : "Active and completed campaign bookings on your screens will appear here for proof upload."}
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
                      {booking.startDate && booking.endDate && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary shrink-0" />
                      {booking.screen?.name || "Screen Booking"}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {booking.campaign?.name && (
                        <span>Campaign: <strong className="text-foreground">{booking.campaign.name}</strong></span>
                      )}
                      {booking.advertiser?.name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Advertiser: {booking.advertiser.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Upload / Re-upload Button */}
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBookingForUpload(booking);
                        setUploadModalOpen(true);
                      }}
                      className="gap-1.5 h-8 text-xs font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {hasProof ? "Add More Proof" : "Upload Proof of Play"}
                    </Button>

                    {/* Expand Details if proof exists */}
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
                            View Files ({fileCount}) <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Proof Section */}
                {isExpanded && hasProof && (
                  <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/10 space-y-4">
                    {/* Summary / Notes */}
                    {(proof.summary || proof.ownerNotes || proof.adminNotes) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        {(proof.summary || proof.ownerNotes) && (
                          <div className="rounded-lg bg-background p-3 border border-border/80">
                            <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">
                              Your Upload Summary
                            </p>
                            <p className="text-foreground whitespace-pre-wrap">{proof.summary || proof.ownerNotes}</p>
                          </div>
                        )}

                        {proof.adminNotes && (
                          <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-200 dark:border-blue-900/40">
                            <p className="font-semibold text-blue-700 dark:text-blue-300 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Admin Feedback
                            </p>
                            <p className="text-foreground whitespace-pre-wrap">{proof.adminNotes}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Files Viewer */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Uploaded Files ({fileCount})
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

      {/* Upload Modal */}
      <ProofUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        booking={selectedBookingForUpload}
        role="screen_owner"
        onSuccess={() => refetch()}
      />
    </div>
  );
}
