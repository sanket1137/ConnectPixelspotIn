import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import type { Blog } from "@shared/schema";

export default function BlogList() {
    const { data: blogs, isLoading } = useQuery<Blog[]>({
        queryKey: ["/api/blogs"],
    });

    return (
        <div className="min-h-screen bg-background">
            <SEO
                title="Blog | Pixelspot - DOOH Advertising Insights"
                description="Insights, trends, and guides on Digital Out-of-Home (DOOH) advertising from the team at Pixelspot."
            />

            {/* Hero Section */}
            <section className="relative py-20 overflow-hidden bg-slate-950 text-white">
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">Industry Insights</Badge>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Pixelspot Blog</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Stay updated with the latest trends in digital outdoor advertising, case studies, and expert advice for your brand.
                    </p>
                </div>
            </section>

            {/* Blog Feed */}
            <section className="py-20 container mx-auto px-4">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-[400px] w-full rounded-xl bg-muted animate-pulse" />
                        ))}
                    </div>
                ) : blogs && blogs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {blogs.map((blog) => (
                            <Card key={blog.id} className="flex flex-col h-full border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg">
                                {blog.coverImage && (
                                    <div className="aspect-video relative overflow-hidden rounded-t-xl">
                                        <img
                                            src={blog.coverImage}
                                            alt={blog.title}
                                            className="object-cover w-full h-full transition-transform hover:scale-105 duration-500"
                                        />
                                    </div>
                                )}
                                <CardHeader>
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {format(new Date(blog.createdAt), "MMM d, yyyy")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            Pixelspot Team
                                        </span>
                                    </div>
                                    <CardTitle className="line-clamp-2 hover:text-primary transition-colors">
                                        <Link href={`/blog/${blog.slug}`}>{blog.title}</Link>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <p className="text-muted-foreground text-sm line-clamp-3">
                                        {blog.excerpt || blog.content.substring(0, 150) + "..."}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="ghost" className="p-0 text-primary hover:text-primary/80 group" asChild>
                                        <Link href={`/blog/${blog.slug}`}>
                                            Read More
                                            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <h3 className="text-2xl font-semibold mb-4 text-muted-foreground">No posts yet</h3>
                        <p>Our team is working on some exciting content. Stay tuned!</p>
                    </div>
                )}
            </section>

            {/* Newsletter / CTA */}
            <section className="bg-primary/5 py-20 border-y border-primary/10">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Ready to Launch Your Campaign?</h2>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Join 1000+ brands reaching millions across India.
                    </p>
                    <Button size="lg" className="rounded-full px-8" asChild>
                        <Link href="/login">Get Started for Free</Link>
                    </Button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-primary/5">
                <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="text-center md:text-left">
                        <h3 className="font-bold text-xl mb-4">Pixelspot</h3>
                        <p className="text-sm text-muted-foreground">
                            India's Smartest AI-Powered DOOH Advertising Network.
                        </p>
                    </div>
                    <div className="flex gap-8 text-sm text-muted-foreground font-medium">
                        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
                        <Link href="/blog" className="text-primary underline">Blog</Link>
                        <Link href="/find-screens" className="hover:text-primary transition-colors">Find Screens</Link>
                        <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
                    </div>
                </div>
                <div className="container mx-auto px-4 mt-20 pt-8 border-t border-primary/5 text-center text-xs text-muted-foreground">
                    © {new Date().getFullYear()} Pixelspot. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
