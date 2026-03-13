import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Check, Pencil, Send, Loader2, MapPin, Users2, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

type Phase = "location" | "audience" | "budget" | "matching";
type TrackedPhase = "location" | "audience" | "budget";


interface PhaseState {
  answer: string;
  confirmed: boolean;
  editing: boolean;
}

interface Props {
  onMatchReady: (location: string, audience: string, budget: number) => void;
}

interface ChatMessage {
  role: "bot" | "user";
  content: string;
  type?: "question" | "confirm" | "answer" | "thinking";
  phase?: Phase;
  isConfirmTurn?: boolean;
  confirmText?: string;
}

const PHASE_ICONS: Record<Phase | "matching", React.ReactNode> = {
  location: <MapPin className="h-3.5 w-3.5" />,
  audience: <Users2 className="h-3.5 w-3.5" />,
  budget: <Wallet className="h-3.5 w-3.5" />,
  matching: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
};

const QUESTIONS: Record<Phase, string> = {
  location: "Which city or specific area do you want to target?",
  audience: "Who are you trying to reach, and where should they see your ad?",
  budget: "What is your total campaign budget?",
  matching: "",
};

// ─── Smart Paraphrase Helpers ────────────────────────────────────────────────

function parseBudget(raw: string): number | null {
  const clean = raw.replace(/₹|,|\s/g, "").toLowerCase();
  const num = parseFloat(clean.replace(/k$/, "")) * (clean.endsWith("k") ? 1000 : 1);
  return isNaN(num) || num <= 0 ? null : num;
}

function parseLocation(raw: string): string {
  const lower = raw.toLowerCase();
  const cityMap: Record<string, string> = {
    bangalore: "Bangalore", bengaluru: "Bangalore", blr: "Bangalore",
    indiranagar: "Indiranagar, Bangalore", koramangala: "Koramangala, Bangalore",
    whitefield: "Whitefield, Bangalore", hsr: "HSR Layout, Bangalore",
    "mg road": "MG Road, Bangalore", btm: "BTM Layout, Bangalore",
    mumbai: "Mumbai", bombay: "Mumbai",
    delhi: "Delhi", "new delhi": "New Delhi", ncr: "Delhi-NCR",
    hyderabad: "Hyderabad", chennai: "Chennai", pune: "Pune",
    kolkata: "Kolkata", ahmedabad: "Ahmedabad", surat: "Surat",
    jaipur: "Jaipur", kochi: "Kochi", chandigarh: "Chandigarh",
  };
  const match = Object.keys(cityMap).find((k) => lower.includes(k));
  if (match) return cityMap[match];
  // Capitalise first letter of each word as fallback
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseAudience(raw: string): string {
  const lower = raw.toLowerCase();
  const parts: string[] = [];

  // Occupation
  if (/office|corporate|profession|employee|worker|exec|manager/.test(lower)) parts.push("working professionals");
  else if (/student|college|university|campus|youth/.test(lower)) parts.push("students");
  else if (/shopper|consumer|retail|buyer/.test(lower)) parts.push("shoppers");
  else if (/commut|transit|travell?er|passenger/.test(lower)) parts.push("commuters");
  else if (/gym|fitness|health|workout/.test(lower)) parts.push("fitness enthusiasts");
  else if (/family|parent|kid|children/.test(lower)) parts.push("families");

  // Age range extraction: "22 to 40", "18-35", "between 25 and 45"
  const ageMatch = lower.match(/(\d{1,2})\s*(?:to|[-–]|and)\s*(\d{1,2})/);
  if (ageMatch) {
    const a = parseInt(ageMatch[1]), b = parseInt(ageMatch[2]);
    if (a >= 10 && b <= 80 && a < b) parts.push(`aged ${a}–${b}`);
  }

  // Location context
  if (/near|around|close|next to|beside/.test(lower)) {
    const nearMatch = lower.match(/near\s+([a-z\s]+?)(?:\s+area|,|$)/);
    if (nearMatch) parts.push(`near ${nearMatch[1].trim()}`);
  }
  if (/tech park|it park|office complex/.test(lower)) parts.push("near tech parks");
  if (/mall|shopping|retail/.test(lower)) parts.push("at shopping destinations");
  if (/metro|transit|bus stop/.test(lower)) parts.push("at transit points");

  if (parts.length === 0) {
    // Fallback: clean up and title-case the raw input
    return raw.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return parts.join(", ");
}

function buildConfirmation(phase: Phase, answer: string): string {
  if (phase === "location") {
    const loc = parseLocation(answer);
    return `Got it! You want to target **${loc}**. Is that correct?`;
  }
  if (phase === "audience") {
    const audience = parseAudience(answer);
    return `So your target audience is **${audience}**. Does that sound right?`;
  }
  if (phase === "budget") {
    const num = parseBudget(answer);
    if (!num) return `Hmm, I couldn't read that budget. Please try: **₹50,000** or **50k**`;
    return `A total budget of **₹${num.toLocaleString()}**. Shall we find your screens now?`;
  }
  return "";
}

export default function AIStep2_Conversation({ onMatchReady }: Props) {
  const [phase, setPhase] = useState<Phase>("location");
  const [phases, setPhases] = useState<Record<TrackedPhase, PhaseState>>({
    location: { answer: "", confirmed: false, editing: false },
    audience: { answer: "", confirmed: false, editing: false },
    budget: { answer: "", confirmed: false, editing: false },
  });
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: "I'll ask you 3 quick questions to find the best screens for your campaign. Let's start!",
      type: "question",
    },
    {
      role: "bot",
      content: QUESTIONS["location"],
      type: "question",
      phase: "location",
    },
  ]);
  const [input, setInput] = useState("");
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [pendingConfirmText, setPendingConfirmText] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!awaitingConfirm) inputRef.current?.focus();
  }, [awaitingConfirm, phase]);

  const addMessage = (msg: ChatMessage) =>
    setMessages((prev) => [...prev, msg]);

  const handleSend = () => {
    if (!input.trim() || awaitingConfirm || isMatching) return;
    const text = input.trim();
    setInput("");

    // Validate budget phase
    if (phase === "budget") {
      const num = parseBudget(text);
      if (!num) {
        addMessage({ role: "user", content: text });
        addMessage({ role: "bot", content: "I couldn't read that budget. Please enter it like: **₹50,000** or **50k**", type: "question" });
        return;
      }
    }

    addMessage({ role: "user", content: text });
    const confirmText = buildConfirmation(phase, text);
    setPendingConfirmText(text);

    setTimeout(() => {
      addMessage({ role: "bot", content: confirmText, type: "confirm", isConfirmTurn: true, phase });
      setAwaitingConfirm(true);
    }, 400);
  };

  const handleConfirm = () => {
    setAwaitingConfirm(false);
    const currentPhase = phase;
    const answer = pendingConfirmText;

    setPhases((prev) => ({ ...prev, [currentPhase]: { answer, confirmed: true, editing: false } }));

    const nextPhase: Partial<Record<TrackedPhase, TrackedPhase>> = {
      location: "audience",
      audience: "budget",
    };
    const next = nextPhase[currentPhase as TrackedPhase];

    if (next) {
      setPhase(next);
      setTimeout(() => {
        addMessage({ role: "bot", content: QUESTIONS[next], type: "question", phase: next });
      }, 400);
    } else {
      // All 3 confirmed → trigger matching
      setIsMatching(true);
      setPhase("matching");
      addMessage({ role: "bot", content: "✨ Analysing screens across the city to find the best matches for you...", type: "thinking" });

      const loc = phases.location.answer || answer;
      const aud = phases.audience.answer;
      const bud = parseBudget(currentPhase === "budget" ? answer : phases.budget?.answer ?? "") || 0;

      setTimeout(() => onMatchReady(loc, aud, bud), 600);
    }
  };

  const handleEdit = () => {
    setAwaitingConfirm(false);
    addMessage({ role: "bot", content: QUESTIONS[phase], type: "question", phase });
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const PHASE_ORDER: TrackedPhase[] = ["location", "audience", "budget"];

  return (
    <div className="flex flex-col h-[520px]">
      {/* Progress chips */}
      <div className="flex gap-2 mb-4">
        {PHASE_ORDER.map((p, i) => {
          const done = (phases as Record<TrackedPhase, PhaseState>)[p as TrackedPhase]?.confirmed;
          const active = phase === p && !isMatching;
          return (
            <div
              key={p}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                done ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                : active ? "bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-950/30 dark:border-violet-700 dark:text-violet-300"
                : "bg-muted border-border text-muted-foreground"
              )}
            >
              {done ? <Check className="h-3 w-3" /> : PHASE_ICONS[p]}
              {i + 1}. {p.charAt(0).toUpperCase() + p.slice(1)}
            </div>
          );
        })}
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2.5", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-violet-600 text-white rounded-br-sm"
                  : msg.type === "confirm"
                  ? "bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 rounded-bl-sm"
                  : "bg-muted rounded-bl-sm"
              )}
            >
              {/* Render **bold** markdown */}
              {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                part.startsWith("**") && part.endsWith("**")
                  ? <strong key={j}>{part.slice(2, -2)}</strong>
                  : <span key={j}>{part}</span>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Confirm / Edit buttons */}
        {awaitingConfirm && (
          <div className="flex justify-start pl-9 gap-2 pt-1">
            <Button size="sm" onClick={handleConfirm} className="bg-violet-600 hover:bg-violet-700 text-white h-8 gap-1.5">
              <Check className="h-3.5 w-3.5" />
              Yes, that's right
            </Button>
            <Button size="sm" variant="outline" onClick={handleEdit} className="h-8 gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        )}

        {/* Matching spinner */}
        {isMatching && (
          <div className="flex gap-2.5 justify-start pl-0">
            <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
              <span className="text-sm text-muted-foreground">Finding your screens…</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t pt-3 flex gap-2">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={
            awaitingConfirm ? "Confirm or edit above…"
            : isMatching ? "Matching screens…"
            : phase === "location" ? "e.g. Indiranagar, Bangalore"
            : phase === "audience" ? "e.g. office workers near tech parks"
            : phase === "budget" ? "e.g. ₹50,000 or 50k"
            : ""
          }
          disabled={awaitingConfirm || isMatching}
          className="flex-1"
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || awaitingConfirm || isMatching}
          className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
