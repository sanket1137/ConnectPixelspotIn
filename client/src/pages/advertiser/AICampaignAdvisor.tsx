import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, Send, User, Bot, MapPin, DollarSign, Calendar, ArrowRight, Globe, Zap, Eye, Monitor, CheckSquare, XSquare, Map as MapIcon, RefreshCw, Building } from "lucide-react";
import { getScreenCountDisplay, calculateScreenPricePerDay } from "@shared/utils";
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
      content: "Get instant screen recommendations! Add your website URL or choose a campaign type, then tell me about your goals.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [campaignType, setCampaignType] = useState("");
  const [showQuickStart, setShowQuickStart] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  
  // Conversation ID for memory persistence
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  
  // State for selected screens
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set());
  const [detailsDialogScreen, setDetailsDialogScreen] = useState<ScreenRecommendation | null>(null);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  // Helper functions for screen selection
  const toggleScreenSelection = (screenId: string, messageId: string) => {
    setCurrentMessageId(messageId);
    setSelectedScreens(prev => {
      const newSet = new Set(prev);
      if (newSet.has(screenId)) {
        newSet.delete(screenId);
      } else {
        newSet.add(screenId);
      }
      return newSet;
    });
  };

  const selectAllScreens = (screens: ScreenRecommendation[], messageId: string) => {
    setCurrentMessageId(messageId);
    setSelectedScreens(new Set(screens.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedScreens(new Set());
  };

  const getSelectedScreensFromMessage = (messageId: string): ScreenRecommendation[] => {
    const message = messages.find(m => m.id === messageId);
    if (!message?.screenRecommendations) return [];
    return message.screenRecommendations.filter(s => selectedScreens.has(s.id));
  };

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
    setShowQuickStart(false);

    try {
      // Get Firebase auth token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("Not authenticated");
      }
      const token = await user.getIdToken();

      // Use V2 API endpoint with conversation memory
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          message: input,
          conversationId: conversationId,
          websiteUrl: websiteUrl || undefined,
          campaignType: campaignType || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      // Store conversation ID for future messages (enables memory)
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

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

  const handleCreateCampaignWithSelected = (messageId: string) => {
    const selected = getSelectedScreensFromMessage(messageId);
    if (selected.length === 0) return;
    sessionStorage.setItem("aiRecommendedScreens", JSON.stringify(selected));
    setLocation("/advertiser/campaigns/new?from=ai");
  };

  const handleViewOnMap = (messageId: string) => {
    const selected = getSelectedScreensFromMessage(messageId);
    if (selected.length === 0) return;
    sessionStorage.setItem("highlightedScreens", JSON.stringify(selected.map(s => s.id)));
    setLocation("/advertiser/discover");
  };

  const handleRefineSearch = () => {
    const refineMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "I'd be happy to refine your search! Would you like to:\n\n• Adjust the budget or location?\n• See screens in different venue types?\n• Refine the target audience?\n• Change the campaign duration?\n\nJust let me know what you'd like to adjust!",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, refineMessage]);
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

      {showQuickStart && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Website URL (Optional)
              </label>
              <Input
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="Enter your business website URL (optional)"
                data-testid="input-website-url"
              />
              <p className="text-xs text-muted-foreground">
                We'll analyze your website to better understand your business
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Campaign Type (Optional)</label>
              <div className="flex flex-wrap gap-2">
                {["Brand Awareness", "Product Launch", "Store Promotion", "Event Promotion"].map((type) => (
                  <Button
                    key={type}
                    variant={campaignType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCampaignType(campaignType === type ? "" : type)}
                    data-testid={`button-campaign-type-${type.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowQuickStart(false)}
              className="w-full"
              data-testid="button-skip-quick-start"
            >
              Skip & Chat
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="h-[calc(100vh-12rem)] flex flex-col">
        <CardHeader className="border-b flex-shrink-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Campaign Consultation
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6 pb-4">
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
                  
                  <div className={`flex flex-col gap-2 ${message.role === "user" ? "items-end max-w-[80%]" : "items-start max-w-full"}`}>
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
                      <div className="w-full space-y-4 mt-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="gap-1">
                            <MapPin className="h-3 w-3" />
                            {message.screenRecommendations.length} Screens Recommended
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {message.screenRecommendations.map((screen) => {
                            const isSelected = selectedScreens.has(screen.id);
                            return (
                              <Card 
                                key={screen.id} 
                                className={`bg-background hover-elevate cursor-pointer border-2 transition-all ${
                                  isSelected ? 'border-primary' : 'border-border'
                                }`}
                                onClick={() => toggleScreenSelection(screen.id, message.id)}
                                data-testid={`card-screen-${screen.id}`}
                              >
                                <CardContent className="p-0">
                                  {/* Screen Image */}
                                  <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Building className="h-12 w-12 text-muted-foreground/30" />
                                    </div>
                                    <div className="absolute top-2 left-2">
                                      <Checkbox 
                                        checked={isSelected}
                                        onCheckedChange={() => toggleScreenSelection(screen.id, message.id)}
                                        data-testid={`checkbox-screen-${screen.id}`}
                                      />
                                    </div>
                                    <div className="absolute top-2 right-2">
                                      <Badge variant="secondary">{screen.venueCategory}</Badge>
                                    </div>
                                  </div>

                                  {/* Screen Details */}
                                  <div className="p-4 space-y-3">
                                    <div>
                                      <h4 className="font-semibold text-base mb-1">{screen.name}</h4>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {screen.location}, {screen.city}
                                      </p>
                                    </div>
                                    
                                    {/* Price and Footfall */}
                                    <div className="flex items-center justify-between gap-4">
                                      <div className="flex items-center gap-1">
                                        <DollarSign className="h-4 w-4 text-primary" />
                                        <span className="font-bold text-lg text-primary">₹{calculateScreenPricePerDay(screen).toLocaleString()}</span>
                                        <span className="text-xs text-muted-foreground">/day</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-sm">
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                        <span className="font-medium">{screen.avgDailyFootfall.toLocaleString()}</span>
                                      </div>
                                    </div>

                                    {/* Reason */}
                                    <div className="bg-primary/5 p-3 rounded-md border border-primary/10">
                                      <p className="text-xs leading-relaxed">
                                        <strong className="text-primary">Why this screen:</strong> {screen.reason}
                                      </p>
                                    </div>

                                    {/* View Details Button */}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full gap-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsDialogScreen(screen);
                                      }}
                                      data-testid={`button-view-details-${screen.id}`}
                                    >
                                      <Monitor className="h-4 w-4" />
                                      View Details
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Bulk Action Buttons */}
                        <div className="flex flex-wrap gap-3 pt-4 border-t">
                          <Button
                            onClick={() => handleCreateCampaignWithSelected(message.id)}
                            disabled={currentMessageId === message.id && selectedScreens.size === 0}
                            className="gap-2"
                            data-testid="button-create-campaign-selected"
                          >
                            <Sparkles className="h-4 w-4" />
                            Create Campaign with Selected ({currentMessageId === message.id ? selectedScreens.size : 0})
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => handleViewOnMap(message.id)}
                            disabled={currentMessageId === message.id && selectedScreens.size === 0}
                            className="gap-2"
                            data-testid="button-view-map"
                          >
                            <MapIcon className="h-4 w-4" />
                            View Selected on Map
                          </Button>
                          
                          <Button
                            variant="ghost"
                            onClick={handleRefineSearch}
                            className="gap-2"
                            data-testid="button-refine-search"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Refine My Search
                          </Button>
                          
                          <Button
                            variant="ghost"
                            onClick={() => {
                              if (currentMessageId === message.id && selectedScreens.size === message.screenRecommendations!.length) {
                                clearSelection();
                              } else {
                                selectAllScreens(message.screenRecommendations!, message.id);
                              }
                            }}
                            className="gap-2 ml-auto"
                            data-testid="button-toggle-select-all"
                          >
                            {currentMessageId === message.id && selectedScreens.size === message.screenRecommendations!.length ? (
                              <>
                                <XSquare className="h-4 w-4" />
                                Clear Selection
                              </>
                            ) : (
                              <>
                                <CheckSquare className="h-4 w-4" />
                                Select All
                              </>
                            )}
                          </Button>
                        </div>
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
          </div>

          <div className="border-t p-4 flex-shrink-0">
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

      {/* Screen Details Dialog */}
      <Dialog open={!!detailsDialogScreen} onOpenChange={(open) => !open && setDetailsDialogScreen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Monitor className="h-6 w-6 text-primary" />
              {detailsDialogScreen?.name}
            </DialogTitle>
            <DialogDescription>
              Complete screen information and specifications
            </DialogDescription>
          </DialogHeader>

          {detailsDialogScreen && (
            <div className="space-y-6">
              {/* Screen Image */}
              <div className="relative h-48 bg-muted rounded-lg overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Building className="h-20 w-20 text-muted-foreground/30" />
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="text-sm">
                    {detailsDialogScreen.venueCategory}
                  </Badge>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Location</p>
                  <p className="font-medium flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{detailsDialogScreen.location}, {detailsDialogScreen.city}</span>
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Venue Type</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    {detailsDialogScreen.venueCategory}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Price per Day</p>
                  <p className="font-bold text-2xl text-primary flex items-center gap-1">
                    <DollarSign className="h-5 w-5" />
                    ₹{calculateScreenPricePerDay(detailsDialogScreen).toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Daily Footfall</p>
                  <p className="font-bold text-2xl flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" />
                    {detailsDialogScreen.avgDailyFootfall.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Why This Screen */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-primary">Why This Screen is Recommended</p>
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <p className="text-sm leading-relaxed">{detailsDialogScreen.reason}</p>
                </div>
              </div>

              {/* Additional Info Placeholder */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Operating Hours</p>
                  <p className="text-sm">24/7 Available</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Demographics</p>
                  <p className="text-sm">Mixed Audience</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetailsDialogScreen(null)}
              data-testid="button-close-details"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (detailsDialogScreen) {
                  const messageWithScreen = messages.find(m => 
                    m.screenRecommendations?.some(s => s.id === detailsDialogScreen.id)
                  );
                  if (messageWithScreen) {
                    toggleScreenSelection(detailsDialogScreen.id, messageWithScreen.id);
                  }
                  setDetailsDialogScreen(null);
                }
              }}
              className="gap-2"
              data-testid="button-select-screen"
            >
              <CheckSquare className="h-4 w-4" />
              {detailsDialogScreen && selectedScreens.has(detailsDialogScreen.id) ? 'Deselect' : 'Select'} This Screen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
