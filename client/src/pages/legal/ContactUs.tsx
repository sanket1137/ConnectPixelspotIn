import { Link } from 'wouter';
import { ArrowLeft, Mail, Phone, MapPin, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from "@assets/pixelspot-logo.png";

export default function ContactUs() {
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
        <h1 className="text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-8">We'd love to hear from you. Reach out to us through any of the channels below.</p>

        {/* Company Info Card */}
        <div className="bg-muted/50 rounded-lg p-6 mb-8">
          <p className="font-semibold text-lg">PIXELSPOT SOLUTIONS PRIVATE LIMITED</p>
          <p className="text-muted-foreground mt-1">CIN: U26103KA2025PTC201293</p>
          <p className="text-muted-foreground">GSTIN: 29AAPCP6653G1ZT</p>
          <p className="text-muted-foreground mt-2">
            India's Digital Out-of-Home (DOOH) advertising marketplace
          </p>
        </div>

        {/* Contact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Email</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <a href="mailto:contact@pixelspot.in" className="text-primary hover:underline font-medium">
                contact@pixelspot.in
              </a>
              <p className="text-sm text-muted-foreground mt-1">We typically respond within 24 hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Phone</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <a href="tel:+917204808334" className="text-primary hover:underline font-medium">
                +91 72048 08334
              </a>
              <p className="text-sm text-muted-foreground mt-1">Available during business hours</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Office</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                17, 2nd Floor, 7th Main Road,<br />
                Indiranagar, Second Stage,<br />
                Bangalore, Karnataka,<br />
                India — 560038
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Business Hours */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Business Hours</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="font-medium">Monday – Friday</p>
                <p className="text-muted-foreground">10:00 AM – 7:00 PM IST</p>
              </div>
              <div>
                <p className="font-medium">Saturday</p>
                <p className="text-muted-foreground">10:00 AM – 2:00 PM IST</p>
              </div>
              <div>
                <p className="font-medium">Sunday</p>
                <p className="text-muted-foreground">Closed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <Link href="/privacy">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Privacy Policy</span>
              </div>
            </Link>
            <Link href="/terms">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Terms of Service</span>
              </div>
            </Link>
            <Link href="/refund">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Refund Policy</span>
              </div>
            </Link>
            <Link href="/register?role=advertiser">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Find Screens</span>
              </div>
            </Link>
            <Link href="/register?role=screen_owner">
              <div className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">List Your Screen</span>
              </div>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
