import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign } from "lucide-react";

interface Booking {
  id: string;
  campaignId: string;
  screenId: string;
  status: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
}

export default function ManageBookings() {
  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/admin/bookings"],
  });

  const getStatusBadgeVariant = (status: string) => {
    if (status === "approved") return "default";
    if (status === "pending") return "secondary";
    if (status === "rejected") return "destructive";
    return "outline";
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif">Campaigns & Bookings</h1>
        <p className="text-muted-foreground mt-1">View and manage all campaign bookings</p>
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
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <Card key={booking.id} data-testid={`card-booking-${booking.id}`}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-chart-2/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-chart-2" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Booking #{booking.id.slice(0, 8)}</CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      ₹{booking.totalPrice}
                    </div>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(booking.status)}>
                  {booking.status}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
