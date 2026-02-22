import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Eye, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { format } from "date-fns";
import type { Blog } from "@shared/schema";
import { Link } from "wouter";

export default function ManageBlogs() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
    const [formData, setFormData] = useState({
        title: "",
        slug: "",
        content: "",
        excerpt: "",
        coverImage: "",
        status: "draft"
    });

    const { data: blogs = [], isLoading } = useQuery<Blog[]>({
        queryKey: ["/api/admin/blogs"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            const response = await apiRequest("POST", "/api/admin/blogs", data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
            setIsDialogOpen(false);
            resetForm();
            toast({ title: "Blog Created", description: "The blog post has been created successfully." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: typeof formData }) => {
            const response = await apiRequest("PATCH", `/api/admin/blogs/${id}`, data);
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
            setIsDialogOpen(false);
            setEditingBlog(null);
            resetForm();
            toast({ title: "Blog Updated", description: "The blog post has been updated successfully." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/admin/blogs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/blogs"] });
            toast({ title: "Blog Deleted", description: "The blog post has been deleted." });
        },
        onError: (error: Error) => {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    });

    const resetForm = () => {
        setFormData({
            title: "",
            slug: "",
            content: "",
            excerpt: "",
            coverImage: "",
            status: "draft"
        });
    };

    const handleEdit = (blog: Blog) => {
        setEditingBlog(blog);
        setFormData({
            title: blog.title,
            slug: blog.slug,
            content: blog.content,
            excerpt: blog.excerpt || "",
            coverImage: blog.coverImage || "",
            status: blog.status
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingBlog) {
            updateMutation.mutate({ id: editingBlog.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        setFormData(prev => ({
            ...prev,
            title,
            slug: editingBlog ? prev.slug : generateSlug(title)
        }));
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground font-serif">Manage Blogs</h1>
                    <p className="text-muted-foreground mt-1">Create and manage your platform's editorial content</p>
                </div>
                <Button onClick={() => { resetForm(); setEditingBlog(null); setIsDialogOpen(true); }} data-testid="button-add-blog">
                    <Plus className="h-4 w-4 mr-2" />
                    New Post
                </Button>
            </div>

            {isLoading ? (
                <div className="text-center py-12">Loading blogs...</div>
            ) : blogs.length === 0 ? (
                <Card className="p-12 text-center">
                    <h3 className="text-xl font-semibold mb-2">No blogs found</h3>
                    <p className="text-muted-foreground mb-6">Start by creating your first blog post.</p>
                    <Button onClick={() => { resetForm(); setEditingBlog(null); setIsDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Post
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {blogs.map((blog) => (
                        <Card key={blog.id} className="overflow-hidden border-primary/10">
                            <div className="flex flex-col md:flex-row">
                                {blog.coverImage && (
                                    <div className="md:w-48 h-32 md:h-auto relative">
                                        <img
                                            src={blog.coverImage}
                                            alt={blog.title}
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                )}
                                <div className="flex-1 p-6">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-bold line-clamp-1">{blog.title}</h3>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(new Date(blog.createdAt), "MMM d, yyyy")}
                                                </span>
                                                <Badge variant={blog.status === "published" ? "default" : "secondary"}>
                                                    {blog.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="icon" asChild title="View Publicly">
                                                <Link href={`/blog/${blog.slug}`}>
                                                    <Eye className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                            <Button variant="outline" size="icon" onClick={() => handleEdit(blog)} title="Edit">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => {
                                                if (confirm("Are you sure you want to delete this blog?")) {
                                                    deleteMutation.mutate(blog.id);
                                                }
                                            }} title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-muted-foreground text-sm line-clamp-2 italic mb-1">
                                        Slug: {blog.slug}
                                    </p>
                                    <p className="text-muted-foreground text-sm line-clamp-2">
                                        {blog.excerpt || "No excerpt provided."}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Blog Editor Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingBlog ? "Edit Blog Post" : "Create New Blog Post"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={handleTitleChange}
                                    required
                                    placeholder="Enter a catchy title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="slug">Slug *</Label>
                                <Input
                                    id="slug"
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                    required
                                    placeholder="url-friendly-slug"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="excerpt">Excerpt / Meta Description</Label>
                            <Textarea
                                id="excerpt"
                                value={formData.excerpt}
                                onChange={(e) => setFormData(prev => ({ ...prev, excerpt: e.target.value }))}
                                placeholder="A short summary for search results and social media"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="content">Content (HTML Supported) *</Label>
                            <Textarea
                                id="content"
                                value={formData.content}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                className="min-h-[300px] font-mono"
                                required
                                placeholder="Write your article content here..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="coverImage">Cover Image URL</Label>
                                <Input
                                    id="coverImage"
                                    value={formData.coverImage}
                                    onChange={(e) => setFormData(prev => ({ ...prev, coverImage: e.target.value }))}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft</SelectItem>
                                        <SelectItem value="published">Published</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editingBlog ? "Update Post" : "Create Post"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
