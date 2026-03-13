import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap } from "lucide-react";

interface Props {
  campaignName: string;
  onChange: (name: string) => void;
  error?: string;
}

export default function Step1_CampaignName({ campaignName, onChange, error }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Name your campaign</h2>
          <p className="text-sm text-muted-foreground">Give it a clear, recognisable name</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign-name" className="text-base font-medium">
          Campaign Name
        </Label>
        <Input
          id="campaign-name"
          placeholder="e.g. Summer Sale 2025, Diwali Launch, Brand Awareness Q2"
          value={campaignName}
          onChange={(e) => onChange(e.target.value)}
          className={`h-12 text-base ${error ? "border-destructive" : ""}`}
          data-testid="input-campaign-name"
          autoFocus
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground">Minimum 3 characters</p>
      </div>

      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Tip:</strong> Use a name that includes the brand, season, or goal — makes it easier to track
          across campaigns.
        </p>
      </div>
    </div>
  );
}
