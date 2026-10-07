import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Download, ImagePlus, Loader2, Pencil, Trash2, Upload, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMetricRegistry } from "@/lib/metricRegistry";
import { downloadFile, errorText, uploadForm } from "@/lib/screenImportApi";
import { useScreenOwners } from "@/pages/admin/ScreenImports";
import { TIME_OPTIONS } from "@shared/screenFieldOptions";
import {
  cellList,
  cellText,
  importFieldsFor,
  summarize,
  validateRows,
  type ImportCell,
  type ImportField,
  type ImportIssue,
  type ImportRow,
} from "@shared/screenImport";
import { getVenueType } from "@shared/venueTaxonomy";

interface Draft {
  id: string;
  fileName: string;
  venueType: string;
  ownerId: string;
  host: string | null;
  screenStatus: string;
  state: "draft" | "imported" | "discarded";
  rows: ImportRow[];
  issues: ImportIssue[];
  screenCount: number;
}

const DB_CODES = new Set(["dup_saved", "dup_draft", "near_dup"]); // only the server can check these
const PAGE = 50;
const FIELD_W: Partial<Record<ImportField["kind"], number>> = { multi: 150, yesno: 80, time: 90, int: 90, decimal: 110, pincode: 90, resolution: 110 };

export default function ScreenImportDraft() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const registry = useMetricRegistry();
  const owners = useScreenOwners();
  const { data: draft, isLoading, error } = useQuery<Draft>({ queryKey: [`/api/admin/screen-imports/${id}`], refetchOnWindowFocus: false });
  const { data: cityData } = useQuery<{ cities: Record<string, string[]> }>({ queryKey: ["/api/admin/cities"] });
  const cities = cityData?.cities || {};

  const [rows, setRows] = useState<ImportRow[]>([]);
  const [serverIssues, setServerIssues] = useState<ImportIssue[]>([]);
  const [meta, setMeta] = useState({ ownerId: "", host: "", screenStatus: "pending" });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [page, setPage] = useState(0);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const lastClicked = useRef<number | null>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);

  // load
  useEffect(() => {
    if (!draft) return;
    setRows(draft.rows);
    setServerIssues(draft.issues.filter((i) => DB_CODES.has(i.code)));
    setMeta({ ownerId: draft.ownerId, host: draft.host || "", screenStatus: draft.screenStatus });
    if (draft.state === "imported") setResult(draft.screenCount);
  }, [draft]);

  const venueType = draft?.venueType || "";
  const fields = useMemo(() => (venueType ? importFieldsFor(registry, venueType) : []), [registry, venueType]);

  // checks: instant ones here, duplicate checks from the last save
  const deferredRows = useDeferredValue(rows);
  const localIssues = useMemo(
    () => (venueType && cityData ? validateRows(deferredRows, { registry, venueType, cities }).filter((i) => !DB_CODES.has(i.code)) : []),
    [deferredRows, registry, venueType, cities, cityData]
  );
  const issues = useMemo(() => {
    const present = new Set(rows.map((r) => r.row));
    return [...localIssues, ...serverIssues.filter((i) => present.has(i.row) && !(i.code === "near_dup" && rows.find((r) => r.row === i.row)?.differentScreen))];
  }, [localIssues, serverIssues, rows]);
  const byRow = useMemo(() => {
    const m = new Map<number, ImportIssue[]>();
    for (const i of issues) m.set(i.row, [...(m.get(i.row) || []), i]);
    return m;
  }, [issues]);
  const summary = useMemo(() => summarize(rows, issues), [rows, issues]);
  const needsWork = useCallback(
    (r: ImportRow) => {
      const list = byRow.get(r.row) || [];
      return list.some((i) => i.level === "error") || (!r.warningsOk && list.length > 0);
    },
    [byRow]
  );

  const visible = useMemo(() => (onlyProblems ? rows.filter(needsWork) : rows), [rows, onlyProblems, needsWork]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE));
  const pageRows = visible.slice(page * PAGE, page * PAGE + PAGE);
  useEffect(() => {
    if (page >= pages) setPage(pages - 1);
  }, [page, pages]);

  // ---------- saving ----------
  const save = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await apiRequest("PUT", `/api/admin/screen-imports/${id}`, body);
        const out = await res.json();
        setServerIssues((out.issues as ImportIssue[]).filter((i) => DB_CODES.has(i.code)));
        setDirty(false);
        queryClient.invalidateQueries({ queryKey: ["/api/admin/screen-imports"] });
        return true;
      } catch (e) {
        toast({ title: "Not saved", description: errorText(e), variant: "destructive" });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, queryClient, toast]
  );
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => save({ rows: rowsRef.current }), 1200);
    return () => clearTimeout(t);
  }, [rows, dirty, save]);

  const updateRows = useCallback((fn: (rows: ImportRow[]) => ImportRow[]) => {
    setRows((prev) => fn(prev));
    setDirty(true);
  }, []);
  const setCell = useCallback(
    (rowNum: number, patch: Record<string, ImportCell>) => updateRows((prev) => prev.map((r) => (r.row === rowNum ? { ...r, values: { ...r.values, ...patch } } : r))),
    [updateRows]
  );
  const setFlag = useCallback(
    (rowNums: number[], flag: "warningsOk" | "differentScreen", on: boolean) => {
      const set = new Set(rowNums);
      updateRows((prev) => prev.map((r) => (set.has(r.row) ? { ...r, [flag]: on } : r)));
    },
    [updateRows]
  );
  const removeRows = (rowNums: number[]) => {
    if (!confirm(`Remove ${rowNums.length} row${rowNums.length === 1 ? "" : "s"} from this import?`)) return;
    const set = new Set(rowNums);
    updateRows((prev) => prev.filter((r) => !set.has(r.row)));
    setSelected(new Set());
  };

  // suggestion applied to every row with the same value in that column
  const applyToAll = useCallback(
    (issue: ImportIssue, sourceRow: number) => {
      const src = rowsRef.current.find((r) => r.row === sourceRow);
      if (!src) return;
      const original = cellText(src.values[issue.field]);
      let n = 0;
      updateRows((prev) =>
        prev.map((r) => {
          if (cellText(r.values[issue.field]) !== original) return r;
          n++;
          return { ...r, values: { ...r.values, ...issue.fix!.set } };
        })
      );
      setTimeout(() => toast({ title: `Fixed ${n} row${n === 1 ? "" : "s"}`, description: `${original} → ${cellText(Object.values(issue.fix!.set)[0])}` }), 0);
    },
    [updateRows, toast]
  );

  const selectWith = useCallback(
    (issue: ImportIssue) => {
      const match = new Set(issues.filter((i) => i.code === issue.code && i.field === issue.field).map((i) => i.row));
      setSelected(match);
      toast({ title: `${match.size} rows selected`, description: "Use Bulk edit to fix them together." });
    },
    [issues, toast]
  );

  const toggleSelect = useCallback(
    (rowNum: number, shift: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (shift && lastClicked.current !== null) {
          const ids = visible.map((r) => r.row);
          const a = ids.indexOf(lastClicked.current);
          const b = ids.indexOf(rowNum);
          if (a >= 0 && b >= 0) {
            for (const r of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) next.add(r);
            return next;
          }
        }
        if (next.has(rowNum)) next.delete(rowNum);
        else next.add(rowNum);
        return next;
      });
      lastClicked.current = rowNum;
    },
    [visible]
  );

  // ---------- actions ----------
  const updateMeta = async (patch: Partial<typeof meta>) => {
    setMeta((m) => ({ ...m, ...patch }));
    await save(patch);
  };

  const reupload = async (file: File) => {
    try {
      const form = new FormData();
      form.append("file", file);
      const out = await uploadForm<Draft & { notices?: string[] }>(`/api/admin/screen-imports/${id}/upload`, form);
      setRows(out.rows);
      setServerIssues(out.issues.filter((i) => DB_CODES.has(i.code)));
      setDirty(false);
      setSelected(new Set());
      toast({ title: "Rows replaced from the new file", description: out.notices?.join(" ") || `${out.rows.length} rows` });
    } catch (e) {
      toast({ title: "Upload failed", description: errorText(e), variant: "destructive" });
    }
  };

  const runImport = async () => {
    if (dirty && !(await save({ rows }))) return;
    setImporting(true);
    try {
      const res = await apiRequest("POST", `/api/admin/screen-imports/${id}/commit`);
      const out = await res.json();
      setResult(out.count);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screen-imports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
    } catch (e) {
      toast({ title: "Not imported", description: errorText(e), variant: "destructive" });
      const fresh = await queryClient.fetchQuery<Draft>({ queryKey: [`/api/admin/screen-imports/${id}`] });
      setServerIssues(fresh.issues.filter((i) => DB_CODES.has(i.code)));
    } finally {
      setImporting(false);
    }
  };

  const saveAndExit = async () => {
    if (dirty && !(await save({ rows }))) return;
    setLocation("/admin/screens/import");
  };

  // ---------- render ----------
  if (isLoading) return <div className="p-8 text-muted-foreground">Loading import…</div>;
  if (error || !draft) return <div className="p-8 text-destructive">Couldn't load this import. {errorText(error)}</div>;
  const typeLabel = getVenueType(venueType)?.label ?? venueType;

  if (result !== null) {
    return (
      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <Card>
          <CardContent className="py-10 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <h1 className="text-2xl font-semibold">{result} screens imported</h1>
            <p className="text-muted-foreground">
              {typeLabel} · {draft.fileName}. Location tags are being generated in the background. Add photos so advertisers can see the screens.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => setLocation("/admin/screen-images")}>
                <ImagePlus className="h-4 w-4 mr-2" /> Add photos
              </Button>
              <Button variant="outline" onClick={() => setLocation("/admin/screens")}>
                View screens
              </Button>
              <Button variant="ghost" onClick={() => setLocation("/admin/screens/import")}>
                Back to imports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (draft.state === "discarded") return <div className="p-8 text-muted-foreground">This draft was discarded.</div>;

  const pageSelectedAll = pageRows.length > 0 && pageRows.every((r) => selected.has(r.row));

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={saveAndExit}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Imports
          </Button>
          <h1 className="text-2xl font-bold font-serif">{draft.fileName}</h1>
          <p className="text-sm text-muted-foreground">
            {typeLabel} template · draft — saved automatically{" "}
            {saving ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> saving…
              </span>
            ) : dirty ? (
              "· unsaved changes"
            ) : (
              "· all changes saved"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Owner</Label>
            <Select value={meta.ownerId} onValueChange={(v) => updateMeta({ ownerId: v })}>
              <SelectTrigger className="w-56 h-9">
                <SelectValue placeholder="Owner" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.companyName || o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs" htmlFor="draft-host">
              Host
            </Label>
            <Input id="draft-host" className="w-36 h-9" value={meta.host} onChange={(e) => setMeta((m) => ({ ...m, host: e.target.value.toUpperCase() }))} onBlur={() => updateMeta({ host: meta.host })} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Create as</Label>
            <Select value={meta.screenStatus} onValueChange={(v) => updateMeta({ screenStatus: v })}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* summary + actions */}
      <Card>
        <CardContent className="py-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="text-sm">
            <b>{summary.total}</b> rows · <span className="text-green-700 font-medium">{summary.ok} OK</span> ·{" "}
            <span className={summary.blocking ? "text-destructive font-medium" : "text-muted-foreground"}>{summary.blocking} to fix</span>
            {summary.warningRows > 0 && <span className="text-amber-700"> ({summary.warningRows} only need a review)</span>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={onlyProblems} onCheckedChange={(v) => { setOnlyProblems(v); setPage(0); }} /> Show only rows to fix
          </label>
          <div className="flex flex-wrap gap-2 ml-auto">
            {selected.size > 0 && (
              <>
                <Badge variant="secondary" className="h-9 px-3">{selected.size} selected</Badge>
                <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Bulk edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setFlag(Array.from(selected), "warningsOk", true)}>
                  Mark warnings reviewed
                </Button>
                <Button size="sm" variant="outline" onClick={() => removeRows(Array.from(selected))}>
                  <Trash2 className="h-4 w-4 mr-1" /> Remove rows
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </>
            )}
            <input ref={reuploadRef} type="file" accept=".xlsx" className="hidden" onChange={(e) => e.target.files?.[0] && reupload(e.target.files[0])} />
            <Button size="sm" variant="outline" onClick={() => reuploadRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Re-upload corrected file
            </Button>
            <Button size="sm" variant="outline" onClick={async () => { if (dirty) await save({ rows }); downloadFile(`/api/admin/screen-imports/${id}/download`, "import.xlsx").catch((e) => toast({ title: "Download failed", description: errorText(e), variant: "destructive" })); }}>
              <Download className="h-4 w-4 mr-1" /> Download sheet
            </Button>
            <Button size="sm" onClick={runImport} disabled={summary.blocking > 0 || importing || saving || !rows.length} data-testid="button-import-screens">
              {importing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              {summary.blocking > 0 ? `Fix ${summary.blocking} row${summary.blocking === 1 ? "" : "s"} to import` : `Import ${rows.length} screens`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* grid */}
      <div className="rounded-lg border overflow-auto max-h-[calc(100vh-300px)]">
        <table className="text-xs border-separate border-spacing-0">
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr>
              <th className="sticky left-0 z-30 bg-slate-50 border-b px-2 py-2 w-10">
                <Checkbox
                  aria-label="Select rows on this page"
                  checked={pageSelectedAll}
                  onCheckedChange={(on) =>
                    setSelected((prev) => {
                      const next = new Set(prev);
                      pageRows.forEach((r) => (on ? next.add(r.row) : next.delete(r.row)));
                      return next;
                    })
                  }
                />
              </th>
              <th className="sticky left-10 z-30 bg-slate-50 border-b px-2 py-2 text-left w-12">Row</th>
              <th className="sticky left-[88px] z-30 bg-slate-50 border-b border-r px-2 py-2 text-left min-w-[300px]">Problems</th>
              {fields.map((f) => (
                <th key={f.key} className={`border-b px-2 py-2 text-left font-medium whitespace-nowrap ${f.metric ? "bg-blue-50" : ""}`} title={f.help} style={{ minWidth: FIELD_W[f.kind] ?? (f.kind === "text" ? 180 : 140) }}>
                  {f.header}
                  {f.required ? <span className="text-destructive"> *</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <GridRow
                key={r.row}
                row={r}
                issues={byRow.get(r.row) || []}
                issuesKey={JSON.stringify(byRow.get(r.row) || [])}
                selected={selected.has(r.row)}
                fields={fields}
                cities={cities[cellText(r.values.state)] || []}
                onCell={setCell}
                onToggle={toggleSelect}
                onFlag={setFlag}
                onApplyAll={applyToAll}
                onSelectWith={selectWith}
                onRemove={(n) => removeRows([n])}
              />
            ))}
            {!pageRows.length && (
              <tr>
                <td colSpan={fields.length + 3} className="p-8 text-center text-muted-foreground">
                  {onlyProblems ? "Nothing left to fix 🎉" : "No rows."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          Page {page + 1} of {pages}
          <Button size="sm" variant="outline" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {bulkOpen && (
        <BulkEditDialog
          fields={fields}
          count={selected.size}
          cities={cities}
          onClose={() => setBulkOpen(false)}
          onApply={(key, value) => {
            const set = new Set(selected);
            updateRows((prev) => prev.map((r) => (set.has(r.row) ? { ...r, values: { ...r.values, [key]: value } } : r)));
            setBulkOpen(false);
            toast({ title: `Updated ${set.size} rows` });
          }}
        />
      )}
    </div>
  );
}

// ---------- one grid row ----------

interface GridRowProps {
  row: ImportRow;
  issues: ImportIssue[];
  issuesKey: string;
  selected: boolean;
  fields: ImportField[];
  cities: string[];
  onCell: (row: number, patch: Record<string, ImportCell>) => void;
  onToggle: (row: number, shift: boolean) => void;
  onFlag: (rows: number[], flag: "warningsOk" | "differentScreen", on: boolean) => void;
  onApplyAll: (issue: ImportIssue, row: number) => void;
  onSelectWith: (issue: ImportIssue) => void;
  onRemove: (row: number) => void;
}

const GridRow = memo(
  function GridRow({ row, issues, selected, fields, cities, onCell, onToggle, onFlag, onApplyAll, onSelectWith, onRemove }: GridRowProps) {
    const errors = issues.filter((i) => i.level === "error");
    const warnings = issues.filter((i) => i.level === "warning");
    const fieldIssue = (key: string) => issues.find((i) => i.field === key || (key === "longitude" && i.field === "latitude"));
    const status = errors.length ? "error" : warnings.length && !row.warningsOk ? "warning" : "ok";
    const bg = selected ? "bg-blue-50" : "bg-white";
    return (
      <tr className={bg}>
        <td className={`sticky left-0 z-10 ${bg} border-b px-2 py-1.5 align-top`}>
          <Checkbox aria-label={`Select row ${row.row}`} checked={selected} onClick={(e) => { e.preventDefault(); onToggle(row.row, e.shiftKey); }} />
        </td>
        <td className={`sticky left-10 z-10 ${bg} border-b px-2 py-1.5 align-top font-mono`}>
          <span className={status === "error" ? "text-destructive font-semibold" : status === "warning" ? "text-amber-700 font-semibold" : "text-green-700"}>{row.row}</span>
        </td>
        <td className={`sticky left-[88px] z-10 ${bg} border-b border-r px-2 py-1.5 align-top min-w-[300px] max-w-[340px]`}>
          {!issues.length ? (
            <span className="text-green-700">OK</span>
          ) : (
            <ul className="space-y-1">
              {issues.map((i, k) => (
                <li key={k} className={i.level === "error" ? "text-destructive" : "text-amber-700"}>
                  <span className="inline-flex items-start gap-1">
                    {i.level === "warning" && <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />}
                    {i.message}
                  </span>
                  <span className="flex flex-wrap gap-1 mt-0.5">
                    {i.fix && (
                      <button type="button" className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-primary hover:bg-primary/20" onClick={() => onCell(row.row, i.fix!.set)}>
                        <Wand2 className="h-3 w-3" /> {i.fix.label}
                      </button>
                    )}
                    {i.fix && Object.keys(i.fix.set).length === 1 && Object.keys(i.fix.set)[0] === i.field && (
                      <button type="button" className="rounded px-1.5 py-0.5 text-primary underline-offset-2 hover:underline" onClick={() => onApplyAll(i, row.row)}>
                        Apply to all rows with this value
                      </button>
                    )}
                    {i.field !== "row" && (
                      <button type="button" className="rounded px-1.5 py-0.5 text-slate-500 hover:underline" onClick={() => onSelectWith(i)}>
                        Select all with this problem
                      </button>
                    )}
                    {(i.code === "dup_saved" || i.code === "dup_file" || i.code === "dup_draft") && (
                      <button type="button" className="rounded px-1.5 py-0.5 text-destructive hover:underline" onClick={() => onRemove(row.row)}>
                        Remove row
                      </button>
                    )}
                    {i.code === "near_dup" && (
                      <label className="inline-flex items-center gap-1 text-slate-700">
                        <Checkbox checked={!!row.differentScreen} onCheckedChange={(v) => onFlag([row.row], "differentScreen", !!v)} /> This is a different screen
                      </label>
                    )}
                  </span>
                </li>
              ))}
              {warnings.length > 0 && !errors.some((e) => e.code === "near_dup") && (
                <li>
                  <label className="inline-flex items-center gap-1 text-slate-700">
                    <Checkbox checked={!!row.warningsOk} onCheckedChange={(v) => onFlag([row.row], "warningsOk", !!v)} /> Warnings reviewed
                  </label>
                </li>
              )}
            </ul>
          )}
        </td>
        {fields.map((f) => (
          <td key={f.key} className="border-b px-1 py-1 align-top">
            <CellEditor field={f} value={row.values[f.key]} cities={cities} bad={fieldIssue(f.key)} onChange={(v) => onCell(row.row, { [f.key]: v })} />
          </td>
        ))}
      </tr>
    );
  },
  (a, b) => a.row === b.row && a.selected === b.selected && a.issuesKey === b.issuesKey && a.fields === b.fields && a.cities === b.cities
);

function CellEditor({ field, value, cities, bad, onChange }: { field: ImportField; value: ImportCell | undefined; cities: string[]; bad?: ImportIssue; onChange: (v: ImportCell) => void }) {
  const ring = bad ? (bad.level === "error" ? "border-destructive bg-red-50" : "border-amber-500 bg-amber-50") : "border-slate-200";
  const base = `h-8 w-full rounded border px-1.5 text-xs ${ring}`;
  const title = bad?.message;
  const text = cellText(value);

  if (field.kind === "multi") {
    const chosen = cellList(value);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" title={title || chosen.join(", ")} className={`${base} text-left truncate`}>
            {chosen.length ? chosen.join(", ") : <span className="text-slate-400">Choose…</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1.5">
            {(field.options || []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm">
                <Checkbox checked={chosen.includes(o)} onCheckedChange={(on) => onChange(on ? [...chosen.filter((x) => (field.options || []).includes(x)), o] : chosen.filter((x) => x !== o))} />
                {o}
              </label>
            ))}
            {chosen.filter((x) => !(field.options || []).includes(x)).map((x) => (
              <p key={x} className="text-xs text-destructive">
                “{x}” isn't an option — untick it by choosing again
              </p>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const options = field.key === "city" ? cities : field.kind === "yesno" ? ["Yes", "No"] : field.kind === "time" ? TIME_OPTIONS : field.kind === "select" ? field.options || [] : null;
  if (options) {
    const known = options.includes(text);
    return (
      <select className={base} value={text} title={title} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {!known && text && <option value={text}>{text} (not valid)</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  return <TextCell className={base} title={title} value={text} numeric={["int", "decimal", "number", "pincode"].includes(field.kind)} onChange={onChange} />;
}

// Text cell: edits locally, commits on blur / Enter (keeps typing smooth on big sheets)
function TextCell({ value, onChange, className, title, numeric }: { value: string; onChange: (v: string) => void; className: string; title?: string; numeric: boolean }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = () => v !== value && onChange(v.trim());
  return (
    <input
      className={className}
      title={title}
      value={v}
      inputMode={numeric ? "decimal" : undefined}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
    />
  );
}

// ---------- bulk edit ----------

function BulkEditDialog({ fields, count, cities, onClose, onApply }: { fields: ImportField[]; count: number; cities: Record<string, string[]>; onClose: () => void; onApply: (key: string, value: ImportCell) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState<ImportCell>("");
  const field = fields.find((f) => f.key === key);
  const allCities = useMemo(() => Array.from(new Set(Object.values(cities).flat())).sort(), [cities]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk edit {count} rows</DialogTitle>
          <DialogDescription>Sets one column to the same value on every selected row.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Column</Label>
            <Select value={key || undefined} onValueChange={(k) => { setKey(k); setValue(fields.find((f) => f.key === k)?.kind === "multi" ? [] : ""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a column" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {fields.map((f) => (
                  <SelectItem key={f.key} value={f.key}>
                    {f.header}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {field && (
            <div className="space-y-1.5">
              <Label>New value</Label>
              {field.kind === "multi" ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {(field.options || []).map((o) => (
                    <label key={o} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={cellList(value).includes(o)} onCheckedChange={(on) => setValue(on ? [...cellList(value), o] : cellList(value).filter((x) => x !== o))} />
                      {o}
                    </label>
                  ))}
                </div>
              ) : (
                <CellEditor field={field} value={value} cities={field.key === "city" ? allCities : []} onChange={setValue} />
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!field} onClick={() => onApply(key, value)}>
            Apply to {count} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
