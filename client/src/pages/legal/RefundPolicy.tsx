import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from "@assets/pixelspot-logo.png";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <img src={logo} alt="Pixelspot" className="h-8 w-auto" />
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-2">Refund &amp; Cancellation Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 8, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments on the Pixelspot platform are processed securely via <strong>Razorpay</strong>. This Refund &amp;
              Cancellation Policy outlines the conditions under which refunds are issued for advertising bookings made through
              our Digital Out-of-Home (DOOH) marketplace at{' '}
              <a href="https://connect.pixelspot.in" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                connect.pixelspot.in
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Eligibility for Refund</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You may be eligible for a refund in the following situations:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Booking Rejected by Screen Owner:</strong> If a Screen Owner rejects your booking request, a full automatic refund will be initiated.</li>
              <li><strong>Screen Not Operational:</strong> If the booked screen was not operational during the booked period (verified by our team), a proportional refund will be issued for the affected duration.</li>
              <li><strong>Duplicate or Erroneous Payment:</strong> If you are charged multiple times or an incorrect amount due to a system error, a full refund of the excess amount will be processed.</li>
              <li><strong>Campaign Cancelled Before Start Date:</strong> If you cancel your campaign before it begins, a refund will be issued according to the cancellation schedule below.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Cancellation Schedule</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Refund amounts for advertiser-initiated cancellations depend on the timing relative to the campaign start date:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border rounded-lg">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="border border-border px-4 py-3 text-left font-semibold">Cancellation Timing</th>
                    <th className="border border-border px-4 py-3 text-left font-semibold">Refund</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border px-4 py-3">More than 7 days before campaign start</td>
                    <td className="border border-border px-4 py-3">90% refund (10% administrative fee retained)</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="border border-border px-4 py-3">3 to 7 days before campaign start</td>
                    <td className="border border-border px-4 py-3">50% refund</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-3">Less than 3 days before campaign start</td>
                    <td className="border border-border px-4 py-3">No refund</td>
                  </tr>
                  <tr className="bg-muted/30">
                    <td className="border border-border px-4 py-3">After campaign has started</td>
                    <td className="border border-border px-4 py-3">No refund</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Refund Process</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Submit Request:</strong> Initiate a refund request through the Platform dashboard or by emailing <a href="mailto:contact@pixelspot.in" className="text-primary hover:underline">contact@pixelspot.in</a> with your booking ID and reason for cancellation.</li>
              <li><strong>Review Period:</strong> Our team will review your request within <strong>3–5 business days</strong>.</li>
              <li><strong>Refund Processing:</strong> Approved refunds are processed within <strong>7–10 business days</strong> and credited to your original payment method via Razorpay.</li>
              <li><strong>Notification:</strong> You will receive an email confirmation once your refund has been processed.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Non-Refundable Items</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">The following are not eligible for refunds:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Partially completed campaigns — the completed portion of the campaign is non-refundable.</li>
              <li>Campaigns where content was displayed as booked and verified by the Screen Owner.</li>
              <li>Platform service fees and payment processing fees.</li>
              <li>Campaigns cancelled after the start date (see cancellation schedule above).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Screen Owner Payouts</h2>
            <p className="text-muted-foreground leading-relaxed">
              If a refund is approved for a booking, the corresponding payout to the Screen Owner will be adjusted accordingly.
              Screen Owners will be notified of any payout adjustments via email and their Platform dashboard. If a payout has
              already been disbursed, the adjusted amount may be deducted from future payouts.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Disputes</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Contact Us First:</strong> If you disagree with a refund decision, please reach out to our support team at <a href="mailto:contact@pixelspot.in" className="text-primary hover:underline">contact@pixelspot.in</a> with your booking details and we will re-evaluate your case.</li>
              <li><strong>Razorpay Dispute Resolution:</strong> If the matter remains unresolved, you may escalate the dispute through Razorpay's dispute resolution process.</li>
              <li><strong>Governing Law:</strong> All disputes are subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India, as outlined in our{' '}
                <Link href="/terms"><span className="text-primary hover:underline cursor-pointer">Terms of Service</span></Link>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For refund requests or questions about this policy, please contact us:
            </p>
            <div className="bg-muted/50 rounded-lg p-6">
              <p className="font-semibold">PIXELSPOT SOLUTIONS PRIVATE LIMITED</p>
              <p className="text-muted-foreground mt-1">CIN: U26103KA2025PTC201293</p>
              <p className="text-muted-foreground">GSTIN: 29AAPCP6653G1ZT</p>
              <p className="text-muted-foreground mt-3">17, 2nd Floor, 7th Main Road, Indiranagar, Second Stage,</p>
              <p className="text-muted-foreground">Bangalore, Karnataka, India — 560038</p>
              <p className="text-muted-foreground mt-3">
                Email: <a href="mailto:contact@pixelspot.in" className="text-primary hover:underline">contact@pixelspot.in</a>
              </p>
              <p className="text-muted-foreground">Phone: +91 72048 08334</p>
              <p className="text-muted-foreground mt-3">
                Website: <a href="https://connect.pixelspot.in" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">connect.pixelspot.in</a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
