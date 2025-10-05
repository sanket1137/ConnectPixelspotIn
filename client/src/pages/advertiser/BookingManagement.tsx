import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Calendar, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  ownerResponse: string | null;
  ownerRespondedAt: string | null;
  alternativeStartDate: string | null;
  alternativeEndDate: string | null;
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

export default function BookingManagement() {
  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/advertiser/bookings"],
  });

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
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending Owner</Badge>;
      case "owner_approved":
        return <Badge className="bg-green-500"><CheckCircle className="mr-1 h-3 w-3" />Owner Approved</Badge>;
      case "owner_rejected":
        return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Owner Rejected</Badge>;
      case "approved":
        return <Badge className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case "active":
        return <Badge className="bg-blue-500">Active</Badge>;
      default:
        return <Badge>{booking.status}</Badge>;
    }
  };

  const pendingBookings = bookings.filter(b => b.status === "pending_owner");
  const approvedBookings = bookings.filter(b => b.status === "owner_approved" || b.status === "approved");
  const rejectedBookings = bookings.filter(b => b.status === "owner_rejected");

  const renderBookingCard = (booking: BookingWithDetails) => (
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
            <p className="text-xs text-muted-foreground mt-1">
              Campaign: {booking.campaign.name}
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

          {booking.status === "owner_rejected" && booking.ownerResponse && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong className="block mb-1">Rejection Reason:</strong>
                {booking.ownerResponse}
                {booking.alternativeStartDate && booking.alternativeEndDate && (
                  <div className="mt-3">
                    <strong className="block mb-1">Suggested Dates:</strong>
                    <span className="text-sm">
                      {formatDate(booking.alternativeStartDate)} - {formatDate(booking.alternativeEndDate)}
                    </span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {booking.status === "owner_rejected" && booking.alternativeStartDate && (
            <Button size="sm" variant="outline" className="w-full mt-2" data-testid={`button-accept-alternate-${booking.id}`}>
              Accept Alternate Dates
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif">Booking Management</h1>
        <p className="text-muted-foreground mt-1">Track and manage your booking requests</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading bookings...</div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No bookings yet. Create a campaign to get started.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({bookings.length})
            </TabsTrigger>
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

          <TabsContent value="all">
            <div className="grid gap-4">
              {bookings.map(renderBookingCard)}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            {pendingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No pending bookings
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingBookings.map(renderBookingCard)}
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
                {approvedBookings.map(renderBookingCard)}
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
                {rejectedBookings.map(renderBookingCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
