import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayCheckoutOptions {
  campaignId: string;
  amount: number; // in paise
  campaignName: string;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function useRazorpayCheckout() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const initiatePayment = useCallback(async (options: RazorpayCheckoutOptions) => {
    setIsProcessing(true);
    
    try {
      // 1. Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Failed to load Razorpay SDK. Check your internet connection.");
      }

      // 2. Get Razorpay public key
      const configRes = await apiRequest("GET", "/api/payments/config");
      const { keyId } = await configRes.json();
      if (!keyId) {
        throw new Error("Razorpay is not configured. Contact support.");
      }

      // 3. Create order on backend
      const orderRes = await apiRequest("POST", "/api/payments/create-order", {
        campaignId: options.campaignId,
        amount: options.amount,
      });
      const { orderId, amount, currency } = await orderRes.json();

      // 4. Open Razorpay checkout
      return new Promise<string>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: "Pixelspot",
          description: `Payment for ${options.campaignName}`,
          order_id: orderId,
          handler: async function (response: any) {
            try {
              // 5. Verify payment on backend
              const verifyRes = await apiRequest("POST", "/api/payments/verify", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              const result = await verifyRes.json();
              
              toast({
                title: "Payment Successful",
                description: `Payment of ₹${(amount / 100).toLocaleString()} completed. Invoice: ${result.invoice?.invoiceNumber || "Generated"}`,
              });
              
              options.onSuccess?.(response.razorpay_payment_id);
              resolve(response.razorpay_payment_id);
            } catch (verifyError: any) {
              const msg = verifyError.message || "Payment verification failed";
              toast({ title: "Verification Failed", description: msg, variant: "destructive" });
              options.onFailure?.(msg);
              reject(new Error(msg));
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              options.onFailure?.("Payment cancelled");
              reject(new Error("Payment cancelled"));
            },
          },
          theme: {
            color: "#6366f1",
          },
        });

        rzp.on("payment.failed", function (response: any) {
          setIsProcessing(false);
          const msg = response.error?.description || "Payment failed";
          toast({ title: "Payment Failed", description: msg, variant: "destructive" });
          options.onFailure?.(msg);
          reject(new Error(msg));
        });

        rzp.open();
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({
        title: "Payment Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      options.onFailure?.(error.message);
      throw error;
    }
  }, [toast]);

  return { initiatePayment, isProcessing };
}
