import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from "@assets/pixelspot-logo.png";

export default function PrivacyPolicy() {
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
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: March 8, 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Pixelspot. This Privacy Policy explains how <strong>PIXELSPOT SOLUTIONS PRIVATE LIMITED</strong>{' '}
              (CIN: U26103KA2025PTC201293), operating the platform at{' '}
              <a href="https://connect.pixelspot.in" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                connect.pixelspot.in
              </a>, collects, uses, discloses, and protects your personal information when you use our Digital Out-of-Home (DOOH)
              advertising marketplace.
            </p>
            <p className="text-muted-foreground leading-relaxed mt-3">
              This policy applies to all users of our platform, including Advertisers, Screen Owners, and visitors.
              By accessing or using Pixelspot, you consent to the practices described in this Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-medium mb-3">2.1 Information You Provide</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Information:</strong> Name, email address, phone number, password, and role selection (Advertiser or Screen Owner) during registration.</li>
              <li><strong>Screen Owner Data:</strong> Business name, screen locations (latitude/longitude, address), screen specifications (type, resolution, dimensions), operating hours, pricing, and photographs of screen installations.</li>
              <li><strong>Advertiser Data:</strong> Business/brand name, campaign details, creative assets (images, videos), targeting preferences, and budget information.</li>
              <li><strong>Payment Information:</strong> Billing details processed securely via Razorpay. We do not store your full credit/debit card numbers on our servers.</li>
              <li><strong>Communications:</strong> Messages, support requests, and any other content you share with us or other users through the platform.</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">2.2 Automatically Collected Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Usage Data:</strong> Pages viewed, features used, actions taken, timestamps, and interaction patterns on the platform.</li>
              <li><strong>Device Information:</strong> Browser type, operating system, device type, screen resolution, and unique device identifiers.</li>
              <li><strong>Location Data:</strong> Approximate location based on IP address; precise location only when you use map-based features with your consent.</li>
              <li><strong>Cookies &amp; Similar Technologies:</strong> Session cookies for authentication, preference cookies, and analytics data to improve user experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Management:</strong> Create, maintain, and secure your account; verify your identity and email/mobile number.</li>
              <li><strong>Screen &amp; Campaign Facilitation:</strong> Enable screen listing, discovery, campaign creation, and booking management between Advertisers and Screen Owners.</li>
              <li><strong>Payments, Invoices &amp; Payouts:</strong> Process transactions, generate invoices with applicable GST, and facilitate payouts to Screen Owners.</li>
              <li><strong>AI-Powered Recommendations:</strong> Provide intelligent campaign targeting suggestions, budget optimization, and screen recommendations using AI analysis.</li>
              <li><strong>Screen Auto-Tagging:</strong> Automatically generate relevant tags for screens using Google Places API data to improve discoverability.</li>
              <li><strong>Notifications:</strong> Send booking confirmations, approval/rejection updates, payment receipts, and platform announcements via email (AWS SES) and SMS.</li>
              <li><strong>Platform Improvement:</strong> Analyze usage patterns to enhance features, fix issues, and improve overall user experience.</li>
              <li><strong>Legal Compliance:</strong> Meet regulatory obligations, enforce our Terms of Service, and protect against fraud or misuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing &amp; Disclosure</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              <strong>We do not sell your personal data.</strong> We share information only in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Between Platform Users:</strong> When a booking is made, the Screen Owner can see the Advertiser's name and campaign details, and the Advertiser can see the Screen Owner's business name and screen information. This is necessary to facilitate the booking.</li>
              <li><strong>Payment Processor (Razorpay):</strong> Transaction details are shared with Razorpay to process payments securely. Razorpay operates under its own privacy policy and is PCI-DSS compliant.</li>
              <li><strong>Service Providers:</strong> We use trusted third-party services under data processing agreements, including AWS SES (email delivery), Google Cloud (storage &amp; maps), Firebase (authentication &amp; hosting), and OpenAI (AI-powered features).</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or governmental authority, or to protect the rights, safety, or property of Pixelspot, our users, or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Encryption in Transit:</strong> All data transmitted between your browser and our servers is encrypted using SSL/TLS protocols.</li>
              <li><strong>Authentication:</strong> Secure authentication powered by Firebase Auth with support for email/password and Google Sign-In.</li>
              <li><strong>Rate Limiting:</strong> API rate limiting to prevent abuse and brute-force attacks.</li>
              <li><strong>CSRF &amp; CSP Headers:</strong> Cross-Site Request Forgery protection and Content Security Policy headers to prevent common web attacks.</li>
              <li><strong>Encrypted Database:</strong> Database connections are encrypted with SSL, and sensitive data is stored securely.</li>
              <li><strong>Payment Security:</strong> All payment processing is handled by Razorpay, which is PCI-DSS Level 1 compliant.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Data Retention</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Active Accounts:</strong> Your data is retained as long as your account is active and you continue to use the platform.</li>
              <li><strong>Financial Records:</strong> Transaction records, invoices, and payment data are retained for a minimum of 8 years as required under Indian tax and financial laws.</li>
              <li><strong>Account Deletion:</strong> You may request deletion of your account and associated data by contacting us. We will process deletion requests subject to legal retention obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Update or correct your personal information via your profile settings or by contacting us.</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements (e.g., financial records).</li>
              <li><strong>Withdraw Consent:</strong> Withdraw consent for optional data processing activities (such as marketing communications) at any time.</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise any of these rights, please contact us at{' '}
              <a href="mailto:contact@pixelspot.in" className="text-primary hover:underline">contact@pixelspot.in</a>.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We integrate with the following third-party services. Each operates under its own privacy policy:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><a href="https://policies.google.com/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a> (Google Maps, Google Cloud, Google Sign-In)</li>
              <li><a href="https://firebase.google.com/support/privacy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Firebase Privacy Policy</a> (Authentication, Hosting)</li>
              <li><a href="https://razorpay.com/privacy/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Razorpay Privacy Policy</a> (Payment Processing)</li>
              <li><a href="https://aws.amazon.com/privacy/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">AWS Privacy Policy</a> (Email via SES)</li>
              <li><a href="https://openai.com/privacy/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">OpenAI Privacy Policy</a> (AI Features)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements,
              or other factors. When we make material changes, we will notify you via email at the address associated with your account
              and/or through a prominent notice on the platform. Your continued use of Pixelspot after changes are posted constitutes
              your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
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
