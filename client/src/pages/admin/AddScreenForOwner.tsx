import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Monitor, MapPin, Upload } from "lucide-react";
import type { User } from "@shared/schema";
import { UploadButton } from "@uppy/react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";

const addScreenSchema = z.object({
  ownerId: z.string().min(1, "Screen owner is required"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.string().min(1, "Screen type is required"),
  size: z.string().min(1, "Size is required"),
  location: z.string().min(3, "Location is required"),
  city: z.string().min(2, "City is required"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
  latitude: z.string().min(1, "Latitude is required"),
  longitude: z.string().min(1, "Longitude is required"),
  pricePerDay: z.string().min(1, "Price is required"),
  minBookingDays: z.string().min(1, "Minimum booking days required"),
  operationalHours: z.string().optional(),
});

type AddScreenForm = z.infer<typeof addScreenSchema>;

export default function AddScreenForOwner() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadedImageURL, setUploadedImageURL] = useState<string | null>(null);

  const form = useForm<AddScreenForm>({
    resolver: zodResolver(addScreenSchema),
    defaultValues: {
      ownerId: "",
      name: "",
      type: "",
      size: "",
      location: "",
      city: "",
      pincode: "",
      latitude: "",
      longitude: "",
      pricePerDay: "",
      minBookingDays: "1",
      operationalHours: "",
    },
  });

  // Fetch all screen owners
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const screenOwners = users.filter(user => user.role === "screen_owner");

  const createScreenMutation = useMutation({
    mutationFn: async (data: AddScreenForm) => {
      return apiRequest("POST", "/api/admin/screens/create", {
        ...data,
        pricePerDay: parseInt(data.pricePerDay),
        minBookingDays: parseInt(data.minBookingDays),
        latitude: data.latitude,
        longitude: data.longitude,
        imageUrl: uploadedImageURL || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/screens"] });
      toast({
        title: "Screen Added",
        description: "Screen has been successfully added for the owner.",
      });
      setLocation("/admin/screens");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT",
      url: data.url,
      headers: { "Content-Type": "image/*" },
    };
  };

  const uppy = new Uppy({
    restrictions: {
      maxNumberOfFiles: 1,
      allowedFileTypes: ["image/*"],
    },
  }).use(AwsS3, {
    shouldUseMultipart: false,
    getUploadParameters: handleGetUploadParameters,
  });

  uppy.on("upload-success", (_file, response) => {
    const url = response.uploadURL?.split("?")[0];
    if (url) {
      setUploadedImageURL(url);
      toast({
        title: "Image Uploaded",
        description: "Screen image has been uploaded successfully.",
      });
    }
  });

  const onSubmit = (data: AddScreenForm) => {
    createScreenMutation.mutate(data);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-serif">Add Screen for Owner</h1>
          <p className="text-muted-foreground mt-1">Add a new screen on behalf of a screen owner</p>
        </div>
        <Button variant="outline" onClick={() => setLocation("/admin/screens")} data-testid="button-back">
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
            <CardTitle>Screen Details</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Screen Owner Selection */}
              <FormField
                control={form.control}
                name="ownerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Screen Owner *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-owner">
                          <SelectValue placeholder="Select a screen owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {screenOwners.map((owner) => (
                          <SelectItem key={owner.id} value={owner.id}>
                            {owner.name} ({owner.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Screen Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MG Road Billboard" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Screen Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="billboard">Billboard</SelectItem>
                            <SelectItem value="digital">Digital Screen</SelectItem>
                            <SelectItem value="transit">Transit</SelectItem>
                            <SelectItem value="retail">Retail</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Size *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 10x20 ft" {...field} data-testid="input-size" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Location</h3>
                </div>

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Street address" {...field} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bangalore" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pincode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pincode *</FormLabel>
                        <FormControl>
                          <Input placeholder="6-digit pincode" {...field} data-testid="input-pincode" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="latitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Latitude *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 12.9716" {...field} data-testid="input-latitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="longitude"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Longitude *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 77.5946" {...field} data-testid="input-longitude" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Pricing & Availability */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Pricing & Availability</h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="pricePerDay"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price Per Day (₹) *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 5000" {...field} data-testid="input-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minBookingDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Booking Days *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 7" {...field} data-testid="input-min-days" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="operationalHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operational Hours (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 6 AM - 10 PM" {...field} data-testid="input-hours" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Screen Image</h3>
                <div className="flex items-center gap-4">
                  <UploadButton uppy={uppy} />
                  {uploadedImageURL && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Upload className="h-4 w-4" />
                      <span>Image uploaded successfully</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={createScreenMutation.isPending}
                  data-testid="button-submit"
                >
                  {createScreenMutation.isPending ? "Adding Screen..." : "Add Screen"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin/screens")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
