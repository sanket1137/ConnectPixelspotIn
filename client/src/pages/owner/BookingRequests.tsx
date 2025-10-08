import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Check, X, Monitor, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
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
  };
}

export default function BookingRequests() {
  const { toast } = useToast();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [alternateDates, setAlternateDates] = useState({ startDate: "", endDate: "" });

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
  const rejectedBookings = bookings.filter(b => b.status === "rejected");

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
        {showActions && (
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
        )}
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
    </div>
  );
}
