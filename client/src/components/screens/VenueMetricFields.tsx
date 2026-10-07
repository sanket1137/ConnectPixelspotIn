import React from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { metricsFor, type MetricDef, type MetricRegistry } from "@shared/venueMetrics";
import { VENUE_FAMILIES, getVenueType, resolveVenueType, typesInFamily } from "@shared/venueTaxonomy";

// ---------- Venue type dropdown (grouped by family, from the taxonomy) ----------

interface VenueTypeSelectProps {
  value: string; // the venue_category text that gets saved
  onChange: (value: string) => void;
  triggerTestId?: string;
  placeholder?: string;
}

// The saved value is the type's label (e.g. "Apartment", "Cinema audi"). A screen saved earlier with
// another spelling ("Residential Building") keeps it until the owner picks something else.
export function VenueTypeSelect({ value, onChange, triggerTestId, placeholder = "Select venue type" }: VenueTypeSelectProps) {
  const labels = new Set(VENUE_FAMILIES.flatMap((f) => typesInFamily(f.slug).map((t) => t.label)));
  const legacy = value && !labels.has(value) ? value : null;
  const legacyType = legacy ? resolveVenueType(legacy)?.type : undefined;
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger data-testid={triggerTestId}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[340px]">
        {legacy && (
          <SelectGroup>
            <SelectLabel>Current</SelectLabel>
            <SelectItem value={legacy}>
              {legacy}
              {legacyType ? ` — counts as ${legacyType.label}` : ""}
            </SelectItem>
          </SelectGroup>
        )}
        {VENUE_FAMILIES.map((f) => (
          <SelectGroup key={f.slug}>
            <SelectLabel>{f.label}</SelectLabel>
            {typesInFamily(f.slug).map((t) => (
              <SelectItem key={t.slug} value={t.label}>
                {t.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- Venue metric fields (from the admin-managed definitions) ----------

export type MetricFormValues = Record<string, string | string[]>;

interface VenueMetricFieldsProps {
  registry: MetricRegistry;
  venueCategory: string; // current venue type selection (raw text); fields follow its canonical type
  values: MetricFormValues;
  onChange: (key: string, value: string | string[]) => void;
  errors?: Record<string, string>;
}

function Field({ def, value, error, onChange }: { def: MetricDef; value: string | string[]; error?: string; onChange: (v: string | string[]) => void }) {
  const id = `venue-metric-${def.key}`;
  const text = Array.isArray(value) ? value.join(", ") : value;
  const label = (
    <label htmlFor={id} className="text-sm font-medium text-slate-800">
      {def.label}
      {def.kind === "currency" && <span className="text-slate-400 font-normal"> (₹)</span>}
      {def.unit && <span className="text-slate-400 font-normal"> ({def.unit})</span>}
      {def.required && <span className="ml-1 text-[11px] font-medium text-primary">Recommended</span>}
    </label>
  );
  let input: React.ReactNode;
  if (def.kind === "enum" || def.kind === "boolean") {
    const options = def.kind === "boolean" ? ["Yes", "No"] : def.options || [];
    input = (
      <Select value={text || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (def.kind === "multi") {
    const chosen = Array.isArray(value) ? value : text ? text.split(",").map((s) => s.trim()) : [];
    input = (
      <div id={id} role="group" aria-label={def.label} className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        {(def.options || []).map((o) => (
          <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
            <Checkbox checked={chosen.includes(o)} onCheckedChange={(on) => onChange(on ? [...chosen, o] : chosen.filter((x) => x !== o))} />
            {o}
          </label>
        ))}
      </div>
    );
  } else if (def.kind === "number" || def.kind === "currency") {
    input = (
      <Input
        id={id}
        inputMode="decimal"
        placeholder={def.kind === "currency" ? "e.g. 1,20,00,000" : /year/.test(def.key) ? "e.g. 2019" : def.unit === "%" ? "e.g. 85" : ""}
        value={text}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        aria-invalid={!!error}
      />
    );
  } else {
    input = <Input id={id} value={text} onChange={(e) => onChange(e.target.value)} maxLength={300} />;
  }
  return (
    <div className="space-y-1.5">
      {label}
      {input}
      {error ? <p className="text-xs text-destructive">{error}</p> : def.help ? <p className="text-xs text-slate-500">{def.help}</p> : null}
    </div>
  );
}

export function VenueMetricFields({ registry, venueCategory, values, onChange, errors = {} }: VenueMetricFieldsProps) {
  const type = resolveVenueType(venueCategory)?.type;
  const defs = metricsFor(registry, type?.slug);
  if (!type) return <p className="text-sm text-slate-500">Choose the venue type above to see the details advertisers look for.</p>;
  if (!defs.length) return <p className="text-sm text-slate-500">No details are set up for {type.label} yet.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Advertisers compare venues by these numbers. Fill what you know — anything left blank simply isn't shown.</p>
      <div className="grid md:grid-cols-2 gap-4">
        {defs.map((d) => (
          <Field key={d.key} def={d} value={values[d.key] ?? ""} error={errors[d.key]} onChange={(v) => onChange(d.key, v)} />
        ))}
      </div>
    </div>
  );
}

// Stored metrics → form values (numbers shown with Indian grouping, e.g. 1,20,00,000)
export function metricsToFormValues(metrics: Record<string, unknown> | null | undefined): MetricFormValues {
  const out: MetricFormValues = {};
  for (const [k, v] of Object.entries(metrics || {})) {
    if (v === null || v === undefined) continue;
    out[k] = Array.isArray(v) ? v.map(String) : typeof v === "number" ? v.toLocaleString("en-IN") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v);
  }
  return out;
}

export function venueTypeSlugFor(venueCategory: string): string | null {
  return resolveVenueType(venueCategory)?.type.slug ?? null;
}

export { getVenueType };
