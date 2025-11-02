import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Building2, MapPin, Phone, Briefcase, FileText } from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const INDUSTRIES = [
  "Advertising & Marketing",
  "Agriculture",
  "Automotive",
  "Banking & Financial Services",
  "Consumer Goods",
  "E-commerce & Retail",
  "Education",
  "Entertainment & Media",
  "Fashion & Apparel",
  "Food & Beverage",
  "Healthcare & Pharmaceuticals",
  "Hospitality & Tourism",
  "Insurance",
  "Manufacturing",
  "Real Estate & Construction",
  "Technology & IT Services",
  "Telecommunications",
  "Transportation & Logistics",
  "Other",
];

const profileSchema = z.object({
  mobileNumber: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  companyName: z.string().min(2, "Company name is required"),
  industry: z.string().min(1, "Please select an industry"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(1, "Please select a state"),
  gstNumber: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileCompletion() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      mobileNumber: user?.mobileNumber || "",
      companyName: user?.companyName || "",
      industry: user?.industry || "",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      gstNumber: user?.gstNumber || "",
    },
  });

  const sendOTPMutation = useMutation({
    mutationFn: async (mobile: string) => {
      return await apiRequest("POST", "/api/otp/send-mobile", { mobile });
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({
        title: "OTP Sent",
        description: "Please check your mobile for the OTP code",
      });
    },
    onError: (error: Error) => {
      // Extract the actual error message from the API response
      let errorMessage = "Failed to send OTP";
      try {
        // Error format: "400: {"error":"message"}"
        const match = error.message.match(/\d+:\s*({.*})/);
        if (match) {
          const errorData = JSON.parse(match[1]);
          errorMessage = errorData.error || errorMessage;
        }
      } catch (e) {
        // If parsing fails, use the full error message
        errorMessage = error.message.replace(/^\d+:\s*/, '');
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const verifyOTPMutation = useMutation({
    mutationFn: async ({ mobile, code }: { mobile: string; code: string }) => {
      return await apiRequest("POST", "/api/otp/verify-mobile", { mobile, code });
    },
    onSuccess: () => {
      setMobileVerified(true);
      toast({
        title: "Mobile Verified",
        description: "Your mobile number has been verified successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (error: Error) => {
      // Extract the actual error message from the API response
      let errorMessage = "Invalid or expired OTP";
      try {
        const match = error.message.match(/\d+:\s*({.*})/);
        if (match) {
          const errorData = JSON.parse(match[1]);
          errorMessage = errorData.error || errorMessage;
        }
      } catch (e) {
        errorMessage = error.message.replace(/^\d+:\s*/, '');
      }
      
      toast({
        title: "Verification Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("PUT", "/api/profile", {
        ...data,
        name: user?.name,
      });
    },
    onSuccess: () => {
      toast({
        title: "Profile Completed",
        description: "Your profile has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      window.location.href = "/";
    },
    onError: (error: Error) => {
      // Extract the actual error message from the API response
      let errorMessage = "Failed to update profile";
      try {
        const match = error.message.match(/\d+:\s*({.*})/);
        if (match) {
          const errorData = JSON.parse(match[1]);
          errorMessage = errorData.error || errorMessage;
        }
      } catch (e) {
        errorMessage = error.message.replace(/^\d+:\s*/, '');
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSendOTP = () => {
    const mobile = form.getValues("mobileNumber");
    const validation = profileSchema.shape.mobileNumber.safeParse(mobile);
    
    if (!validation.success) {
      toast({
        title: "Invalid Mobile Number",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    sendOTPMutation.mutate(mobile);
  };

  const handleVerifyOTP = () => {
    const mobile = form.getValues("mobileNumber");
    verifyOTPMutation.mutate({ mobile, code: otp });
  };

  const onSubmit = (data: ProfileFormData) => {
    if (!mobileVerified && !user?.mobileVerified) {
      toast({
        title: "Mobile Verification Required",
        description: "Please verify your mobile number before completing your profile",
        variant: "destructive",
      });
      return;
    }

    updateProfileMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-6">
      <Card className="w-full max-w-3xl p-8">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Complete Your Profile</h1>
            <p className="text-muted-foreground">
              Please provide the following information to access your dashboard
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Mobile Number Verification */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Phone className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Mobile Number Verification</h2>
                  </div>

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter 10-digit mobile number"
                              {...field}
                              disabled={mobileVerified || user?.mobileVerified}
                              data-testid="input-mobile"
                            />
                            {!mobileVerified && !user?.mobileVerified && (
                              <Button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={sendOTPMutation.isPending}
                                data-testid="button-send-otp"
                              >
                                {otpSent ? "Resend OTP" : "Send OTP"}
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                        {(mobileVerified || user?.mobileVerified) && (
                          <p className="text-sm text-green-600">✓ Mobile number verified</p>
                        )}
                      </FormItem>
                    )}
                  />

                  {otpSent && !mobileVerified && !user?.mobileVerified && (
                    <div className="space-y-2">
                      <Label>Enter OTP</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter 6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          maxLength={6}
                          data-testid="input-otp"
                        />
                        <Button
                          type="button"
                          onClick={handleVerifyOTP}
                          disabled={verifyOTPMutation.isPending || otp.length !== 6}
                          data-testid="button-verify-otp"
                        >
                          Verify
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Please check your mobile for the OTP code
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Company Information */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Company Information</h2>
                  </div>

                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} data-testid="input-company" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-industry">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDUSTRIES.map((industry) => (
                              <SelectItem key={industry} value={industry}>
                                {industry}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter GST number if available" 
                            {...field} 
                            data-testid="input-gst"
                          />
                        </FormControl>
                        <FormDescription>
                          15-character GST identification number (if registered)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>

              {/* Address Information */}
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold">Address</h2>
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your address" {...field} data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter city" {...field} data-testid="input-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-state">
                                <SelectValue placeholder="Select state" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {INDIAN_STATES.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Card>

              <Button
                type="submit"
                className="w-full"
                disabled={updateProfileMutation.isPending}
                data-testid="button-complete-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Complete Profile"}
              </Button>
            </form>
          </Form>
        </div>
      </Card>
    </div>
  );
}
