import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, FileText, Clock, User, MessageSquare, Hash } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  conversationId?: string;
  userMessage: string;
  aiResponse: string;
  wasRedacted: boolean;
  patternsFound: string[];
  sensitiveFieldsRequested: string[];
  tokensUsed?: number;
}

interface SecurityAlert {
  severity: 'low' | 'medium' | 'high';
  type: 'pii_detected' | 'sensitive_field_request' | 'rate_limit_exceeded';
  userId: string;
  details: string;
  timestamp: string;
}

export default function AISecurityDashboard() {
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const { data: auditLogsData } = useQuery({
    queryKey: ['/api/admin/ai/audit-logs?limit=100'],
  });

  const { data: securityAlertsData } = useQuery({
    queryKey: ['/api/admin/ai/security-alerts?limit=50'],
  });

  const auditLogs = (auditLogsData as { logs: AuditLogEntry[] })?.logs || [];
  const securityAlerts = (securityAlertsData as { alerts: SecurityAlert[] })?.alerts || [];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case 'pii_detected':
        return '🔒';
      case 'sensitive_field_request':
        return '⚠️';
      case 'rate_limit_exceeded':
        return '🚫';
      default:
        return '📊';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="title-security-dashboard">
          AI Security Dashboard
        </h1>
        <p className="text-muted-foreground">
          Monitor AI advisor interactions, audit logs, and security alerts
        </p>
      </div>

      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Security Alerts ({securityAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="audit" data-testid="tab-audit">
            <FileText className="h-4 w-4 mr-2" />
            Audit Logs ({auditLogs.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <Shield className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {securityAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>No security alerts detected</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {securityAlerts.map((alert, index) => (
                <Card key={index} className={alert.severity === 'high' ? 'border-destructive' : ''}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getAlertTypeIcon(alert.type)}</span>
                        <div>
                          <CardTitle className="text-base">
                            {alert.type.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </CardTitle>
                          <CardDescription>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {format(new Date(alert.timestamp), 'MMM d, yyyy h:mm a')}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">User ID:</span>
                        <code className="bg-muted px-2 py-0.5 rounded text-xs">{alert.userId}</code>
                      </div>
                      <p className="text-sm">{alert.details}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Audit Logs</CardTitle>
                <CardDescription>Click to view full details</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {auditLogs.map((log, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedLog(log)}
                        className="w-full text-left p-3 rounded-lg border hover-elevate active-elevate-2 transition-colors"
                        data-testid={`log-entry-${index}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-sm truncate">{log.userName}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {log.wasRedacted && (
                              <Badge variant="destructive" className="text-xs">
                                PII Redacted
                              </Badge>
                            )}
                            {log.sensitiveFieldsRequested.length > 0 && (
                              <Badge variant="default" className="text-xs">
                                Sensitive Request
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                          {log.userMessage}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                          </span>
                          {log.tokensUsed && (
                            <span>
                              <Hash className="h-3 w-3 inline mr-1" />
                              {log.tokensUsed} tokens
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Audit Log Details</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedLog ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted-foreground">User</label>
                        <div className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4" />
                          <span className="font-medium">{selectedLog.userName}</span>
                          <Badge variant="secondary">{selectedLog.userRole}</Badge>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">Timestamp</label>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(selectedLog.timestamp), 'MMM d, yyyy h:mm:ss a')}</span>
                        </div>
                      </div>

                      {selectedLog.conversationId && (
                        <div>
                          <label className="text-xs text-muted-foreground">Conversation ID</label>
                          <code className="block bg-muted px-3 py-2 rounded text-xs mt-1 break-all">
                            {selectedLog.conversationId}
                          </code>
                        </div>
                      )}

                      <div>
                        <label className="text-xs text-muted-foreground">User Message</label>
                        <div className="bg-muted p-3 rounded mt-1 text-sm">
                          <MessageSquare className="h-4 w-4 inline mr-2 text-muted-foreground" />
                          {selectedLog.userMessage}
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted-foreground">AI Response</label>
                        <div className="bg-muted p-3 rounded mt-1 text-sm whitespace-pre-wrap">
                          {selectedLog.aiResponse}
                        </div>
                      </div>

                      {selectedLog.wasRedacted && (
                        <div>
                          <label className="text-xs text-destructive">PII Patterns Detected</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedLog.patternsFound.map((pattern, i) => (
                              <Badge key={i} variant="destructive">
                                {pattern}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedLog.sensitiveFieldsRequested.length > 0 && (
                        <div>
                          <label className="text-xs text-destructive">Sensitive Fields Requested</label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {selectedLog.sensitiveFieldsRequested.map((field, i) => (
                              <Badge key={i} variant="default">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedLog.tokensUsed && (
                        <div>
                          <label className="text-xs text-muted-foreground">Tokens Used</label>
                          <div className="flex items-center gap-2 mt-1">
                            <Hash className="h-4 w-4" />
                            <span>{selectedLog.tokensUsed.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>Select a log entry to view details</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Total Interactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{auditLogs.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">PII Redactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {auditLogs.filter(log => log.wasRedacted).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Sensitive Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {auditLogs.filter(log => log.sensitiveFieldsRequested.length > 0).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">Security Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {securityAlerts.length}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Statistics</CardTitle>
              <CardDescription>Overview of AI security monitoring</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Clean Interactions</span>
                  <span className="text-sm font-medium">
                    {auditLogs.length - auditLogs.filter(log => log.wasRedacted || log.sensitiveFieldsRequested.length > 0).length} / {auditLogs.length}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 dark:bg-green-400" 
                    style={{ 
                      width: `${auditLogs.length ? ((auditLogs.length - auditLogs.filter(log => log.wasRedacted || log.sensitiveFieldsRequested.length > 0).length) / auditLogs.length * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">PII Redaction Rate</span>
                  <span className="text-sm font-medium">
                    {auditLogs.filter(log => log.wasRedacted).length} / {auditLogs.length}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-destructive" 
                    style={{ 
                      width: `${auditLogs.length ? (auditLogs.filter(log => log.wasRedacted).length / auditLogs.length * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Sensitive Field Requests</span>
                  <span className="text-sm font-medium">
                    {auditLogs.filter(log => log.sensitiveFieldsRequested.length > 0).length} / {auditLogs.length}
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-orange-600 dark:bg-orange-400" 
                    style={{ 
                      width: `${auditLogs.length ? (auditLogs.filter(log => log.sensitiveFieldsRequested.length > 0).length / auditLogs.length * 100) : 0}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
