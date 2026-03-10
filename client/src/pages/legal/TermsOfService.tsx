import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from "@assets/pixelspot-logo.png";

export default function TermsOfService() {
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
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 8, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Definitions</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>"Platform"</strong> refers to the Pixelspot marketplace operated at connect.pixelspot.in by PIXELSPOT SOLUTIONS PRIVATE LIMITED.</li>
              <li><strong>"Advertiser"</strong> refers to any user who creates campaigns and books advertising slots on digital screens through the Platform.</li>
              <li><strong>"Screen Owner"</strong> refers to any user who lists and manages digital screens on the Platform to receive advertising bookings.</li>
              <li><strong>"Campaign"</strong> refers to an advertising initiative created by an Advertiser, including creative assets, targeting preferences, and budget.</li>
              <li><strong>"Booking"</strong> refers to a request by an Advertiser to display content on a specific Screen for a defined period, subject to Screen Owner approval.</li>
              <li><strong>"Screen"</strong> refers to a digital display device listed on the Platform by a Screen Owner for advertising purposes.</li>
              <li><strong>"Content"</strong> refers to any images, videos, text, or other creative materials uploaded to the Platform by users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing, registering on, or using the Pixelspot platform, you acknowledge that you have read, understood, and agree
              to be bound by these Terms of Service, our{' '}
              <Link href="/privacy"><span className="text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>, and our{' '}
              <Link href="/refund"><span className="text-primary hover:underline cursor-pointer">Refund Policy</span></Link>.
              If you do not agree with any part of these terms, you must not use the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Eligibility</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must be at least 18 years of age to use the Platform.</li>
              <li>Screen Owners must be a valid business entity or authorized individual with legal rights to operate and monetize the listed screens.</li>
              <li>The Platform primarily serves the Indian market. Users and screens should be India-based or serving the Indian advertising market.</li>
              <li>You must have the legal capacity and authority to enter into a binding agreement.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Account Registration</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>Email and/or mobile verification is required to activate your account.</li>
              <li>You are solely responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must notify us immediately of any unauthorized access to your account.</li>
              <li>One person or entity may not maintain multiple accounts without prior written approval.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Screen Owner Obligations</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Provide accurate and up-to-date screen information including location, specifications, operating hours, and pricing.</li>
              <li>Approve or reject booking requests in a timely manner (within the platform-specified timeframe).</li>
              <li>Maintain screens in proper working condition during booked periods to ensure content is displayed as agreed.</li>
              <li>Comply with all applicable local, state, and national advertising laws and regulations, including outdoor advertising permits and municipal guidelines.</li>
              <li>Not list screens that you do not own or have legal authorization to operate.</li>
              <li>Ensure screen content complies with the Advertising Standards Council of India (ASCI) guidelines.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Advertiser Obligations</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Upload only lawful content that does not violate any applicable laws or regulations.</li>
              <li>Content must not be misleading, deceptive, defamatory, obscene, offensive, or illegal.</li>
              <li>Respect intellectual property rights — do not upload content for which you do not hold the necessary rights or licenses.</li>
              <li>Provide campaign creative assets in the required formats and specifications.</li>
              <li>Not promote products or services prohibited under Indian law (e.g., tobacco advertising in violation of COTPA, misleading pharmaceutical claims).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Bookings &amp; Payments</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>A booking is a request to display content on a screen — it is <strong>not guaranteed</strong> until approved by the Screen Owner.</li>
              <li>Screen Owners have the right to approve or reject any booking request at their discretion.</li>
              <li>Payment is processed via Razorpay upon booking approval. All payments are in Indian Rupees (INR).</li>
              <li>Goods and Services Tax (GST) at the applicable rate (currently 18%) will be charged on all transactions.</li>
              <li>Invoices are generated automatically and available in your account dashboard.</li>
              <li>Pixelspot acts as a marketplace facilitator and is not a party to the advertising agreement between Advertisers and Screen Owners.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cancellation &amp; Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              Cancellations and refunds are governed by our{' '}
              <Link href="/refund"><span className="text-primary hover:underline cursor-pointer">Refund Policy</span></Link>.
              Please review it carefully before making a booking. Refund eligibility depends on the timing of cancellation
              relative to the campaign start date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Platform Commission</h2>
            <p className="text-muted-foreground leading-relaxed">
              Pixelspot charges a service fee (commission) on transactions facilitated through the Platform. The applicable
              commission rate is disclosed to Screen Owners during onboarding and may be updated with prior notice. Commission
              is deducted from the booking amount before payout to the Screen Owner.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Intellectual Property</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>The Pixelspot platform, including its design, code, features, logos, and branding, is the intellectual property of PIXELSPOT SOLUTIONS PRIVATE LIMITED.</li>
              <li>Users retain ownership of the content they upload to the Platform.</li>
              <li>By uploading content, you grant Pixelspot a non-exclusive, royalty-free license to display, distribute, and process your content as necessary to operate the Platform and fulfill bookings.</li>
              <li>You must not copy, modify, distribute, or reverse-engineer any part of the Platform without written permission.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Prohibited Activities</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">The following activities are strictly prohibited:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Creating fake or fraudulent accounts or misrepresenting your identity.</li>
              <li>Spamming, phishing, or sending unsolicited communications through the Platform.</li>
              <li>Attempting to hack, exploit vulnerabilities, or gain unauthorized access to the Platform or its systems.</li>
              <li>Scraping, crawling, or using automated tools to extract data from the Platform without permission.</li>
              <li>Circumventing the Platform to conduct transactions directly with users discovered through Pixelspot.</li>
              <li>Uploading malicious software, viruses, or any code designed to disrupt the Platform.</li>
              <li>Manipulating reviews, ratings, or any other feedback mechanism.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>The Platform is provided on an <strong>"as-is"</strong> and <strong>"as-available"</strong> basis without warranties of any kind, express or implied.</li>
              <li>Pixelspot does not guarantee specific advertising results, screen availability, or campaign performance.</li>
              <li>To the maximum extent permitted by law, Pixelspot's total liability to any user shall not exceed the total fees paid by that user to Pixelspot in the 12 months preceding the claim.</li>
              <li>Pixelspot is not liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Platform.</li>
              <li>Pixelspot is not responsible for the actions, content, or conduct of any user on the Platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p className="text-muted-foreground leading-relaxed">
              You agree to indemnify, defend, and hold harmless PIXELSPOT SOLUTIONS PRIVATE LIMITED, its directors, officers,
              employees, and agents from and against any and all claims, liabilities, damages, losses, costs, and expenses
              (including reasonable legal fees) arising from your use of the Platform, violation of these Terms, infringement
              of any third-party rights, or any content you upload or distribute through the Platform.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Dispute Resolution</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>These Terms shall be governed by and construed in accordance with the laws of India.</li>
              <li>Any disputes arising from or in connection with these Terms or the use of the Platform shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.</li>
              <li>Before initiating legal action, parties agree to attempt resolution through good-faith negotiation and, if necessary, mediation.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Termination</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You may deactivate your account at any time by contacting us.</li>
              <li>Pixelspot reserves the right to suspend or terminate accounts that violate these Terms, engage in prohibited activities, or are inactive for an extended period.</li>
              <li>Upon termination, your right to use the Platform ceases immediately. Provisions relating to intellectual property, limitation of liability, indemnification, and dispute resolution survive termination.</li>
              <li>Any pending payouts will be processed within 30 days of account termination, subject to applicable deductions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              For questions or concerns about these Terms of Service, please contact us:
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
