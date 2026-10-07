import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowDown, ArrowLeft, ArrowUp, Download, EyeOff, FileSpreadsheet, Pencil, Plus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { downloadFile, errorText } from "@/lib/screenImportApi";
import { VenueCategoryPicker } from "@/components/admin/VenueCategoryPicker";
import { BASE_IMPORT_FIELDS, CALCULATED_COLUMNS } from "@shared/screenImport";
import { INDIAN_STATES } from "@shared/screenFieldOptions";
import { METRIC_KINDS, METRIC_KIND_LABELS, type MetricDef, type MetricKind } from "@shared/venueMetrics";
import { getVenueType } from "@shared/venueTaxonomy";

type AdminMetric = MetricDef & { id: number };

export default function ScreenTemplate() {
  const [, setLocation] = useLocation();
  const [venueType, setVenueType] = useState("");
  const tab = new URLSearchParams(window.location.search).get("tab") || "download";

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => setLocation("/admin/screens")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Manage Screens
        </Button>
        <h1 className="text-3xl font-bold text-foreground font-serif">Screen template</h1>
        <p className="text-muted-foreground mt-1">Download the Excel template for a venue category, and manage the venue metrics it asks for.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Label htmlFor="venue-category" className="text-sm font-medium">
          Venue category
        </Label>
        <VenueCategoryPicker id="venue-category" value={venueType} onChange={setVenueType} />
      </div>

      <Tabs defaultValue={tab}>
        <TabsList>
          <TabsTrigger value="download">Download template</TabsTrigger>
          <TabsTrigger value="settings">Settings · venue metrics</TabsTrigger>
          <TabsTrigger value="cities">Settings · cities</TabsTrigger>
        </TabsList>
        <TabsContent value="download" className="mt-4">
          <DownloadTab venueType={venueType} />
        </TabsContent>
        <TabsContent value="settings" className="mt-4">
          <MetricsTab venueType={venueType} />
        </TabsContent>
        <TabsContent value="cities" className="mt-4">
          <CitiesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useAdminMetrics(venueType: string) {
  return useQuery<{ metrics: AdminMetric[]; usage: Record<string, number> }>({
    queryKey: [`/api/admin/venue-metrics?venueType=${venueType}`],
    enabled: !!venueType,
  });
}

// ---------- Download ----------

function DownloadTab({ venueType }: { venueType: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const { data } = useAdminMetrics(venueType);
  const active = (data?.metrics || []).filter((m) => m.active);
  const label = getVenueType(venueType)?.label;

  const download = async () => {
    setBusy(true);
    try {
      await downloadFile(`/api/admin/screen-imports/template?venueType=${venueType}`, `PixelSpot_${venueType}_template.xlsx`);
    } catch (e) {
      toast({ title: "Couldn't build the template", description: errorText(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!venueType) return <EmptyHint text="Choose a venue category to download its template." />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" /> {label} template
        </CardTitle>
        <CardDescription>
          One row per screen listing. Dropdowns use the same fixed lists as the screen form, so imported values work with advertiser filters. Owner, host and status are chosen on the Import page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Button onClick={download} disabled={busy} data-testid="button-download-template">
          <Download className="h-4 w-4 mr-2" /> {busy ? "Preparing…" : "Download template (.xlsx)"}
        </Button>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <ColumnList title={`Screen columns (${BASE_IMPORT_FIELDS.length})`} items={BASE_IMPORT_FIELDS.map((f) => `${f.header}${f.required ? " *" : ""}${f.kind === "multi" ? " — Yes/No per option" : f.kind === "select" ? " — dropdown" : ""}`)} />
          <ColumnList title={`Venue metrics (${active.length})`} items={active.map((m) => `${m.label}${m.required ? " *" : ""}${m.kind === "enum" ? " — dropdown" : m.kind === "multi" ? " — Yes/No per option" : ""}`)} empty="No metrics set up — add them in Settings." />
          <ColumnList title="Calculated (locked)" items={CALCULATED_COLUMNS.map((c) => `${c.header} ${c.help}`)} />
        </div>
        <p className="text-xs text-muted-foreground">* required. Not in the sheet: id, owner, host, status, created date, images, location tags and other system fields.</p>
      </CardContent>
    </Card>
  );
}

function ColumnList({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="font-medium mb-2">{title}</div>
      {items.length ? (
        <ul className="space-y-1 text-muted-foreground max-h-72 overflow-auto">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">{text}</div>;
}

// ---------- Metrics settings ----------

function MetricsTab({ venueType }: { venueType: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useAdminMetrics(venueType);
  const [editing, setEditing] = useState<AdminMetric | "new" | null>(null);
  const metrics = data?.metrics || [];
  const usage = data?.usage || {};
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [`/api/admin/venue-metrics?venueType=${venueType}`] });
    queryClient.invalidateQueries({ queryKey: ["/api/venue-metrics/definitions"] });
  };

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Record<string, unknown> }) => apiRequest("PATCH", `/api/admin/venue-metrics/${id}`, body),
    onSuccess: refresh,
    onError: (e) => toast({ title: "Not saved", description: errorText(e), variant: "destructive" }),
  });

  const move = (i: number, dir: -1 | 1) => {
    const a = metrics[i];
    const b = metrics[i + dir];
    if (!a || !b) return;
    patch.mutate({ id: a.id, body: { sortOrder: b.sortOrder } });
    patch.mutate({ id: b.id, body: { sortOrder: a.sortOrder } });
  };

  if (!venueType) return <EmptyHint text="Choose a venue category to manage its metrics." />;
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>{getVenueType(venueType)?.label} metrics</CardTitle>
          <CardDescription>Each active metric becomes a column in the template and a field on the screen form. Advertisers only ever see filled values. Hidden metrics keep their data.</CardDescription>
        </div>
        <Button onClick={() => setEditing("new")} data-testid="button-add-metric">
          <Plus className="h-4 w-4 mr-1" /> Add metric
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !metrics.length ? (
          <EmptyHint text="No metrics yet — add the first one." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-2 w-16">Order</th>
                  <th className="py-2 pr-3">Metric</th>
                  <th className="py-2 pr-3">Input</th>
                  <th className="py-2 pr-3">Options</th>
                  <th className="py-2 pr-3">Required</th>
                  <th className="py-2 pr-3">On card</th>
                  <th className="py-2 pr-3">Screens filled</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={m.id} className={`border-b last:border-0 ${m.active ? "" : "opacity-60"}`}>
                    <td className="py-2 pr-2">
                      <div className="flex">
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${m.label} up`}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={i === metrics.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${m.label} down`}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium">
                        {m.label}
                        {m.unit ? <span className="text-muted-foreground font-normal"> ({m.unit})</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">{m.key}</div>
                    </td>
                    <td className="py-2 pr-3">{METRIC_KIND_LABELS[m.kind]}</td>
                    <td className="py-2 pr-3 max-w-[220px] text-muted-foreground">{m.options?.length ? m.options.join(", ") : "—"}</td>
                    <td className="py-2 pr-3">{m.required ? "Yes" : ""}</td>
                    <td className="py-2 pr-3">{m.showOnCard ? <Badge variant="secondary">Card</Badge> : ""}</td>
                    <td className="py-2 pr-3">{(usage[m.key] || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2 pr-3">{m.active ? <Badge variant="outline">Active</Badge> : <Badge variant="secondary">Hidden</Badge>}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => patch.mutate({ id: m.id, body: { active: !m.active } })}>
                        {m.active ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                        {m.active ? "Hide" : "Show"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
      {editing && (
        <MetricDialog
          venueType={venueType}
          metric={editing === "new" ? null : editing}
          used={editing === "new" ? 0 : usage[editing.key] || 0}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

function MetricDialog({ venueType, metric, used, onClose, onSaved }: { venueType: string; metric: AdminMetric | null; used: number; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [label, setLabel] = useState(metric?.label ?? "");
  const [kind, setKind] = useState<MetricKind>(metric?.kind ?? "number");
  const [unit, setUnit] = useState(metric?.unit ?? "");
  const [help, setHelp] = useState(metric?.help ?? "");
  const [options, setOptions] = useState((metric?.options || []).join("\n"));
  const [min, setMin] = useState(metric?.min != null ? String(metric.min) : "");
  const [max, setMax] = useState(metric?.max != null ? String(metric.max) : "");
  const [required, setRequired] = useState(!!metric?.required);
  const [showOnCard, setShowOnCard] = useState(!!metric?.showOnCard);
  const [saving, setSaving] = useState(false);
  const needsOptions = kind === "enum" || kind === "multi";
  const numeric = kind === "number" || kind === "currency";

  const save = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      label,
      kind,
      unit: numeric ? unit : null,
      help,
      options: needsOptions ? options.split("\n").map((s) => s.trim()).filter(Boolean) : [],
      min: numeric && min !== "" ? Number(min) : null,
      max: numeric && max !== "" ? Number(max) : null,
      required,
      showOnCard,
    };
    try {
      if (metric) await apiRequest("PATCH", `/api/admin/venue-metrics/${metric.id}`, body);
      else await apiRequest("POST", "/api/admin/venue-metrics", { venueType, ...body });
      toast({ title: metric ? "Metric updated" : "Metric added", description: metric ? undefined : "It's in the next template you download." });
      onSaved();
    } catch (e) {
      toast({ title: "Not saved", description: errorText(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{metric ? `Edit ${metric.label}` : `Add a metric for ${getVenueType(venueType)?.label}`}</DialogTitle>
          <DialogDescription>{metric ? `Key: ${metric.key}${used ? ` · filled on ${used} screens` : ""}` : "The key is made from the label and can't change later."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="m-label">Label</Label>
            <Input id="m-label" value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Clubhouse members" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-kind">Input type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as MetricKind)} disabled={used > 0}>
                <SelectTrigger id="m-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {METRIC_KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {used > 0 && <p className="text-xs text-muted-foreground">Locked — screens already have values.</p>}
            </div>
            {numeric && (
              <div className="space-y-1.5">
                <Label htmlFor="m-unit">Unit</Label>
                <Input id="m-unit" value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. min, sq ft, %" />
              </div>
            )}
          </div>
          {numeric && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-min">Minimum</Label>
                <Input id="m-min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-max">Maximum</Label>
                <Input id="m-max" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
            </div>
          )}
          {needsOptions && (
            <div className="space-y-1.5">
              <Label htmlFor="m-options">Options (one per line)</Label>
              <Textarea id="m-options" rows={5} value={options} onChange={(e) => setOptions(e.target.value)} />
              {used > 0 && <p className="text-xs text-muted-foreground">Options already used by screens can't be removed.</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="m-help">Help text (shown in the template and form)</Label>
            <Input id="m-help" value={help} maxLength={200} onChange={(e) => setHelp(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={required} onCheckedChange={(v) => setRequired(!!v)} /> Required on import
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={showOnCard} onCheckedChange={(v) => setShowOnCard(!!v)} /> Show on the advertiser card (max 2)
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || label.trim().length < 2}>
            {saving ? "Saving…" : metric ? "Save" : "Add metric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Cities ----------

function CitiesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [state, setState] = useState("");
  const [customState, setCustomState] = useState("");
  const [isCustomState, setIsCustomState] = useState(false);
  const [city, setCity] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const { data, isLoading } = useQuery<{ cities: Record<string, string[]> }>({ queryKey: ["/api/admin/cities"] });

  // Merge known Indian states with whatever keys the API returns
  const allStates = useMemo(() => {
    const fromApi = Object.keys(data?.cities || {});
    const set = new Set([...INDIAN_STATES, ...fromApi]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const activeState = isCustomState ? customState.trim() : state;
  const list = useMemo(() => (activeState ? data?.cities[activeState] || [] : []), [data, activeState]);

  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return list;
    const q = citySearch.toLowerCase().trim();
    return list.filter((c) => c.toLowerCase().includes(q));
  }, [list, citySearch]);

  const totalCitiesCount = useMemo(() => {
    if (!data?.cities) return 0;
    return Object.values(data.cities).reduce((acc, arr) => acc + (arr?.length || 0), 0);
  }, [data]);

  const add = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/cities", { state: activeState, city }),
    onSuccess: async (res) => {
      const out = await res.json();
      toast({ title: `${out.city} added to ${activeState}`, description: "City master and Excel templates updated successfully." });
      setCity("");
      if (isCustomState) {
        setState(activeState);
        setIsCustomState(false);
        setCustomState("");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cities"] });
    },
    onError: (e) => toast({ title: "Not added", description: errorText(e), variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-xl">Cities & States Master</CardTitle>
            <CardDescription className="mt-1">
              Dropdowns in Excel templates, screen import checks, and discovery filters use this list. Add missing cities or custom states anytime.
            </CardDescription>
          </div>
          {totalCitiesCount > 0 && (
            <Badge variant="outline" className="self-start sm:self-auto bg-primary/5 text-primary border-primary/20 text-xs px-2.5 py-1">
              {totalCitiesCount} total cities across {allStates.length} states/UTs
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-muted/40 p-4 rounded-xl border border-border/60 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-foreground">Add City or Custom State</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-primary hover:text-primary/80"
              onClick={() => {
                setIsCustomState(!isCustomState);
                if (!isCustomState) setState("");
              }}
            >
              {isCustomState ? "← Choose from standard states" : "+ Enter custom state"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            {!isCustomState ? (
              <div className="space-y-1.5">
                <Label htmlFor="city-state" className="text-xs font-medium">State</Label>
                <Select value={state || undefined} onValueChange={setState}>
                  <SelectTrigger id="city-state" className="w-64 bg-background">
                    <SelectValue placeholder={isLoading ? "Loading states…" : "Choose a state"} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[320px]">
                    {allStates.map((s) => {
                      const count = data?.cities[s]?.length || 0;
                      return (
                        <SelectItem key={s} value={s}>
                          <span className="flex items-center justify-between w-full gap-4">
                            <span>{s}</span>
                            <span className="text-xs text-muted-foreground">({count})</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="custom-state" className="text-xs font-medium">Custom State / Region</Label>
                <Input
                  id="custom-state"
                  className="w-64 bg-background"
                  value={customState}
                  maxLength={60}
                  onChange={(e) => setCustomState(e.target.value)}
                  placeholder="e.g. Ladakh or NCR"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="city-name" className="text-xs font-medium">City name</Label>
              <Input
                id="city-name"
                className="w-56 bg-background"
                value={city}
                maxLength={60}
                onChange={(e) => setCity(e.target.value)}
                disabled={!activeState}
                placeholder="e.g. Hosur"
              />
            </div>

            <Button
              onClick={() => add.mutate()}
              disabled={!activeState || city.trim().length < 2 || add.isPending}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              {add.isPending ? "Adding…" : "Add city"}
            </Button>
          </div>
        </div>

        {activeState ? (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{activeState}</span>
                <Badge variant="secondary" className="text-xs">{list.length} cities</Badge>
              </div>
              {list.length > 6 && (
                <div className="w-56">
                  <Input
                    placeholder="Search in this state…"
                    value={citySearch}
                    onChange={(e) => setCitySearch(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              )}
            </div>

            {filteredCities.length > 0 ? (
              <div className="flex flex-wrap gap-2 max-h-[280px] overflow-y-auto p-1">
                {filteredCities.map((c) => (
                  <Badge
                    key={c}
                    variant="secondary"
                    className="px-2.5 py-1 text-xs bg-secondary/60 hover:bg-secondary font-normal"
                  >
                    {c}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4">
                {list.length === 0
                  ? `No cities listed for ${activeState} yet. Use the input above to add the first one!`
                  : `No cities matching "${citySearch}".`}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
            <p className="text-sm">Select a state above to view and manage its registered cities.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
