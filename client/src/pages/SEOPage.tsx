import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Sparkles, ArrowRight, MapPin, Monitor, TrendingUp, CheckCircle2, Building2, Layout, PieChart, ChevronRight, Target, Zap, MessageCircle, Users, Home } from "lucide-react";
import { Link } from "wouter";
import logo from "@assets/pixelspot-logo.png";

interface FAQ {
    question: string;
    answer: string;
}

interface SEOPageProps {
    keyword: string;
    title: string;
    description: string;
    h1: string;
    h2: string;
    introText: string;
    aiAnswer: string;
    features: { title: string; description: string; icon: any }[];
    processSteps: { title: string; description: string }[];
    faqs: FAQ[];
    cityContext?: string;
    industryContext?: string;
}

export default function SEOPage({
    keyword,
    title,
    description,
    h1,
    h2,
    introText,
    aiAnswer,
    features,
    processSteps,
    faqs,
    cityContext,
    industryContext,
}: SEOPageProps) {
    const schema = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": h1,
        "description": description,
        "provider": {
            "@type": "Organization",
            "name": "Pixelspot",
            "url": "https://connect.pixelspot.in"
        },
        "areaServed": cityContext ? { "@type": "City", "name": cityContext } : { "@type": "Country", "name": "India" },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://connect.pixelspot.in/${keyword.toLowerCase().replace(/\s+/g, '-')}`
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <SEO title={title} description={description} keywords={keyword} schema={schema} />

            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4">
                    <div className="flex h-16 items-center justify-between">
                        <Link href="/">
                            <img src={logo} alt="Pixelspot" className="h-8 sm:h-10 w-auto cursor-pointer" />
                        </Link>
                        <div className="flex items-center gap-3">
                            <Link href="/login">
                                <Button variant="ghost" size="sm">Login</Button>
                            </Link>
                            <Link href="/register?role=advertiser">
                                <Button size="sm">
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Sign Up Free
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            {/* Breadcrumbs */}
            <div className="bg-muted/30 border-b">
                <div className="container mx-auto px-4 py-3">
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink href="/" className="flex items-center gap-1">
                                    <Home className="w-3.5 h-3.5" />
                                    Home
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator>
                                <ChevronRight className="w-4 h-4" />
                            </BreadcrumbSeparator>
                            {cityContext && (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/cities">Cities</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator>
                                        <ChevronRight className="w-4 h-4" />
                                    </BreadcrumbSeparator>
                                </>
                            )}
                            {industryContext && (
                                <>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="/industries">Industries</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator>
                                        <ChevronRight className="w-4 h-4" />
                                    </BreadcrumbSeparator>
                                </>
                            )}
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-medium text-foreground">{keyword}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden bg-gradient-to-br from-primary/10 via-background to-background border-b">
                <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
                <div className="container mx-auto px-4 relative">
                    <div className="max-w-4xl mx-auto text-center space-y-8">
                        <Badge {...({ variant: "outline" } as any)} className="px-4 py-2 bg-primary/20 text-primary border-primary/30 text-sm font-medium">
                            #1 DOOH Advertising Platform in India
                        </Badge>
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                            {h1}
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            {introText}
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link href="/register?role=advertiser" className="w-full sm:w-auto">
                                <Button size="lg" className="h-14 px-8 text-lg w-full group">
                                    Launch Your Campaign
                                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="/advertiser/discover" className="w-full sm:w-auto">
                                <Button variant="outline" size="lg" className="h-14 px-8 text-lg w-full">
                                    Explore Screens Nearby
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Overview / Voice Search Section */}
            <section className="py-16 bg-muted/30 border-b">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto bg-background/50 backdrop-blur border rounded-2xl p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-full bg-primary/10">
                                <Sparkles className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-xl font-bold tracking-tight">AI Insights: {h2}</h3>
                        </div>
                        <p className="text-lg text-foreground/90 leading-relaxed italic">
                            "{aiAnswer}"
                        </p>
                    </div>
                </div>
            </section>

            {/* Why Choose Us / Features */}
            <section className="py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold">{h2}</h2>
                        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                            Pixelspot provides the most advanced DOOH infrastructure in India, ensuring your brand reaches the right audience at the right time.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {features.map((feature, i) => (
                            <Card key={i} className="hover:shadow-lg transition-shadow border-primary/10">
                                <CardHeader>
                                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
                                        <feature.icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <CardTitle className="text-2xl">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-lg leading-relaxed">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Campaign Process */}
            <section className="py-24 bg-muted/30 border-y">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Our Streamlined Campaign Process</h2>
                        <p className="text-muted-foreground text-lg">Launching an outdoor campaign has never been easier.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {processSteps.map((step, i) => (
                            <div key={i} className="relative group">
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-bold shadow-xl shadow-primary/20">
                                        {i + 1}
                                    </div>
                                    <h3 className="text-xl font-bold">{step.title}</h3>
                                    <p className="text-muted-foreground">{step.description}</p>
                                </div>
                                {i < processSteps.length - 1 && (
                                    <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/30 to-transparent border-t-2 border-dashed border-primary/20" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section className="py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Frequently Asked Questions</h2>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, i) => (
                                <AccordionItem key={i} value={`faq-${i}`} className="border-b border-primary/10">
                                    <AccordionTrigger className="text-lg font-semibold hover:text-primary transition-colors text-left py-6">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-muted-foreground text-lg leading-relaxed pb-6">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </div>
            </section>

            {/* CTA Footer */}
            <section className="py-20 bg-primary text-primary-foreground overflow-hidden relative">
                <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:60px_60px]" />
                <div className="container mx-auto px-4 relative text-center space-y-8">
                    <h2 className="text-3xl md:text-5xl font-bold">Ready to Dominate {cityContext || 'India'}?</h2>
                    <p className="text-xl opacity-90 max-w-2xl mx-auto">
                        Join 500+ advertisers already using Pixelspot to grow their brands with ROI-driven DOOH campaigns.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/register?role=advertiser">
                            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-bold group">
                                Sign Up for Free
                                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/login">
                            <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-bold border-white text-white hover:bg-white hover:text-primary">
                                Existing User? Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer Links */}
            <footer className="py-12 bg-background border-t">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                        <div>
                            <h4 className="font-bold mb-4">Our Services</h4>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><Link href="/dooh-advertising-india">DOOH Advertising</Link></li>
                                <li><Link href="/ooh-advertising">OOH Advertising</Link></li>
                                <li><Link href="/digital-hoardings">Digital Hoardings</Link></li>
                                <li><Link href="/billboard-advertising">Billboard Advertising</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Cities Covered</h4>
                            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                                <li><Link href="/cities/mumbai">Mumbai</Link></li>
                                <li><Link href="/cities/delhi">Delhi</Link></li>
                                <li><Link href="/cities/bangalore">Bangalore</Link></li>
                                <li><Link href="/cities/hyderabad">Hyderabad</Link></li>
                                <li><Link href="/cities/chennai">Chennai</Link></li>
                                <li><Link href="/cities/pune">Pune</Link></li>
                                <li><Link href="/cities/ahmedabad">Ahmedabad</Link></li>
                                <li><Link href="/cities/kolkata">Kolkata</Link></li>
                                <li><Link href="/cities/surat">Surat</Link></li>
                                <li><Link href="/cities/jaipur">Jaipur</Link></li>
                                <li><Link href="/cities/lucknow">Lucknow</Link></li>
                                <li><Link href="/cities/gurgaon">Gurgaon</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Industries</h4>
                            <ul className="space-y-2 text-muted-foreground">
                                <li><Link href="/industries/real-estate">Real Estate</Link></li>
                                <li><Link href="/industries/automobile">Automobile</Link></li>
                                <li><Link href="/industries/retail">Retail</Link></li>
                                <li><Link href="/industries/fashion">Fashion</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Contact</h4>
                            <p className="text-muted-foreground">Email: info@pixelspot.in</p>
                            <p className="text-muted-foreground">Support: 24/7 Available</p>
                        </div>
                    </div>
                    <div className="pt-8 border-t text-center text-muted-foreground">
                        <p>© 2026 Pixelspot Network India. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
