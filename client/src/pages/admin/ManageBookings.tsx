import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Check, X, Monitor, AlertCircle, CheckCircle, Edit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface BookingWithDetails {
  id: string;
  screenId: string;
  campaignId: string;
  price: number;
  status: string;
  startDate: string;
  endDate: string;
  ownerApproved: boolean;
  approvedByAdmin: boolean;
  screen: {
    name: string;
    location: string;
    city: string;
  };
  campaign: {
    name: string;
    objective: string;
  };
}

export default function ManageBookings() {
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDatesDialogOpen, setEditDatesDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/admin/bookings"],
  });

  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      return apiRequest("PATCH", `/api/admin/bookings/${bookingId}/approve`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Booking Approved",
        description: "The booking has been approved and is now active.",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ bookingId, notes }: { bookingId: string; notes: string }) => {
      return apiRequest("PATCH", `/api/admin/bookings/${bookingId}/reject`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setRejectDialogOpen(false);
      setAdminNotes("");
      toast({
        title: "Booking Rejected",
        description: "The booking has been rejected.",
        variant: "destructive",
      });
    },
  });

  const updateDatesMutation = useMutation({
    mutationFn: async ({ bookingId, startDate, endDate, notes }: { 
      bookingId: string; 
      startDate: string; 
      endDate: string;
      notes?: string;
    }) => {
      return apiRequest("PATCH", `/api/admin/bookings/${bookingId}/update-dates`, {
        startDate,
        endDate,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditDatesDialogOpen(false);
      setEditStartDate("");
      setEditEndDate("");
      setEditNotes("");
      toast({
        title: "Dates Updated",
        description: "The booking dates have been updated successfully.",
      });
    },
  });

  const handleApprove = (booking: BookingWithDetails) => {
    approveMutation.mutate(booking.id);
  };

  const handleRejectClick = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedBooking) return;
    rejectMutation.mutate({
      bookingId: selectedBooking.id,
      notes: adminNotes || "No notes provided",
    });
  };

  const handleEditDatesClick = (booking: BookingWithDetails) => {
    setSelectedBooking(booking);
    setEditStartDate(booking.startDate.split('T')[0]);
    setEditEndDate(booking.endDate.split('T')[0]);
    setEditNotes("");
    setEditDatesDialogOpen(true);
  };

  const handleUpdateDatesConfirm = () => {
    if (!selectedBooking || !editStartDate || !editEndDate) return;
    updateDatesMutation.mutate({
      bookingId: selectedBooking.id,
      startDate: new Date(editStartDate).toISOString(),
      endDate: new Date(editEndDate).toISOString(),
      notes: editNotes || undefined,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (booking: BookingWithDetails) => {
    switch (booking.status) {
      case "pending_owner":
        return <Badge variant="secondary">Pending Owner</Badge>;
      case "owner_approved":
        return <Badge className="bg-yellow-500">Awaiting Admin</Badge>;
      case "approved":
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case "active":
        return <Badge className="bg-blue-500">Active</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "owner_rejected":
        return <Badge variant="destructive">Owner Rejected</Badge>;
      default:
        return <Badge>{booking.status}</Badge>;
    }
  };

  // Admin can approve bookings regardless of owner approval status
  // Include both "pending_owner" and "owner_approved" in awaiting approval tab
  const pendingApproval = bookings.filter(b => b.status === "owner_approved" || b.status === "pending_owner");
  const approvedBookings = bookings.filter(b => b.status === "approved" || b.status === "active");
  const rejectedBookings = bookings.filter(b => b.status === "rejected" || b.status === "owner_rejected");

  const renderBookingCard = (booking: BookingWithDetails, showApprovalActions = false) => (
    <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-4">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">
              {booking.screen?.name || "Screen Deleted"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {booking.screen ? `${booking.screen.location}, ${booking.screen.city}` : "Screen no longer available"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Campaign: {booking.campaign?.name || "Unknown Campaign"}
            </p>
          </div>
        </div>
        {getStatusBadge(booking)}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{formatDate(booking.startDate)} - {formatDate(booking.endDate)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-bold text-primary">₹{booking.price.toLocaleString()}</span>
          </div>

          {/* Show warning when admin is bypassing owner approval */}
          {booking.status === "pending_owner" && showApprovalActions && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2 text-xs text-yellow-700 dark:text-yellow-500">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              <strong>Bypassing Owner Approval:</strong> Approving this will automatically approve on behalf of the screen owner.
            </div>
          )}

          <div className="flex gap-2 pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditDatesClick(booking)}
              disabled={approveMutation.isPending || rejectMutation.isPending || updateDatesMutation.isPending}
              data-testid={`button-edit-dates-${booking.id}`}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Dates
            </Button>
            {showApprovalActions && (
              <>
                <Button
                  variant="outline"
                  size="sm"
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
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif">Manage Bookings</h1>
        <p className="text-muted-foreground mt-1">Review and approve booking requests</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No bookings yet
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" data-testid="tab-pending">
              Awaiting Approval ({pendingApproval.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved">
              Approved ({approvedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected">
              Rejected ({rejectedBookings.length})
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({bookings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {pendingApproval.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No bookings awaiting approval
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingApproval.map(booking => renderBookingCard(booking, true))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="approved">
            {approvedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No approved bookings
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {approvedBookings.map(booking => renderBookingCard(booking))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="rejected">
            {rejectedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No rejected bookings
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {rejectedBookings.map(booking => renderBookingCard(booking))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4">
              {bookings.map(booking => renderBookingCard(booking, booking.status === "owner_approved"))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Booking</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this booking request.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="admin-notes">Admin Notes</Label>
            <Textarea
              id="admin-notes"
              placeholder="Explain why this booking is being rejected..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="mt-2"
              data-testid="textarea-admin-notes"
            />
          </div>

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

      {/* Edit Dates Dialog */}
      <Dialog open={editDatesDialogOpen} onOpenChange={setEditDatesDialogOpen}>
        <DialogContent data-testid="dialog-edit-dates">
          <DialogHeader>
            <DialogTitle>Edit Booking Dates</DialogTitle>
            <DialogDescription>
              {selectedBooking && (
                <>
                  Modify the booking dates for <strong>{selectedBooking.screen.name}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="mt-2"
                data-testid="input-edit-start-date"
              />
            </div>

            <div>
              <Label htmlFor="edit-end-date">End Date</Label>
              <Input
                id="edit-end-date"
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="mt-2"
                data-testid="input-edit-end-date"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add a note explaining the date change..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="mt-2"
                data-testid="textarea-edit-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDatesDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDatesConfirm}
              disabled={updateDatesMutation.isPending || !editStartDate || !editEndDate}
              data-testid="button-confirm-edit-dates"
            >
              {updateDatesMutation.isPending ? "Updating..." : "Update Dates"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
