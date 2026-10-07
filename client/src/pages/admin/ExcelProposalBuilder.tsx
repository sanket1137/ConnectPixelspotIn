import React, { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileSpreadsheet,
  Printer,
  Download,
  Search,
  SlidersHorizontal,
  Filter,
  CheckSquare,
  Square,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Sparkles,
  Calculator,
  Building2,
  MapPin,
  Users,
  Settings2,
  X,
  Check,
  TrendingUp,
  Globe,
  FileText,
  Eye,
  EyeOff,
  Info,
  DollarSign,
  Activity,
  Clock,
  ChevronDown,
  Layers,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";
import { normalizeCityName } from "@shared/constants";

// ── Column Definition for Screens ──
export interface ColumnMeta {
  key: string;
  label: string;
  category: "Core" | "Location" | "Technical" | "Audience" | "Financials" | "Operations";
  align?: "left" | "center" | "right";
  format?: "text" | "currency" | "number" | "boolean" | "date";
  isInternal?: boolean; // If true, marked as internal (e.g. procurement base price)
}

export const ALL_COLUMNS: ColumnMeta[] = [
  // Core
  { key: "name", label: "Screen Name", category: "Core", align: "left" },
  { key: "venueName", label: "Venue Name", category: "Core", align: "left" },
  { key: "category", label: "Screen Format", category: "Core", align: "left" },
  { key: "displayFormat", label: "Orientation", category: "Core", align: "center" },
  { key: "resolution", label: "Resolution", category: "Core", align: "center" },
  { key: "size", label: "Physical Dimensions", category: "Core", align: "center" },
  { key: "host", label: "Host / Network Code", category: "Core", align: "center", isInternal: true },
  { key: "isMultiScreen", label: "Multi-Screen", category: "Core", align: "center", format: "boolean" },
  { key: "numberOfScreens", label: "Screen Count", category: "Core", align: "right", format: "number" },
  { key: "id", label: "Screen ID", category: "Core", align: "left", isInternal: true },

  // Location
  { key: "city", label: "City", category: "Location", align: "left" },
  { key: "state", label: "State", category: "Location", align: "left" },
  { key: "location", label: "Full Address", category: "Location", align: "left" },
  { key: "pincode", label: "Pincode", category: "Location", align: "center" },
  { key: "latitude", label: "Latitude", category: "Location", align: "right", isInternal: true },
  { key: "longitude", label: "Longitude", category: "Location", align: "right", isInternal: true },
  { key: "venueCategory", label: "Venue Category", category: "Location", align: "left" },
  { key: "venueType", label: "Venue Type Slug", category: "Location", align: "left", isInternal: true },
  { key: "environmentType", label: "Environment", category: "Location", align: "center" },
  { key: "visibility", label: "Visibility", category: "Location", align: "center" },

  // Financials & Commercials
  { key: "clientPricePerDay", label: "Client Rate / Day (₹)", category: "Financials", align: "right", format: "currency" },
  { key: "campaignDurationDays", label: "Duration (Days)", category: "Financials", align: "right", format: "number" },
  { key: "screenTotalCost", label: "Total Cost (₹)", category: "Financials", align: "right", format: "currency" },
  { key: "pricePerDay", label: "Base Rate / Day (₹)", category: "Financials", align: "right", format: "currency", isInternal: true },
  { key: "bundlePricePerDay", label: "Bundle Rate (₹)", category: "Financials", align: "right", format: "currency" },
  { key: "minBookingDays", label: "Min Booking Days", category: "Financials", align: "right", format: "number" },
  { key: "zoneName", label: "Zone Package", category: "Financials", align: "left" },

  // Audience & Reach
  { key: "avgDailyFootfall", label: "Avg Daily Footfall", category: "Audience", align: "right", format: "number" },
  { key: "trafficType", label: "Traffic Flow", category: "Audience", align: "left" },
  { key: "avgDwellTime", label: "Avg Dwell Time (Min)", category: "Audience", align: "right", format: "number" },
  { key: "detailedAgeGroups", label: "Age Demographics", category: "Audience", align: "left" },
  { key: "genderOrientation", label: "Gender Orientation", category: "Audience", align: "left" },
  { key: "incomeLevel", label: "Income Class", category: "Audience", align: "left" },
  { key: "occupationMix", label: "Occupation Mix", category: "Audience", align: "left" },
  { key: "lifestyleTags", label: "Audience Lifestyle", category: "Audience", align: "left" },
  { key: "interestSegments", label: "Interests Segments", category: "Audience", align: "left" },

  // Technical & Playback
  { key: "durationPerSlot", label: "Slot Duration (Sec)", category: "Technical", align: "right", format: "number" },
  { key: "loopDuration", label: "Loop Duration (Sec)", category: "Technical", align: "right", format: "number" },
  { key: "maxBrandsPerLoop", label: "Max Brands / Loop", category: "Technical", align: "right", format: "number" },
  { key: "playbackSlotsPerHour", label: "Slots / Hour", category: "Technical", align: "right", format: "number" },
  { key: "contentTypesSupported", label: "Supported Formats", category: "Technical", align: "left" },

  // Operations
  { key: "operatingHoursPreset", label: "Operating Preset", category: "Operations", align: "left" },
  { key: "operationalHours", label: "Operating Hours", category: "Operations", align: "left" },
  { key: "status", label: "Status", category: "Operations", align: "center" },
  { key: "createdAt", label: "Created Date", category: "Operations", align: "center", format: "date" },
];

const DEFAULT_TABLE_COLS = [
  "name",
  "venueName",
  "city",
  "state",
  "category",
  "displayFormat",
  "resolution",
  "avgDailyFootfall",
  "environmentType",
  "pricePerDay",
  "clientPricePerDay",
  "campaignDurationDays",
  "screenTotalCost",
  "host",
];

const DEFAULT_EXPORT_COLS = [
  "name",
  "venueName",
  "city",
  "state",
  "category",
  "displayFormat",
  "resolution",
  "avgDailyFootfall",
  "environmentType",
  "clientPricePerDay",
  "campaignDurationDays",
  "screenTotalCost",
];

const VENUE_CATEGORIES = [
  "Airport",
  "Apartment",
  "Bus Stop",
  "Café",
  "Cinema",
  "Co-working",
  "College",
  "Corporate Park",
  "Flyover",
  "Gym",
  "Highway",
  "Hospital",
  "Mall",
  "Metro",
  "Office Building",
  "Restaurant",
  "Retail Store",
  "Road Junction",
  "Road Side",
  "Salon",
  "Shopping Complex",
  "Stadium",
];

const ENVIRONMENT_OPTIONS = ["Indoor", "Outdoor Digital", "Semi-Outdoor"];

export default function ExcelProposalBuilder() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ── Scope & Lazy Search State (Multi-Select Supported) ──
  const [scope, setScope] = useState<"all_india" | "state" | "city">("all_india");
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedVenueCategories, setSelectedVenueCategories] = useState<string[]>([]);
  const [selectedEnvironments, setSelectedEnvironments] = useState<string[]>([]);
  const [hostFilter, setHostFilter] = useState<string>("");
  const [keywordFilter, setKeywordFilter] = useState<string>("");

  // ── Search Numeric Filters ──
  const [searchMinPrice, setSearchMinPrice] = useState<string>("");
  const [searchMaxPrice, setSearchMaxPrice] = useState<string>("");
  const [searchMinFootfall, setSearchMinFootfall] = useState<string>("");
  const [searchMaxFootfall, setSearchMaxFootfall] = useState<string>("");
  const [searchMinDwellTime, setSearchMinDwellTime] = useState<string>("");

  // Search triggered status
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rawScreens, setRawScreens] = useState<any[]>([]);

  // ── Proposal Metadata ──
  const [clientBrand, setClientBrand] = useState("Client Proposal");
  const [campaignName, setCampaignName] = useState("DOOH Media Plan Proposal");
  const [preparedBy, setPreparedBy] = useState("PixelSpot Media Team");
  const [durationDays, setDurationDays] = useState<number>(30);

  // ── Pricing Formula / Margin State ──
  const [markupType, setMarkupType] = useState<"percent" | "multiplier" | "fixed">("percent");
  const [markupValue, setMarkupValue] = useState<number>(20); // 20% margin default
  const [customPriceExpression, setCustomPriceExpression] = useState("");

  // ── Two-Level Column Selection: Table View vs. Client Export ──
  const [tableColKeys, setTableColKeys] = useState<string[]>(DEFAULT_TABLE_COLS);
  const [exportColKeys, setExportColKeys] = useState<string[]>(DEFAULT_EXPORT_COLS);
  const [isColModalOpen, setIsColModalOpen] = useState(false);

  // ── Sorting ──
  const [sortField, setSortField] = useState<string>("avgDailyFootfall");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // ── Selection State ──
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // ── Excel-like Column Facet Filters ──
  const [columnValueFilters, setColumnValueFilters] = useState<Record<string, Set<string>>>({});
  const [columnNumericFilters, setColumnNumericFilters] = useState<Record<string, { min: string; max: string }>>({});

  // ── Table Live Filter & Formula Filter ──
  const [tableSearch, setTableSearch] = useState("");
  const [formulaFilterExpression, setFormulaFilterExpression] = useState("");
  const [activeFormulaFilter, setActiveFormulaFilter] = useState<string | null>(null);

  // ── Export States ──
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ── Fetch City Master for accurate States & Cities ──
  const { data: cityMasterData } = useQuery<{ cities: Record<string, string[]> }>({
    queryKey: ["/api/admin/cities"],
  });

  const cityMaster = cityMasterData?.cities || {};
  const stateNames = useMemo(() => Object.keys(cityMaster).sort(), [cityMaster]);

  // Derived available cities without duplicates
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    if (selectedStates.length > 0) {
      selectedStates.forEach((st) => {
        (cityMaster[st] || []).forEach((c) => citySet.add(normalizeCityName(c)));
      });
    } else {
      Object.values(cityMaster).forEach((list) => {
        (list || []).forEach((c) => citySet.add(normalizeCityName(c)));
      });
    }
    return Array.from(citySet).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [cityMaster, selectedStates]);

  // ── Execute Search ──
  const handleSearchScreens = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      params.set("scope", scope);

      if (selectedStates.length > 0) {
        params.set("states", selectedStates.join(","));
      }
      if (selectedCities.length > 0) {
        params.set("cities", selectedCities.join(","));
      }
      if (selectedVenueCategories.length > 0) {
        params.set("venueCategories", selectedVenueCategories.join(","));
      }
      if (selectedEnvironments.length > 0) {
        params.set("environmentTypes", selectedEnvironments.join(","));
      }
      if (hostFilter) params.set("host", hostFilter);
      if (keywordFilter) params.set("search", keywordFilter);

      // Numeric search constraints
      if (searchMinPrice) params.set("minPrice", searchMinPrice);
      if (searchMaxPrice) params.set("maxPrice", searchMaxPrice);
      if (searchMinFootfall) params.set("minFootfall", searchMinFootfall);
      if (searchMaxFootfall) params.set("maxFootfall", searchMaxFootfall);
      if (searchMinDwellTime) params.set("minDwellTime", searchMinDwellTime);

      params.set("limit", "2500");

      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/admin/proposal-screens?${params.toString()}`, {
        headers: { ...authHeaders },
        credentials: "include",
      });

      if (!res.ok) {
        let errMsg = `Failed to load screens (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error) errMsg = errData.error;
        } catch {}
        throw new Error(errMsg);
      }

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response format. Please refresh the page and try again.");
      }

      // Standardize city name on every fetched screen
      const fetchedScreens = (data.screens || []).map((scr: any) => ({
        ...scr,
        city: scr.city ? normalizeCityName(scr.city) : scr.city,
      }));

      setRawScreens(fetchedScreens);
      setHasSearched(true);
      setColumnValueFilters({});
      setColumnNumericFilters({});

      // By default select all retrieved screens
      setSelectedRowIds(new Set(fetchedScreens.map((s: any) => s.id)));

      toast({
        title: "Screens Loaded",
        description: `Found ${fetchedScreens.length} screens matching your criteria.`,
      });
    } catch (err: any) {
      toast({
        title: "Search Error",
        description: err.message || "Failed to query screens.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Calculate Client Price Based on Formula ──
  const calculateClientRate = (baseRate: number): number => {
    if (!baseRate || baseRate <= 0) return 0;
    if (customPriceExpression) {
      try {
        const sanitized = customPriceExpression.replace(/price/gi, String(baseRate));
        if (/^[\d\s+\-*/.()]+$/.test(sanitized)) {
          // eslint-disable-next-line no-eval
          const val = Function(`"use strict"; return (${sanitized})`)();
          return Math.round(Number(val) || baseRate);
        }
      } catch {
        // fallback
      }
    }

    if (markupType === "percent") {
      return Math.round(baseRate * (1 + (markupValue || 0) / 100));
    } else if (markupType === "multiplier") {
      return Math.round(baseRate * (markupValue || 1));
    } else if (markupType === "fixed") {
      return Math.round(markupValue || baseRate);
    }
    return baseRate;
  };

  // Canonicalize common column values to prevent duplicate filter options
  const canonicalizeFieldValue = (colKey: string, rawVal: any): any => {
    if (rawVal === undefined || rawVal === null) return rawVal;
    if (typeof rawVal !== "string") return rawVal;
    const s = rawVal.trim();
    if (colKey === "city") return normalizeCityName(s);
    if (colKey === "category") {
      const l = s.toLowerCase();
      if (l === "digital display" || l === "digital screen" || l === "digital standee" || l === "digital billboard") return "Digital Display";
      if (l === "led video wall" || l === "led display" || l === "outdoor led") return "LED Video Wall";
      if (l === "transit display") return "Transit Display";
      if (l === "kiosk") return "Kiosk";
      if (l === "mall led") return "Mall LED";
      if (l === "lift display") return "Lift Display";
      return s;
    }
    if (colKey === "displayFormat") {
      const l = s.toLowerCase();
      if (l === "portrait") return "Portrait";
      if (l === "landscape") return "Landscape";
      if (l === "square") return "Square";
      return s;
    }
    if (colKey === "environmentType") {
      const l = s.toLowerCase();
      if (l === "indoor") return "Indoor";
      if (l === "semi-outdoor" || l === "semi outdoor") return "Semi-Outdoor";
      if (l === "outdoor" || l === "outdoor digital") return "Outdoor Digital";
      return s;
    }
    if (colKey === "state") {
      if (s === "Delhi-NCR" || s === "Delhi - NCR") return "Delhi";
      if (s === "TamilNadu") return "Tamil Nadu";
      if (s === "J&K") return "Jammu & Kashmir";
      return s;
    }
    if (colKey === "status") {
      if (s === "unactive") return "inactive";
      return s;
    }
    return s;
  };

  // ── Enrich Screens with Calculated Proposal Fields & Canonical Values ──
  const enrichedScreens = useMemo(() => {
    return rawScreens.map((screen) => {
      const basePrice = Number(screen.pricePerDay || 0);
      const clientRate = calculateClientRate(basePrice);
      const totalCost = clientRate * (durationDays || 30);

      return {
        ...screen,
        city: screen.city ? normalizeCityName(screen.city) : screen.city,
        category: canonicalizeFieldValue("category", screen.category),
        displayFormat: canonicalizeFieldValue("displayFormat", screen.displayFormat),
        environmentType: canonicalizeFieldValue("environmentType", screen.environmentType),
        state: canonicalizeFieldValue("state", screen.state),
        status: canonicalizeFieldValue("status", screen.status),
        clientPricePerDay: clientRate,
        campaignDurationDays: durationDays || 30,
        screenTotalCost: totalCost,
      };
    });
  }, [rawScreens, markupType, markupValue, customPriceExpression, durationDays]);

  // ── Extract Unique Distinct Values for Every Column (Deduplicated & Canonical) ──
  const columnDistinctValues = useMemo(() => {
    const map: Record<string, { value: string; count: number }[]> = {};

    ALL_COLUMNS.forEach((col) => {
      const counts: Record<string, number> = {};
      enrichedScreens.forEach((scr) => {
        let val = scr[col.key];
        if (val === undefined || val === null || val === "") {
          counts["(Blank)"] = (counts["(Blank)"] || 0) + 1;
        } else if (Array.isArray(val)) {
          if (val.length === 0) {
            counts["(Blank)"] = (counts["(Blank)"] || 0) + 1;
          } else {
            val.forEach((item) => {
              const str = canonicalizeFieldValue(col.key, String(item));
              if (str) counts[str] = (counts[str] || 0) + 1;
            });
          }
        } else if (typeof val === "boolean") {
          const str = val ? "Yes" : "No";
          counts[str] = (counts[str] || 0) + 1;
        } else {
          const str = canonicalizeFieldValue(col.key, String(val));
          counts[str] = (counts[str] || 0) + 1;
        }
      });

      const list = Object.entries(counts).map(([v, c]) => ({ value: v, count: c }));
      if (col.format === "number" || col.format === "currency") {
        list.sort((a, b) => {
          const numA = parseFloat(a.value.replace(/[^0-9.-]/g, "")) || 0;
          const numB = parseFloat(b.value.replace(/[^0-9.-]/g, "")) || 0;
          return numA - numB;
        });
      } else {
        list.sort((a, b) => b.count - a.count);
      }
      map[col.key] = list;
    });

    return map;
  }, [enrichedScreens]);

  // ── Apply Excel Column Filters & Formula Filter ──
  const filteredScreens = useMemo(() => {
    return enrichedScreens.filter((screen) => {
      // 1. Text Search across visible values
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        const matchesText =
          (screen.name && screen.name.toLowerCase().includes(q)) ||
          (screen.venueName && screen.venueName.toLowerCase().includes(q)) ||
          (screen.city && screen.city.toLowerCase().includes(q)) ||
          (screen.state && screen.state.toLowerCase().includes(q)) ||
          (screen.host && screen.host.toLowerCase().includes(q)) ||
          (screen.category && screen.category.toLowerCase().includes(q)) ||
          (screen.venueCategory && screen.venueCategory.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      // 2. Excel Column Distinct Value Selection Filters
      for (const [colKey, allowedValues] of Object.entries(columnValueFilters)) {
        if (!allowedValues || allowedValues.size === 0) continue;

        const val = screen[colKey];
        if (Array.isArray(val)) {
          const hasMatch = val.some((v) => allowedValues.has(canonicalizeFieldValue(colKey, String(v))));
          if (!hasMatch) return false;
        } else if (typeof val === "boolean") {
          const str = val ? "Yes" : "No";
          if (!allowedValues.has(str)) return false;
        } else if (val === undefined || val === null || val === "") {
          if (!allowedValues.has("(Blank)")) return false;
        } else {
          const str = canonicalizeFieldValue(colKey, String(val));
          if (!allowedValues.has(str)) return false;
        }
      }

      // 3. Excel Column Numeric Range Filters
      for (const [colKey, range] of Object.entries(columnNumericFilters)) {
        if (!range) continue;
        const numVal = Number(screen[colKey]) || 0;
        if (range.min !== "" && range.min !== undefined) {
          const minVal = parseFloat(range.min);
          if (!isNaN(minVal) && numVal < minVal) return false;
        }
        if (range.max !== "" && range.max !== undefined) {
          const maxVal = parseFloat(range.max);
          if (!isNaN(maxVal) && numVal > maxVal) return false;
        }
      }

      // 4. Formula Expression Filter
      const activeFormula = activeFormulaFilter || formulaFilterExpression.trim();
      if (activeFormula) {
        try {
          const footfall = Number(screen.avgDailyFootfall || 0);
          const price = Number(screen.pricePerDay || 0);
          const clientPrice = Number(screen.clientPricePerDay || 0);
          const dwellTime = Number(screen.avgDwellTime || 0);
          const category = String(screen.category || "").toLowerCase();
          const venueCategory = String(screen.venueCategory || "").toLowerCase();
          const environment = String(screen.environmentType || "").toLowerCase();
          const income = String(screen.incomeLevel || "").toLowerCase();
          const city = String(screen.city || "").toLowerCase();

          const formulaCode = activeFormula
            .replace(/\bfootfall\b/g, String(footfall))
            .replace(/\bprice\b/g, String(price))
            .replace(/\bclientPrice\b/g, String(clientPrice))
            .replace(/\bdwellTime\b/g, String(dwellTime))
            .replace(/\band\b/gi, "&&")
            .replace(/\bor\b/gi, "||");

          if (!/[;`]|window|document|fetch|eval|Function/i.test(formulaCode)) {
            // eslint-disable-next-line no-eval
            const fn = new Function(
              "category",
              "venueCategory",
              "environment",
              "income",
              "city",
              `return Boolean(${formulaCode});`
            );
            const pass = fn(category, venueCategory, environment, income, city);
            if (!pass) return false;
          }
        } catch {
          // Syntax in progress, don't crash
        }
      }

      return true;
    });
  }, [enrichedScreens, tableSearch, columnValueFilters, columnNumericFilters, formulaFilterExpression, activeFormulaFilter]);

  // ── Sorted Screens ──
  const sortedScreens = useMemo(() => {
    return [...filteredScreens].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortOrder === "asc" ? valA - valB : valB - valA;
      }
      return sortOrder === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredScreens, sortField, sortOrder]);

  // ── Selected Screens Subset ──
  const selectedScreensList = useMemo(() => {
    return sortedScreens.filter((s) => selectedRowIds.has(s.id));
  }, [sortedScreens, selectedRowIds]);

  // ── Aggregated Proposal KPIs ──
  const proposalKpis = useMemo(() => {
    const totalSelected = selectedScreensList.length;
    const totalDailyReach = selectedScreensList.reduce((acc, s) => acc + (Number(s.avgDailyFootfall) || 0), 0);
    const totalDailyClientSpend = selectedScreensList.reduce((acc, s) => acc + (Number(s.clientPricePerDay) || 0), 0);
    const totalDailyBaseCost = selectedScreensList.reduce((acc, s) => acc + (Number(s.pricePerDay) || 0), 0);
    const totalCampaignValue = totalDailyClientSpend * (durationDays || 30);
    const totalCampaignCost = totalDailyBaseCost * (durationDays || 30);
    const netGrossProfit = totalCampaignValue - totalCampaignCost;
    const profitMarginPct = totalCampaignValue > 0 ? ((netGrossProfit / totalCampaignValue) * 100).toFixed(1) : "0";

    const uniqueCities = new Set(selectedScreensList.map((s) => s.city).filter(Boolean)).size;

    return {
      totalSelected,
      totalDailyReach,
      totalDailyClientSpend,
      totalDailyBaseCost,
      totalCampaignValue,
      totalCampaignCost,
      netGrossProfit,
      profitMarginPct,
      uniqueCities,
    };
  }, [selectedScreensList, durationDays]);

  // ── Active Columns to Render in Table ──
  const activeTableColumns = useMemo(() => {
    return ALL_COLUMNS.filter((c) => tableColKeys.includes(c.key));
  }, [tableColKeys]);

  // ── Active Columns for Client Export ──
  const activeExportColumns = useMemo(() => {
    return ALL_COLUMNS.filter((c) => exportColKeys.includes(c.key));
  }, [exportColKeys]);

  // ── Selection Handlers ──
  const handleToggleSelectAll = () => {
    if (selectedRowIds.size === filteredScreens.length && filteredScreens.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredScreens.map((s) => s.id)));
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRowIds(next);
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // ── Column Filter Toggles ──
  const toggleColumnValue = (colKey: string, val: string) => {
    setColumnValueFilters((prev) => {
      const currentSet = new Set(prev[colKey] || []);
      if (currentSet.has(val)) {
        currentSet.delete(val);
      } else {
        currentSet.add(val);
      }
      if (currentSet.size === 0) {
        const next = { ...prev };
        delete next[colKey];
        return next;
      }
      return { ...prev, [colKey]: currentSet };
    });
  };

  const clearColumnFilter = (colKey: string) => {
    setColumnValueFilters((prev) => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
    setColumnNumericFilters((prev) => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
  };

  const clearAllFilters = () => {
    setColumnValueFilters({});
    setColumnNumericFilters({});
    setTableSearch("");
    setFormulaFilterExpression("");
    setActiveFormulaFilter(null);
  };

  const activeFiltersCount = useMemo(() => {
    let count = Object.keys(columnValueFilters).length;
    count += Object.keys(columnNumericFilters).filter(
      (k) => columnNumericFilters[k]?.min !== "" || columnNumericFilters[k]?.max !== ""
    ).length;
    if (tableSearch) count++;
    if (formulaFilterExpression || activeFormulaFilter) count++;
    return count;
  }, [columnValueFilters, columnNumericFilters, tableSearch, formulaFilterExpression, activeFormulaFilter]);

  // ── Export Excel Handler ──
  const handleExportExcel = async (exportMode: "single_sheet" | "city_worksheets" = "single_sheet") => {
    if (selectedScreensList.length === 0) {
      toast({
        title: "No Screens Selected",
        description: "Please select at least 1 screen to export the proposal.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsExportingExcel(true);
      const authHeaders = await getAuthHeaders();

      // STRICTLY USE exportColKeys for client spreadsheet!
      const payload = {
        clientBrand,
        campaignName,
        preparedBy,
        durationDays: durationDays || 30,
        exportMode,
        columns: activeExportColumns.map((c) => ({
          key: c.key,
          label: c.label,
          numFmt: c.format === "currency" ? "₹#,##0" : c.format === "number" ? "#,##0" : undefined,
        })),
        screens: selectedScreensList,
      };

      const res = await fetch("/api/admin/proposal-screens/export-excel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (campaignName || "Proposal").replace(/[^a-zA-Z0-9_-]/g, "_");
      const modeSuffix = exportMode === "city_worksheets" ? "CityWise" : "Master";
      a.download = `Pixelspot_Proposal_${safeName}_${modeSuffix}_${durationDays}d.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast({
        title: exportMode === "city_worksheets" ? "Multi-Sheet Proposal Exported" : "Excel Proposal Generated",
        description:
          exportMode === "city_worksheets"
            ? `Generated Excel with Summary sheet and city-wise inventory worksheets.`
            : `Exported ${selectedScreensList.length} screens with ${activeExportColumns.length} client columns.`,
      });
    } catch (err: any) {
      toast({
        title: "Excel Export Failed",
        description: err.message || "Failed to generate Excel file.",
        variant: "destructive",
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ── Print PDF Handler ──
  const handlePrintPdf = () => {
    if (selectedScreensList.length === 0) {
      toast({
        title: "No Screens Selected",
        description: "Please select at least 1 screen to print or export PDF.",
        variant: "destructive",
      });
      return;
    }
    setTimeout(() => {
      window.print();
    }, 200);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1700px] mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* ── Top Navigation & Actions Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/media-plans")}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Media Plans
            </Button>
            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
              Admin Proposal Studio
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 text-foreground">
            <FileSpreadsheet className="h-7 w-7 text-emerald-600" />
            Excel Proposal Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Multi-select states & cities, filter inventory with Excel-style column facets, customize formula pricing, and export clean proposals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Column Selector Dialog */}
          <Dialog open={isColModalOpen} onOpenChange={setIsColModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-slate-300 dark:border-slate-700 shadow-sm">
                <SlidersHorizontal className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span>Columns</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-muted">
                  👁️ {tableColKeys.length} | 📤 {exportColKeys.length}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-primary" />
                  Configure Table Visibility & Client Export Columns
                </DialogTitle>
                <CardDescription>
                  Separately choose which columns are visible in your admin table vs. which columns are included in the proposal sent to the client (e.g. keep procurement cost or host visible in table but hidden from client export).
                </CardDescription>
              </DialogHeader>

              {/* Presets & Bulk Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-b pb-3">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-semibold text-muted-foreground mr-1">Presets:</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTableColKeys(DEFAULT_TABLE_COLS);
                      setExportColKeys(DEFAULT_EXPORT_COLS);
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    💼 Standard Client Proposal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const all = ALL_COLUMNS.map((c) => c.key);
                      setTableColKeys(all);
                      setExportColKeys(all.filter((k) => !ALL_COLUMNS.find((c) => c.key === k)?.isInternal));
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    🗄️ Full DB in Table (Hide Internal in Export)
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const all = ALL_COLUMNS.map((c) => c.key);
                      setTableColKeys(all);
                      setExportColKeys(all);
                    }}
                    className="text-xs h-7 gap-1"
                  >
                    ✨ Select All Everywhere
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExportColKeys([...tableColKeys])}
                    className="text-xs h-7 text-primary hover:bg-primary/10"
                  >
                    🔄 Sync Export = Table
                  </Button>
                </div>
              </div>

              {/* Matrix of Columns: Table vs. Export */}
              <div className="overflow-y-auto flex-1 pr-2 py-3 space-y-5">
                {(["Core", "Location", "Financials", "Audience", "Technical", "Operations"] as const).map(
                  (cat) => {
                    const colsInCat = ALL_COLUMNS.filter((c) => c.category === cat);
                    return (
                      <div key={cat} className="space-y-2 border rounded-md p-3 bg-muted/20">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                            {cat} Details ({colsInCat.length} columns)
                          </h4>
                          <div className="flex gap-4 text-xs font-semibold text-muted-foreground mr-2">
                            <span className="w-20 text-center">👁️ Table View</span>
                            <span className="w-24 text-center">📤 Client Export</span>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {colsInCat.map((col) => {
                            const isTableChecked = tableColKeys.includes(col.key);
                            const isExportChecked = exportColKeys.includes(col.key);

                            return (
                              <div
                                key={col.key}
                                className={`flex items-center justify-between p-2 rounded-md border text-xs transition-colors ${
                                  isTableChecked || isExportChecked
                                    ? "bg-background border-border"
                                    : "bg-muted/10 border-transparent text-muted-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <span className="font-medium text-foreground">{col.label}</span>
                                  {col.isInternal && (
                                    <Badge variant="outline" className="text-[10px] py-0 px-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                                      Internal Base
                                    </Badge>
                                  )}
                                  <span className="text-[11px] font-mono text-muted-foreground">({col.key})</span>
                                </div>

                                <div className="flex items-center gap-4 shrink-0">
                                  {/* Table View Checkbox */}
                                  <div className="w-20 flex justify-center">
                                    <Checkbox
                                      checked={isTableChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setTableColKeys((prev) => [...prev, col.key]);
                                        } else {
                                          setTableColKeys((prev) => prev.filter((k) => k !== col.key));
                                        }
                                      }}
                                    />
                                  </div>

                                  {/* Client Export Checkbox */}
                                  <div className="w-24 flex justify-center">
                                    <Checkbox
                                      checked={isExportChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setExportColKeys((prev) => [...prev, col.key]);
                                        } else {
                                          setExportColKeys((prev) => prev.filter((k) => k !== col.key));
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              <DialogFooter className="border-t pt-3 flex justify-between items-center sm:justify-between">
                <div className="text-xs text-muted-foreground space-x-3">
                  <span><strong>{tableColKeys.length}</strong> in Table</span>
                  <span>•</span>
                  <span><strong>{exportColKeys.length}</strong> in Client Export</span>
                </div>
                <Button onClick={() => setIsColModalOpen(false)}>Save Column Setup</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export PDF Button */}
          <Button
            onClick={handlePrintPdf}
            variant="outline"
            disabled={selectedScreensList.length === 0}
            className="gap-2 border-slate-300 dark:border-slate-700 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Printer className="h-4 w-4 text-slate-700 dark:text-slate-300" />
            Export PDF ({activeExportColumns.length} cols)
          </Button>

          {/* Quick Export City-wise Multi-Sheet Button */}
          <Button
            onClick={() => handleExportExcel("city_worksheets")}
            disabled={isExportingExcel || selectedScreensList.length === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm transition-all"
            title="Export Excel with Summary sheet and separate worksheets for each city"
          >
            {isExportingExcel ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
            City Sheets (.xlsx)
          </Button>

          {/* Export Excel (.xlsx) Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                disabled={isExportingExcel || selectedScreensList.length === 0}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all"
              >
                {isExportingExcel ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Export Excel ({activeExportColumns.length} cols)
                <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-80" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2 shadow-xl border-slate-200 dark:border-slate-800">
              <DropdownMenuItem
                onClick={() => handleExportExcel("city_worksheets")}
                className="cursor-pointer flex flex-col items-start gap-1 p-2.5 rounded-md bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-emerald-800 dark:text-emerald-300">
                  <Layers className="h-4 w-4 text-emerald-600" />
                  City-wise Multi-Sheet (.xlsx)
                </div>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  Executive Summary tab (city & venue summaries) + dedicated sheets for each city (Summary, Property List - Bengaluru, Delhi...).
                </span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuItem
                onClick={() => handleExportExcel("single_sheet")}
                className="cursor-pointer flex flex-col items-start gap-1 p-2.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <FileSpreadsheet className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  Single Master Sheet (.xlsx)
                </div>
                <span className="text-[11px] text-muted-foreground leading-relaxed">
                  All {selectedScreensList.length} screens combined in a single master spreadsheet tab.
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Proposal Metadata / Client Card ── */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 print:hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                Client / Brand Name
              </Label>
              <Input
                value={clientBrand}
                onChange={(e) => setClientBrand(e.target.value)}
                placeholder="e.g. Tata Motors / Puma"
                className="h-9 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Campaign Title
              </Label>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Q4 Festive DOOH Campaign"
                className="h-9 font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                Prepared By
              </Label>
              <Input
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="e.g. PixelSpot Media Team"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                Campaign Duration (Days)
              </Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-9 font-bold text-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── STEP 1: CAMPAIGN SCOPE & MULTI-SELECT INVENTORY SEARCH ── */}
      <Card className="border-primary/20 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/20 shadow-sm print:hidden">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" />
                Search & Scope DOOH Inventory
              </CardTitle>
              <CardDescription className="text-xs">
                Multi-select states, cities, categories, and numeric filters, then click &quot;Search Screens&quot;.
              </CardDescription>
            </div>
            {hasSearched && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs w-fit">
                ✓ Inventory Queried ({rawScreens.length} Loaded)
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Scope Selector: All India / State / City */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Campaign Geographic Scope
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setScope("all_india");
                  setSelectedStates([]);
                  setSelectedCities([]);
                }}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  scope === "all_india"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className={`p-2 rounded-md ${scope === "all_india" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">All India Campaign</div>
                  <div className="text-xs text-muted-foreground">National coverage across all states & cities</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope("state")}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  scope === "state"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className={`p-2 rounded-md ${scope === "state" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">State Level Campaign</div>
                  <div className="text-xs text-muted-foreground">Focus inventory within selected states</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope("city")}
                className={`p-3 rounded-lg border text-left transition-all flex items-start gap-3 ${
                  scope === "city"
                    ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                    : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className={`p-2 rounded-md ${scope === "city" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-sm">City Level Campaign</div>
                  <div className="text-xs text-muted-foreground">Target specific cities & metropolitan areas</div>
                </div>
              </button>
            </div>
          </div>

          {/* ── MULTI-SELECT SCOPE INPUTS (STATES, CITIES, CATEGORIES, ENVIRONMENTS) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* States Multi-Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>States {scope === "state" && <span className="text-red-500">*</span>}</span>
                {selectedStates.length > 0 && (
                  <span className="text-[11px] text-primary font-normal">({selectedStates.length} selected)</span>
                )}
              </Label>
              <SearchMultiSelect
                placeholder={scope === "all_india" ? "All States (Optional)" : "Select States..."}
                options={stateNames.map((st) => ({
                  label: st,
                  value: st,
                  count: cityMaster[st]?.length,
                }))}
                selectedValues={selectedStates}
                onChange={(vals) => {
                  setSelectedStates(vals);
                  // Keep only cities that exist in selected states
                  if (vals.length > 0) {
                    const validCities = new Set(
                      vals.flatMap((st) => (cityMaster[st] || []).map((c) => normalizeCityName(c)))
                    );
                    setSelectedCities((prev) => prev.filter((c) => validCities.has(c)));
                  }
                }}
              />
            </div>

            {/* Cities Multi-Select (Canonical Names Only) */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Cities {scope === "city" && <span className="text-red-500">*</span>}</span>
                {selectedCities.length > 0 && (
                  <span className="text-[11px] text-primary font-normal">({selectedCities.length} selected)</span>
                )}
              </Label>
              <SearchMultiSelect
                placeholder={
                  selectedStates.length > 0
                    ? `Cities in ${selectedStates.length} state(s)...`
                    : "All Cities (Optional)..."
                }
                options={availableCities.map((ct) => ({
                  label: ct,
                  value: ct,
                }))}
                selectedValues={selectedCities}
                onChange={setSelectedCities}
              />
            </div>

            {/* Venue Categories Multi-Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Venue Categories</span>
                {selectedVenueCategories.length > 0 && (
                  <span className="text-[11px] text-primary font-normal">({selectedVenueCategories.length})</span>
                )}
              </Label>
              <SearchMultiSelect
                placeholder="All Venue Categories"
                options={VENUE_CATEGORIES.map((vc) => ({
                  label: vc,
                  value: vc,
                }))}
                selectedValues={selectedVenueCategories}
                onChange={setSelectedVenueCategories}
              />
            </div>

            {/* Environment Types Multi-Select */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                <span>Environments</span>
                {selectedEnvironments.length > 0 && (
                  <span className="text-[11px] text-primary font-normal">({selectedEnvironments.length})</span>
                )}
              </Label>
              <SearchMultiSelect
                placeholder="All Environments"
                options={ENVIRONMENT_OPTIONS.map((env) => ({
                  label: env,
                  value: env,
                }))}
                selectedValues={selectedEnvironments}
                onChange={setSelectedEnvironments}
              />
            </div>
          </div>

          {/* ── NUMERIC SEARCH FILTERS (PRICING, FOOTFALL, DWELL TIME) ── */}
          <div className="p-3.5 rounded-lg border bg-background/80 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Numeric Search Criteria (Optional)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-emerald-600" />
                  Min Price / Day (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 300"
                  value={searchMinPrice}
                  onChange={(e) => setSearchMinPrice(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-emerald-600" />
                  Max Price / Day (₹)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 2500"
                  value={searchMaxPrice}
                  onChange={(e) => setSearchMaxPrice(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  Min Daily Footfall
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={searchMinFootfall}
                  onChange={(e) => setSearchMinFootfall(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  Max Daily Footfall
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={searchMaxFootfall}
                  onChange={(e) => setSearchMaxFootfall(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  Min Dwell Time (Mins)
                </Label>
                <Input
                  type="number"
                  placeholder="e.g. 10"
                  value={searchMinDwellTime}
                  onChange={(e) => setSearchMinDwellTime(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Secondary Search Filters & Search Button */}
          <div className="flex flex-col sm:flex-row items-end gap-3 pt-1">
            <div className="flex-1 w-full sm:w-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Host / Network Code (Optional)
                </Label>
                <Input
                  value={hostFilter}
                  onChange={(e) => setHostFilter(e.target.value)}
                  placeholder="e.g. IND-06-PVR, IND-01-SOX"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Keyword Search (Optional)
                </Label>
                <Input
                  value={keywordFilter}
                  onChange={(e) => setKeywordFilter(e.target.value)}
                  placeholder="Screen name, mall name, address..."
                  className="h-9"
                />
              </div>
            </div>

            <Button
              onClick={handleSearchScreens}
              disabled={isLoading || (scope === "state" && selectedStates.length === 0) || (scope === "city" && selectedCities.length === 0)}
              className="w-full sm:w-auto h-9 px-6 gap-2 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Screens
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── STEP 2: PRICING FORMULA & MARGIN CALCULATOR TOOLBAR ── */}
      {hasSearched && (
        <Card className="border-indigo-100 dark:border-indigo-950 bg-indigo-50/30 dark:bg-indigo-950/10 shadow-sm print:hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-bold text-foreground">Client Pricing Formula & Profit Margin</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Dynamically applies a markup formula to calculate the proposed client rate per screen. Base procurement rate can be kept in table but excluded from export.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground font-medium mr-1">Markup:</span>
                  {[0, 15, 20, 25, 30, 50].map((pct) => (
                    <Button
                      key={pct}
                      size="sm"
                      variant={markupType === "percent" && markupValue === pct && !customPriceExpression ? "default" : "outline"}
                      onClick={() => {
                        setMarkupType("percent");
                        setMarkupValue(pct);
                        setCustomPriceExpression("");
                      }}
                      className="text-xs h-7 px-2.5"
                    >
                      +{pct}%
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Formula e.g. price * 1.35 + 50"
                    value={customPriceExpression}
                    onChange={(e) => setCustomPriceExpression(e.target.value)}
                    className="h-7 w-48 text-xs font-mono"
                  />
                  {customPriceExpression && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCustomPriceExpression("")}
                      className="h-7 px-1.5 text-xs text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Live Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
              <div className="p-2.5 rounded-md bg-white dark:bg-slate-900 border text-center">
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Total Daily Reach
                </div>
                <div className="text-base sm:text-lg font-bold text-foreground">
                  {proposalKpis.totalDailyReach.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-white dark:bg-slate-900 border text-center">
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Base Daily Cost
                </div>
                <div className="text-base sm:text-lg font-bold text-slate-600 dark:text-slate-400">
                  ₹{proposalKpis.totalDailyBaseCost.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-white dark:bg-slate-900 border text-center">
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">
                  Proposed Daily Rate
                </div>
                <div className="text-base sm:text-lg font-bold text-primary">
                  ₹{proposalKpis.totalDailyClientSpend.toLocaleString("en-IN")}
                </div>
              </div>

              <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-center">
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wider">
                  Total Campaign ({durationDays}d)
                </div>
                <div className="text-base sm:text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
                  ₹{proposalKpis.totalCampaignValue.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: EXCEL FILTER BAR, QUICK FORMULA PRESETS & ACTIVE FILTER CHIPS ── */}
      {hasSearched && (
        <div className="space-y-3 print:hidden">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filter loaded screens by name, venue, city, format..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {tableSearch && (
                <button
                  type="button"
                  onClick={() => setTableSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="relative flex-1">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-500" />
                <Input
                  placeholder="Formula filter e.g. footfall >= 15000 and price < 1000"
                  value={formulaFilterExpression}
                  onChange={(e) => {
                    setFormulaFilterExpression(e.target.value);
                    setActiveFormulaFilter(null);
                  }}
                  className="pl-8 h-9 text-xs font-mono"
                />
                {formulaFilterExpression && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormulaFilterExpression("");
                      setActiveFormulaFilter(null);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleSelectAll}
                className="h-9 text-xs gap-1.5"
              >
                {selectedRowIds.size === filteredScreens.length && filteredScreens.length > 0 ? (
                  <>
                    <CheckSquare className="h-3.5 w-3.5 text-primary" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    Select All ({filteredScreens.length})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Active Filters Pill Bar */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md bg-muted/40 border">
              <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 mr-1">
                <Filter className="h-3 w-3 text-primary" />
                Active Column Filters:
              </span>

              {Object.entries(columnValueFilters).map(([colKey, vals]) => {
                const colMeta = ALL_COLUMNS.find((c) => c.key === colKey);
                const label = colMeta?.label || colKey;
                const valsArr = Array.from(vals);
                const displayStr = valsArr.length > 2 ? `${valsArr[0]}, +${valsArr.length - 1} more` : valsArr.join(", ");
                return (
                  <Badge
                    key={colKey}
                    variant="secondary"
                    className="gap-1.5 text-xs py-0.5 px-2 bg-primary/10 text-primary border-primary/20"
                  >
                    <span><strong>{label}:</strong> {displayStr}</span>
                    <button
                      type="button"
                      onClick={() => clearColumnFilter(colKey)}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}

              {Object.entries(columnNumericFilters).map(([colKey, range]) => {
                if (!range || (range.min === "" && range.max === "")) return null;
                const colMeta = ALL_COLUMNS.find((c) => c.key === colKey);
                const label = colMeta?.label || colKey;
                return (
                  <Badge
                    key={colKey}
                    variant="secondary"
                    className="gap-1.5 text-xs py-0.5 px-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  >
                    <span>
                      <strong>{label}:</strong> {range.min ? `≥ ${range.min}` : ""} {range.max ? `≤ ${range.max}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => clearColumnFilter(colKey)}
                      className="hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}

              {tableSearch && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <span>Search: &quot;{tableSearch}&quot;</span>
                  <button type="button" onClick={() => setTableSearch("")}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={clearAllFilters}
                className="text-[11px] h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                Clear All ({activeFiltersCount})
              </Button>
            </div>
          )}

          {/* Quick formula preset filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Formula Presets:
            </span>
            {[
              { label: "🚀 High Footfall (>20k)", formula: "footfall >= 20000" },
              { label: "🏢 Malls & Corporates", formula: "venueCategory == 'mall' || venueCategory == 'corporate park'" },
              { label: "🏷️ Budget (< ₹600/day)", formula: "price <= 600" },
              { label: "💎 Premium Audience", formula: "income.includes('premium') || income.includes('luxury')" },
              { label: "⏱️ Long Dwell (>10m)", formula: "dwellTime >= 10" },
              { label: "🏛️ Indoor Only", formula: "environment == 'indoor'" },
            ].map((chip) => {
              const isActive = activeFormulaFilter === chip.formula || formulaFilterExpression === chip.formula;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    if (isActive) {
                      setActiveFormulaFilter(null);
                      setFormulaFilterExpression("");
                    } else {
                      setActiveFormulaFilter(chip.formula);
                      setFormulaFilterExpression(chip.formula);
                    }
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white border-indigo-600 font-semibold shadow-sm"
                      : "bg-background border-border hover:bg-muted text-muted-foreground"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PRINT-ONLY PROPOSAL HEADER (USES STRICTLY EXPORT COLUMNS) ── */}
      <div className="hidden print:block mb-6 border-b-2 border-slate-900 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
              PIXELSPOT DOOH MEDIA PROPOSAL
            </h1>
            <p className="text-sm font-semibold text-slate-700 mt-1">{campaignName}</p>
          </div>
          <div className="text-right text-xs text-slate-600 space-y-0.5">
            <div><strong>Client:</strong> {clientBrand}</div>
            <div><strong>Duration:</strong> {durationDays} Days</div>
            <div><strong>Prepared By:</strong> {preparedBy}</div>
            <div><strong>Date:</strong> {new Date().toLocaleDateString("en-IN")}</div>
          </div>
        </div>

        {/* Executive KPI summary for Print */}
        <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-slate-200">
          <div className="p-2 border rounded text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Screens</div>
            <div className="text-base font-bold text-slate-900">{proposalKpis.totalSelected}</div>
          </div>
          <div className="p-2 border rounded text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Daily Reach</div>
            <div className="text-base font-bold text-slate-900">{proposalKpis.totalDailyReach.toLocaleString("en-IN")}</div>
          </div>
          <div className="p-2 border rounded text-center">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Daily Investment</div>
            <div className="text-base font-bold text-slate-900">₹{proposalKpis.totalDailyClientSpend.toLocaleString("en-IN")}</div>
          </div>
          <div className="p-2 border rounded text-center bg-slate-50">
            <div className="text-[10px] text-slate-500 uppercase font-bold">Total Investment ({durationDays}d)</div>
            <div className="text-base font-extrabold text-slate-900">₹{proposalKpis.totalCampaignValue.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </div>

      {/* ── STEP 4: DATA TABLE DISPLAY (EXCEL COLUMN FILTERS + SORTING + SELECTION) ── */}
      {!hasSearched ? (
        <Card className="border-dashed border-2 py-16 text-center shadow-none">
          <CardContent className="space-y-4">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Search className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">No Inventory Loaded Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Screens are fetched on-demand. Select your campaign states, cities, or categories above and click <strong>&quot;Search Screens&quot;</strong>.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : sortedScreens.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <Info className="h-10 w-10 mx-auto text-muted-foreground" />
            <h3 className="text-base font-semibold">No Screens Matched Your Filters</h3>
            <p className="text-xs text-muted-foreground">
              Try adjusting your geographic scope, removing column filters, or clearing the formula filter.
            </p>
            {activeFiltersCount > 0 && (
              <Button size="sm" variant="outline" onClick={clearAllFilters} className="mt-2 text-xs">
                Clear All Column Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table summary bar */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 print:hidden">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{sortedScreens.length}</strong> screens (<strong>{selectedScreensList.length}</strong> selected for export)
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                👁️ Table: {activeTableColumns.length} cols | 📤 Client Export: {activeExportColumns.length} cols
              </span>
            </div>
            <span>
              Click header to sort • Click <Filter className="h-3 w-3 inline mx-0.5 text-slate-400" /> to select values
            </span>
          </div>

          <div className="border rounded-lg overflow-x-auto shadow-sm bg-background">
            <table className="w-full text-xs text-left border-collapse">
              {/* Table Header with Excel-Style Column Filters */}
              <thead>
                <tr className="bg-slate-900 text-white font-semibold border-b border-slate-700">
                  <th className="p-3 w-10 text-center print:hidden">
                    <Checkbox
                      checked={
                        selectedRowIds.size === filteredScreens.length && filteredScreens.length > 0
                          ? true
                          : selectedRowIds.size > 0
                          ? "indeterminate"
                          : false
                      }
                      onCheckedChange={handleToggleSelectAll}
                    />
                  </th>
                  <th className="p-3 w-10 text-center font-bold">#</th>

                  {(typeof window !== "undefined" && window.matchMedia && window.matchMedia("print").matches
                    ? activeExportColumns
                    : activeTableColumns
                  ).map((col) => {
                    const isSorted = sortField === col.key;
                    const hasValueFilter = Boolean(columnValueFilters[col.key]?.size);
                    const hasNumericFilter = Boolean(
                      columnNumericFilters[col.key]?.min !== "" || columnNumericFilters[col.key]?.max !== ""
                    );
                    const isColumnFiltered = hasValueFilter || hasNumericFilter;
                    const distinctVals = columnDistinctValues[col.key] || [];

                    return (
                      <th
                        key={col.key}
                        className={`p-2.5 whitespace-nowrap select-none border-r border-slate-800 last:border-r-0 ${
                          col.align === "right"
                            ? "text-right"
                            : col.align === "center"
                            ? "text-center"
                            : "text-left"
                        }`}
                      >
                        <div className={`inline-flex items-center gap-1.5 ${col.align === "right" ? "justify-end" : ""}`}>
                          {/* Sort click area */}
                          <div
                            onClick={() => handleSort(col.key)}
                            className="inline-flex items-center gap-1 cursor-pointer hover:text-emerald-400 transition-colors"
                          >
                            <span>{col.label}</span>
                            {isSorted ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <ArrowDown className="h-3 w-3 text-emerald-400" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </div>

                          {/* Excel Column Facet Filter Popover */}
                          <div className="print:hidden">
                            <ColumnFilterPopover
                              column={col}
                              uniqueValues={distinctVals}
                              selectedValues={columnValueFilters[col.key] || new Set()}
                              onToggleValue={(val) => toggleColumnValue(col.key, val)}
                              onSelectAllValues={() => {
                                const allVals = new Set(distinctVals.map((d) => d.value));
                                setColumnValueFilters((prev) => ({ ...prev, [col.key]: allVals }));
                              }}
                              onClearFilter={() => clearColumnFilter(col.key)}
                              isFiltered={isColumnFiltered}
                              numericRange={columnNumericFilters[col.key] || { min: "", max: "" }}
                              onNumericRangeChange={(range) => {
                                setColumnNumericFilters((prev) => ({ ...prev, [col.key]: range }));
                              }}
                            />
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-border">
                {sortedScreens.map((screen, sIdx) => {
                  const isSelected = selectedRowIds.has(screen.id);
                  return (
                    <tr
                      key={screen.id || sIdx}
                      className={`transition-colors ${
                        isSelected
                          ? "bg-primary/[0.03] hover:bg-primary/[0.06]"
                          : "opacity-60 hover:opacity-100 bg-background hover:bg-muted/30"
                      }`}
                    >
                      {/* Checkbox column */}
                      <td className="p-3 text-center print:hidden">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleRow(screen.id)}
                        />
                      </td>

                      {/* Row Index */}
                      <td className="p-3 text-center text-muted-foreground font-mono text-[11px]">
                        {sIdx + 1}
                      </td>

                      {/* Dynamic Columns */}
                      {activeTableColumns.map((col) => {
                        const val = screen[col.key];

                        return (
                          <td
                            key={col.key}
                            className={`p-3 whitespace-nowrap ${
                              col.align === "right"
                                ? "text-right font-mono"
                                : col.align === "center"
                                ? "text-center"
                                : "text-left"
                            } ${
                              col.key === "clientPricePerDay" || col.key === "screenTotalCost"
                                ? "font-bold text-emerald-600 dark:text-emerald-400"
                                : col.key === "pricePerDay"
                                ? "text-muted-foreground"
                                : ""
                            }`}
                          >
                            {col.format === "currency" ? (
                              val !== undefined && val !== null ? `₹${Number(val).toLocaleString("en-IN")}` : "-"
                            ) : col.format === "number" ? (
                              val !== undefined && val !== null ? Number(val).toLocaleString("en-IN") : "-"
                            ) : col.format === "boolean" ? (
                              val ? "Yes" : "No"
                            ) : col.format === "date" ? (
                              val ? new Date(val).toLocaleDateString("en-IN") : "-"
                            ) : Array.isArray(val) ? (
                              val.join(", ")
                            ) : val !== undefined && val !== null ? (
                              String(val)
                            ) : (
                              "-"
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer with SUM / Formula Totals */}
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="p-3 print:hidden"></td>
                  <td className="p-3 text-center text-xs">TOTAL</td>

                  {activeTableColumns.map((col) => {
                    if (col.key === "name") {
                      return (
                        <td key={col.key} className="p-3 font-bold text-foreground">
                          {selectedScreensList.length} Screens Selected
                        </td>
                      );
                    }
                    if (col.key === "avgDailyFootfall") {
                      return (
                        <td key={col.key} className="p-3 text-right font-mono font-bold text-primary">
                          {proposalKpis.totalDailyReach.toLocaleString("en-IN")}
                        </td>
                      );
                    }
                    if (col.key === "pricePerDay") {
                      return (
                        <td key={col.key} className="p-3 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                          ₹{proposalKpis.totalDailyBaseCost.toLocaleString("en-IN")}
                        </td>
                      );
                    }
                    if (col.key === "clientPricePerDay") {
                      return (
                        <td key={col.key} className="p-3 text-right font-mono font-bold text-primary">
                          ₹{proposalKpis.totalDailyClientSpend.toLocaleString("en-IN")}
                        </td>
                      );
                    }
                    if (col.key === "screenTotalCost") {
                      return (
                        <td key={col.key} className="p-3 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          ₹{proposalKpis.totalCampaignValue.toLocaleString("en-IN")}
                        </td>
                      );
                    }
                    return <td key={col.key} className="p-3"></td>;
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── PRINT-ONLY FOOTER ── */}
      <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-[11px] text-slate-500 flex justify-between">
        <div>Generated by PixelSpot DOOH Platform • Confidential Client Proposal</div>
        <div>All rates subject to slot availability and final confirmation</div>
      </div>
    </div>
  );
}

// ── Searchable Multi-Select Dropdown Component ──
interface SearchMultiSelectProps {
  placeholder: string;
  options: { label: string; value: string; count?: number }[];
  selectedValues: string[];
  onChange: (vals: string[]) => void;
}

function SearchMultiSelect({
  placeholder,
  options,
  selectedValues,
  onChange,
}: SearchMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );
  }, [options, searchQuery]);

  const toggleOption = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const displayText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      return match ? match.label : selectedValues[0];
    }
    if (selectedValues.length <= 2) {
      return selectedValues.join(", ");
    }
    return `${selectedValues[0]}, +${selectedValues.length - 1} more`;
  }, [selectedValues, options, placeholder]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-9 px-3 text-left border rounded-md bg-background flex items-center justify-between gap-2 text-xs hover:border-slate-400 transition-colors"
        >
          <span className={`truncate ${selectedValues.length > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            {displayText}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {selectedValues.length > 0 && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onChange([]);
                }}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-2.5 text-xs space-y-2 bg-popover shadow-xl border">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-8 text-xs"
          />
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 border-b pb-1.5">
          <button
            type="button"
            onClick={() => onChange(options.map((o) => o.value))}
            className="hover:text-primary font-medium"
          >
            Select All ({options.length})
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="hover:text-primary font-medium"
          >
            Clear Selected
          </button>
        </div>

        {/* Scrollable List */}
        <div className="max-h-52 overflow-y-auto space-y-1 pr-1 border rounded p-1 bg-background">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-3 text-muted-foreground text-[11px]">No options found</div>
          ) : (
            filteredOptions.map((opt) => {
              const isChecked = selectedValues.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleOption(opt.value)}
                    />
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {opt.count !== undefined && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                      ({opt.count})
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-between items-center pt-1 border-t">
          <span className="text-[11px] text-muted-foreground font-medium">
            {selectedValues.length} selected
          </span>
          <Button size="sm" onClick={() => setIsOpen(false)} className="h-6 text-[11px] px-2.5">
            Done
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Excel-Style Column Filter Popover Component ──
interface ColumnFilterPopoverProps {
  column: ColumnMeta;
  uniqueValues: { value: string; count: number }[];
  selectedValues: Set<string>;
  onToggleValue: (val: string) => void;
  onSelectAllValues: () => void;
  onClearFilter: () => void;
  isFiltered: boolean;
  numericRange: { min: string; max: string };
  onNumericRangeChange: (range: { min: string; max: string }) => void;
}

function ColumnFilterPopover({
  column,
  uniqueValues,
  selectedValues,
  onToggleValue,
  onSelectAllValues,
  onClearFilter,
  isFiltered,
  numericRange,
  onNumericRangeChange,
}: ColumnFilterPopoverProps) {
  const [searchVal, setSearchVal] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredValues = useMemo(() => {
    if (!searchVal.trim()) return uniqueValues;
    const q = searchVal.toLowerCase().trim();
    return uniqueValues.filter((item) => item.value.toLowerCase().includes(q));
  }, [uniqueValues, searchVal]);

  const isNumeric = column.format === "number" || column.format === "currency";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`p-1 rounded transition-colors ${
            isFiltered
              ? "bg-emerald-500 text-white shadow-sm"
              : "hover:bg-slate-800 text-slate-400 hover:text-white"
          }`}
          title={`Filter by ${column.label}`}
        >
          <Filter className={`h-3 w-3 ${isFiltered ? "fill-white" : ""}`} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-3 text-xs space-y-3 bg-popover shadow-xl border">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="font-bold text-foreground truncate">{column.label} Filter</div>
          {isFiltered && (
            <button
              type="button"
              onClick={() => {
                onClearFilter();
                setSearchVal("");
              }}
              className="text-[11px] text-red-500 hover:underline font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {/* If Numeric Column: Provide Min/Max range filter inputs */}
        {isNumeric && (
          <div className="space-y-2 p-2 rounded bg-muted/30 border">
            <span className="text-[11px] font-semibold text-muted-foreground">Range Filter:</span>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={numericRange.min}
                onChange={(e) => onNumericRangeChange({ ...numericRange, min: e.target.value })}
                className="h-7 text-xs"
              />
              <Input
                type="number"
                placeholder="Max"
                value={numericRange.max}
                onChange={(e) => onNumericRangeChange({ ...numericRange, max: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
          </div>
        )}

        {/* Search through distinct values */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search values..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>

        {/* Master Select All / Clear All */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
          <button
            type="button"
            onClick={onSelectAllValues}
            className="hover:text-primary font-medium"
          >
            Select All ({uniqueValues.length})
          </button>
          <button
            type="button"
            onClick={onClearFilter}
            className="hover:text-primary font-medium"
          >
            Clear Selected
          </button>
        </div>

        {/* Scrollable list of distinct values with checkboxes */}
        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 border rounded p-1.5 bg-background">
          {filteredValues.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-[11px]">
              No matching values
            </div>
          ) : (
            filteredValues.map((item) => {
              const isChecked = selectedValues.has(item.value);
              return (
                <label
                  key={item.value}
                  className="flex items-center justify-between p-1 rounded hover:bg-muted/50 cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleValue(item.value)}
                    />
                    <span className="truncate">{item.value}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                    ({item.count})
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" onClick={() => setIsOpen(false)} className="h-7 text-xs px-3">
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
