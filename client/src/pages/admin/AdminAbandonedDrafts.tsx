import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  ShoppingCart,
  FileText,
  DollarSign,
  User,
  Building,
  Phone,
  Mail,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  LogIn,
  SlidersHorizontal,
  PlusCircle,
  Trash2,
  Activity,
  Layers,
} from "lucide-react";
import { formatRupees } from "@/lib/venueGroups";

interface DraftCampaign {
  id: string;
  name: string;
  budget: number;
  summary?: string;
  creativeUrl?: string;
  targetArea?: string;
  createdAt: string;
  screens: Array<{
    screenId: string;
    screenName: string;
    location: string;
    price: number;
  }>;
  advertiser: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    company?: string;
  };
}

interface CartActivity {
  id: string;
  userId: string;
  actionType: string;
  actionDetails: string;
  metadata?: any;
  createdAt: string;
  advertiser: {
    id: string;
    name: string;
    email: string;
    mobile?: string;
    company?: string;
  };
}

interface AbandonedDraftsResponse {
  drafts: DraftCampaign[];
  cartActivities: CartActivity[];
  stats: {
    totalDrafts: number;
    totalDraftsBudget: number;
    uniqueCartUsers: number;
  };
}

interface ActivityLogItem {
  id: string;
  userId: string | null;
  sessionId: string | null;
  actionType: string;
  actionDetails: string;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    mobileNumber?: string;
    companyName?: string;
  } | null;
}

interface ActivityLogsResponse {
  logs: ActivityLogItem[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminAbandonedDrafts() {
  const [activeTab, setActiveTab] = useState<"drafts" | "activity">("drafts");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);

  // Fetch abandoned drafts & active carts
  const {
    data: abandonedData,
    isLoading: isLoadingDrafts,
    refetch: refetchDrafts,
  } = useQuery<AbandonedDraftsResponse>({
    queryKey: ["/api/admin/abandoned-drafts"],
  });

  // Fetch chronological user activity logs (latest on top)
  const {
    data: logsData,
    isLoading: isLoadingLogs,
    refetch: refetchLogs,
  } = useQuery<ActivityLogsResponse>({
    queryKey: [
      `/api/admin/user-activity-logs?limit=100${
        selectedUserFilter ? `&userId=${selectedUserFilter}` : ""
      }${selectedActionFilter !== "all" ? `&actionType=${selectedActionFilter}` : ""}`,
    ],
  });

  const handleRefresh = () => {
    refetchDrafts();
    refetchLogs();
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "user_login":
        return <Badge className="bg-blue-600 text-white font-medium text-[11px] gap-1"><LogIn className="h-3 w-3" /> Login</Badge>;
      case "add_to_cart":
        return <Badge className="bg-emerald-600 text-white font-medium text-[11px] gap-1"><ShoppingCart className="h-3 w-3" /> Added to Cart</Badge>;
      case "update_cart_quantity":
        return <Badge className="bg-amber-600 text-white font-medium text-[11px] gap-1"><SlidersHorizontal className="h-3 w-3" /> Updated Cart</Badge>;
      case "remove_from_cart":
        return <Badge variant="destructive" className="font-medium text-[11px] gap-1"><Trash2 className="h-3 w-3" /> Removed Cart</Badge>;
      case "screen_search":
        return <Badge variant="secondary" className="font-medium text-[11px] gap-1"><Search className="h-3 w-3" /> Search</Badge>;
      case "campaign_draft_start":
      case "campaign_step_advance":
        return <Badge className="bg-purple-600 text-white font-medium text-[11px] gap-1"><FileText className="h-3 w-3" /> Campaign Step</Badge>;
      case "campaign_abandoned":
        return <Badge className="bg-rose-700 text-white font-medium text-[11px] gap-1"><Clock className="h-3 w-3" /> Abandoned</Badge>;
      default:
        return <Badge variant="outline" className="font-medium text-[11px]">{type}</Badge>;
    }
  };

  const filteredDrafts = (abandonedData?.drafts || []).filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.name?.toLowerCase().includes(q) ||
      d.advertiser?.name?.toLowerCase().includes(q) ||
      d.advertiser?.email?.toLowerCase().includes(q) ||
      d.advertiser?.company?.toLowerCase().includes(q)
    );
  });

  const filteredCartActivities = (abandonedData?.cartActivities || []).filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.actionDetails?.toLowerCase().includes(q) ||
      c.advertiser?.name?.toLowerCase().includes(q) ||
      c.advertiser?.email?.toLowerCase().includes(q) ||
      c.advertiser?.company?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <Clock className="h-7 w-7 text-primary" />
            Abandoned Campaign Drafts & User Journey
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track advertiser operations, cart additions, and unfinished campaigns to recover sales leads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedUserFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedUserFilter(null)}
              className="text-xs text-slate-600"
            >
              Clear User Filter
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Draft Campaigns
            </CardTitle>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {abandonedData?.stats.totalDrafts ?? "—"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Unfinished campaign builds</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pipeline Value at Risk
            </CardTitle>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatRupees(abandonedData?.stats.totalDraftsBudget || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">From unsubmitted drafts</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Cart Users
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {abandonedData?.stats.uniqueCartUsers ?? "—"}
            </div>
            <p className="text-xs text-slate-500 mt-1">Added screens in last 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Logged Events
            </CardTitle>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Activity className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {logsData?.total ?? "—"}
            </div>
            <p className="text-xs text-slate-500 mt-1">User operations captured</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
          <TabsList className="bg-slate-100 p-1">
            <TabsTrigger value="drafts" className="text-xs font-semibold gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Abandoned Drafts & Carts ({filteredDrafts.length + filteredCartActivities.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs font-semibold gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              User Activity Stream ({logsData?.total || 0})
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search user, company, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Abandoned Drafts & Carts */}
        <TabsContent value="drafts" className="mt-4 space-y-4">
          {isLoadingDrafts ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading abandoned drafts...</div>
          ) : filteredDrafts.length === 0 && filteredCartActivities.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl bg-slate-50/50">
              <Clock className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No abandoned drafts found</p>
              <p className="text-xs text-slate-500 mt-1">Advertisers who drop off will appear here automatically.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Draft Campaigns Section */}
              {filteredDrafts.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-600" />
                    Unsubmitted Campaign Drafts ({filteredDrafts.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredDrafts.map((draft) => (
                      <Card key={draft.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-base font-bold text-slate-900 leading-snug">
                                {draft.name}
                              </CardTitle>
                              <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Started on {new Date(draft.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                              </CardDescription>
                            </div>
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs font-semibold shrink-0">
                              {formatRupees(draft.budget || 0)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          {/* Advertiser Details */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span>{draft.advertiser.name}</span>
                              {draft.advertiser.company && (
                                <span className="text-slate-500 font-normal">({draft.advertiser.company})</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                              <a href={`mailto:${draft.advertiser.email}`} className="flex items-center gap-1 hover:underline text-primary">
                                <Mail className="h-3 w-3" /> {draft.advertiser.email}
                              </a>
                              {draft.advertiser.mobile && (
                                <a href={`tel:${draft.advertiser.mobile}`} className="flex items-center gap-1 hover:underline">
                                  <Phone className="h-3 w-3" /> {draft.advertiser.mobile}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Selected Screens Preview */}
                          {draft.screens && draft.screens.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-semibold text-slate-500">
                                Screens Attached ({draft.screens.length}):
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {draft.screens.map((scr) => (
                                  <span key={scr.screenId} className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px]">
                                    <Layers className="h-3 w-3 text-slate-500" />
                                    {scr.screenName}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Outreach Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserFilter(draft.advertiser.id);
                                setActiveTab("activity");
                              }}
                              className="text-xs text-primary hover:underline font-semibold"
                            >
                              View Full User Journey →
                            </button>
                            <div className="flex items-center gap-1.5">
                              {draft.advertiser.mobile && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                                  <a href={`tel:${draft.advertiser.mobile}`}>
                                    <Phone className="h-3 w-3" /> Call
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" className="h-7 text-xs gap-1" asChild>
                                <a href={`mailto:${draft.advertiser.email}?subject=Regarding your Pixelspot campaign draft "${draft.name}"`}>
                                  <Mail className="h-3 w-3" /> Email Lead
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Cart Activity Dropoffs Section */}
              {filteredCartActivities.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    Advertisers with Active Carts ({filteredCartActivities.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredCartActivities.map((cart) => (
                      <Card key={cart.id} className="border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <CardTitle className="text-sm font-bold text-slate-900 leading-snug">
                                {cart.actionDetails}
                              </CardTitle>
                              <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Last cart action: {new Date(cart.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                              </CardDescription>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-semibold shrink-0">
                              In Cart
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          {/* Advertiser Details */}
                          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <User className="h-3.5 w-3.5 text-primary" />
                              <span>{cart.advertiser.name}</span>
                              {cart.advertiser.company && (
                                <span className="text-slate-500 font-normal">({cart.advertiser.company})</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                              <a href={`mailto:${cart.advertiser.email}`} className="flex items-center gap-1 hover:underline text-primary">
                                <Mail className="h-3 w-3" /> {cart.advertiser.email}
                              </a>
                              {cart.advertiser.mobile && (
                                <a href={`tel:${cart.advertiser.mobile}`} className="flex items-center gap-1 hover:underline">
                                  <Phone className="h-3 w-3" /> {cart.advertiser.mobile}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUserFilter(cart.advertiser.id);
                                setActiveTab("activity");
                              }}
                              className="text-xs text-primary hover:underline font-semibold"
                            >
                              View User History →
                            </button>
                            <div className="flex items-center gap-1.5">
                              {cart.advertiser.mobile && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                                  <a href={`tel:${cart.advertiser.mobile}`}>
                                    <Phone className="h-3 w-3" /> Call
                                  </a>
                                </Button>
                              )}
                              <Button size="sm" className="h-7 text-xs gap-1" asChild>
                                <a href={`mailto:${cart.advertiser.email}?subject=Assistance with your Pixelspot screen selection`}>
                                  <Mail className="h-3 w-3" /> Help Book
                                </a>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Chronological User Activity Stream (Latest on top) */}
        <TabsContent value="activity" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700">Filter Action:</span>
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="h-8 text-xs border border-slate-300 rounded-lg px-2 bg-white"
              >
                <option value="all">All Actions</option>
                <option value="user_login">User Login</option>
                <option value="add_to_cart">Add to Cart</option>
                <option value="update_cart_quantity">Update Quantity</option>
                <option value="remove_from_cart">Remove from Cart</option>
                <option value="screen_search">Screen Search</option>
                <option value="campaign_step_advance">Campaign Step Advance</option>
                <option value="campaign_abandoned">Campaign Abandoned</option>
              </select>
            </div>
            {selectedUserFilter && (
              <Badge variant="secondary" className="gap-1.5 text-xs py-1 px-2.5">
                Filtered by User ID: {selectedUserFilter}
                <button
                  type="button"
                  onClick={() => setSelectedUserFilter(null)}
                  className="hover:text-red-600 font-bold ml-1"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>

          {isLoadingLogs ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading user activity stream...</div>
          ) : !logsData?.logs?.length ? (
            <div className="p-12 text-center border rounded-2xl bg-slate-50/50">
              <Activity className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No activity logs recorded yet</p>
              <p className="text-xs text-slate-500 mt-1">User operations such as logins, cart changes, and searches will appear here in real-time.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logsData.logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <div
                    key={log.id}
                    className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex flex-col gap-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        {getActionBadge(log.actionType)}
                        <span className="text-xs font-semibold text-slate-900 leading-tight">
                          {log.actionDetails}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 shrink-0">
                        {new Date(log.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "medium",
                        })}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        {log.user ? (
                          <button
                            type="button"
                            onClick={() => setSelectedUserFilter(log.user!.id)}
                            className="font-medium text-primary hover:underline flex items-center gap-1"
                          >
                            <User className="h-3 w-3" />
                            {log.user.name} ({log.user.email})
                          </button>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <User className="h-3 w-3" /> Guest / Session: {log.sessionId ? log.sessionId.slice(0, 14) : "—"}
                          </span>
                        )}
                        {log.user?.companyName && (
                          <span className="text-slate-400">· {log.user.companyName}</span>
                        )}
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                        >
                          {isExpanded ? "Hide Details" : "View Metadata"}
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                      )}
                    </div>

                    {/* Expandable JSON Metadata */}
                    {isExpanded && log.metadata && (
                      <pre className="p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[11px] overflow-x-auto mt-1">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
