import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Calendar, DollarSign, Check, X, Monitor, AlertCircle, CheckCircle, Edit, Eye, User, Building, Phone, Mail, ChevronLeft, ChevronRight } from "lucide-react";
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
    creativeUrl: string | null;
  };
  advertiser: {
    id: string;
    name: string;
    email: string;
    mobileNumber: string | null;
    companyName: string | null;
  } | null;
  owner: {
    id: string;
    name: string;
    email: string;
    mobileNumber: string | null;
    companyName: string | null;
  } | null;
}

export default function ManageBookings() {
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDatesDialogOpen, setEditDatesDialogOpen] = useState(false);
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

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
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
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
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-700 dark:text-orange-400">Pending Owner</Badge>;
      case "owner_approved":
        return <Badge className="bg-green-500/20 text-green-700 dark:text-green-400">✓ Owner Approved</Badge>;
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

  // Separate bookings by approval stage
  const pendingOwnerApproval = bookings.filter(b => b.status === "pending_owner");
  const pendingAdminApproval = bookings.filter(b => b.status === "owner_approved");
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

          {/* Owner approval status indicator */}
          <div className="flex items-center gap-2 text-xs pt-2">
            <span className="text-muted-foreground">Owner Status:</span>
            {booking.ownerApproved ? (
              <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                <Check className="h-3 w-3" />
                Approved
              </span>
            ) : (
              <span className="text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Pending Approval
              </span>
            )}
          </div>

          {/* Show warning when admin is bypassing owner approval */}
          {booking.status === "pending_owner" && showApprovalActions && new Date(booking.endDate) >= new Date() && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2 text-xs text-yellow-700 dark:text-yellow-500">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              <strong>Bypassing Owner Approval:</strong> Approving this will automatically approve on behalf of the screen owner.
            </div>
          )}

          {/* Show expired badge when booking's end date has passed */}
          {showApprovalActions && new Date(booking.endDate) < new Date() && (
            <Badge variant="destructive" className="text-xs">
              Expired — End date has passed
            </Badge>
          )}

          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedBooking(booking);
                setViewDetailsDialogOpen(true);
              }}
              data-testid={`button-view-details-${booking.id}`}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </Button>
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
            {showApprovalActions && new Date(booking.endDate) >= new Date() && (
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

  const renderPaginatedList = (list: BookingWithDetails[], showApprovalActions = false) => {
    const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE);
    const paginatedList = list.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    if (list.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No bookings found
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {paginatedList.map(booking => renderBookingCard(booking, showApprovalActions))}
        
        {list.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, list.length)} of {list.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

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
        <Tabs defaultValue="pending-owner" className="space-y-6" onValueChange={() => setPage(1)}>
          <TabsList>
            <TabsTrigger value="pending-owner" data-testid="tab-pending-owner">
              Awaiting Owner Approval ({pendingOwnerApproval.length})
            </TabsTrigger>
            <TabsTrigger value="pending-admin" data-testid="tab-pending-admin">
              Awaiting Admin Approval ({pendingAdminApproval.length})
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

          <TabsContent value="pending-owner">
            {renderPaginatedList(pendingOwnerApproval, true)}
          </TabsContent>

          <TabsContent value="pending-admin">
            {renderPaginatedList(pendingAdminApproval, true)}
          </TabsContent>

          <TabsContent value="approved">
            {renderPaginatedList(approvedBookings, false)}
          </TabsContent>

          <TabsContent value="rejected">
            {renderPaginatedList(rejectedBookings, false)}
          </TabsContent>

          <TabsContent value="all">
            {renderPaginatedList(bookings, false)}
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

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={setViewDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-view-details">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Complete information about this booking request
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-6 py-4">
              {/* Advertiser Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Advertiser Information
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {selectedBooking.advertiser ? (
                    <>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{selectedBooking.advertiser.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">
                            <a href={`mailto:${selectedBooking.advertiser.email}`} className="text-primary hover:underline">
                              {selectedBooking.advertiser.email}
                            </a>
                          </p>
                        </div>
                      </div>
                      {selectedBooking.advertiser.mobileNumber && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Mobile</p>
                            <p className="font-medium">
                              <a href={`tel:${selectedBooking.advertiser.mobileNumber}`} className="text-primary hover:underline">
                                {selectedBooking.advertiser.mobileNumber}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedBooking.advertiser.companyName && (
                        <div className="flex items-start gap-2">
                          <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Company</p>
                            <p className="font-medium">{selectedBooking.advertiser.companyName}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No advertiser information available</p>
                  )}
                </div>
              </div>

              {/* Screen Owner Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-primary" />
                  Screen Owner Information
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  {selectedBooking.owner ? (
                    <>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Name</p>
                          <p className="font-medium">{selectedBooking.owner.name}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">
                            <a href={`mailto:${selectedBooking.owner.email}`} className="text-primary hover:underline">
                              {selectedBooking.owner.email}
                            </a>
                          </p>
                        </div>
                      </div>
                      {selectedBooking.owner.mobileNumber && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Mobile</p>
                            <p className="font-medium">
                              <a href={`tel:${selectedBooking.owner.mobileNumber}`} className="text-primary hover:underline">
                                {selectedBooking.owner.mobileNumber}
                              </a>
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedBooking.owner.companyName && (
                        <div className="flex items-start gap-2">
                          <Building className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm text-muted-foreground">Company</p>
                            <p className="font-medium">{selectedBooking.owner.companyName}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No owner information available</p>
                  )}
                </div>
              </div>

              {/* Booking Summary */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Booking Summary</h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Campaign</span>
                    <span className="font-medium">{selectedBooking.campaign.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Screen</span>
                    <span className="font-medium">{selectedBooking.screen.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Location</span>
                    <span className="font-medium">{selectedBooking.screen.location}, {selectedBooking.screen.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <span className="font-medium">{formatDate(selectedBooking.startDate)} - {formatDate(selectedBooking.endDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="font-bold text-primary">₹{selectedBooking.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span>{getStatusBadge(selectedBooking)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setViewDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
