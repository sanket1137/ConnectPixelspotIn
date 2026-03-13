import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, DollarSign, Plus, Eye, Edit2, RefreshCw, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import type { Campaign } from "@shared/schema";

interface CampaignWithStats extends Campaign {
  bookingStats?: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
  };
}
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function CampaignsList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: campaigns = [], isLoading } = useQuery<CampaignWithStats[]>({
    queryKey: ["/api/advertiser/campaigns"],
  });

  const resubmitMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      return apiRequest("PATCH", `/api/advertiser/campaigns/${campaignId}/resubmit`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/campaigns"] });
      toast({
        title: "Campaign Resubmitted",
        description: "Your campaign has been resubmitted for review.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resubmit campaign. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "live":
        return "default";
      case "pending":
        return "secondary";
      case "approved":
        return "default";
      case "completed":
        return "outline";
      case "rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getCampaignStatusDisplay = (campaign: CampaignWithStats): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    // If no booking stats, show basic status
    if (!campaign.bookingStats || campaign.bookingStats.total === 0) {
      return {
        text: campaign.status,
        variant: getStatusVariant(campaign.status) as "default" | "secondary" | "destructive" | "outline",
      };
    }

    const { total, approved, rejected, pending } = campaign.bookingStats;

    // Determine status text based on booking states
    if (approved === total) {
      return { text: `Approved (${approved}/${total})`, variant: "default" };
    } else if (rejected === total) {
      return { text: `Rejected (${rejected}/${total})`, variant: "destructive" };
    } else if (approved > 0) {
      return { text: `Partially Approved (${approved}/${total})`, variant: "secondary" };
    } else if (pending > 0) {
      return { text: `Pending (${pending}/${total})`, variant: "secondary" };
    }

    // Fallback
    return { text: campaign.status, variant: getStatusVariant(campaign.status) as "default" | "secondary" | "destructive" | "outline" };
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-foreground font-serif mb-2">My Campaigns</h1>
          <p className="text-muted-foreground">Manage and track your advertising campaigns</p>
        </div>
        <Button onClick={() => setLocation("/advertiser/campaigns/new")} size="lg" data-testid="button-create-campaign">
          <Plus className="mr-2 h-5 w-5" />
          Create Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Create your first campaign to start advertising on digital screens across India.
              </p>
            </div>
            <Button onClick={() => setLocation("/advertiser/campaigns/new")} size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Create Your First Campaign
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover-elevate" data-testid={`card-campaign-${campaign.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-xl font-bold text-foreground">{campaign.name}</h3>
                          {(() => {
                            const statusDisplay = getCampaignStatusDisplay(campaign);
                            return <Badge variant={statusDisplay.variant} data-testid={`badge-status-${campaign.id}`}>{statusDisplay.text}</Badge>;
                          })()}
                        </div>
                        <p className="text-sm text-muted-foreground capitalize">{campaign.objective.replace(/_/g, " ")}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-6 pt-3 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Created</p>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(campaign.createdAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Duration</p>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(campaign.startDate), "MMM d")} - {format(new Date(campaign.endDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="text-sm font-medium text-foreground">
                            ₹{(campaign.budget / 1000).toFixed(1)}K
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="text-sm font-medium text-foreground">
                          {(() => {
                            const statusDisplay = getCampaignStatusDisplay(campaign);
                            return statusDisplay.text;
                          })()}
                        </p>
                      </div>
                    </div>

                    {campaign.status === "rejected" && campaign.rejectionReason && (
                      <Alert variant="destructive" className="mt-3">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong className="block mb-1">Rejection Reason:</strong>
                          {campaign.rejectionReason}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation(`/advertiser/campaigns/${campaign.id}`)}
                      data-testid={`button-view-${campaign.id}`}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                    {campaign.status === "rejected" && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => setLocation(`/advertiser/campaigns/edit/${campaign.id}`)}
                          data-testid={`button-edit-${campaign.id}`}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit Campaign
                        </Button>
                        <Button 
                          onClick={() => resubmitMutation.mutate(campaign.id)}
                          disabled={resubmitMutation.isPending}
                          data-testid={`button-resubmit-${campaign.id}`}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          {resubmitMutation.isPending ? "Resubmitting..." : "Resubmit"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
