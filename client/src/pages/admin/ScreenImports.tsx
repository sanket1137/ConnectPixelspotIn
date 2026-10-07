import { useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { errorText, uploadForm } from "@/lib/screenImportApi";
import { getVenueType } from "@shared/venueTaxonomy";
import type { User } from "@shared/schema";

export interface ImportListItem {
  id: string;
  fileName: string;
  venueType: string;
  ownerId: string;
  ownerName: string | null;
  host: string | null;
  screenStatus: string;
  state: "draft" | "imported";
  errorCount: number;
  screenCount: number;
  createdByName: string | null;
  updatedByName: string | null;
  updatedAt: string;
  importedAt: string | null;
}

const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");

export function useScreenOwners() {
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/admin/users"] });
  return users.filter((u) => u.role === "screen_owner").sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name));
}

export default function ScreenImports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const owners = useScreenOwners();
  const [ownerId, setOwnerId] = useState("");
  const [host, setHost] = useState("");
  const [status, setStatus] = useState("pending");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: imports = [] } = useQuery<ImportListItem[]>({ queryKey: ["/api/admin/screen-imports"] });
  const drafts = imports.filter((i) => i.state === "draft");
  const done = imports.filter((i) => i.state === "imported");

  const discard = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/screen-imports/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/screen-imports"] }),
    onError: (e) => toast({ title: "Couldn't discard", description: errorText(e), variant: "destructive" }),
  });

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("ownerId", ownerId);
      form.append("host", host);
      form.append("screenStatus", status);
      const out = await uploadForm<{ id: string; existingDraft?: boolean; notices?: string[] }>("/api/admin/screen-imports", form);
      if (out.existingDraft) toast({ title: "This file is already an open draft", description: "Opening it — your earlier fixes are kept." });
      else if (out.notices?.length) toast({ title: "Uploaded", description: out.notices.join(" ") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screen-imports"] });
      setLocation(`/admin/screens/import/${out.id}`);
    } catch (e) {
      toast({ title: "Upload failed", description: errorText(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => setLocation("/admin/screens")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Manage Screens
        </Button>
        <h1 className="text-3xl font-bold text-foreground font-serif">Import screens</h1>
        <p className="text-muted-foreground mt-1">
          Upload a filled template. Every row is checked; fix problems on screen, then import. Nothing is saved to screens until every row is valid.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New import</CardTitle>
          <CardDescription>
            Need a template?{" "}
            <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => setLocation("/admin/screens/template")}>
              Get template
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="imp-owner">Screen owner</Label>
            <Select value={ownerId || undefined} onValueChange={setOwnerId}>
              <SelectTrigger id="imp-owner">
                <SelectValue placeholder="Choose the owner" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {owners.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.companyName || o.name} {o.companyName ? `(${o.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imp-host">Host code</Label>
            <Input id="imp-host" value={host} maxLength={40} onChange={(e) => setHost(e.target.value.toUpperCase())} placeholder="e.g. IND-02-AEK" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imp-status">Screens are created as</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="imp-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending review</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="active">Active (live)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="imp-file">Filled template (.xlsx)</Label>
            <Input id="imp-file" ref={fileRef} type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <Button onClick={upload} disabled={!file || !ownerId || uploading} data-testid="button-upload-import">
              <Upload className="h-4 w-4 mr-2" /> {uploading ? "Checking the file…" : "Upload and check"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Drafts</CardTitle>
          <CardDescription>Imports still being fixed. They're saved as you work — continue any time.</CardDescription>
        </CardHeader>
        <CardContent>
          {!drafts.length ? (
            <p className="text-sm text-muted-foreground">No open drafts.</p>
          ) : (
            <ImportTable
              rows={drafts}
              action={(d) => (
                <div className="flex justify-end gap-2">
                  <Button size="sm" onClick={() => setLocation(`/admin/screens/import/${d.id}`)}>
                    Continue
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Discard ${d.fileName}`} onClick={() => confirm(`Discard the draft "${d.fileName}"? Nothing has been imported from it.`) && discard.mutate(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              extra={(d) => (d.errorCount ? <Badge variant="destructive">{d.errorCount} to fix</Badge> : <Badge variant="secondary">Ready</Badge>)}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent imports</CardTitle>
        </CardHeader>
        <CardContent>
          {!done.length ? (
            <p className="text-sm text-muted-foreground">Nothing imported yet.</p>
          ) : (
            <ImportTable rows={done} extra={(d) => <Badge variant="outline">{d.screenCount} screens</Badge>} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ImportTable({ rows, action, extra }: { rows: ImportListItem[]; action?: (r: ImportListItem) => ReactNode; extra: (r: ImportListItem) => ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b">
            <th className="py-2 pr-3">File</th>
            <th className="py-2 pr-3">Venue category</th>
            <th className="py-2 pr-3">Owner · host</th>
            <th className="py-2 pr-3" />
            <th className="py-2 pr-3">Last change</th>
            {action && <th className="py-2" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 pr-3">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileSpreadsheet className="h-4 w-4 text-green-700" /> {r.fileName}
                </span>
              </td>
              <td className="py-2 pr-3">{getVenueType(r.venueType)?.label ?? r.venueType}</td>
              <td className="py-2 pr-3">
                {r.ownerName ?? "—"}
                {r.host ? <span className="text-muted-foreground"> · {r.host}</span> : null}
              </td>
              <td className="py-2 pr-3">{extra(r)}</td>
              <td className="py-2 pr-3 text-muted-foreground">
                {when(r.importedAt ?? r.updatedAt)}
                {r.updatedByName || r.createdByName ? ` · ${r.updatedByName || r.createdByName}` : ""}
              </td>
              {action && <td className="py-2">{action(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
