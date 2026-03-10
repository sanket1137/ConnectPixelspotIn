// Razorpay Payment Gateway Service
// Handles order creation, payment verification, and payment fetching
import Razorpay from "razorpay";
import crypto from "crypto";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

let razorpayInstance: Razorpay | null = null;

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error("Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.");
    }
    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayInstance;
}

export interface CreateOrderOptions {
  amount: number;       // Amount in paise (INR minor units). ₹100 = 10000
  currency?: string;    // Default: INR
  receipt: string;      // Unique receipt ID (e.g., campaign or booking ID)
  notes?: Record<string, string>; // Additional metadata
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  notes: Record<string, string>;
  created_at: number;
}

export interface VerifyPaymentParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

class RazorpayService {
  /**
   * Create a Razorpay order for collecting payment
   */
  async createOrder(options: CreateOrderOptions): Promise<RazorpayOrder> {
    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: options.amount,
      currency: options.currency || "INR",
      receipt: options.receipt,
      notes: options.notes || {},
    });
    return order as unknown as RazorpayOrder;
  }

  /**
   * Verify Razorpay payment signature (HMAC SHA256)
   * This MUST be called after client-side payment to ensure authenticity
   */
  verifyPayment(params: VerifyPaymentParams): boolean {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    return expectedSignature === razorpay_signature;
  }

  /**
   * Verify Razorpay webhook signature
   */
  verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return expectedSignature === signature;
  }

  /**
   * Fetch payment details from Razorpay
   */
  async fetchPayment(paymentId: string): Promise<any> {
    const razorpay = getRazorpay();
    return await razorpay.payments.fetch(paymentId);
  }

  /**
   * Fetch order details from Razorpay
   */
  async fetchOrder(orderId: string): Promise<any> {
    const razorpay = getRazorpay();
    return await razorpay.orders.fetch(orderId);
  }

  /**
   * Initiate a refund for a payment
   */
  async createRefund(paymentId: string, amount?: number, notes?: Record<string, string>): Promise<any> {
    const razorpay = getRazorpay();
    const refundOptions: any = {};
    if (amount) refundOptions.amount = amount; // partial refund in paise
    if (notes) refundOptions.notes = notes;
    return await razorpay.payments.refund(paymentId, refundOptions);
  }

  /**
   * Check if Razorpay is configured
   */
  isConfigured(): boolean {
    return !!(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
  }

  /**
   * Get the public key for client-side checkout
   */
  getPublicKey(): string {
    return RAZORPAY_KEY_ID;
  }
}

export const razorpayService = new RazorpayService();
