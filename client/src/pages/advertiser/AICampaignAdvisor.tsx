import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, User, Bot, MapPin, DollarSign, Calendar, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  screenRecommendations?: ScreenRecommendation[];
  timestamp: Date;
}

interface ScreenRecommendation {
  id: string;
  name: string;
  location: string;
  city: string;
  venueCategory: string;
  pricePerDay: number;
  avgDailyFootfall: number;
  reason: string;
}

export default function AICampaignAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm your AI Campaign Advisor. I'll help you create an effective DOOH advertising campaign by understanding your business, target audience, and goals.\n\nTell me about your business and what you'd like to achieve with this campaign.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Get Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }
      const token = await user.getIdToken();

      const response = await fetch("/api/ai/campaign-advisor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        screenRecommendations: data.screenRecommendations,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportToCampaign = (recommendations: ScreenRecommendation[]) => {
    // Store recommendations in sessionStorage to pass to campaign creation
    sessionStorage.setItem("aiRecommendedScreens", JSON.stringify(recommendations));
    setLocation("/advertiser/campaigns/new?from=ai");
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-foreground font-serif">AI Campaign Advisor</h1>
          <p className="text-muted-foreground">Get personalized screen recommendations for your campaign</p>
        </div>
      </div>

      <Card className="h-[600px] flex flex-col">
        <CardHeader className="border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Campaign Consultation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea ref={scrollRef} className="flex-1 p-6">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col gap-2 max-w-[80%] ${message.role === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`rounded-lg p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    </div>

                    {message.screenRecommendations && message.screenRecommendations.length > 0 && (
                      <div className="w-full space-y-3 mt-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {message.screenRecommendations.length} Screens Recommended
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => handleExportToCampaign(message.screenRecommendations!)}
                            className="gap-2"
                            data-testid="button-export-campaign"
                          >
                            Create Campaign <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>

                        {message.screenRecommendations.map((screen) => (
                          <Card key={screen.id} className="bg-background">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-semibold text-sm">{screen.name}</h4>
                                  <p className="text-xs text-muted-foreground">{screen.location}, {screen.city}</p>
                                </div>
                                <Badge variant="outline">{screen.venueCategory}</Badge>
                              </div>
                              
                              <div className="flex gap-4 text-xs text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ₹{screen.pricePerDay.toLocaleString()}/day
                                </span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {screen.avgDailyFootfall.toLocaleString()} daily views
                                </span>
                              </div>

                              <p className="text-xs bg-muted p-2 rounded">
                                <strong>Why this screen:</strong> {screen.reason}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="bg-primary">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Tell me about your business and campaign goals..."
                disabled={isLoading}
                className="flex-1"
                data-testid="input-chat-message"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                size="icon"
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
