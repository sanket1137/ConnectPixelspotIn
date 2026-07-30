import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Users, TrendingUp, Calendar, Eye, Globe, Target, Hash, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  title: string | null;
  websiteUrl: string | null;
  campaignType: string | null;
  messageCount: number;
  totalTokensUsed: number;
  lastMessageAt: Date;
  createdAt: Date;
}

interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  screenRecommendations: any[] | null;
  tokensUsed: number | null;
  createdAt: Date;
}

interface Analytics {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  activeUsersCount: number;
  averageMessagesPerConversation: number;
  conversationsToday: number;
  conversationsThisWeek: number;
  conversationsThisMonth: number;
}

const getSafeHostname = (url: string) => {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;
  } catch {
    return url;
  }
};

export default function AIConversations() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Fetch conversations list
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery<{ conversations: Conversation[] }>({
    queryKey: ["/api/admin/ai/conversations"],
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<Analytics>({
    queryKey: ["/api/admin/ai/analytics"],
  });

  // Fetch specific conversation details
  const { data: conversationDetails, isLoading: detailsLoading } = useQuery<{
    conversation: Conversation;
    messages: Message[];
  }>({
    queryKey: [`/api/admin/ai/conversations/${selectedConversation}`],
    enabled: !!selectedConversation,
  });

  const conversations = conversationsData?.conversations || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">AI Campaign Advisor Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor user interactions and conversation insights
        </p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {analyticsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card data-testid="card-total-conversations">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-conversations">
                  {analytics?.totalConversations || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.conversationsThisWeek || 0} this week
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-active-users">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-active-users">
                  {analytics?.activeUsersCount || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Using AI advisor
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-messages">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-messages">
                  {analytics?.totalMessages || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {analytics?.averageMessagesPerConversation || 0} per conversation
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-total-tokens">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Total Tokens Used</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-tokens">
                  {(analytics?.totalTokens || 0).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI API usage
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Conversations</CardTitle>
          <CardDescription>All AI advisor conversations with user details</CardDescription>
        </CardHeader>
        <CardContent>
          {conversationsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No conversations yet</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {conversations.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE).map((conv) => (
                  <div
                    key={conv.id}
                    className="border rounded-lg p-4 hover-elevate cursor-pointer"
                    onClick={() => setSelectedConversation(conv.id)}
                    data-testid={`conversation-${conv.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold truncate">{conv.userName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {conv.userEmail}
                          </Badge>
                        </div>
                        
                        {conv.title && (
                          <p className="text-sm font-medium mb-2">{conv.title}</p>
                        )}

                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {conv.messageCount} messages
                          </span>
                          
                          {conv.campaignType && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              {conv.campaignType}
                            </span>
                          )}

                          {conv.websiteUrl && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {getSafeHostname(conv.websiteUrl)}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedConversation(conv.id);
                        }}
                        data-testid={`button-view-${conv.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {conversations.length > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between mt-6 border-t pt-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {(page - 1) * ITEMS_PER_PAGE + 1} to {Math.min(page * ITEMS_PER_PAGE, conversations.length)} of {conversations.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(Math.ceil(conversations.length / ITEMS_PER_PAGE), p + 1))}
                      disabled={page >= Math.ceil(conversations.length / ITEMS_PER_PAGE)}
                    >
                      Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Conversation Details Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="max-w-3xl w-full overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
          <DialogHeader className="shrink-0">
            <DialogTitle>Conversation Details</DialogTitle>
            <DialogDescription>
              Full conversation thread and user interactions
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto flex-1 pr-1">

          {detailsLoading ? (
            <div className="space-y-4 mt-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : conversationDetails ? (
            <div className="space-y-4 mt-4">
              {/* Conversation Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">User Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">User:</span>
                    <span className="font-medium">{conversationDetails.conversation.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">{conversationDetails.conversation.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Messages:</span>
                    <span className="font-medium">{conversationDetails.conversation.messageCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tokens Used:</span>
                    <span className="font-medium">{conversationDetails.conversation.totalTokensUsed.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Messages */}
              <div className="space-y-3">
                <h3 className="font-semibold">Conversation Thread</h3>
                {conversationDetails.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg ${
                      msg.role === "user" 
                        ? "bg-muted/50" 
                        : "bg-primary/5 border border-primary/20"
                    }`}
                    data-testid={`message-${msg.id}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={msg.role === "user" ? "secondary" : "default"}>
                        {msg.role === "user" ? "User" : "AI Assistant"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                    
                    {msg.screenRecommendations && msg.screenRecommendations.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs font-medium mb-2">
                          Recommended {msg.screenRecommendations.length} screens
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {msg.screenRecommendations.slice(0, 4).map((screen: any, idx: number) => (
                            <div key={idx} className="text-xs p-2 bg-background rounded border">
                              <div className="font-medium truncate">{screen.name}</div>
                              <div className="text-muted-foreground">{screen.city}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
