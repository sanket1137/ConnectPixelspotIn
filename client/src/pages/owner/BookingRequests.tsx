import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Check, X, Monitor, AlertCircle, Eye, Upload, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BookingRequest {
  id: string;
  screenId: string;
  campaignId: string;
  price: number;
  status: string;
  startDate: string;
  endDate: string;
  screen: {
    name: string;
    location: string;
    city: string;
  };
  campaign: {
    name: string;
    objective: string;
    creativeUrl: string | null;
    creativeFileUrl: string | null;
    creativeStatus: string | null;
    creativeRejectionReason: string | null;
  };
}

export default function BookingRequests() {
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [alternateDates, setAlternateDates] = useState({ startDate: "", endDate: "" });
  const [creativeRejectDialogOpen, setCreativeRejectDialogOpen] = useState(false);
  const [creativeRejectReason, setCreativeRejectReason] = useState("");
  const [creativeRejectBooking, setCreativeRejectBooking] = useState<BookingRequest | null>(null);

  // Proof-of-play state
  const [proofNotes, setProofNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, File[]>>({});
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { data: bookings = [], isLoading } = useQuery<BookingRequest[]>({
    queryKey: ["/api/owner/booking-requests"],
  });

  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/owner/bookings/${bookingId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/booking-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      toast({
        title: "Booking Approved",
        description: "The booking request has been approved.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ bookingId, reason, alternativeDates }: { 
      bookingId: string; 
      reason: string; 
      alternativeDates?: { startDate: string; endDate: string } 
    }) => {
      return apiRequest("PATCH", `/api/owner/bookings/${bookingId}/reject`, {
        reason,
        alternativeDates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/booking-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      setRejectDialogOpen(false);
      setRejectReason("");
      setAlternateDates({ startDate: "", endDate: "" });
      toast({
        title: "Booking Rejected",
        description: "The booking request has been rejected.",
      });
    },
  });

  const handleApprove = (booking: BookingRequest) => {
    approveMutation.mutate(booking.id);
  };

  const approveCreativeMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("PATCH", `/api/owner/campaigns/${campaignId}/creative/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/booking-requests"] });
      toast({ title: "Creative Approved", description: "The campaign creative has been approved." });
    },
  });

  const rejectCreativeMutation = useMutation({
    mutationFn: async ({ campaignId, reason }: { campaignId: string; reason: string }) => {
      return apiRequest("PATCH", `/api/owner/campaigns/${campaignId}/creative/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/booking-requests"] });
      setCreativeRejectDialogOpen(false);
      setCreativeRejectReason("");
      toast({ title: "Creative Rejected", description: "The advertiser has been notified to re-upload." });
    },
  });

  // Fetch owner's existing proofs
  const { data: ownerProofs = [] } = useQuery<any[]>({
    queryKey: ["/api/owner/proof-of-play"],
  });

  // Upload proof mutation
  const uploadProofMutation = useMutation({
    mutationFn: async ({ bookingId, files, notes }: { bookingId: string; files: File[]; notes: string }) => {
      const formData = new FormData();
      files.forEach(f => formData.append("files", f));
      if (notes) formData.append("notes", notes);
      const res = await fetch(`/api/owner/bookings/${bookingId}/proof`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/owner/proof-of-play"] });
      setProofFiles(prev => ({ ...prev, [variables.bookingId]: [] }));
      setProofNotes(prev => ({ ...prev, [variables.bookingId]: "" }));
      setUploadingProof(null);
      toast({ title: "Proof Uploaded", description: "Your proof of play has been submitted for review." });
    },
    onError: (error: Error) => {
      setUploadingProof(null);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleRejectClick = (booking: BookingRequest) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedBooking) return;
    
    const hasAlternateDates = alternateDates.startDate && alternateDates.endDate;
    
    rejectMutation.mutate({
      bookingId: selectedBooking.id,
      reason: rejectReason || "No reason provided",
      alternativeDates: hasAlternateDates ? alternateDates : undefined,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateDuration = (start: string, end: string) => {
    const days = Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  const pendingBookings = bookings.filter(b => b.status === "pending_owner");
  const approvedBookings = bookings.filter(b => b.status === "owner_approved" || b.status === "approved");
  const activeBookings = bookings.filter(b => b.status === "active");
  const completedBookings = bookings.filter(b => b.status === "completed");
  const rejectedBookings = bookings.filter(b => b.status === "rejected");

  const renderProofSection = (booking: BookingRequest) => {
    const existingProofs = ownerProofs.filter((p: any) => p.bookingId === booking.id);
    const files = proofFiles[booking.id] || [];
    const notes = proofNotes[booking.id] || "";
    const isUploading = uploadingProof === booking.id;

    return (
      <Card className="border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Proof of Play</span>
          </div>

          {/* Existing proofs */}
          {existingProofs.length > 0 && (
            <div className="space-y-2">
              {existingProofs.map((proof: any) => (
                <div key={proof.id} className="p-2 border rounded-md bg-muted/30 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Proof #{proof.id.slice(0, 8)}...</span>
                    <Badge variant={
                      proof.status === "confirmed" ? "default" :
                      proof.status === "admin_verified" ? "secondary" :
                      proof.status === "disputed" ? "destructive" : "outline"
                    } className="text-xs">
                      {proof.status === "admin_verified" ? "Under Review" : proof.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{proof.fileUrls?.length || 0} files • {new Date(proof.createdAt).toLocaleDateString()}</p>
                  {proof.fileUrls?.map((f: any, i: number) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline mr-2">
                      {f.caption || `File ${i + 1}`}
                    </a>
                  ))}
                  {proof.adminNotes && <p className="text-muted-foreground">Admin: {proof.adminNotes}</p>}
                  {proof.advertiserNotes && <p className="text-destructive">Advertiser: {proof.advertiserNotes}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Upload form */}
          <div className="space-y-2">
            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              className="hidden"
              ref={el => { fileInputRefs.current[booking.id] = el; }}
              onChange={e => {
                const selected = e.target.files ? Array.from(e.target.files) : [];
                setProofFiles(prev => ({ ...prev, [booking.id]: selected }));
              }}
            />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRefs.current[booking.id]?.click()}
            >
              <Upload className="h-3 w-3 mr-1" />
              {files.length > 0 ? `${files.length} file(s) selected` : "Select Photos/Videos/PDFs"}
            </Button>
            {files.length > 0 && (
              <>
                <Textarea
                  placeholder="Add notes about this proof (optional)..."
                  className="text-xs h-16"
                  value={notes}
                  onChange={e => setProofNotes(prev => ({ ...prev, [booking.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isUploading}
                  onClick={() => {
                    setUploadingProof(booking.id);
                    uploadProofMutation.mutate({ bookingId: booking.id, files, notes });
                  }}
                >
                  {isUploading ? "Uploading..." : "Upload Proof of Play"}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderBookingCard = (booking: BookingRequest, showActions: boolean = false) => (
    <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">{booking.screen.name}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.screen.location}, {booking.screen.city}
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Campaign:</span>
                <span className="font-medium">{booking.campaign.name}</span>
              </div>
              {booking.campaign?.creativeUrl && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => window.open(booking.campaign.creativeUrl!, '_blank')}
                    data-testid={`button-view-creative-${booking.id}`}
                  >
                    <Eye className="mr-1.5 h-3 w-3" />
                    View Campaign Creative
                  </Button>
                </div>
              )}
              {/* Creative file review for approved bookings */}
              {booking.campaign?.creativeFileUrl && (booking.status === "approved" || booking.status === "owner_approved" || booking.status === "active") && (
                <div className="mt-2 p-3 border rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Uploaded Creative</span>
                    {booking.campaign.creativeStatus && (
                      <Badge variant={booking.campaign.creativeStatus === "approved" ? "default" : booking.campaign.creativeStatus === "rejected" ? "destructive" : "secondary"}>
                        {booking.campaign.creativeStatus}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => window.open(booking.campaign.creativeFileUrl!, '_blank')}
                  >
                    Preview Creative File
                  </Button>
                  {(!booking.campaign.creativeStatus || booking.campaign.creativeStatus === "pending") && (
                    <div className="flex gap-2 mt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => approveCreativeMutation.mutate(booking.campaignId)}
                        disabled={approveCreativeMutation.isPending}
                      >
                        <Check className="mr-1 h-3 w-3" /> Approve Creative
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => {
                          setCreativeRejectBooking(booking);
                          setCreativeRejectDialogOpen(true);
                        }}
                        disabled={rejectCreativeMutation.isPending}
                      >
                        <X className="mr-1 h-3 w-3" /> Reject Creative
                      </Button>
                    </div>
                  )}
                  {booking.campaign.creativeStatus === "rejected" && booking.campaign.creativeRejectionReason && (
                    <p className="text-xs text-destructive">Reason: {booking.campaign.creativeRejectionReason}</p>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
                <Badge variant="secondary">{calculateDuration(booking.startDate, booking.endDate)} days</Badge>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Revenue:</span>
                <span className="font-bold text-primary text-base">₹{booking.price.toLocaleString()}</span>
              </div>
              {booking.status === "owner_approved" && (
                <Badge variant="outline" className="mt-2">Awaiting Admin Approval</Badge>
              )}
              {booking.status === "approved" && (
                <Badge className="mt-2">Fully Approved</Badge>
              )}
            </div>
          </div>
        </div>
        {showActions && new Date(booking.endDate) < new Date() ? (
          <Badge variant="destructive" className="text-xs">
            Expired — End date has passed
          </Badge>
        ) : showActions ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRejectClick(booking)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-reject-${booking.id}`}
            >
              <X className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => handleApprove(booking)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
              data-testid={`button-approve-${booking.id}`}
            >
              <Check className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif">Booking Management</h1>
        <p className="text-muted-foreground mt-1">Review and manage all booking requests for your screens</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : (
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Pending ({pendingBookings.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedBookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending booking requests
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingBookings.map((booking) => renderBookingCard(booking, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No approved bookings
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedBookings.map((booking) => renderBookingCard(booking, false))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            {activeBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No active bookings currently running
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeBookings.map((booking) => (
                  <div key={booking.id} className="space-y-2">
                    {renderBookingCard(booking, false)}
                    {renderProofSection(booking)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No completed bookings yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {completedBookings.map((booking) => (
                  <div key={booking.id} className="space-y-2">
                    {renderBookingCard(booking, false)}
                    {renderProofSection(booking)}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No rejected bookings
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedBookings.map((booking) => renderBookingCard(booking, false))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Booking Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection and optionally suggest alternate dates.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>{selectedBooking.screen.name}</strong>
                  <br />
                  {formatDate(selectedBooking.startDate)} - {formatDate(selectedBooking.endDate)}
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="reject-reason">Reason for Rejection</Label>
                <Textarea
                  id="reject-reason"
                  placeholder="e.g., Already booked for these dates, maintenance scheduled..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-2"
                  data-testid="textarea-reject-reason"
                />
              </div>

              <div>
                <Label className="mb-2 block">Suggest Alternate Dates (Optional)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="alt-start" className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      id="alt-start"
                      type="date"
                      value={alternateDates.startDate}
                      onChange={(e) => setAlternateDates({ ...alternateDates, startDate: e.target.value })}
                      className="mt-1"
                      data-testid="input-alt-start-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="alt-end" className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      id="alt-end"
                      type="date"
                      value={alternateDates.endDate}
                      onChange={(e) => setAlternateDates({ ...alternateDates, endDate: e.target.value })}
                      className="mt-1"
                      data-testid="input-alt-end-date"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creative Reject Dialog */}
      <Dialog open={creativeRejectDialogOpen} onOpenChange={setCreativeRejectDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reject Creative</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting the creative. The advertiser will be asked to upload a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="creative-reject-reason">Reason for Rejection</Label>
            <Textarea
              id="creative-reject-reason"
              placeholder="e.g., Image resolution too low, content not suitable..."
              value={creativeRejectReason}
              onChange={(e) => setCreativeRejectReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreativeRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (creativeRejectBooking) {
                  rejectCreativeMutation.mutate({
                    campaignId: creativeRejectBooking.campaignId,
                    reason: creativeRejectReason || "Not suitable",
                  });
                }
              }}
              disabled={rejectCreativeMutation.isPending}
            >
              {rejectCreativeMutation.isPending ? "Rejecting..." : "Reject Creative"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
