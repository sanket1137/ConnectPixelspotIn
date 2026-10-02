import React from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { attributesFor, type AttributeDef, type CustomAttribute } from "@shared/venueAttributes";
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

// ---------- Venue-specific fields ----------

interface VenueAttributeFieldsProps {
  venueCategory: string; // current venue type selection (raw text); fields follow its canonical type
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  custom: CustomAttribute[];
  onCustomChange: (rows: CustomAttribute[]) => void;
  errors?: Record<string, string>;
}

function Field({ def, value, error, onChange }: { def: AttributeDef; value: string; error?: string; onChange: (v: string) => void }) {
  const id = `venue-attr-${def.key}`;
  const label = (
    <label htmlFor={id} className="text-sm font-medium text-slate-800">
      {def.label}
      {def.type === "currency" && <span className="text-slate-400 font-normal"> (₹)</span>}
      {def.unit && <span className="text-slate-400 font-normal"> ({def.unit})</span>}
      {def.required && <span className="ml-1 text-[11px] font-medium text-primary">Recommended</span>}
    </label>
  );
  let input: React.ReactNode;
  if (def.type === "enum") {
    input = (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {def.options!.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (def.type === "number" || def.type === "currency") {
    input = (
      <Input
        id={id}
        inputMode="decimal"
        placeholder={def.type === "currency" ? "e.g. 1,20,00,000" : /year/.test(def.key) ? "e.g. 2019" : def.unit === "%" ? "e.g. 85" : ""}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ""))}
        aria-invalid={!!error}
      />
    );
  } else {
    input = <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={300} />;
  }
  return (
    <div className="space-y-1.5">
      {label}
      {input}
      {error ? <p className="text-xs text-destructive">{error}</p> : def.help ? <p className="text-xs text-slate-500">{def.help}</p> : null}
    </div>
  );
}

export function VenueAttributeFields({ venueCategory, values, onChange, custom, onCustomChange, errors = {} }: VenueAttributeFieldsProps) {
  const type = resolveVenueType(venueCategory)?.type;
  const defs = attributesFor(type?.slug);

  const updateRow = (i: number, patch: Partial<CustomAttribute>) => onCustomChange(custom.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-5">
      {!type ? (
        <p className="text-sm text-slate-500">Choose the venue type above to see the details advertisers look for.</p>
      ) : defs.length > 0 ? (
        <>
          <p className="text-sm text-slate-600">
            Advertisers compare venues by these numbers. Fill what you know — anything left blank simply isn't shown.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {defs.map((d) => (
              <Field key={d.key} def={d} value={values[d.key] ?? ""} error={errors[d.key]} onChange={(v) => onChange(d.key, v)} />
            ))}
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <div className="text-sm font-medium text-slate-800">Custom details</div>
        <p className="text-xs text-slate-500">Anything else worth knowing, e.g. “Clubhouse members · 400 · people”.</p>
        {custom.map((row, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_110px_auto] gap-2 items-start">
            <Input placeholder="Detail" aria-label={`Custom detail ${i + 1} name`} value={row.label} maxLength={60} onChange={(e) => updateRow(i, { label: e.target.value })} />
            <Input placeholder="Value" aria-label={`Custom detail ${i + 1} value`} value={row.value} maxLength={120} onChange={(e) => updateRow(i, { value: e.target.value })} />
            <Input placeholder="Unit" aria-label={`Custom detail ${i + 1} unit`} value={row.unit ?? ""} maxLength={20} onChange={(e) => updateRow(i, { unit: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label={`Remove custom detail ${i + 1}`} onClick={() => onCustomChange(custom.filter((_, j) => j !== i))}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {custom.length < 10 && (
          <Button type="button" variant="outline" size="sm" onClick={() => onCustomChange([...custom, { label: "", value: "", unit: "" }])}>
            <Plus className="h-4 w-4 mr-1" /> Add custom detail
          </Button>
        )}
      </div>
    </div>
  );
}

// Stored attributes → form strings (numbers shown with Indian grouping, e.g. 1,20,00,000)
export function attributesToFormValues(attrs: Record<string, unknown> | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined) continue;
    out[k] = typeof v === "number" ? v.toLocaleString("en-IN") : String(v);
  }
  return out;
}

export function venueTypeSlugFor(venueCategory: string): string | null {
  return resolveVenueType(venueCategory)?.type.slug ?? null;
}

export { getVenueType };
