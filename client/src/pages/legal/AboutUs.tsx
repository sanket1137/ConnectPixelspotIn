import { Link } from 'wouter';
import { ArrowLeft, Monitor, Megaphone, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logo from "@assets/pixelspot-logo.png";

export default function AboutUs() {
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
        {/* Hero */}
        <section className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Connecting Brands with Digital Screens Across India</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Pixelspot is India's Digital Out-of-Home (DOOH) advertising marketplace — making it effortless for brands
            to reach audiences on digital screens and for screen owners to monetize their inventory.
          </p>
        </section>

        {/* Who We Are */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Who We Are</h2>
          <p className="text-muted-foreground leading-relaxed">
            <strong>PIXELSPOT SOLUTIONS PRIVATE LIMITED</strong> is a technology company founded in 2025, headquartered in
            Bangalore, Karnataka, India. We operate{' '}
            <a href="https://connect.pixelspot.in" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              connect.pixelspot.in
            </a> — a marketplace that connects advertisers with digital screen owners across India. Our mission is to
            democratize outdoor digital advertising by making it accessible, transparent, and efficient for businesses of all sizes.
          </p>
          <p className="text-muted-foreground leading-relaxed mt-3">
            From small local businesses to national brands, Pixelspot empowers advertisers to discover and book digital screens
            in prime locations, while enabling screen owners to maximize their revenue with minimal effort.
          </p>
        </section>

        {/* What We Do */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">What We Do</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Megaphone className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Advertisers</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>Discover digital screens across India on an interactive map</li>
                  <li>Create targeted ad campaigns with flexible budgets</li>
                  <li>Book time slots on screens that match your audience</li>
                  <li>Track campaign performance and manage bookings</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Monitor className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>For Screen Owners</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>List your digital screens and set your own pricing</li>
                  <li>Receive booking requests from verified advertisers</li>
                  <li>Earn revenue from your screen inventory</li>
                  <li>Manage availability and approve bookings easily</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>AI-Powered</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-muted-foreground space-y-2 text-sm">
                  <li>Smart targeting recommendations based on your goals</li>
                  <li>Automatic screen tagging using location intelligence</li>
                  <li>AI campaign advisor for budget and screen selection</li>
                  <li>Data-driven insights to optimize performance</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Company Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Company Details</h2>
          <div className="bg-muted/50 rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company Name</p>
                <p className="font-semibold">PIXELSPOT SOLUTIONS PRIVATE LIMITED</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">CIN</p>
                <p className="font-semibold">U26103KA2025PTC201293</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">GSTIN</p>
                <p className="font-semibold">29AAPCP6653G1ZT</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Founded</p>
                <p className="font-semibold">2025</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">Registered Office</p>
                <p className="font-semibold">17, 2nd Floor, 7th Main Road, Indiranagar, Second Stage, Bangalore, Karnataka, India — 560038</p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            Have questions or want to learn more? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <p className="text-muted-foreground">
              Email: <a href="mailto:contact@pixelspot.in" className="text-primary hover:underline">contact@pixelspot.in</a>
            </p>
            <p className="text-muted-foreground">
              Phone: <a href="tel:+917760807137" className="text-primary hover:underline">+91 77608 07137</a>
            </p>
          </div>
          <div className="mt-4">
            <Link href="/contact">
              <Button variant="outline">
                Visit Contact Page
              </Button>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
