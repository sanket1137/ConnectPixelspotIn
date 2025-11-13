import { useEffect, useRef } from 'react';
import { queryClient } from '@/lib/queryClient';

type WebSocketMessage = {
  type: string;
  data?: any;
  timestamp: string;
};

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    function connect() {
      // Determine WebSocket URL based on current location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('🔌 WebSocket connected');
          reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            handleMessage(message);
          } catch (error) {
            console.error('🔌 Failed to parse WebSocket message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('🔌 WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          wsRef.current = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            reconnectAttempts.current++;
            
            console.log(`🔌 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else {
            console.error('🔌 Max reconnection attempts reached');
          }
        };
      } catch (error) {
        console.error('🔌 Failed to create WebSocket connection:', error);
      }
    }

    function handleMessage(message: WebSocketMessage) {
      console.log('📡 WebSocket message:', message);

      switch (message.type) {
        case 'connected':
          console.log('✅ WebSocket connection confirmed');
          break;

        case 'campaign:updated':
          // Invalidate campaign-related queries
          if (message.data?.campaignId) {
            queryClient.invalidateQueries({ queryKey: ['/api/advertiser/campaigns'] });
            queryClient.invalidateQueries({ queryKey: ['/api/advertiser/campaigns', message.data.campaignId] });
            queryClient.invalidateQueries({ queryKey: ['/api/admin/campaigns'] });
          }
          break;

        case 'booking:updated':
          // Invalidate booking-related queries
          if (message.data?.campaignId) {
            queryClient.invalidateQueries({ queryKey: ['/api/advertiser/campaigns', message.data.campaignId] });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/advertiser/campaigns'] });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/bookings'] });
          queryClient.invalidateQueries({ queryKey: ['/api/owner/booking-requests'] });
          queryClient.invalidateQueries({ queryKey: ['/api/owner/requests'] });
          break;

        case 'screen:updated':
          // Invalidate screen-related queries
          if (message.data?.screenId) {
            queryClient.invalidateQueries({ queryKey: ['/api/screens', message.data.screenId] });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/screens'] });
          queryClient.invalidateQueries({ queryKey: ['/api/public/screens'] });
          queryClient.invalidateQueries({ queryKey: ['/api/admin/screens'] });
          queryClient.invalidateQueries({ queryKey: ['/api/owner/screens'] });
          break;

        default:
          console.log('Unknown message type:', message.type);
      }
    }

    // Initialize WebSocket connection
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}
