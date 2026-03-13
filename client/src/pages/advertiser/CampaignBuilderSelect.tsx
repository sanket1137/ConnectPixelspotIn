import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Bot, SlidersHorizontal, ArrowRight, Clock, Sparkles, Settings2 } from "lucide-react";

const modes = [
  {
    id: "express",
    icon: Zap,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    borderHover: "hover:border-amber-500/50",
    title: "Express Campaign",
    tagline: "Launch in minutes",
    description:
      "You already know which screens you want. Pick your location, choose screens, set dates, and go live fast.",
    features: ["Choose city or drop a pin", "Browse & select screens", "Min booking validation", "No guesswork"],
    cta: "Start Express",
    route: "/advertiser/campaigns/new/express",
    available: true,
    highlight: true,
  },
  {
    id: "ai",
    icon: Bot,
    iconColor: "text-purple-500",
    iconBg: "bg-purple-500/10",
    borderHover: "hover:border-purple-500/50",
    title: "AI Campaign Builder",
    tagline: "Smart recommendations",
    description:
      "Tell the AI your goal and budget. It analyses footfall data, audience demographics, and picks the best screens for you.",
    features: ["Goal-based planning", "AI screen recommendations", "Audience optimisation", "Budget maximisation"],
    cta: "Start AI Builder",
    route: "/advertiser/campaigns/new/ai",
    available: true,
    highlight: false,
  },
  {
    id: "advanced",
    icon: SlidersHorizontal,
    iconColor: "text-sky-500",
    iconBg: "bg-sky-500/10",
    borderHover: "hover:border-sky-500/50",
    title: "Advanced Expert Builder",
    tagline: "Full control",
    description:
      "Set every parameter—budget, audience demographics, venue types, time preferences, and smart screen matching.",
    features: ["Budget-first planning", "Demographic targeting", "Venue & time filters", "Smart plan generator"],
    cta: "Advanced Builder",
    route: "/advertiser/campaigns/new/advanced",
    available: true,
    highlight: false,
  },
];

export default function CampaignBuilderSelect() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            New Campaign
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">How do you want to build?</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Choose a mode that fits your style. You can always switch later.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.id}
                className={`relative flex flex-col rounded-2xl border-2 bg-card p-6 transition-all duration-200 ${
                  mode.highlight
                    ? "border-amber-500/40 shadow-lg shadow-amber-500/5"
                    : "border-border"
                } ${mode.available ? `${mode.borderHover} cursor-pointer` : "opacity-60"}`}
                onClick={() => {
                  if (mode.available && mode.route) setLocation(mode.route);
                }}
              >
                {mode.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white hover:bg-amber-500 px-3 py-0.5 text-xs font-semibold">
                      Recommended
                    </Badge>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl ${mode.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${mode.iconColor}`} />
                </div>

                {/* Title */}
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{mode.title}</h2>
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  {mode.tagline}
                </p>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{mode.description}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {mode.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                      <div className={`w-1.5 h-1.5 rounded-full ${mode.iconColor.replace("text-", "bg-")}`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  className="w-full"
                  variant={mode.highlight ? "default" : "outline"}
                  disabled={!mode.available}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode.available && mode.route) setLocation(mode.route);
                  }}
                  data-testid={`button-mode-${mode.id}`}
                >
                  {mode.available ? (
                    <>
                      {mode.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      <Clock className="mr-2 h-4 w-4" />
                      {mode.cta}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          All builders create real campaigns using the same screens and pricing. No hidden fees.
        </p>
      </div>
    </div>
  );
}
