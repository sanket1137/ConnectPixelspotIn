import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Paperclip, File, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { SupportTicket, TicketMessage } from "@shared/schema";

export default function TicketDetails() {
  const [, params] = useRoute("/tickets/:id");
  const [, adminParams] = useRoute("/admin/tickets/:id");
  const ticketId = params?.id ?? adminParams?.id;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [replyMessage, setReplyMessage] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery<{ ticket: SupportTicket, messages: (TicketMessage & { sender: any })[], userProfile: any }>({
    queryKey: [`/api/tickets/${ticketId}`],
    enabled: !!ticketId,
  });

  const replyMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/tickets/${ticketId}/messages`, {
        method: "POST",
        headers: { ...authHeaders },
        body: formData, // Sending as multipart/form-data
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      setReplyMessage("");
      setFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: [`/api/tickets/${ticketId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Scroll to bottom when messages load or new message is sent
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data?.messages]);

  if (isLoading) {
    return <div className="p-6 max-w-4xl mx-auto animate-pulse flex flex-col gap-4">
      <div className="h-10 w-32 bg-slate-100 rounded"></div>
      <div className="h-24 w-full bg-slate-100 rounded"></div>
      <div className="h-96 w-full bg-slate-50 rounded"></div>
    </div>;
  }

  if (!data?.ticket) {
    return <div className="p-6 text-center">Ticket not found or you don't have access.</div>;
  }

  const { ticket, messages } = data;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && (!files || files.length === 0)) return;

    const formData = new FormData();
    if (replyMessage.trim()) formData.append("message", replyMessage);
    
    if (files) {
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
    }

    replyMutation.mutate(formData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="default" className="bg-blue-500"><AlertCircle className="w-3 h-3 mr-1"/> Open</Badge>;
      case "in_progress": return <Badge variant="secondary" className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1"/> In Progress</Badge>;
      case "closed": return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen">
      {/* Header */}
      <div className="p-4 md:px-6 border-b bg-background flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/tickets")} className="mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold line-clamp-1">{ticket.subject}</h1>
              {getStatusBadge(ticket.status)}
            </div>
            <p className="text-sm text-muted-foreground">
              Ticket #{ticket.id.split('-')[0]} • Created {format(new Date(ticket.createdAt), "MMM d, yyyy")}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area & Profile Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 space-y-6"
        >
        {messages.map((msg, idx) => {
          const isOwn = msg.senderId === user?.id;
          const showAvatar = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
          
          return (
            <div key={msg.id} className={`flex gap-3 max-w-[85%] ${isOwn ? "ml-auto flex-row-reverse" : "mr-auto"}`}>
              {showAvatar ? (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-xs font-bold ${isOwn ? "bg-primary" : "bg-slate-700"}`}>
                  {msg.sender?.name?.charAt(0) || "U"}
                </div>
              ) : (
                <div className="w-8 shrink-0"></div>
              )}
              
              <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
                {showAvatar && (
                  <span className="text-xs text-muted-foreground mb-1 mx-1">
                    {isOwn ? "You" : msg.sender?.name || "Support Team"} • {format(new Date(msg.createdAt), "h:mm a")}
                  </span>
                )}
                
                <Card className={`p-3 shadow-sm ${isOwn ? "bg-primary text-primary-foreground border-primary" : "bg-white"}`}>
                  <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                  
                  {/* Attachments */}
                  {msg.attachments && (msg.attachments as any[]).length > 0 && (
                    <div className="mt-3 space-y-2">
                      {(msg.attachments as any[]).map((file, i) => (
                        <a 
                          key={i} 
                          href={file.url} 
                          target="_blank" 
                          rel="noreferrer"
                          className={`flex items-center gap-2 p-2 rounded text-xs ${isOwn ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-800"}`}
                        >
                          {file.type?.startsWith("image/") ? (
                            <img src={file.url} alt="attachment" className="w-8 h-8 object-cover rounded" />
                          ) : (
                            <File className="w-4 h-4 shrink-0" />
                          )}
                          <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>
          );
        })}
        </div>

        {/* Admin Sidebar */}
        {user?.role === "admin" && data.userProfile && (
          <div className="w-80 border-l bg-background hidden lg:block overflow-y-auto">
            <div className="p-4 border-b font-semibold bg-slate-50">User Profile</div>
            <div className="p-4 space-y-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Name</div>
                <div className="font-medium">{data.userProfile.name}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Email</div>
                <div className="font-medium">{data.userProfile.email}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Role</div>
                <div className="font-medium capitalize">{data.userProfile.role?.replace('_', ' ')}</div>
              </div>
              {data.userProfile.companyName && (
                <div>
                  <div className="text-muted-foreground text-xs">Company</div>
                  <div className="font-medium">{data.userProfile.companyName}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground text-xs">Joined</div>
                <div className="font-medium">{format(new Date(data.userProfile.createdAt), "MMM d, yyyy")}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reply Area */}
      <div className="p-4 md:p-6 bg-background border-t shrink-0">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto space-y-3">
          {ticket.status === "closed" && user?.role !== "admin" && (
            <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded text-center mb-2">
              This ticket is closed. Replying will reopen it.
            </div>
          )}
          
          <div className="relative border rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-primary overflow-hidden">
            <Textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[100px] border-0 focus-visible:ring-0 resize-none p-4 pb-12 shadow-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
            
            <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center bg-background">
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => setFiles(e.target.files)} 
                  className="hidden" 
                  multiple 
                  accept="image/*,.pdf,.csv,.txt"
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground h-8 px-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-1" />
                  {files && files.length > 0 ? (
                    <span className="text-primary font-medium">{files.length} file(s)</span>
                  ) : (
                    <span>Attach</span>
                  )}
                </Button>
              </div>
              
              <Button 
                type="submit" 
                size="sm"
                disabled={replyMutation.isPending || (!replyMessage.trim() && (!files || files.length === 0))}
              >
                {replyMutation.isPending ? "Sending..." : "Send"} 
                <Send className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
