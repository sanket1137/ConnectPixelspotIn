import WebSocket, { WebSocketServer } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();
// Map userId → Set of WebSocket connections (one user can have multiple tabs)
const userClients = new Map<string, Set<WebSocket>>();

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 WebSocket client connected');
    clients.add(ws);

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());
        // Client sends { type: 'auth', userId: '...' } after connecting
        if (msg.type === 'auth' && msg.userId) {
          const userId = msg.userId as string;
          if (!userClients.has(userId)) {
            userClients.set(userId, new Set());
          }
          userClients.get(userId)!.add(ws);
          (ws as any).__userId = userId;
          ws.send(JSON.stringify({ type: 'auth:ok', userId }));
        }
      } catch {
        // Ignore invalid messages
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      clients.delete(ws);
      // Remove from user map
      const userId = (ws as any).__userId as string | undefined;
      if (userId && userClients.has(userId)) {
        userClients.get(userId)!.delete(ws);
        if (userClients.get(userId)!.size === 0) {
          userClients.delete(userId);
        }
      }
    });

    ws.on('error', (error) => {
      console.error('🔌 WebSocket error:', error);
      clients.delete(ws);
      const userId = (ws as any).__userId as string | undefined;
      if (userId && userClients.has(userId)) {
        userClients.get(userId)!.delete(ws);
        if (userClients.get(userId)!.size === 0) {
          userClients.delete(userId);
        }
      }
    });

    // Send connection confirmation
    ws.send(JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() }));
  });

  console.log('✅ WebSocket server initialized on /ws');
  return wss;
}

// Broadcast function to send updates to all connected clients
export function broadcastUpdate(event: string, data: any) {
  if (!wss) return;

  const message = JSON.stringify({
    type: event,
    data,
    timestamp: new Date().toISOString()
  });

  let successCount = 0;
  let failureCount = 0;

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        successCount++;
      } catch (error) {
        console.error('🔌 Failed to send to client:', error);
        failureCount++;
      }
    }
  });

  if (successCount > 0) {
    console.log(`📡 Broadcast '${event}' to ${successCount} client(s)${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
  }
}

// Send targeted message to a specific user (all their connected tabs/devices)
export function sendToUser(userId: string, event: string, data: any) {
  const sockets = userClients.get(userId);
  if (!sockets || sockets.size === 0) return;

  const message = JSON.stringify({
    type: event,
    data,
    timestamp: new Date().toISOString()
  });

  let sent = 0;
  sockets.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
        sent++;
      } catch {
        // ignore
      }
    }
  });

  if (sent > 0) {
    console.log(`📡 Sent '${event}' to user ${userId} (${sent} socket(s))`);
  }
}

// Specific broadcast functions for different events
export function broadcastCampaignUpdate(campaignId: string, status?: string) {
  broadcastUpdate('campaign:updated', { campaignId, status });
}

export function broadcastBookingUpdate(bookingId: string, campaignId: string, status?: string) {
  broadcastUpdate('booking:updated', { bookingId, campaignId, status });
}

export function broadcastScreenUpdate(screenId: string, status?: string) {
  broadcastUpdate('screen:updated', { screenId, status });
}

// Notification-specific: notify user of new notification
export function notifyUser(userId: string, notification: { type: string; title: string; message: string; data?: any }) {
  sendToUser(userId, 'notification:new', notification);
}

export function getConnectedClientsCount(): number {
  return clients.size;
}

export function getAuthenticatedUsersCount(): number {
  return userClients.size;
}
