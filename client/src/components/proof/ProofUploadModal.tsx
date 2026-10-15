import React, { useState, useRef } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  ImageIcon, 
  Video as VideoIcon, 
  X, 
  Loader2, 
  AlertCircle,
  ShieldCheck,
  Calendar,
  Monitor
} from "lucide-react";
import { getAuthHeaders } from "@/lib/queryClient";

interface ProofUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    campaignId?: string;
    screenId?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    screen?: {
      name?: string;
      location?: string;
      venueName?: string;
      host?: string;
    };
    campaign?: {
      name?: string;
    };
  } | null;
  role: "admin" | "screen_owner";
  onSuccess?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(file: File): "photo" | "video" | "pdf" | "excel" | "other" {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (file.type.startsWith("video/") || ["mp4", "mov", "webm"].includes(ext)) return "video";
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (
    file.type.includes("spreadsheet") || 
    file.type.includes("excel") || 
    file.type === "text/csv" || 
    ["xlsx", "xls", "csv"].includes(ext)
  ) return "excel";
  if (file.type.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext)) return "photo";
  return "other";
}

export function ProofUploadModal({
  open,
  onOpenChange,
  booking,
  role,
  onSuccess
}: ProofUploadModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [summary, setSummary] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const incoming = Array.from(e.target.files);
      const combined = [...selectedFiles, ...incoming].slice(0, 10);
      setSelectedFiles(combined);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!booking) throw new Error("No booking selected");
      if (selectedFiles.length === 0) throw new Error("Please select at least one file");

      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });
      formData.append("summary", summary);
      if (role === "admin" && adminNotes) {
        formData.append("adminNotes", adminNotes);
      }

      const endpoint = role === "admin" 
        ? `/api/admin/bookings/${booking.id}/proof`
        : `/api/owner/bookings/${booking.id}/proof`;

      const authHeaders = await getAuthHeaders();
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Upload failed");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Proof of Play Uploaded!",
        description: role === "admin" 
          ? "Proof of Play has been directly uploaded and verified for this booking." 
          : "Proof of Play uploaded successfully. Admin will review and verify.",
      });
      setSelectedFiles([]);
      setSummary("");
      setAdminNotes("");
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/proof-of-play"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/bookings-for-proof"] });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/proof-of-play"] });
      queryClient.invalidateQueries({ queryKey: ["/api/advertiser/proof-of-play"] });
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Upload Failed",
        description: err.message || "Could not upload proof of play files.",
        variant: "destructive",
      });
    },
  });

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Upload className="w-5 h-5 text-primary" />
            Upload Proof of Play
          </DialogTitle>
          <DialogDescription>
            Attach indisputable execution evidence (Photos, Videos, PDFs, Excel player logs) for this screen booking.
          </DialogDescription>
        </DialogHeader>

        {/* Booking Context Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Screen & Venue</p>
              <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                <Monitor className="w-4 h-4 text-primary shrink-0" />
                {booking.screen?.name || "Screen"}
                {booking.screen?.venueName && ` • ${booking.screen.venueName}`}
              </h4>
            </div>
            {booking.screen?.host && (
              <Badge variant="outline" className="bg-background text-[11px] font-medium shrink-0">
                Host: {booking.screen.host}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1 border-t border-primary/10">
            {booking.campaign?.name && (
              <span>Campaign: <strong className="text-foreground">{booking.campaign.name}</strong></span>
            )}
            {booking.startDate && booking.endDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4 py-2">
          {/* File Drag and Drop Box */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Select Proof Files (Up to 10 files)</Label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-all bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,.xlsx,.xls,.csv,.mp4,.webm"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Click to browse or drag and drop files here
              </p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Supports daytime/nighttime Photos (.jpg, .png), Player Run Logs (.xlsx, .csv), Execution Certificates (.pdf), and Videos (.mp4). Max 50MB per file.
              </p>
            </div>
          </div>

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Selected Files ({selectedFiles.length})</span>
                <button
                  type="button"
                  onClick={() => setSelectedFiles([])}
                  className="text-red-500 hover:underline"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                {selectedFiles.map((file, idx) => {
                  const type = getFileType(file);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2 rounded-lg border border-border bg-card text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {type === "photo" && <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />}
                        {type === "video" && <VideoIcon className="w-4 h-4 text-purple-500 shrink-0" />}
                        {type === "pdf" && <FileText className="w-4 h-4 text-red-500 shrink-0" />}
                        {type === "excel" && <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {type === "other" && <FileText className="w-4 h-4 text-gray-500 shrink-0" />}
                        
                        <span className="truncate font-medium text-foreground">{file.name}</span>
                        <span className="text-muted-foreground shrink-0">({formatBytes(file.size)})</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {type}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => removeFile(idx)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Written Summary / Execution Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="pop-summary" className="text-sm font-semibold">
              Execution Summary & Notes
            </Label>
            <Textarea
              id="pop-summary"
              rows={3}
              placeholder="e.g. Broadcasted 120 slot repetitions daily across active campaign dates. Screen photos and compliance player log attached."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="resize-none text-sm"
            />
          </div>

          {/* Admin Specific Verification Note */}
          {role === "admin" && (
            <div className="space-y-1.5 pt-1">
              <Label htmlFor="admin-notes" className="text-sm font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-4 h-4" />
                Admin Verification Remarks
              </Label>
              <Textarea
                id="admin-notes"
                rows={2}
                placeholder="Internal verification remarks or verification seal notes for the advertiser..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="resize-none text-sm"
              />
            </div>
          )}

          {/* 30-Day Retention Notice */}
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              <strong>Data Retention Notice:</strong> Per platform terms, proof files will be retained on cloud storage for 30 days after campaign completion. Advertisers are advised to download copies within this timeframe.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={selectedFiles.length === 0 || uploadMutation.isPending}
            className="gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading Files...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Submit Proof of Play
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
