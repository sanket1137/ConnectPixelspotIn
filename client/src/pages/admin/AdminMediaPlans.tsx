import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, Building2, Monitor, IndianRupee, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

type MediaPlanRow = {
  id: string;
  name: string;
  clientBrand: string;
  startDate: string;
  endDate: string;
  budget: number;
  agencyMargin: number;
  notes: string | null;
  status: "draft" | "sent" | "executed";
  createdAt: string;
  updatedAt: string;
  agencyId: string;
  agencyName: string;
  agencyEmail: string;
  agencyCompany: string | null;
  screenCount: number;
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft:    { label: "Draft",    variant: "secondary" },
  sent:     { label: "Sent to Client", variant: "outline" },
  executed: { label: "Executed → Campaign Created", variant: "default" },
};

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminMediaPlans() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const { data: plans = [], isLoading } = useQuery<MediaPlanRow[]>({
    queryKey: ["/api/admin/media-plans"],
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    return plans.filter((p) => {
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.clientBrand.toLowerCase().includes(q) ||
        p.agencyName.toLowerCase().includes(q) ||
        p.agencyEmail.toLowerCase().includes(q) ||
        (p.agencyCompany ?? "").toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [plans, search, statusFilter]);

  // Summary stats
  const stats = useMemo(() => ({
    total:    plans.length,
    draft:    plans.filter((p) => p.status === "draft").length,
    sent:     plans.filter((p) => p.status === "sent").length,
    executed: plans.filter((p) => p.status === "executed").length,
  }), [plans]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" />
          Agency Media Plans
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          All media plans created by agencies — including drafts, sent proposals, and executed campaigns.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Plans",   value: stats.total,    color: "text-primary" },
          { label: "Draft",         value: stats.draft,    color: "text-muted-foreground" },
          { label: "Sent to Client",value: stats.sent,     color: "text-yellow-600 dark:text-yellow-400" },
          { label: "Executed",      value: stats.executed, color: "text-green-600 dark:text-green-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="admin-media-plans-search"
            placeholder="Search by plan name, brand, agency…"
            className="pl-9"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
          <SelectTrigger id="admin-media-plans-status-filter" className="w-full sm:w-52">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent to Client</SelectItem>
            <SelectItem value="executed">Executed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              Loading media plans…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm">No media plans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Client Brand</TableHead>
                    <TableHead className="hidden md:table-cell">Agency</TableHead>
                    <TableHead className="hidden lg:table-cell">Screens</TableHead>
                    <TableHead className="hidden lg:table-cell">Budget</TableHead>
                    <TableHead className="hidden md:table-cell">Dates</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((plan) => (
                    <TableRow key={plan.id}>
                      {/* Plan Name */}
                      <TableCell>
                        <p className="font-medium text-sm leading-snug">{plan.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Created {fmt(plan.createdAt)}
                        </p>
                      </TableCell>

                      {/* Client Brand */}
                      <TableCell>
                        <span className="text-sm font-medium">{plan.clientBrand}</span>
                      </TableCell>

                      {/* Agency */}
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-sm font-medium leading-snug">{plan.agencyName}</p>
                            {plan.agencyCompany && (
                              <p className="text-xs text-muted-foreground">{plan.agencyCompany}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Screen Count */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span>{plan.screenCount}</span>
                        </div>
                      </TableCell>

                      {/* Budget */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                          {fmtCurrency(plan.budget).replace("₹", "")}
                        </div>
                        {plan.agencyMargin > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            +{plan.agencyMargin}% margin
                          </p>
                        )}
                      </TableCell>

                      {/* Date Range */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {fmt(plan.startDate)} → {fmt(plan.endDate)}
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant={STATUS_CONFIG[plan.status]?.variant ?? "secondary"}
                          className={
                            plan.status === "executed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-0"
                              : plan.status === "sent"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-0"
                              : ""
                          }
                        >
                          {STATUS_CONFIG[plan.status]?.label ?? plan.status}
                        </Badge>
                        {plan.status === "executed" && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Campaign + Bookings created
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {filtered.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-6 pt-2">
          <span className="text-sm text-muted-foreground">
            Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
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
              onClick={() => setPage((p) => Math.min(Math.ceil(filtered.length / ITEMS_PER_PAGE), p + 1))}
              disabled={page >= Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
