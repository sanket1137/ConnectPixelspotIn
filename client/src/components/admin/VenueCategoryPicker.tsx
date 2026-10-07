import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VENUE_FAMILIES, typesInFamily } from "@shared/venueTaxonomy";

// Venue category (type slug) picker, grouped by family
export function VenueCategoryPicker({ value, onChange, id }: { value: string; onChange: (slug: string) => void; id?: string }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full sm:w-72">
        <SelectValue placeholder="Choose a venue category" />
      </SelectTrigger>
      <SelectContent className="max-h-[360px]">
        {VENUE_FAMILIES.map((f) => (
          <SelectGroup key={f.slug}>
            <SelectLabel>{f.label}</SelectLabel>
            {typesInFamily(f.slug).map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
