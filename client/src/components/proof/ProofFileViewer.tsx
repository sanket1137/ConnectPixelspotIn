import React, { useState } from "react";
import { 
  FileText, 
  FileSpreadsheet, 
  FileCode, 
  Download, 
  ExternalLink, 
  Eye, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  X,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface ProofFileItem {
  url: string;
  type: "photo" | "video" | "pdf" | "excel" | "log";
  originalName?: string;
  fileSize?: number;
  caption?: string;
  uploadedAt?: string;
}

interface ProofFileViewerProps {
  files: ProofFileItem[];
  cleanupStatus?: string | null;
  className?: string;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProofFileViewer({ files, cleanupStatus, className = "" }: ProofFileViewerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (cleanupStatus === "purged") {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50/50 dark:border-purple-900/50 dark:bg-purple-950/20 p-4 text-sm text-purple-900 dark:text-purple-200 flex items-start gap-3">
        <Archive className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Media Files Archived & Purged</p>
          <p className="text-xs text-purple-700/80 dark:text-purple-300/80 mt-0.5">
            Heavy media assets for this booking were cleaned from cloud storage after the 30-day post-campaign retention period. Audit logs, metadata, and written summaries are perpetually retained.
          </p>
        </div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic py-2">
        No files uploaded yet.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {files.map((file, idx) => {
          const isPhoto = file.type === "photo";
          const isVideo = file.type === "video";
          const isPdf = file.type === "pdf";
          const isExcel = file.type === "excel";

          return (
            <div
              key={idx}
              className="group relative rounded-xl border border-border/80 bg-card hover:bg-accent/30 transition-all p-3 flex flex-col justify-between shadow-xs hover:shadow-sm"
            >
              {/* Media Preview or Icon Header */}
              {isPhoto ? (
                <div 
                  className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted cursor-pointer mb-2.5 group-hover:brightness-95 transition-all"
                  onClick={() => setSelectedImage(file.url)}
                >
                  <img
                    src={file.url}
                    alt={file.originalName || "Proof photo"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <span className="p-1.5 rounded-full bg-white/90 text-gray-900">
                      <Eye className="w-4 h-4" />
                    </span>
                  </div>
                  <Badge className="absolute top-2 left-2 bg-black/60 text-white hover:bg-black/70 text-[10px] py-0 px-1.5 border-none">
                    Photo
                  </Badge>
                </div>
              ) : isVideo ? (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black/90 mb-2.5 flex items-center justify-center">
                  <VideoIcon className="w-8 h-8 text-white/80" />
                  <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] py-0 px-1.5 border-none">
                    Video
                  </Badge>
                </div>
              ) : (
                <div className={`aspect-video w-full rounded-lg mb-2.5 flex flex-col items-center justify-center gap-1.5 ${
                  isPdf 
                    ? "bg-red-500/10 text-red-600 dark:bg-red-950/20 dark:text-red-400" 
                    : isExcel 
                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                    : "bg-blue-500/10 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400"
                }`}>
                  {isPdf && <FileText className="w-8 h-8" />}
                  {isExcel && <FileSpreadsheet className="w-8 h-8" />}
                  {!isPdf && !isExcel && <FileCode className="w-8 h-8" />}
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    {isPdf ? "PDF Document" : isExcel ? "Spreadsheet / Logs" : "Compliance Log"}
                  </span>
                </div>
              )}

              {/* File Info */}
              <div className="space-y-1">
                <p className="text-xs font-medium truncate text-foreground" title={file.originalName || "Proof File"}>
                  {file.originalName || `Proof File ${idx + 1}`}
                </p>
                {file.fileSize && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(file.fileSize)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  View
                </a>
                <a
                  href={file.url}
                  download={file.originalName || "proof_file"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Lightbox Modal */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-black/95 border-none shadow-2xl flex items-center justify-center">
          {selectedImage && (
            <div className="relative w-full max-h-[85vh] flex items-center justify-center">
              <img
                src={selectedImage}
                alt="Enlarged Proof"
                className="max-w-full max-h-[80vh] object-contain rounded-md"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
