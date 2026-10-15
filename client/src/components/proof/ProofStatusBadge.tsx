import React from "react";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ShieldCheck, Clock, CheckCircle2, AlertTriangle, Archive, FileQuestion } from "lucide-react";

interface ProofStatusBadgeProps {
  status?: string | null;
  adminVerified?: boolean;
  cleanupStatus?: string | null;
  className?: string;
}

export function ProofStatusBadge({ status, adminVerified, cleanupStatus, className = "" }: ProofStatusBadgeProps) {
  if (cleanupStatus === "purged" || status === "cleaned_up") {
    return (
      <Badge variant="outline" className={`bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 flex items-center gap-1 font-medium ${className}`}>
        <Archive className="w-3.5 h-3.5" />
        Files Cleaned (Purged)
      </Badge>
    );
  }

  if (!status || status === "no_proof") {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700 flex items-center gap-1 font-medium ${className}`}>
        <FileQuestion className="w-3.5 h-3.5" />
        Awaiting Proof
      </Badge>
    );
  }

  switch (status) {
    case "confirmed":
      return (
        <Badge variant="outline" className={`bg-green-500/10 text-green-700 dark:text-green-300 border-green-300 dark:border-green-800 flex items-center gap-1 font-medium ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Confirmed by Advertiser
        </Badge>
      );
    case "admin_verified":
      return (
        <Badge variant="outline" className={`bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 flex items-center gap-1 font-medium ${className}`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          Admin Verified
        </Badge>
      );
    case "disputed":
      return (
        <Badge variant="outline" className={`bg-red-500/10 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 flex items-center gap-1 font-medium ${className}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          Disputed
        </Badge>
      );
    case "pending":
    default:
      return (
        <Badge variant="outline" className={`bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 flex items-center gap-1 font-medium ${className}`}>
          <Clock className="w-3.5 h-3.5" />
          Pending Review
        </Badge>
      );
  }
}
