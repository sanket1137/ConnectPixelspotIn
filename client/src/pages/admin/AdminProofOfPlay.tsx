import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Upload, 
  Download, 
  Trash2, 
  Clock, 
  AlertTriangle, 
  Archive, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  Monitor, 
  Calendar, 
  Building2, 
  User, 
  ChevronDown, 
  ChevronUp,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ProofStatusBadge } from "@/components/proof/ProofStatusBadge";
import { ProofFileViewer } from "@/components/proof/ProofFileViewer";
import { ProofUploadModal } from "@/components/proof/ProofUploadModal";
import { apiRequest } from "@/lib/queryClient";

export default function AdminProofOfPlay() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all-proofs");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedProofId, setExpandedProofId] = useState<string | null>(null);

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedBookingForUpload, setSelectedBookingForUpload] = useState<any>(null);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [proofToVerify, setProofToVerify] = useState<any>(null);
  const [adminVerifyNotes, setAdminVerifyNotes] = useState("");

  const [cleanupConfirmOpen, setCleanupConfirmOpen] = useState(false);
  const [proofToCleanup, setProofToCleanup] = useState<any>(null);

  const [snoozeModalOpen, setSnoozeModalOpen] = useState(false);
  const [proofToSnooze, setProofToSnooze] = useState<any>(null);
  const [snoozeDays, setSnoozeDays] = useState("30");

  // Queries
  const { data: proofs = [], isLoading: isLoadingProofs, refetch: refetchProofs } = useQuery<any[]>({
    queryKey: ["/api/admin/proof-of-play"],
  });

  const { data: cleanupCandidates = [], isLoading: isLoadingCleanup, refetch: refetchCleanup } = useQuery<any[]>({
    queryKey: ["/api/admin/proof-of-play/cleanup-candidates"],
  });

  // Verify Mutation
  const verifyMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const res = await apiRequest("PUT", `/api/admin/proof-of-play/${id}/verify`, { adminNotes: notes });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Proof of Play Verified",
        description: "Status updated to Admin Verified. Advertiser can now review.",
      });
      setVerifyModalOpen(false);
      setProofToVerify(null);
      setAdminVerifyNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proof-of-play"] });
    },
    onError: (err: any) => {
      toast({
        title: "Verification Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Cleanup Purge Mutation
  const cleanupMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/admin/proof-of-play/${id}/cleanup`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Media Storage Purged",
        description: "Physical media files deleted from cloud storage. Audit records preserved.",
      });
      setCleanupConfirmOpen(false);
      setProofToCleanup(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proof-of-play"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proof-of-play/cleanup-candidates"] });
    },
    onError: (err: any) => {
      toast({
        title: "Clean-up Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Snooze Mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ id, days }: { id: string; days: number }) => {
      const res = await apiRequest("POST", `/api/admin/proof-of-play/${id}/snooze`, { days });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Clean-up Snoozed",
        description: `This proof of play record will be hidden from the urgent clean-up list for ${snoozeDays} days.`,
      });
      setSnoozeModalOpen(false);
      setProofToSnooze(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proof-of-play/cleanup-candidates"] });
    },
    onError: (err: any) => {
      toast({
        title: "Snooze Failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // Filtering
  const filteredProofs = proofs.filter((p) => {
    const matchesSearch = 
      (p.screen?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.screen?.host || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.campaign?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.advertiser?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.advertiser?.email || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "purged" && (p.cleanupStatus === "purged" || p.status === "cleaned_up")) ||
      p.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalProofsCount = proofs.length;
  const pendingCount = proofs.filter(p => p.status === "pending").length;
  const verifiedCount = proofs.filter(p => p.status === "admin_verified").length;
  const confirmedCount = proofs.filter(p => p.status === "confirmed").length;
  const disputedCount = proofs.filter(p => p.status === "disputed").length;
  const cleanupCount = cleanupCandidates.length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-extrabold tracking-tight">Proof of Play Management</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Inspect campaign broadcast execution, review & verify owner evidence, feed direct proof of play, and manage 30-day storage clean-up.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchProofs();
              refetchCleanup();
            }}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 bg-card/60 backdrop-blur-xs">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Total Proofs</p>
          <p className="text-2xl font-bold mt-1 text-foreground">{totalProofsCount}</p>
        </Card>
        <Card className="p-4 bg-amber-500/5 border-amber-200 dark:border-amber-900/40">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Pending Review</p>
          <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">{pendingCount}</p>
        </Card>
        <Card className="p-4 bg-blue-500/5 border-blue-200 dark:border-blue-900/40">
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Admin Verified</p>
          <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">{verifiedCount}</p>
        </Card>
        <Card className="p-4 bg-green-500/5 border-green-200 dark:border-green-900/40">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase">Confirmed</p>
          <p className="text-2xl font-bold mt-1 text-green-700 dark:text-green-300">{confirmedCount}</p>
        </Card>
        <Card className="p-4 bg-red-500/5 border-red-200 dark:border-red-900/40">
          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Disputed</p>
          <p className="text-2xl font-bold mt-1 text-red-700 dark:text-red-300">{disputedCount}</p>
        </Card>
        <Card className="p-4 bg-purple-500/5 border-purple-200 dark:border-purple-900/40">
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase">30d Clean-up Due</p>
          <p className="text-2xl font-bold mt-1 text-purple-700 dark:text-purple-300">{cleanupCount}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="all-proofs" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            Verification Queue
          </TabsTrigger>
          <TabsTrigger value="cleanup" className="gap-2 relative">
            <Archive className="w-4 h-4" />
            Storage Clean-up
            {cleanupCount > 0 && (
              <Badge className="ml-1.5 h-5 px-1.5 bg-purple-600 text-white text-[10px] rounded-full">
                {cleanupCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* =========================================
            TAB 1: ALL PROOFS & VERIFICATION QUEUE
            ========================================= */}
        <TabsContent value="all-proofs" className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search screen, host, campaign, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Proofs</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="admin_verified">Admin Verified</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="purged">Files Purged (Cleaned)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Proofs List */}
          {isLoadingProofs ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading proof of play submissions...</p>
            </div>
          ) : filteredProofs.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-border p-8 bg-card/40">
              <ShieldCheck className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <h3 className="text-base font-semibold">No Proof of Play Records Found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search query or status filter."
                  : "Proof of play records submitted by screen owners or admin will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredProofs.map((item) => {
                const isExpanded = expandedProofId === item.id;
                const fileCount = item.fileUrls?.length || 0;

                return (
                  <Card key={item.id} className="overflow-hidden border-border/80 shadow-xs hover:border-border transition-all">
                    {/* Header Bar */}
                    <div className="p-4 sm:p-5 bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <ProofStatusBadge 
                            status={item.status} 
                            adminVerified={item.adminVerified} 
                            cleanupStatus={item.cleanupStatus} 
                          />
                          <Badge variant="secondary" className="text-[11px]">
                            Uploaded by {item.uploadedByRole === "admin" ? "Admin" : "Screen Owner"}
                          </Badge>
                          {item.createdAt && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* Screen & Campaign Names */}
                        <div className="pt-0.5">
                          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-primary shrink-0" />
                            {item.screen?.name || "Screen Booking"}
                            {item.screen?.venueName && (
                              <span className="text-muted-foreground font-normal text-sm">
                                ({item.screen.venueName})
                              </span>
                            )}
                          </h3>
                        </div>

                        {/* Metadata row */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {item.screen?.host && (
                            <span className="flex items-center gap-1 font-medium text-foreground/80">
                              <Building2 className="w-3.5 h-3.5 text-primary" />
                              Host: {item.screen.host}
                            </span>
                          )}
                          {item.campaign?.name && (
                            <span>
                              Campaign: <strong>{item.campaign.name}</strong>
                            </span>
                          )}
                          {item.advertiser && (
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5" />
                              Advertiser: {item.advertiser.name || item.advertiser.email}
                            </span>
                          )}
                          {item.booking?.startDate && item.booking?.endDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(item.booking.startDate).toLocaleDateString()} - {new Date(item.booking.endDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Verify Button (if pending) */}
                        {item.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setProofToVerify(item);
                              setAdminVerifyNotes(item.adminNotes || "");
                              setVerifyModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-8 text-xs font-semibold"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verify Proof
                          </Button>
                        )}

                        {/* Download Archive */}
                        {item.cleanupStatus !== "purged" && (
                          <a
                            href={`/api/admin/proof-of-play/${item.id}/archive`}
                            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background hover:bg-accent text-xs font-medium transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            ZIP Archive
                          </a>
                        )}

                        {/* Toggle Expand View */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedProofId(isExpanded ? null : item.id)}
                          className="h-8 px-2.5 text-xs text-muted-foreground gap-1"
                        >
                          {isExpanded ? (
                            <>
                              Hide Details <ChevronUp className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              View Files ({fileCount}) <ChevronDown className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable Details Section */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/10 space-y-4">
                        {/* Summary & Notes */}
                        {(item.summary || item.ownerNotes || item.adminNotes || item.advertiserNotes) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {(item.summary || item.ownerNotes) && (
                              <div className="rounded-lg bg-background p-3 border border-border/80">
                                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider mb-1">
                                  Owner / Execution Summary
                                </p>
                                <p className="text-foreground whitespace-pre-wrap">{item.summary || item.ownerNotes}</p>
                              </div>
                            )}

                            {item.adminNotes && (
                              <div className="rounded-lg bg-blue-500/5 p-3 border border-blue-200 dark:border-blue-900/40">
                                <p className="font-semibold text-blue-700 dark:text-blue-300 uppercase text-[10px] tracking-wider mb-1 flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Admin Remarks
                                </p>
                                <p className="text-foreground whitespace-pre-wrap">{item.adminNotes}</p>
                              </div>
                            )}

                            {item.advertiserNotes && (
                              <div className={`rounded-lg p-3 border ${
                                item.status === "disputed" 
                                  ? "bg-red-500/5 border-red-200 dark:border-red-900/40 text-red-900 dark:text-red-200" 
                                  : "bg-green-500/5 border-green-200 dark:border-green-900/40 text-green-900 dark:text-green-200"
                              }`}>
                                <p className="font-semibold uppercase text-[10px] tracking-wider mb-1">
                                  Advertiser Feedback {item.status === "disputed" && "(Dispute Reason)"}
                                </p>
                                <p className="whitespace-pre-wrap">{item.advertiserNotes}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Files Viewer */}
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Uploaded Evidence Files ({fileCount})
                          </p>
                          <ProofFileViewer 
                            files={item.fileUrls || []} 
                            cleanupStatus={item.cleanupStatus} 
                          />
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* =========================================
            TAB 2: 30-DAY STORAGE CLEAN-UP
            ========================================= */}
        <TabsContent value="cleanup" className="space-y-4">
          {/* Explanation Alert */}
          <div className="rounded-xl border border-purple-200 bg-purple-500/5 p-4 text-sm text-foreground flex items-start gap-3">
            <Archive className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h4 className="font-bold text-purple-900 dark:text-purple-200">
                Automated 30-Day Storage Clean-Up Engine
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Per our Data Retention Policy, campaign bookings that ended more than 30 days ago appear in this console. To preserve storage quota on Google Cloud Storage, you can download an offline ZIP archive and approve permanent file deletion. Textual audit logs, host assignments, and billing summaries remain permanently intact.
              </p>
            </div>
          </div>

          {/* Clean-up Table */}
          {isLoadingCleanup ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p>Scanning for clean-up candidates...</p>
            </div>
          ) : cleanupCandidates.length === 0 ? (
            <div className="py-16 text-center rounded-xl border border-dashed border-border p-8 bg-card/40">
              <CheckCircle2 className="w-12 h-12 text-emerald-500/60 mx-auto mb-3" />
              <h3 className="text-base font-semibold">Storage Is Optimized</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                No proof of play records are currently pending 30-day clean-up. Records will automatically appear here once their campaign conclusion reaches the 30-day threshold.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cleanupCandidates.map((candidate) => {
                const fileCount = candidate.fileUrls?.length || 0;
                const endDate = candidate.booking?.endDate ? new Date(candidate.booking.endDate) : null;
                const daysElapsed = endDate 
                  ? Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24))
                  : 30;

                return (
                  <Card key={candidate.id} className="p-4 sm:p-5 border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300">
                          {daysElapsed} days since campaign end
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {fileCount} files in cloud storage
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-primary shrink-0" />
                        {candidate.screen?.name || "Screen Booking"}
                        {candidate.screen?.host && (
                          <span className="text-xs font-normal text-muted-foreground">
                            (Host: {candidate.screen.host})
                          </span>
                        )}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {candidate.campaign?.name && (
                          <span>Campaign: <strong>{candidate.campaign.name}</strong></span>
                        )}
                        {candidate.advertiser && (
                          <span>Advertiser: {candidate.advertiser.name || candidate.advertiser.email}</span>
                        )}
                        {endDate && (
                          <span>Ended: {endDate.toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    {/* Three Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {/* Button 1: Download Archive ZIP */}
                      <a
                        href={`/api/admin/proof-of-play/${candidate.id}/archive`}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-background hover:bg-accent text-xs font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download Archive (ZIP)
                      </a>

                      {/* Button 2: Keep Record / Snooze */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setProofToSnooze(candidate);
                          setSnoozeModalOpen(true);
                        }}
                        className="h-8 text-xs font-medium gap-1"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Keep / Snooze
                      </Button>

                      {/* Button 3: Clean / Purge Files */}
                      <Button
                        size="sm"
                        onClick={() => {
                          setProofToCleanup(candidate);
                          setCleanupConfirmOpen(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white h-8 text-xs font-semibold gap-1.5 shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clean Storage
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* =========================================
          VERIFY CONFIRMATION DIALOG
          ========================================= */}
      <Dialog open={verifyModalOpen} onOpenChange={setVerifyModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Verify Proof of Play
            </DialogTitle>
            <DialogDescription>
              Mark this submission as verified by Admin. The advertiser will be notified that proof is ready for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="rounded-lg bg-muted p-3 space-y-1 text-xs">
              <p><strong>Screen:</strong> {proofToVerify?.screen?.name}</p>
              <p><strong>Campaign:</strong> {proofToVerify?.campaign?.name}</p>
              <p><strong>Files:</strong> {proofToVerify?.fileUrls?.length || 0} items</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Admin Verification Notes (Optional)</label>
              <Textarea
                rows={3}
                placeholder="e.g. Verified against broadcast log certificates. Execution confirmed."
                value={adminVerifyNotes}
                onChange={(e) => setAdminVerifyNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyModalOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => {
                if (proofToVerify) {
                  verifyMutation.mutate({ id: proofToVerify.id, notes: adminVerifyNotes });
                }
              }}
              disabled={verifyMutation.isPending}
            >
              {verifyMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Confirm Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================
          CLEANUP CONFIRMATION DIALOG
          ========================================= */}
      <Dialog open={cleanupConfirmOpen} onOpenChange={setCleanupConfirmOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Storage Clean-Up
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the heavy media files (photos, videos, PDFs) from Google Cloud Storage to reclaim disk space.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 p-3 text-xs text-red-800 dark:text-red-200">
              <p className="font-semibold">Important:</p>
              <p className="mt-0.5">
                Ensure you have clicked <strong>Download Archive (ZIP)</strong> first if you wish to retain an offline backup on your local machine.
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Booking ID: <code className="bg-muted px-1 rounded">{proofToCleanup?.bookingId}</code></p>
              <p>Files to be deleted: <strong>{proofToCleanup?.fileUrls?.length || 0}</strong></p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white gap-2"
              onClick={() => {
                if (proofToCleanup) {
                  cleanupMutation.mutate(proofToCleanup.id);
                }
              }}
              disabled={cleanupMutation.isPending}
            >
              {cleanupMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Files & Reclaim Storage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================
          SNOOZE CLEAN-UP MODAL
          ========================================= */}
      <Dialog open={snoozeModalOpen} onOpenChange={setSnoozeModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Clock className="w-5 h-5 text-primary" />
              Keep Record / Snooze Clean-up
            </DialogTitle>
            <DialogDescription>
              Delay clean-up prompts for this record if you wish to keep active cloud hosting for longer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <label className="text-xs font-semibold text-muted-foreground">Keep files active for:</label>
            <Select value={snoozeDays} onValueChange={setSnoozeDays}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 More Days</SelectItem>
                <SelectItem value="30">30 More Days (Recommended)</SelectItem>
                <SelectItem value="60">60 More Days</SelectItem>
                <SelectItem value="90">90 More Days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSnoozeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (proofToSnooze) {
                  snoozeMutation.mutate({ id: proofToSnooze.id, days: parseInt(snoozeDays, 10) });
                }
              }}
              disabled={snoozeMutation.isPending}
            >
              {snoozeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Save Snooze Duration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Modal (if triggered directly by Admin) */}
      <ProofUploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        booking={selectedBookingForUpload}
        role="admin"
        onSuccess={() => {
          refetchProofs();
          refetchCleanup();
        }}
      />
    </div>
  );
}
