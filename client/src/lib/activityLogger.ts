import { apiRequest } from "@/lib/queryClient";

export interface LogActivityParams {
  actionType:
    | "user_login"
    | "screen_search"
    | "screen_view"
    | "add_to_cart"
    | "update_cart_quantity"
    | "remove_from_cart"
    | "campaign_draft_start"
    | "campaign_step_advance"
    | "campaign_abandoned";
  actionDetails: string;
  metadata?: Record<string, any>;
  sessionId?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    let sessionId = sessionStorage.getItem("pixelspot_session_id");
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem("pixelspot_session_id", sessionId);
    }

    await apiRequest("POST", "/api/activity/log", {
      ...params,
      sessionId: params.sessionId || sessionId,
    });
  } catch {
    // Fail silently in client so user experience is never disrupted
  }
}
