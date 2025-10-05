import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, MapPin, Upload } from "lucide-react";

const addScreenSchema = z.object({
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

export default function AddScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AddScreenForm>({
    resolver: zodResolver(addScreenSchema),
    defaultValues: {
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

  const createScreenMutation = useMutation({
    mutationFn: async (data: AddScreenForm) => {
      return apiRequest("POST", "/api/owner/screens", {
        ...data,
        pricePerDay: parseInt(data.pricePerDay),
        minBookingDays: parseInt(data.minBookingDays),
        latitude: data.latitude,
        longitude: data.longitude,
      });
    },
    onSuccess: () => {
      toast({
        title: "Screen Added",
        description: "Your screen has been submitted for approval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/owner/screens"] });
      setLocation("/owner/screens");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add screen. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AddScreenForm) => {
    createScreenMutation.mutate(data);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => setLocation("/owner/screens")}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Screens
        </Button>
        <h1 className="text-4xl font-bold text-foreground font-serif mb-2">Add New Screen</h1>
        <p className="text-muted-foreground">Fill in the details to list your digital advertising screen</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Screen Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Digital Billboard - MG Road" {...field} data-testid="input-screen-name" />
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
                      <FormLabel>Screen Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-screen-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="billboard">Billboard</SelectItem>
                          <SelectItem value="digital_display">Digital Display</SelectItem>
                          <SelectItem value="led_screen">LED Screen</SelectItem>
                          <SelectItem value="video_wall">Video Wall</SelectItem>
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
                      <FormLabel>Screen Size</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 10x20 ft" {...field} data-testid="input-screen-size" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address / Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Near Metro Station, MG Road" {...field} data-testid="input-location" />
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
                      <FormLabel>City</FormLabel>
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
                      <FormLabel>Pincode</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 560001" {...field} data-testid="input-pincode" />
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
                      <FormLabel>Latitude</FormLabel>
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
                      <FormLabel>Longitude</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 77.5946" {...field} data-testid="input-longitude" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing & Availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerDay"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price Per Day (₹)</FormLabel>
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
                      <FormLabel>Minimum Booking Days</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 1" {...field} data-testid="input-min-days" />
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
                      <Input placeholder="e.g., 06:00 - 22:00" {...field} data-testid="input-hours" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setLocation("/owner/screens")}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createScreenMutation.isPending} data-testid="button-submit">
              {createScreenMutation.isPending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
