import { useState, useCallback, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ImagePlus, Search, Upload, Monitor, ChevronLeft, ChevronRight, X,
  CheckCircle, Shuffle, Copy, Loader2, Filter, RotateCcw, ImageOff,
  MapPin, ClipboardCopy, User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthHeaders } from "@/lib/queryClient";
import { VENUE_CATEGORIES } from "@shared/constants";
import { INDIAN_STATES } from "@shared/constants";
import type { Screen } from "@shared/schema";

interface PaginatedScreensResponse {
  screens: Screen[];
  total: number;
}

const ENVIRONMENT_TYPES = ["Indoor", "Semi-Outdoor", "Outdoor Digital"] as const;
const SCREEN_CATEGORIES = [
  "Digital Display", "LED Video Wall", "Kiosk", "Mall LED", "Lift Display", "Transit Display"
] as const;
type AssignMode = "single" | "random" | "all";

export default function BulkImageManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Filters
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [venueCategory, setVenueCategory] = useState("all");
  const [venueName, setVenueName] = useState("");
  const [hostFilter, setHostFilter] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("all");
  const [environmentType, setEnvironmentType] = useState("all");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hasImages, setHasImages] = useState<"yes" | "no" | "all">("no");

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);

  // Image assignment
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [assignMode, setAssignMode] = useState<AssignMode>("single");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Build query params
  const queryParams = useMemo(() => {
    const p: Record<string, string> = {
      page: page.toString(),
      pageSize: pageSize.toString(),
    };
    if (search) p.search = search;
    if (venueCategory !== "all") p.venueCategory = venueCategory;
    if (venueName) p.venueName = venueName;
    if (hostFilter) p.host = hostFilter;
    if (city) p.city = city;
    if (state !== "all") p.state = state;
    if (environmentType !== "all") p.environmentType = environmentType;
    if (category !== "all") p.category = category;
    if (statusFilter !== "all") p.status = statusFilter;
    if (hasImages !== "all") p.hasImages = hasImages;
    return new URLSearchParams(p).toString();
  }, [page, pageSize, search, venueCategory, venueName, hostFilter, city, state, environmentType, category, statusFilter, hasImages]);

  const { data, isLoading } = useQuery<PaginatedScreensResponse>({
    queryKey: [`/api/admin/screens/image-manager?${queryParams}`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/screens/image-manager?${queryParams}`);
      return res.json();
    },
  });

  const screens = data?.screens ?? [];
  const totalScreens = data?.total ?? 0;
  const totalPages = Math.ceil(totalScreens / pageSize);

  // Bulk assign mutation
  const bulkAssignMutation = useMutation({
    mutationFn: async (args: { screenIds: string[]; imageUrls: string[]; mode: AssignMode }) => {
      const res = await apiRequest("PATCH", "/api/admin/screens/bulk-images", args);
      return res.json();
    },
    onSuccess: (data: { updated: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens/image-manager"] });
      queryClient.invalidateQueries({ queryKey: ["/api/screens"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
      toast({
        title: "Images Assigned!",
        description: `Successfully updated ${data.updated} screen(s).`,
      });
      setSelectedIds(new Set());
      setSelectAllMatching(false);
      setUploadedImages([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Could not assign images.",
        variant: "destructive",
      });
    },
  });

  // --- File upload ---
  const uploadFiles = useCallback(async (files: File[]) => {
    setIsUploading(true);
    const newPaths: string[] = [];
    try {
      const headers = await getAuthHeaders();
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("entityType", "screen");
        const response = await fetch("/api/objects/upload-file", {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: headers as any,
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Upload failed: ${response.status}`);
        }
        const data = await response.json();
        newPaths.push(data.objectPath);
      }
      setUploadedImages(prev => [...prev, ...newPaths]);
      toast({
        title: "Images Uploaded",
        description: `${newPaths.length} image(s) uploaded successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload images.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(Array.from(e.dataTransfer.files));
    }
  }, [uploadFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const removeUploadedImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // --- Selection ---
  const toggleSelect = (id: string) => {
    setSelectAllMatching(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectAllMatching(false);
    const allOnPage = screens.map(s => s.id);
    const allSelected = allOnPage.every(id => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allOnPage.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allOnPage.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleSelectAllMatching = () => {
    setSelectAllMatching(true);
    // Also select all on current page for visual feedback
    setSelectedIds(new Set(screens.map(s => s.id)));
  };

  const selectionCount = selectAllMatching ? totalScreens : selectedIds.size;
  const allOnPageSelected = screens.length > 0 && screens.every(s => selectedIds.has(s.id));

  // --- Assign ---
  const handleAssign = async () => {
    if (uploadedImages.length === 0) {
      toast({ title: "No images", description: "Upload images first.", variant: "destructive" });
      return;
    }
    if (selectionCount === 0) {
      toast({ title: "No screens selected", description: "Select screens first.", variant: "destructive" });
      return;
    }

    if (assignMode === "single" && uploadedImages.length > 1) {
      toast({
        title: "Note",
        description: "Only the first uploaded image will be used in 'Same image to all' mode.",
      });
    }

    let screenIds: string[];
    if (selectAllMatching) {
      // Fetch ALL matching IDs (all pages)
      const allParams = new URLSearchParams(queryParams);
      allParams.set("page", "1");
      allParams.set("pageSize", "10000"); // big enough
      const allRes = await apiRequest("GET", `/api/admin/screens/image-manager?${allParams.toString()}`);
      const allData: PaginatedScreensResponse = await allRes.json();
      screenIds = allData.screens.map(s => s.id);
    } else {
      screenIds = Array.from(selectedIds);
    }

    bulkAssignMutation.mutate({ screenIds, imageUrls: uploadedImages, mode: assignMode });
  };

  // --- Filter handlers ---
  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setVenueCategory("all");
    setVenueName("");
    setHostFilter("");
    setCity("");
    setState("all");
    setEnvironmentType("all");
    setCategory("all");
    setStatusFilter("all");
    setHasImages("no");
    setPage(1);
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  };

  const hasActiveFilters = search || venueCategory !== "all" || venueName || hostFilter || city || state !== "all" || environmentType !== "all" || category !== "all" || statusFilter !== "all" || hasImages !== "all";

  // Get thumbnail URL
  const getThumb = (screen: Screen) => {
    const img = screen.screenImages?.[0] ?? (screen as any).images?.[0];
    return img || null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-slate-50 to-violet-50/40 px-6 py-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200/50">
            <ImagePlus className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Screen Image Manager</h1>
            <p className="text-sm text-slate-500 mt-0.5">Bulk assign images to screens across your inventory</p>
          </div>
        </div>
        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="bg-white rounded-lg px-4 py-2 border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Total Matching</span>
            <p className="text-lg font-bold text-slate-900">{totalScreens.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Selected</span>
            <p className="text-lg font-bold text-violet-600">{selectionCount.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg px-4 py-2 border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Images Ready</span>
            <p className="text-lg font-bold text-emerald-600">{uploadedImages.length}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">Filters</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="ml-auto text-xs text-slate-500 hover:text-slate-900" onClick={clearFilters}>
              <RotateCcw className="w-3 h-3 mr-1" /> Clear all
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="col-span-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search name, address, host..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="h-9 text-sm"
              />
              <Button size="sm" variant="outline" onClick={handleSearch} className="h-9 px-3">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Has Images */}
          <Select value={hasImages} onValueChange={(v: "yes" | "no" | "all") => { setHasImages(v); setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Image Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Screens</SelectItem>
              <SelectItem value="no">Without Images</SelectItem>
              <SelectItem value="yes">With Images</SelectItem>
            </SelectContent>
          </Select>

          {/* Venue Category */}
          <Select value={venueCategory} onValueChange={v => { setVenueCategory(v); setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Venue Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Venues</SelectItem>
              {VENUE_CATEGORIES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* City */}
          <Input
            placeholder="City..."
            value={city}
            onChange={e => setCity(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}}
            onBlur={() => { setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}
            className="h-9 text-sm"
          />

          {/* State */}
          <Select value={state} onValueChange={v => { setState(v); setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Environment Type */}
          <Select value={environmentType} onValueChange={v => { setEnvironmentType(v); setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Environments</SelectItem>
              {ENVIRONMENT_TYPES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select value={category} onValueChange={v => { setCategory(v); setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SCREEN_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          {/* Venue Name */}
          <Input
            placeholder="Venue..."
            value={venueName}
            onChange={e => setVenueName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}}
            onBlur={() => { setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}
            className="h-9 text-sm"
          />

          {/* Host / Provider Code */}
          <Input
            placeholder="Host (e.g. IND-06-PVR)..."
            value={hostFilter}
            onChange={e => setHostFilter(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}}
            onBlur={() => { setPage(1); setSelectedIds(new Set()); setSelectAllMatching(false); }}
            className="h-9 text-sm font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {/* Select All banner */}
        {allOnPageSelected && totalScreens > screens.length && !selectAllMatching && (
          <div className="bg-violet-50 border border-violet-200 rounded-lg px-4 py-2.5 mb-3 text-sm flex items-center justify-between">
            <span className="text-violet-700">
              All <strong>{screens.length}</strong> screens on this page are selected.
            </span>
            <Button variant="link" size="sm" className="text-violet-600 font-semibold px-0" onClick={handleSelectAllMatching}>
              Select all {totalScreens.toLocaleString()} matching screens
            </Button>
          </div>
        )}
        {selectAllMatching && (
          <div className="bg-violet-100 border border-violet-300 rounded-lg px-4 py-2.5 mb-3 text-sm flex items-center justify-between">
            <span className="text-violet-800 font-medium">
              All <strong>{totalScreens.toLocaleString()}</strong> matching screens are selected.
            </span>
            <Button variant="link" size="sm" className="text-violet-600 font-semibold px-0" onClick={() => { setSelectAllMatching(false); setSelectedIds(new Set()); }}>
              Clear selection
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : screens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Monitor className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">No screens found</h3>
            <p className="text-sm text-slate-500">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left p-3 w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleSelectAllOnPage}
                      className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                    />
                  </th>
                  <th className="text-left p-3 w-16 font-semibold text-slate-600">Image</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Name</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Host</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Venue</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Owner</th>
                  <th className="text-left p-3 font-semibold text-slate-600">City</th>
                  <th className="text-left p-3 font-semibold text-slate-600">Location</th>
                  <th className="text-left p-3 font-semibold text-slate-600 hidden lg:table-cell">Address</th>
                  <th className="text-left p-3 font-semibold text-slate-600 hidden xl:table-cell">Category</th>
                  <th className="text-left p-3 font-semibold text-slate-600 hidden xl:table-cell">Environment</th>
                  <th className="text-left p-3 font-semibold text-slate-600 w-24">Status</th>
                </tr>
              </thead>
              <tbody>
                {screens.map(screen => {
                  const thumb = getThumb(screen);
                  const isSelected = selectAllMatching || selectedIds.has(screen.id);
                  return (
                    <tr
                      key={screen.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors cursor-pointer ${isSelected ? "bg-violet-50/50" : ""}`}
                      onClick={() => toggleSelect(screen.id)}
                    >
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(screen.id)}
                          className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                        />
                      </td>
                      <td className="p-3">
                        {thumb ? (
                          <img src={thumb} alt="" className="w-12 h-12 object-cover rounded-lg border border-slate-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                            <ImageOff className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="font-medium text-slate-900 truncate max-w-[200px]">{screen.name}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{screen.id.slice(0, 8)}…</p>
                      </td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        {screen.host ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-xs font-semibold bg-blue-50/70 text-blue-700 border-blue-200">
                              {screen.host}
                            </Badge>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                navigator.clipboard.writeText(screen.host || "");
                                toast({ title: "Copied Host!", description: screen.host || "" });
                              }}
                              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Copy host code"
                            >
                              <ClipboardCopy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <p className="text-slate-700 truncate max-w-[150px]">{screen.venueName}</p>
                        <p className="text-xs text-slate-400">{screen.venueCategory}</p>
                      </td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        {screen.ownedByAdmin ? (
                          <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
                            <User className="w-3 h-3 mr-1" />Admin
                          </Badge>
                        ) : screen.ownerId ? (
                          <span className="text-xs text-slate-500 font-mono">{screen.ownerId.slice(0, 8)}…</span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700">{screen.city}</td>
                      <td className="p-3" onClick={e => e.stopPropagation()}>
                        {screen.latitude && screen.longitude ? (
                          <div className="flex items-center gap-1">
                            <a
                              href={`https://www.google.com/maps?q=${screen.latitude},${screen.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono"
                              title="Open in Google Maps"
                            >
                              {Number(screen.latitude).toFixed(4)}, {Number(screen.longitude).toFixed(4)}
                            </a>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                navigator.clipboard.writeText(`${screen.latitude},${screen.longitude}`);
                                toast({ title: "Copied!", description: `${screen.latitude},${screen.longitude}` });
                              }}
                              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Copy coordinates"
                            >
                              <ClipboardCopy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[200px] hidden lg:table-cell">{screen.location}</td>
                      <td className="p-3 hidden xl:table-cell">
                        <Badge variant="outline" className="text-xs">{screen.category}</Badge>
                      </td>
                      <td className="p-3 hidden xl:table-cell text-slate-600 text-xs">{screen.environmentType}</td>
                      <td className="p-3">
                        <Badge
                          variant={screen.status === "active" ? "default" : screen.status === "pending" ? "secondary" : "destructive"}
                          className="text-xs capitalize"
                        >
                          {screen.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Rows per page:</span>
              <Select value={pageSize.toString()} onValueChange={v => { setPageSize(parseInt(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <span className="text-sm text-slate-500 ml-2">
                Page {page} of {totalPages} ({totalScreens.toLocaleString()} total)
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Panel */}
      {selectionCount > 0 && (
        <div className="border-t bg-white shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)] px-6 py-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Selection Info */}
            <div className="flex items-center gap-2 text-sm font-medium text-violet-700 bg-violet-50 px-3 py-1.5 rounded-full shrink-0">
              <CheckCircle className="w-4 h-4" />
              {selectionCount.toLocaleString()} screen{selectionCount !== 1 ? "s" : ""} selected
            </div>

            {/* Upload Area */}
            <div className="flex-1 min-w-0">
              <div
                className={`border-2 border-dashed rounded-xl p-4 transition-all cursor-pointer ${
                  isDragging
                    ? "border-violet-400 bg-violet-50"
                    : "border-slate-300 hover:border-violet-300 hover:bg-violet-50/30"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-violet-600">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                  </div>
                ) : uploadedImages.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Upload className="w-4 h-4" />
                    <span>Drop images here or click to upload</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    {uploadedImages.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img src={url} alt="" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm" />
                        <button
                          onClick={e => { e.stopPropagation(); removeUploadedImage(idx); }}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <div className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-colors">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mode Selector + Assign Button */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-slate-500 font-medium">Assignment Mode</Label>
                <Select value={assignMode} onValueChange={(v: AssignMode) => setAssignMode(v)}>
                  <SelectTrigger className="h-9 w-[190px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">
                      <span className="flex items-center gap-1.5">
                        <Copy className="w-3.5 h-3.5 text-blue-500" />Same image to all
                      </span>
                    </SelectItem>
                    <SelectItem value="random">
                      <span className="flex items-center gap-1.5">
                        <Shuffle className="w-3.5 h-3.5 text-amber-500" />Random — one each
                      </span>
                    </SelectItem>
                    <SelectItem value="all">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />All images to all
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="lg"
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-200/50 px-6 mt-4"
                disabled={uploadedImages.length === 0 || bulkAssignMutation.isPending}
                onClick={handleAssign}
              >
                {bulkAssignMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</>
                ) : (
                  <><ImagePlus className="w-4 h-4 mr-2" />Assign Images</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
