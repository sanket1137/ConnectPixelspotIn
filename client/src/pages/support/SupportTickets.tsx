import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquarePlus, Ticket, Clock, CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { SupportTicket } from "@shared/schema";

export default function SupportTickets() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("medium");
  const [message, setMessage] = useState("");

  const { data: tickets = [], isLoading } = useQuery<SupportTicket[]>({
    queryKey: ["/api/tickets"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/tickets", { subject, category, priority, message });
      return res.json();
    },
    onSuccess: (newTicket) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      toast({ title: "Ticket created", description: "Your support ticket has been submitted successfully." });
      setIsCreateOpen(false);
      setSubject("");
      setMessage("");
      
      // Optional: go to details page immediately
      // setLocation(`/tickets/${newTicket.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create ticket",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="default" className="bg-blue-500"><AlertCircle className="w-3 h-3 mr-1"/> Open</Badge>;
      case "in_progress": return <Badge variant="secondary" className="bg-amber-500 text-white"><Clock className="w-3 h-3 mr-1"/> In Progress</Badge>;
      case "closed": return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high": return <Badge variant="destructive">High</Badge>;
      case "medium": return <Badge variant="secondary">Medium</Badge>;
      case "low": return <Badge variant="outline">Low</Badge>;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Raise and track your support requests.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><MessageSquarePlus className="w-4 h-4 mr-2" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Describe your issue below and our team will get back to you shortly.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input 
                    id="subject" 
                    placeholder="Brief description of the issue" 
                    value={subject} 
                    onChange={e => setSubject(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="billing">Billing & Payments</SelectItem>
                        <SelectItem value="technical">Technical Issue</SelectItem>
                        <SelectItem value="campaign">Campaign Help</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Initial Message (Optional)</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Provide details about your issue..." 
                    value={message} 
                    onChange={e => setMessage(e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || !subject.trim()}>
                  {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <Card key={i} className="animate-pulse h-40 bg-slate-50"></Card>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No tickets found</h2>
          <p className="text-muted-foreground mb-6">You haven't raised any support tickets yet.</p>
          <Button onClick={() => setIsCreateOpen(true)}>Create your first ticket</Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {tickets.map(ticket => (
            <Card key={ticket.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-mono text-muted-foreground">#{ticket.id.split('-')[0]}</span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <h3 className="font-semibold text-lg line-clamp-1">{ticket.subject}</h3>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="capitalize">{ticket.category}</span>
                    <span>•</span>
                    <span>Last updated {format(new Date(ticket.updatedAt), "MMM d, yyyy h:mm a")}</span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setLocation(`/tickets/${ticket.id}`)}>
                  <Eye className="w-4 h-4 mr-2" /> View Details
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
