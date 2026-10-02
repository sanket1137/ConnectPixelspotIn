import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ClipboardList,
  Building2,
  Monitor,
  IndianRupee,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  UserCheck,
  UserPlus,
  Phone,
  Calendar,
  Filter,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  UserCheck2,
  TrendingUp,
  XCircle,
  PauseCircle,
  ArrowRightCircle,
  Loader2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { printMediaPlan } from "@/lib/mediaPlanPdf";

type MediaPlanRow = {
  id: string;
  name: string;
  clientBrand: string;
  startDate: string;
  endDate: string;
  budget: number;
  agencyMargin: number;
  notes: string | null;
  status: "draft" | "sent" | "in_process" | "converted" | "rejected" | "on_hold" | "executed";
  createdAt: string;
  updatedAt: string;
  createdByAdmin: boolean;
  agencyId: string;
  agencyName: string;
  agencyEmail: string;
  agencyCompany: string | null;
  clientUserId: string | null;
  clientName: string | null;
  clientMobile: string | null;
  isClientRegistered: boolean | null;
  screenCount: number;
};

type MetricsData = {
  totalPlans: number;
  adminPlansCount: number;
  agencyPlansCount: number;
  totalValue: number;
  sentCount: number;
  inProcessCount: number;
  convertedCount: number;
  rejectedCount: number;
  onHoldCount: number;
  executedCount: number;
  sentValue: number;
  inProcessValue: number;
  convertedValue: number;
  rejectedValue: number;
  onHoldValue: number;
  executedValue: number;
  conversionRate: number;
  registeredClientsCount: number;
  leadClientsCount: number;
};

// Status config — label, badge colours, and pill style for each proposal outcome
const STATUS_CONFIG: Record<
  string,
  { label: string; badgeClass: string; dotClass: string }
> = {
  draft:      { label: "Draft",       badgeClass: "bg-slate-100 text-slate-600 border-slate-200",       dotClass: "bg-slate-400" },
  sent:       { label: "Sent",        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",           dotClass: "bg-blue-500" },
  in_process: { label: "In Process",  badgeClass: "bg-amber-100 text-amber-700 border-amber-200",        dotClass: "bg-amber-500" },
  converted:  { label: "Converted",   badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",  dotClass: "bg-emerald-500" },
  rejected:   { label: "Rejected",    badgeClass: "bg-red-100 text-red-700 border-red-200",              dotClass: "bg-red-500" },
  on_hold:    { label: "On Hold",     badgeClass: "bg-purple-100 text-purple-700 border-purple-200",     dotClass: "bg-purple-400" },
  executed:   { label: "Executed",    badgeClass: "bg-green-100 text-green-800 border-green-200",        dotClass: "bg-green-600" },
};

const PROPOSAL_STATUSES = ["draft", "sent", "in_process", "converted", "rejected", "on_hold"] as const;


function fmt(date: string) {
  if (!date) return "N/A";
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

function calculateCampaignDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 1;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 1;
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

export default function AdminMediaPlans() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [tabFilter, setTabFilter] = useState<"all" | "admin" | "agency">("all");
  const [durationFilter, setDurationFilter] = useState<string>("30days");
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Fetch admin media plans & metrics
  const { data: plansData, isLoading, refetch } = useQuery<{
    plans: MediaPlanRow[];
    metrics: MetricsData;
  }>({
    queryKey: [`/api/admin/media-plans?duration=${durationFilter}`],
    staleTime: 15_000,
  });

  const plans = plansData?.plans || [];
  const metrics = plansData?.metrics || {
    totalPlans: 0,
    adminPlansCount: 0,
    agencyPlansCount: 0,
    totalValue: 0,
    sentCount: 0,
    inProcessCount: 0,
    convertedCount: 0,
    rejectedCount: 0,
    onHoldCount: 0,
    executedCount: 0,
    sentValue: 0,
    inProcessValue: 0,
    convertedValue: 0,
    rejectedValue: 0,
    onHoldValue: 0,
    executedValue: 0,
    conversionRate: 0,
    registeredClientsCount: 0,
    leadClientsCount: 0,
  };

  // Inline status update mutation
  const updateStatusMutation = async (planId: string, newStatus: string) => {
    setUpdatingStatusId(planId);
    try {
      await apiRequest("PATCH", `/api/admin/media-plans/${planId}/status`, { status: newStatus });
      qc.invalidateQueries({ queryKey: [`/api/admin/media-plans?duration=${durationFilter}`] });
      toast({ title: `Status updated to "${STATUS_CONFIG[newStatus]?.label ?? newStatus}"` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    } finally {
      setUpdatingStatusId(null);
    }
  };


  const filtered = useMemo(() => {
    return plans.filter((p) => {
      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchCreator =
        tabFilter === "all"
          ? true
          : tabFilter === "admin"
          ? p.createdByAdmin === true
          : p.createdByAdmin === false;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.clientBrand.toLowerCase().includes(q) ||
        (p.agencyName || "").toLowerCase().includes(q) ||
        (p.clientName || "").toLowerCase().includes(q) ||
        (p.clientMobile || "").toLowerCase().includes(q);
      return matchStatus && matchCreator && matchSearch;
    });
  }, [plans, search, statusFilter, tabFilter]);

  // Handle proposal PDF download directly from Admin Dashboard
  const handleDownloadPdf = async (planId: string) => {
    try {
      setDownloadingId(planId);
      const res = await apiRequest("GET", `/api/admin/media-plans/${planId}/pdf-data`);
      const pdfData = await res.json();
      printMediaPlan(pdfData);
    } catch {
      toast({ title: "Failed to load PDF proposal data", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Media Plans & Agency Tracker
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create media plans for direct clients/leads and monitor plans prepared by registered agencies.
          </p>
        </div>

        <Button onClick={() => setLocation("/admin/media-plans/new")} className="gap-2 bg-primary hover:bg-primary/90 shadow-sm">
          <Plus className="h-4 w-4" />
          Create Media Plan
        </Button>
      </div>

      {/* ── PROPOSAL OUTCOME DASHBOARD ── */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 border-b border-slate-700 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-400">PROPOSAL OUTCOME TRACKER</span>
              <h3 className="text-lg font-bold mt-0.5">Status Breakdown & Value Analytics</h3>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <Select value={durationFilter} onValueChange={(val) => { setDurationFilter(val); setPage(1); }}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white text-xs">
                  <SelectValue placeholder="Duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Top Summary Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 pb-5 border-b border-slate-700">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Proposals</span>
              <span className="text-3xl font-extrabold text-white mt-1 block">{metrics.totalPlans}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {metrics.adminPlansCount} Admin · {metrics.agencyPlansCount} Agencies
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Pipeline Value</span>
              <span className="text-3xl font-extrabold text-blue-400 mt-1 block">{fmtCurrency(metrics.totalValue)}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">across all proposals</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Converted Value</span>
              <span className="text-3xl font-extrabold text-emerald-400 mt-1 block">{fmtCurrency(metrics.convertedValue)}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">{metrics.convertedCount} proposals converted</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Conversion Rate</span>
              <span className="text-3xl font-extrabold text-amber-400 mt-1 block">{metrics.conversionRate}%</span>
              <span className="text-[11px] text-slate-400 mt-1 block">of all active proposals</span>
            </div>
          </div>

          {/* Per-Status Clickable Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { key: "sent",       label: "Sent",       count: metrics.sentCount,       value: metrics.sentValue,       dot: "bg-blue-500",    text: "text-blue-400",    ring: "border-blue-400 bg-blue-900/40 ring-blue-400" },
              { key: "in_process", label: "In Process", count: metrics.inProcessCount,  value: metrics.inProcessValue,  dot: "bg-amber-500",   text: "text-amber-400",   ring: "border-amber-400 bg-amber-900/40 ring-amber-400" },
              { key: "converted",  label: "Converted",  count: metrics.convertedCount,  value: metrics.convertedValue,  dot: "bg-emerald-500", text: "text-emerald-400", ring: "border-emerald-400 bg-emerald-900/40 ring-emerald-400" },
              { key: "rejected",   label: "Rejected",   count: metrics.rejectedCount,   value: metrics.rejectedValue,   dot: "bg-red-500",     text: "text-red-400",     ring: "border-red-400 bg-red-900/40 ring-red-400" },
              { key: "on_hold",    label: "On Hold",    count: metrics.onHoldCount,     value: metrics.onHoldValue,     dot: "bg-purple-400",  text: "text-purple-400",  ring: "border-purple-400 bg-purple-900/40 ring-purple-400" },
            ].map(({ key, label, count, value, dot, text, ring }) => (
              <button
                key={key}
                onClick={() => { setStatusFilter(statusFilter === key ? "all" : key); setPage(1); }}
                className={`text-left p-4 rounded-xl border transition-all ${
                  statusFilter === key
                    ? `${ring} ring-1`
                    : "border-slate-700 bg-slate-800/60 hover:bg-slate-700/60"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-2 h-2 rounded-full ${dot} shrink-0`} />
                  <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">{label}</span>
                </div>
                <div className={`text-2xl font-extrabold ${text}`}>{count}</div>
                <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{fmtCurrency(value)}</div>
              </button>
            ))}
          </div>

          {statusFilter !== "all" && STATUS_CONFIG[statusFilter] && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">Filtered:</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-700 text-white border border-slate-600">
                {STATUS_CONFIG[statusFilter].label}
              </span>
              <button className="text-xs text-slate-400 hover:text-white underline" onClick={() => { setStatusFilter("all"); setPage(1); }}>
                Clear
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Tabs: All Plans | Admin Plans | Agency Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/70 p-1.5 rounded-lg">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={tabFilter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setTabFilter("all"); setPage(1); }}
            className={`text-xs gap-1.5 ${tabFilter === "all" ? "bg-white text-slate-900 shadow-sm hover:bg-white" : "text-slate-600"}`}
          >
            All Media Plans
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{plans.length}</Badge>
          </Button>
          <Button
            variant={tabFilter === "admin" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setTabFilter("admin"); setPage(1); }}
            className={`text-xs gap-1.5 ${tabFilter === "admin" ? "bg-white text-blue-700 font-semibold shadow-sm hover:bg-white" : "text-slate-600"}`}
          >
            <UserCheck2 className="h-3.5 w-3.5 text-blue-600" />
            Admin Created
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{metrics.adminPlansCount}</Badge>
          </Button>
          <Button
            variant={tabFilter === "agency" ? "default" : "ghost"}
            size="sm"
            onClick={() => { setTabFilter("agency"); setPage(1); }}
            className={`text-xs gap-1.5 ${tabFilter === "agency" ? "bg-white text-purple-700 font-semibold shadow-sm hover:bg-white" : "text-slate-600"}`}
          >
            <Building2 className="h-3.5 w-3.5 text-purple-600" />
            Agency Tracker
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{metrics.agencyPlansCount}</Badge>
          </Button>
        </div>
        {tabFilter === "agency" && (
          <span className="text-xs text-purple-700 font-medium px-2 py-0.5 bg-purple-50 rounded border border-purple-200">
            Tracking plans prepared by registered agencies
          </span>
        )}
      </div>

      {/* Search + Status Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="admin-media-plans-search"
            placeholder="Search by plan name, brand, client name, mobile, agency…"
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
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="in_process">In Process</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="on_hold">On Hold</SelectItem>
            <SelectItem value="executed">Executed (Legacy)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Proposals Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading media plans…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <ClipboardList className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">No media plans found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Media Plan & Brand</TableHead>
                    <TableHead>Target Client (Recipient)</TableHead>
                    <TableHead className="hidden md:table-cell">Creator</TableHead>
                    <TableHead className="hidden lg:table-cell">Inventory Scope</TableHead>
                    <TableHead className="hidden lg:table-cell">Total Value</TableHead>
                    <TableHead className="hidden md:table-cell">Campaign Period</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((plan) => (
                    <TableRow key={plan.id}>
                      {/* Plan Name & Brand */}
                      <TableCell>
                        <p className="font-semibold text-sm leading-snug">{plan.name}</p>
                        <p className="text-xs font-medium text-primary mt-0.5">{plan.clientBrand}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Created {fmt(plan.createdAt)}
                        </p>
                      </TableCell>

                      {/* Recipient Client */}
                      <TableCell>
                        {plan.clientName || plan.clientMobile ? (
                          <div>
                            <p className="text-sm font-semibold">{plan.clientName || "Client Lead"}</p>
                            {plan.clientMobile && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3" /> {plan.clientMobile}
                              </p>
                            )}
                            <div className="mt-1">
                              {plan.isClientRegistered ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0">
                                  <UserCheck className="h-3 w-3 mr-1 text-emerald-600" /> Registered User
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0">
                                  <UserPlus className="h-3 w-3 mr-1 text-amber-600" /> Unregistered Lead
                                </Badge>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">General Client Pitch</span>
                        )}
                      </TableCell>

                      {/* Creator */}
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {plan.createdByAdmin ? (
                            <Badge className="bg-blue-600 text-white text-[10px]">Admin Created</Badge>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold leading-snug text-purple-900">{plan.agencyName || "Agency"}</p>
                                {plan.agencyCompany && (
                                  <p className="text-[11px] text-muted-foreground">{plan.agencyCompany}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Screen Count */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span>{plan.screenCount} screens</span>
                        </div>
                      </TableCell>

                      {/* Budget */}
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-sm font-bold text-slate-900 dark:text-white">
                          <IndianRupee className="h-3.5 w-3.5 text-muted-foreground" />
                          {fmtCurrency(plan.budget).replace("₹", "")}
                        </div>
                        {plan.agencyMargin > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            +{plan.agencyMargin}% margin included
                          </p>
                        )}
                      </TableCell>

                      {/* Date Range */}
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{fmt(plan.startDate)} → {fmt(plan.endDate)}</span>
                        </div>
                      </TableCell>

                      {/* Status — Inline Dropdown */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {updatingStatusId === plan.id ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating…
                            </span>
                          ) : (
                            <Select
                              value={plan.status}
                              onValueChange={(val) => updateStatusMutation(plan.id, val)}
                            >
                              <SelectTrigger
                                className={`h-7 text-[11px] font-semibold px-2 border rounded-full w-auto gap-1 ${STATUS_CONFIG[plan.status]?.badgeClass ?? "bg-slate-100 text-slate-600 border-slate-200"}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[plan.status]?.dotClass ?? "bg-slate-400"} shrink-0`} />
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["draft", "sent", "in_process", "converted", "rejected", "on_hold"].map((s) => (
                                  <SelectItem key={s} value={s} className="text-xs">
                                    <span className="flex items-center gap-1.5">
                                      <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s]?.dotClass}`} />
                                      {STATUS_CONFIG[s]?.label ?? s}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </TableCell>

                      {/* Actions — Edit & Download PDF */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-slate-700 hover:bg-slate-100"
                            onClick={() => setLocation(`/admin/media-plans/${plan.id}`)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs border-primary text-primary hover:bg-primary/10"
                            onClick={() => handleDownloadPdf(plan.id)}
                            disabled={downloadingId === plan.id}
                          >
                            {downloadingId === plan.id ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5" />
                            )}

                            PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
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

      {/* Admin Quick Media Plan Creation Modal */}
      {createModalOpen && (
        <AdminCreateMediaPlanModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            qc.invalidateQueries({ queryKey: [`/api/admin/media-plans?duration=${durationFilter}`] });
            refetch();
          }}
        />
      )}
    </div>
  );
}

// ============================================================
// ADMIN CREATE MEDIA PLAN WIZARD MODAL
// ============================================================

type UserResult = {
  id: string;
  name: string;
  mobileNumber: string;
  email?: string;
  companyName?: string;
  brandName?: string;
  agencyName?: string;
  role?: string;
  accountType?: string;
  status?: string;
  isRegistered?: boolean;
};

function AdminCreateMediaPlanModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Search existing user or lead
  const [userSearch, setUserSearch] = useState("");

  // Create new lead inputs
  const [newLeadName, setNewLeadName] = useState("");
  const [mobileInput, setMobileInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Resolved client for steps 2 & 3
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  // Step 2: Campaign Details
  const [planName, setPlanName] = useState("");
  const [clientBrand, setClientBrand] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [agencyMargin, setAgencyMargin] = useState(0);
  const [notes, setNotes] = useState("");

  // Step 3: Screen Selection
  const [selectedScreenIds, setSelectedScreenIds] = useState<Set<string>>(new Set());
  const [screenSearch, setScreenSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all users & leads for instant 0ms search
  const { data: allUsersData = [], isLoading: loadingUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    },
    enabled: open && step === 1,
  });

  const allUsers = Array.isArray(allUsersData) ? allUsersData : [];

  // Instant 0ms local search across name, mobile, phone, company, brand, agency, and email
  const userSearchResults = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    const qDigits = userSearch.replace(/\D/g, "");
    if (!q) return [];

    return allUsers
      .filter((u: any) => {
        if (u.name && u.name.toLowerCase().includes(q)) return true;
        if (u.companyName && u.companyName.toLowerCase().includes(q)) return true;
        if (u.brandName && u.brandName.toLowerCase().includes(q)) return true;
        if (u.agencyName && u.agencyName.toLowerCase().includes(q)) return true;
        if (u.email && u.email.toLowerCase().includes(q)) return true;
        if (u.mobileNumber && u.mobileNumber.toLowerCase().includes(q)) return true;
        if (u.phone && u.phone.toLowerCase().includes(q)) return true;

        if (qDigits.length >= 1) {
          const uMobileDigits = (u.mobileNumber || "").replace(/\D/g, "");
          const uPhoneDigits = (u.phone || "").replace(/\D/g, "");
          if (uMobileDigits.includes(qDigits) || uPhoneDigits.includes(qDigits)) return true;
        }
        return false;
      })
      .slice(0, 20)
      .map((u: any) => {
        const isRegistered = !!u.firebaseUid && !u.firebaseUid.startsWith("unregistered_");
        return {
          id: u.id,
          name: u.name,
          mobileNumber: u.mobileNumber || u.phone || "",
          email: u.email,
          companyName: u.companyName,
          brandName: u.brandName,
          agencyName: u.agencyName,
          role: u.role,
          accountType: u.accountType,
          status: u.status,
          isRegistered,
        };
      });
  }, [allUsers, userSearch]);

  // Fetch screens (only on step 3)
  const { data: screensData = [], isLoading: loadingScreens } = useQuery<any[]>({
    queryKey: ["/api/agency/screens"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/agency/screens");
      return res.json();
    },
    enabled: open && step === 3,
  });

  const screens = Array.isArray(screensData) ? screensData : (screensData as any).screens || [];

  const filteredScreens = useMemo(() => {
    return screens.filter((s) => {
      const matchCat = categoryFilter === "all" || s.venueCategory === categoryFilter;
      const q = screenSearch.toLowerCase();
      return (
        matchCat &&
        (!q ||
          s.name?.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.venueName?.toLowerCase().includes(q) ||
          s.venueCategory?.toLowerCase().includes(q))
      );
    });
  }, [screens, screenSearch, categoryFilter]);

  const handleUserSearch = (q: string) => {
    setUserSearch(q);
  };

  // Select an existing user/lead and jump straight to Step 2
  const selectExistingUser = (u: UserResult) => {
    setSelectedUser(u);
    if (!clientBrand) setClientBrand(u.companyName || u.brandName || u.name);
    setStep(2);
  };

  // Create new lead and move to Step 2
  const handleCreateLeadConfirm = async () => {
    const cleanMobile = mobileInput.replace(/\D/g, "").slice(-10);
    if (cleanMobile.length < 10) {
      toast({ title: "Please enter a valid 10-digit mobile number", variant: "destructive" });
      return;
    }

    if (!newLeadName.trim()) {
      toast({ title: "Please enter the client's full name", variant: "destructive" });
      return;
    }

    setIsLookingUp(true);
    try {
      const res = await apiRequest("POST", "/api/admin/users/create-unregistered", {
        name: newLeadName.trim(),
        mobileNumber: cleanMobile,
      });
      const data = await res.json();
      const clientObj = data.user || { id: `lead_${Date.now()}`, name: newLeadName.trim(), mobileNumber: cleanMobile, isRegistered: false };
      setSelectedUser(clientObj);
      if (!clientBrand) setClientBrand(clientObj.name);
      qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setStep(2);
    } catch (err: any) {
      console.warn("Lead API error, using fallback local client object:", err);
      const fallbackClient = {
        id: `lead_${Date.now()}`,
        name: newLeadName.trim(),
        mobileNumber: cleanMobile,
        isRegistered: false,
      };
      setSelectedUser(fallbackClient);
      if (!clientBrand) setClientBrand(fallbackClient.name);
      setStep(2);
    } finally {
      setIsLookingUp(false);
    }
  };

  // Step 3 Final Submit — Create Media Plan
  const handleCreateProposal = async () => {
    if (selectedScreenIds.size === 0) {
      toast({ title: "Select at least 1 screen for the media plan", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const campaignDays = calculateCampaignDays(startDate, endDate);
      const itemsPayload = Array.from(selectedScreenIds).map((screenId) => ({
        screenId,
        days: campaignDays,
      }));

      const res = await apiRequest("POST", "/api/admin/media-plans", {
        clientUserId: selectedUser?.id,
        clientName: selectedUser?.name || newLeadName,
        clientMobile: selectedUser?.mobileNumber || mobileInput,
        name: planName || `DOOH Media Plan – ${clientBrand}`,
        clientBrand,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        agencyMargin: Number(agencyMargin) || 0,
        notes,
        items: itemsPayload,
      });

      const createdPlan = await res.json();
      toast({ title: "Media plan created & saved successfully! ✓" });

      try {
        const pdfRes = await apiRequest("GET", `/api/admin/media-plans/${createdPlan.id}/pdf-data`);
        const pdfData = await pdfRes.json();
        printMediaPlan(pdfData);
      } catch {
        // PDF generation is best-effort
      }

      onSuccess();
    } catch {
      toast({ title: "Failed to create media plan. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleScreen = (id: string) => {
    setSelectedScreenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const campaignDays = calculateCampaignDays(startDate, endDate);

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as any);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b bg-slate-50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Media Plan
          </DialogTitle>
          <DialogDescription className="text-xs">
            Identify an existing client by name, mobile, or company — or create a new client lead in one step.
          </DialogDescription>

          {/* Steps indicator */}
          <div className="flex items-center gap-3 mt-4 pt-2">
            {[
              { n: 1, label: "Client Selection" },
              { n: 2, label: "Campaign Info" },
              { n: 3, label: `Screens (${selectedScreenIds.size})` },
            ].map(({ n, label }, i, arr) => (
              <div key={n} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 text-xs font-bold ${step === n ? "text-primary" : step > n ? "text-emerald-600" : "text-muted-foreground"}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === n ? "bg-primary text-white" : step > n ? "bg-emerald-500 text-white" : "bg-slate-200"}`}>{n}</span>
                  {label}
                </div>
                {i < arr.length - 1 && <span className="text-slate-300 text-sm">→</span>}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* ── STEP 1: UNIFIED CLIENT SELECTION & CREATION ── */}
        {step === 1 && (
          <div className="p-6 flex-1 overflow-y-auto space-y-6">

            {/* Option 1: Search Existing User or Lead */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-800">1. Search Existing User or Lead</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Search by client name, mobile number, company, or brand..."
                  value={userSearch}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  className="pl-9 bg-white"
                />
                {loadingUsers && <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Type name, phone number, or company to instantly search users & leads in the system.
              </p>
            </div>

            {/* Search Results List */}
            {userSearchResults.length > 0 && (
              <div className="border rounded-xl overflow-hidden shadow-sm bg-white divide-y max-h-60 overflow-y-auto">
                <div className="px-4 py-2 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Matching Clients ({userSearchResults.length})
                </div>
                {userSearchResults.map((u) => {
                  const orgName = u.companyName || u.brandName || u.agencyName;
                  return (
                    <div
                      key={u.id}
                      onClick={() => selectExistingUser(u)}
                      className="flex items-center justify-between p-3.5 hover:bg-blue-50/70 cursor-pointer transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center shrink-0 text-blue-600 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-slate-900 truncate">{u.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-0.5">
                            {u.mobileNumber && <span className="flex items-center gap-1 font-mono text-[11px]"><Phone className="h-3 w-3" />{u.mobileNumber}</span>}
                            {orgName && <span className="font-medium text-slate-700">· {orgName}</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.isRegistered ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Registered</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Lead</Badge>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-primary group-hover:bg-primary group-hover:text-white">
                          Select →
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {userSearch.trim().length > 0 && userSearchResults.length === 0 && !loadingUsers && (
              <div className="p-4 rounded-xl border border-dashed text-center space-y-1 bg-slate-50">
                <p className="text-xs font-semibold text-slate-600">No existing user or lead found matching "{userSearch}"</p>
                <p className="text-[11px] text-muted-foreground">You can create a new lead for this client below.</p>
              </div>
            )}

            {/* Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Option 2: Add New Client Lead */}
            <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-slate-900">2. Create New Client Lead</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Client Name *</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="bg-white text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mobile Number *</Label>
                  <Input
                    placeholder="10-digit mobile number"
                    value={mobileInput}
                    onChange={(e) => setMobileInput(e.target.value)}
                    className="bg-white text-xs font-mono"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  size="sm"
                  onClick={handleCreateLeadConfirm}
                  disabled={isLookingUp || !newLeadName.trim() || mobileInput.replace(/\D/g, "").length < 10}
                  className="gap-1.5 text-xs"
                >
                  {isLookingUp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                  Create Lead & Continue →
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* ── STEP 2: CAMPAIGN DETAILS ── */}
        {step === 2 && (
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {/* Client summary bar */}
            <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  <strong>{selectedUser?.name}</strong>
                  {selectedUser?.mobileNumber && <span className="text-muted-foreground ml-1.5">({selectedUser.mobileNumber})</span>}
                </span>
                {selectedUser?.isRegistered
                  ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 ml-1">Registered</Badge>
                  : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] px-1.5 py-0 ml-1">Lead</Badge>
                }
              </div>
              <Button size="sm" variant="ghost" className="h-6 text-xs text-primary" onClick={() => { setStep(1); setSelectedUser(null); }}>
                Change Client
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Media Plan Name</Label>
                <Input placeholder="e.g. Diwali Outdoor Campaign" value={planName} onChange={(e) => setPlanName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Client Brand *</Label>
                <Input placeholder="e.g. Cult.fit / Zomato / Nike" value={clientBrand} onChange={(e) => setClientBrand(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Campaign Start Date *</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Campaign End Date *</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 font-medium flex items-center justify-between">
              <span>Campaign Duration: <strong>{campaignDays} Day{campaignDays !== 1 ? "s" : ""}</strong></span>
              <span className="text-[11px] text-blue-700">All screens will auto-fill {campaignDays} days</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Margin Markup (%)</Label>
                <Input type="number" placeholder="0" value={agencyMargin} onChange={(e) => setAgencyMargin(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes / Client Directives</Label>
                <Textarea placeholder="Optional notes for the media plan..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: SELECT SCREENS ── */}
        {step === 3 && (
          <div className="p-6 space-y-4 flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search screens by name, city, venue..." className="pl-9 text-xs" value={screenSearch} onChange={(e) => setScreenSearch(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Array.from(new Set(screens.map((s: any) => s.venueCategory).filter(Boolean))).map((cat) => (
                    <SelectItem key={cat as string} value={cat as string}>{cat as string}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border rounded-lg flex-1 overflow-y-auto max-h-[360px]">
              {loadingScreens ? (
                <div className="flex items-center justify-center h-40 text-xs text-muted-foreground gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Loading screens…</div>
              ) : filteredScreens.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-xs text-muted-foreground">No screens found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Screen / Venue</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Footfall/Day</TableHead>
                      <TableHead className="text-right">Rate/Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredScreens.map((s: any) => {
                      const isSelected = selectedScreenIds.has(s.id);
                      return (
                        <TableRow key={s.id} className={`cursor-pointer ${isSelected ? "bg-blue-50/70" : ""}`} onClick={() => toggleScreen(s.id)}>
                          <TableCell>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleScreen(s.id)} className="rounded border-slate-300" />
                          </TableCell>
                          <TableCell>
                            <p className="font-semibold text-xs">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground">{s.city} • {s.venueName || s.location}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{s.venueCategory}</Badge></TableCell>
                          <TableCell className="text-xs font-mono">{s.size || "—"}</TableCell>
                          <TableCell className="text-right text-xs">{s.avgDailyFootfall ? s.avgDailyFootfall.toLocaleString("en-IN") : "—"}</TableCell>
                          <TableCell className="text-right text-xs font-bold text-primary">₹{s.pricePerDay?.toLocaleString("en-IN")}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="p-3 bg-slate-100 rounded-lg flex items-center justify-between text-xs">
              <span>Selected: <strong>{selectedScreenIds.size} Screen(s)</strong> • Duration: <strong>{campaignDays} Days</strong></span>
              <span className="text-primary font-bold">Each screen auto-filled with {campaignDays} days</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <DialogFooter className="p-4 border-t bg-slate-50">
          <div className="flex w-full items-center justify-between">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>Cancel</Button>

            <div className="flex items-center gap-2">
              {step > 1 && (
                <Button variant="outline" size="sm" onClick={handleBack} disabled={isSubmitting}>
                  ← Back
                </Button>
              )}

              {/* Step 2 */}
              {step === 2 && (
                <Button size="sm" onClick={() => { if (!clientBrand) { toast({ title: "Please enter client brand name", variant: "destructive" }); return; } setStep(3); }}>
                  Select Screens →
                </Button>
              )}

              {/* Step 3 */}
              {step === 3 && (
                <Button size="sm" onClick={handleCreateProposal} disabled={isSubmitting || selectedScreenIds.size === 0}>
                  {isSubmitting ? <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Saving…</> : <><Sparkles className="h-4 w-4 mr-1" />Save & Generate PDF</>}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

