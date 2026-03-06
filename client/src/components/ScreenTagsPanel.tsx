/**
 * ScreenTagsPanel — Displays auto-generated + manual tags for a screen.
 * 
 * Features:
 *  - View all assigned tags grouped by category with color-coded badges
 *  - Primary tags (top 5) get a star indicator
 *  - Hover any tag to see justification (why it was assigned)
 *  - "Generate Tags" button triggers the 6-phase pipeline
 *  - Add manual tags from the master tag list
 *  - Remove individual tag assignments
 * 
 * Used in: EditScreen (owner), ManageScreens detail (admin)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, RefreshCw, Plus, X, Star, Zap } from "lucide-react";

// ──────────────────────────────────────────
// Types (mirror server response shapes)
// ──────────────────────────────────────────
interface ScreenTag {
  id: string;
  slug: string;
  displayName: string;
  category: string;
  description: string | null;
  iconName: string | null;
  colorCode: string | null;
  isActive: boolean;
}

interface TagAssignment {
  id: string;
  screenId: string;
  tagId: string;
  source: string;
  score: number;
  isPrimary: boolean;
  distanceMeters: number | null;
  poiCount: number | null;
  assignedAt: string;
  tag: ScreenTag;
}

// ──────────────────────────────────────────
// Component
// ──────────────────────────────────────────
interface ScreenTagsPanelProps {
  screenId: string;
  /** If true, show generate / add / remove controls. false = read-only view */
  editable?: boolean;
}

export function ScreenTagsPanel({ screenId, editable = true }: ScreenTagsPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedTagId, setSelectedTagId] = useState<string>("");

  // Fetch tag assignments for this screen
  const {
    data: assignments = [],
    isLoading: assignmentsLoading,
  } = useQuery<TagAssignment[]>({
    queryKey: [`/api/screens/${screenId}/tags`],
    enabled: !!screenId,
  });

  // Fetch all master tags (for the "add manual" dropdown)
  const { data: masterTags = [] } = useQuery<ScreenTag[]>({
    queryKey: ["/api/screen-tags"],
    enabled: editable,
  });

  // Generate tags mutation
  const generateMutation = useMutation({
    mutationFn: async (forceRefresh: boolean) => {
      const res = await apiRequest("POST", `/api/screens/${screenId}/generate-tags`, { forceRefresh });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/screens/${screenId}/tags`] });
      toast({
        title: "Tags generated",
        description: `${data.candidates?.length ?? 0} tags assigned (${data.primaryTagIds?.length ?? 0} primary)`,
      });
    },
    onError: () => {
      toast({ title: "Tag generation failed", variant: "destructive" });
    },
  });

  // Add manual tag mutation
  const addTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const res = await apiRequest("POST", `/api/screens/${screenId}/tags`, { tagId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/screens/${screenId}/tags`] });
      setSelectedTagId("");
      toast({ title: "Tag added" });
    },
    onError: () => {
      toast({ title: "Failed to add tag", variant: "destructive" });
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiRequest("DELETE", `/api/screens/${screenId}/tags/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/screens/${screenId}/tags`] });
      toast({ title: "Tag removed" });
    },
    onError: () => {
      toast({ title: "Failed to remove tag", variant: "destructive" });
    },
  });

  // Group assignments by category
  const grouped = assignments.reduce<Record<string, TagAssignment[]>>((acc, a) => {
    const cat = a.tag.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {});

  // Tags already assigned (for filtering dropdown)
  const assignedTagIds = new Set(assignments.map((a) => a.tagId));

  // Available tags = master tags not yet assigned
  const availableTags = masterTags.filter((t) => !assignedTagIds.has(t.id));

  // Group available tags by category for the dropdown
  const availableByCategory = availableTags.reduce<Record<string, ScreenTag[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  // Category display order
  const categoryOrder = [
    "Transportation", "Retail", "Food", "Education", "Healthcare",
    "Entertainment", "Business", "Residential", "Religious",
    "Lifestyle", "Audience", "Time", "Economic",
  ];

  const sortedCategories = Object.keys(grouped).sort(
    (a, b) => (categoryOrder.indexOf(a) - categoryOrder.indexOf(b)),
  );

  // Build a human-readable justification for why a tag was assigned
  function getTagJustification(a: TagAssignment): string {
    const lines: string[] = [];

    // Tag description from master definition
    if (a.tag.description) {
      lines.push(a.tag.description);
    }

    // Source + evidence
    if (a.source === "manual") {
      lines.push("📌 Manually added by user");
    } else {
      // Distance + POI count based justification
      if (a.distanceMeters != null && a.poiCount != null && a.poiCount > 1) {
        lines.push(`📍 ${a.poiCount} matching places found, nearest at ${a.distanceMeters}m`);
      } else if (a.distanceMeters != null && a.poiCount != null && a.poiCount === 1) {
        lines.push(`📍 1 matching place found at ${a.distanceMeters}m`);
      } else if (a.distanceMeters != null) {
        lines.push(`📍 Nearest match is ${a.distanceMeters}m away`);
      } else if (a.poiCount != null) {
        lines.push(`📊 Based on ${a.poiCount} nearby places`);
      }

      // Category-specific reasoning for derived tags (no places data)
      const cat = a.tag.category;
      if (cat === "Lifestyle") {
        lines.push("🔗 Derived from combination of nearby place types");
      } else if (cat === "Audience") {
        lines.push("👥 Inferred audience profile from surrounding area");
      } else if (cat === "Time") {
        lines.push("🕐 Based on time-relevant activity patterns nearby");
      } else if (cat === "Economic") {
        lines.push("💰 Based on price levels of nearby businesses");
      }
    }

    // Score
    if (a.isPrimary) {
      lines.push(`⭐ Primary tag · Score: ${a.score}/1200`);
    } else {
      lines.push(`Score: ${a.score}/1200`);
    }

    return lines.join("\n");
  }

  if (assignmentsLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading tags...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Screen Tags
            </CardTitle>
            <CardDescription>
              Auto-generated from nearby places. {assignments.length} tag{assignments.length !== 1 ? "s" : ""} assigned.
            </CardDescription>
          </div>
          {editable && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateMutation.mutate(true)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              {assignments.length === 0 ? "Generate Tags" : "Regenerate"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Assigned tags grouped by category */}
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No tags assigned yet. Click "Generate Tags" to auto-generate from nearby places.
          </p>
        ) : (
          sortedCategories.map((category) => (
            <div key={category}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {category}
              </p>
              <div className="flex flex-wrap gap-2">
                {grouped[category]
                  .sort((a, b) => b.score - a.score)
                  .map((a) => (
                    <Tooltip key={a.id} delayDuration={200}>
                      <TooltipTrigger className="inline-flex cursor-help">
                        <Badge
                          variant={a.source === "manual" ? "outline" : "secondary"}
                          className="px-2.5 py-1 text-xs flex items-center gap-1"
                          style={{
                            borderColor: a.tag.colorCode ?? undefined,
                            backgroundColor: a.source !== "manual" ? `${a.tag.colorCode}15` : undefined,
                          }}
                        >
                          {a.isPrimary && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                          {a.tag.displayName}
                          <span className="text-muted-foreground ml-0.5">({a.score})</span>
                          {a.distanceMeters != null && (
                            <span className="text-muted-foreground ml-0.5">{a.distanceMeters}m</span>
                          )}
                          {editable && (
                            <button
                              type="button"
                              className="ml-1 hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); removeTagMutation.mutate(a.id); }}
                              disabled={removeTagMutation.isPending}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
                        {getTagJustification(a)}
                      </TooltipContent>
                    </Tooltip>
                  ))}
              </div>
            </div>
          ))
        )}

        {/* Add manual tag */}
        {editable && availableTags.length > 0 && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Select value={selectedTagId} onValueChange={setSelectedTagId}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Add a tag manually..." />
              </SelectTrigger>
              <SelectContent>
                {categoryOrder.map((cat) => {
                  const tags = availableByCategory[cat];
                  if (!tags || tags.length === 0) return null;
                  return (
                    <div key={cat}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {cat}
                      </div>
                      {tags.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.displayName}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedTagId) addTagMutation.mutate(selectedTagId);
              }}
              disabled={!selectedTagId || addTagMutation.isPending}
            >
              {addTagMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
