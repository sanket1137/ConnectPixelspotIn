import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, ArrowLeft, Share2, Facebook, Twitter, Linkedin } from "lucide-react";
import { format } from "date-fns";
import type { Blog } from "@shared/schema";

export default function BlogPost() {
    const [, params] = useRoute("/blog/:slug");
    const slug = params?.slug;

    const { data: blog, isLoading } = useQuery<Blog>({
        queryKey: [`/api/blogs/${slug}`],
        enabled: !!slug,
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-20 max-w-4xl animate-pulse">
                    <div className="h-4 w-20 bg-muted mb-8 rounded" />
                    <div className="h-12 w-3/4 bg-muted mb-6 rounded" />
                    <div className="h-4 w-1/2 bg-muted mb-12 rounded" />
                    <div className="aspect-video w-full bg-muted rounded-xl mb-12" />
                    <div className="space-y-4">
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-2/3 bg-muted rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
                <h2 className="text-3xl font-bold mb-4">Post Not Found</h2>
                <p className="text-muted-foreground mb-8">The blog post you're looking for doesn't exist or has been removed.</p>
                <Button asChild>
                    <Link href="/blog">Back to Blog</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <SEO
                title={`${blog.title} | Pixelspot Blog`}
                description={blog.excerpt || blog.content.substring(0, 160)}
            />

            {/* Article Header */}
            <header className="pt-20 pb-12 bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
                <div className="container mx-auto px-4 relative z-10 max-w-4xl">
                    <Link href="/blog" className="inline-flex items-center text-primary hover:text-primary/80 transition-colors mb-8 group">
                        <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
                        Back to All Posts
                    </Link>

                    <Badge className="mb-4 bg-primary/20 text-primary border-primary/30 uppercase tracking-wider">Expert Insights</Badge>
                    <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
                        {blog.title}
                    </h1>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                P
                            </div>
                            <div className="flex flex-col">
                                <span className="text-white font-medium">Pixelspot Team</span>
                                <span>Content Strategy</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(blog.createdAt), "MMMM d, yyyy")}
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <article className="py-20 container mx-auto px-4 max-w-4xl">
                {blog.coverImage && (
                    <div className="mb-12 rounded-2xl overflow-hidden shadow-2xl border border-primary/10">
                        <img
                            src={blog.coverImage}
                            alt={blog.title}
                            className="w-full h-auto object-cover max-h-[500px]"
                        />
                    </div>
                )}

                {/* Content Body */}
                <div
                    className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 transition-colors"
                    dangerouslySetInnerHTML={{ __html: blog.content }}
                />

                {/* Share Section */}
                <div className="mt-20 pt-10 border-t border-primary/10 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Share this post</span>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="rounded-full hover:bg-blue-600 hover:text-white transition-all">
                                <Facebook className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full hover:bg-sky-400 hover:text-white transition-all">
                                <Twitter className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full hover:bg-blue-700 hover:text-white transition-all">
                                <Linkedin className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full">
                                <Share2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <Button variant="outline" className="rounded-full" asChild>
                        <Link href="/blog">
                            See All Posts
                        </Link>
                    </Button>
                </div>
            </article>

            {/* Quick CTA */}
            <section className="bg-primary/5 py-20 border-y border-primary/10">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl font-bold mb-4">Want to reach millions in this venue?</h2>
                    <p className="text-muted-foreground mb-8 text-lg">
                        Book digital screens at prime locations across India in minutes.
                    </p>
                    <Button size="lg" className="rounded-full px-8 shadow-xl hover:shadow-primary/20 transition-all font-bold" asChild>
                        <Link href="/register">Start Your Campaign</Link>
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
