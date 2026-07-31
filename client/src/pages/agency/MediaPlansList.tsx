import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ClipboardList, Trash2, ExternalLink, Calendar, Building2, Monitor } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_STYLE: Record<string, string> = {
  draft:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  sent:     "bg-blue-100 text-blue-700 border-blue-200",
  executed: "bg-green-100 text-green-700 border-green-200",
};

function fmt(n: number) { return `₹${n.toLocaleString("en-IN")}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MediaPlansList() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/agency/media-plans"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/media-plans");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/agency/media-plans/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/agency/media-plans"] });
      toast({ title: "Plan deleted" });
    },
    onError: () => toast({ title: "Could not delete plan", variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">{plans.length} plan{plans.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setLocation("/agency/media-plans/new")} className="gap-2">
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {plans.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p className="font-semibold text-lg">No media plans yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-6">
              Build multi-screen plans for your clients and track every detail.
            </p>
            <Button onClick={() => setLocation("/agency/media-plans/new")} className="gap-2">
              <Plus className="w-4 h-4" /> Create your first plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map((plan: any) => (
            <Card
              key={plan.id}
              className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setLocation(`/agency/media-plans/${plan.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-base truncate">{plan.name}</h2>
                      <Badge variant="outline" className={`text-xs ${STATUS_STYLE[plan.status] || ""}`}>
                        {plan.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {plan.clientBrand}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {fmtDate(plan.startDate)} – {fmtDate(plan.endDate)}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <Monitor className="w-3 h-3" /> {plan.totalScreens || 0} screen{(plan.totalScreens || 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {plan.notes && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">{plan.notes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-bold text-lg text-violet-700">{fmt(plan.calculatedTotal || plan.budget || 0)}</span>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost" size="icon"
                        className="h-8 w-8"
                        onClick={() => setLocation(`/agency/media-plans/${plan.id}`)}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                      {plan.status !== "executed" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{plan.name}" and all its screen line-items will be permanently removed.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-500 hover:bg-red-600"
                                onClick={() => deleteMutation.mutate(plan.id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
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
