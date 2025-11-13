/**
 * Audit Logger for AI Advisor
 * 
 * Logs all AI advisor requests with:
 * - User information
 * - Request content
 * - Response content
 * - PII detection alerts
 * - Sensitive field access attempts
 */

import type { IStorage } from "../storage";

export interface AuditLogEntry {
  timestamp: Date;
  userId: string;
  userName: string;
  userRole: string;
  endpoint: string;
  conversationId?: string;
  userMessage: string;
  aiResponse: string;
  wasRedacted: boolean;
  patternsFound: string[];
  sensitiveFieldsRequested: string[];
  tokensUsed?: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecurityAlert {
  severity: 'low' | 'medium' | 'high';
  type: 'pii_detected' | 'sensitive_field_request' | 'rate_limit_exceeded';
  userId: string;
  details: string;
  timestamp: Date;
}

// In-memory storage for audit logs (in production, use database or log aggregation service)
const auditLogs: AuditLogEntry[] = [];
const securityAlerts: SecurityAlert[] = [];

// Configurable alert thresholds
const ALERT_CONFIG = {
  maxPIIDetectionsPerHour: 3,
  maxSensitiveRequestsPerHour: 5,
};

/**
 * Log an AI advisor request/response
 */
export function logAIRequest(entry: AuditLogEntry): void {
  auditLogs.push(entry);
  
  // Check for security alerts
  if (entry.wasRedacted && entry.patternsFound.length > 0) {
    checkPIIAlerts(entry);
  }
  
  if (entry.sensitiveFieldsRequested.length > 0) {
    checkSensitiveFieldAlerts(entry);
  }
  
  // Console log for monitoring
  console.log(`📊 [AI Audit] User ${entry.userName} (${entry.userRole}): ${entry.userMessage.substring(0, 50)}...`);
  
  if (entry.wasRedacted) {
    console.warn(`⚠️  [PII Redacted] Found patterns: ${entry.patternsFound.join(', ')}`);
  }
  
  if (entry.sensitiveFieldsRequested.length > 0) {
    console.warn(`🔒 [Sensitive Access] Fields requested: ${entry.sensitiveFieldsRequested.join(', ')}`);
  }
}

/**
 * Check if user has exceeded PII detection threshold
 */
function checkPIIAlerts(entry: AuditLogEntry): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentPIIDetections = auditLogs.filter(
    log =>
      log.userId === entry.userId &&
      log.timestamp > oneHourAgo &&
      log.wasRedacted
  );
  
  if (recentPIIDetections.length >= ALERT_CONFIG.maxPIIDetectionsPerHour) {
    const alert: SecurityAlert = {
      severity: 'medium',
      type: 'pii_detected',
      userId: entry.userId,
      details: `User has triggered PII redaction ${recentPIIDetections.length} times in the last hour`,
      timestamp: new Date(),
    };
    
    securityAlerts.push(alert);
    console.error(`🚨 [Security Alert] ${alert.type.toUpperCase()}: ${alert.details}`);
  }
}

/**
 * Check if user has exceeded sensitive field request threshold
 */
function checkSensitiveFieldAlerts(entry: AuditLogEntry): void {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentSensitiveRequests = auditLogs.filter(
    log =>
      log.userId === entry.userId &&
      log.timestamp > oneHourAgo &&
      log.sensitiveFieldsRequested.length > 0
  );
  
  if (recentSensitiveRequests.length >= ALERT_CONFIG.maxSensitiveRequestsPerHour) {
    const alert: SecurityAlert = {
      severity: 'high',
      type: 'sensitive_field_request',
      userId: entry.userId,
      details: `User has requested sensitive fields ${recentSensitiveRequests.length} times in the last hour`,
      timestamp: new Date(),
    };
    
    securityAlerts.push(alert);
    console.error(`🚨 [Security Alert] ${alert.type.toUpperCase()}: ${alert.details}`);
  }
}

/**
 * Get audit logs for a specific user (admin only)
 */
export function getAuditLogsForUser(userId: string, limit: number = 100): AuditLogEntry[] {
  return auditLogs
    .filter(log => log.userId === userId)
    .slice(-limit)
    .reverse();
}

/**
 * Get all security alerts (admin only)
 */
export function getSecurityAlerts(limit: number = 50): SecurityAlert[] {
  return securityAlerts.slice(-limit).reverse();
}

/**
 * Get recent audit logs (admin only)
 */
export function getRecentAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditLogs.slice(-limit).reverse();
}

/**
 * Detect if a user message is attempting to request sensitive information
 */
export function detectSensitiveFieldRequest(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const requestedFields: string[] = [];
  
  // Check for owner contact requests
  if (
    lowerMessage.includes('owner') &&
    (lowerMessage.includes('phone') ||
      lowerMessage.includes('contact') ||
      lowerMessage.includes('email') ||
      lowerMessage.includes('number'))
  ) {
    requestedFields.push('owner_contact');
  }
  
  // Check for user data requests
  if (
    lowerMessage.includes('user') &&
    (lowerMessage.includes('email') || lowerMessage.includes('phone'))
  ) {
    requestedFields.push('user_contact');
  }
  
  // Check for address requests
  if (
    lowerMessage.includes('home address') ||
    lowerMessage.includes('residential address') ||
    lowerMessage.includes('personal address')
  ) {
    requestedFields.push('personal_address');
  }
  
  // Check for ID/credential requests
  if (
    lowerMessage.includes('password') ||
    lowerMessage.includes('credential') ||
    lowerMessage.includes('api key') ||
    lowerMessage.includes('token')
  ) {
    requestedFields.push('credentials');
  }
  
  return requestedFields;
}

/**
 * Clear old audit logs (run periodically to prevent memory issues)
 * In production, you'd export these to a proper logging service
 */
export function clearOldAuditLogs(daysToKeep: number = 7): void {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const beforeCount = auditLogs.length;
  auditLogs.splice(
    0,
    auditLogs.findIndex(log => log.timestamp > cutoffDate)
  );
  
  const removed = beforeCount - auditLogs.length;
  if (removed > 0) {
    console.log(`🧹 [Audit Cleanup] Removed ${removed} old audit log entries`);
  }
}

// Run cleanup every 24 hours
setInterval(() => clearOldAuditLogs(7), 24 * 60 * 60 * 1000);
