import WebSocket, { WebSocketServer } from 'ws';
import type { Server } from 'http';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function setupWebSocket(server: Server) {
  wss = new WebSocketServer({ 
    server,
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('🔌 WebSocket client connected');
    clients.add(ws);

    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('🔌 WebSocket error:', error);
      clients.delete(ws);
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

export function getConnectedClientsCount(): number {
  return clients.size;
}
