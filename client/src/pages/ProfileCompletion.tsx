import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  mobileNumber: z.string().nullish().or(z.literal("")),
  companyName: z.string().trim().min(2, "Company name is required (minimum 2 characters)"),
  accountType: z.enum(["brand", "agency"]).nullish().or(z.literal("")),
  brandName: z.string().nullish().or(z.literal("")),
  agencyName: z.string().nullish().or(z.literal("")),
  industry: z.string().trim().min(1, "Please select an industry"),
  address: z.string().trim().min(2, "Address is required"),
  city: z.string().trim().min(2, "City is required"),
  state: z.string().trim().min(1, "Please select a state"),
  gstNumber: z.string().nullish().or(z.literal("")),
}).superRefine((data, ctx) => {
  // For advertisers: if accountType is set, require corresponding name field
  if (data.accountType === "brand" && !data.brandName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter your brand name",
      path: ["brandName"],
    });
  }
  if (data.accountType === "agency" && !data.agencyName?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter your agency name",
      path: ["agencyName"],
    });
  }
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileCompletion() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [mobileVerified, setMobileVerified] = useState(false);

  // Redirect if not logged in or if profile is already complete
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
      return;
    }
    if (!loading && user && (user.profileCompleted || user.role === "admin")) {
      const targetRoute = user.role === "admin" ? "/admin" 
        : user.role === "screen_owner" ? "/owner" 
        : user.role === "agency" ? "/agency" 
        : "/advertiser";
      setLocation(targetRoute);
    }
  }, [user, loading, setLocation]);

  // Treat backend mobileVerified as true ONLY if the mobile number is also actually stored.
  // If mobile_verified=true but mobile_number=null (stuck state), we force the user to re-verify.
  const isAlreadyMobileVerified = !!(user?.mobileVerified && user?.mobileNumber);

  const effectiveMobileVerified = mobileVerified || isAlreadyMobileVerified;

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      mobileNumber: user?.mobileNumber || "",
      companyName: user?.companyName || "",
      accountType: (user?.accountType as "brand" | "agency") || undefined,
      brandName: user?.brandName || "",
      agencyName: user?.agencyName || "",
      industry: user?.industry || "",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      gstNumber: user?.gstNumber || "",
    },
  });

  const watchedAccountType = form.watch("accountType");

  // Sync user data into the form ONLY ONCE when user first loads.
  // DO NOT clobber user-entered fields when mobile OTP verification updates user.mobileVerified.
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (user && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      form.reset({
        mobileNumber: user.mobileNumber || "",
        companyName: user.companyName || "",
        accountType: (user.accountType as "brand" | "agency") || undefined,
        brandName: user.brandName || "",
        agencyName: user.agencyName || "",
        industry: user.industry || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        gstNumber: user.gstNumber || "",
      });
    } else if (user?.mobileNumber && !form.getValues("mobileNumber")) {
      form.setValue("mobileNumber", user.mobileNumber);
    }
  }, [user]);

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
      const res = await apiRequest("PUT", "/api/profile", {
        ...data,
        name: user?.name,
      });
      return await res.json();
    },
    onSuccess: (data: any) => {
      if (!data?.user?.profileCompleted) {
        toast({
          title: "Profile Incomplete",
          description: "Your profile details were updated, but some required fields are still missing to complete your profile.",
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Profile Completed",
        description: "Your profile has been updated successfully! Redirecting to dashboard...",
      });
      queryClient.setQueryData(["/api/auth/me"], data.user);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      const targetRole = data.user.role || user?.role;
      const targetRoute = targetRole === "admin" ? "/admin"
        : targetRole === "screen_owner" ? "/owner"
          : targetRole === "agency" ? "/agency"
            : "/advertiser";
      setTimeout(() => {
        window.location.href = targetRoute;
      }, 500);
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
    const mobile = form.getValues("mobileNumber") || "";
    const mobileRegex = /^[6-9]\d{9}$/;

    if (!mobileRegex.test(mobile.trim())) {
      toast({
        title: "Invalid Mobile Number",
        description: "Enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }

    sendOTPMutation.mutate(mobile.trim());
  };

  const handleVerifyOTP = () => {
    const mobile = form.getValues("mobileNumber") || "";
    verifyOTPMutation.mutate({ mobile: mobile.trim(), code: otp.trim() });
  };

  const onInvalid = (errors: any) => {
    console.error("Profile completion form validation errors:", errors);
    const messages: string[] = [];
    for (const [, err] of Object.entries(errors)) {
      if (err && (err as any).message) {
        messages.push((err as any).message);
      }
    }
    const description = messages.length > 0
      ? messages.slice(0, 3).join(". ")
      : "Please fill in all required fields correctly";
    toast({
      title: "Missing or Invalid Fields",
      description,
      variant: "destructive",
    });
  };

  const onSubmit = (data: ProfileFormData) => {
    if (!effectiveMobileVerified) {
      toast({
        title: "Mobile Verification Required",
        description: "Please verify your mobile number before completing your profile",
        variant: "destructive",
      });
      return;
    }

    const mobileToSubmit = (data.mobileNumber || form.getValues("mobileNumber") || user?.mobileNumber || "").trim();
    if (!mobileToSubmit || !/^[6-9]\d{9}$/.test(mobileToSubmit)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid 10-digit mobile number and verify it",
        variant: "destructive",
      });
      return;
    }

    if (user?.role === "advertiser" && !data.accountType) {
      toast({
        title: "Account Type Required",
        description: "Please select whether you are a Brand or an Agency",
        variant: "destructive",
      });
      return;
    }

    const finalData = {
      ...data,
      mobileNumber: mobileToSubmit,
    };

    updateProfileMutation.mutate(finalData);
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
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-6">
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
                              readOnly={effectiveMobileVerified}
                              className={effectiveMobileVerified ? "bg-muted cursor-not-allowed text-muted-foreground" : ""}
                              data-testid="input-mobile"
                            />
                            {!effectiveMobileVerified && (
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
                        {effectiveMobileVerified && (
                          <p className="text-sm text-green-600">✓ Mobile number verified</p>
                        )}
                      </FormItem>
                    )}
                  />

                  {otpSent && !mobileVerified && !isAlreadyMobileVerified && (
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

                  {/* Account Type Selection - Only for Advertisers */}
                  {user?.role === "advertiser" && (
                    <>
                      <FormField
                        control={form.control}
                        name="accountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Are you a Brand or Agency? *</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="brand" id="brand" data-testid="radio-brand" />
                                  <Label htmlFor="brand" className="cursor-pointer font-normal">
                                    I'm a Brand
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="agency" id="agency" data-testid="radio-agency" />
                                  <Label htmlFor="agency" className="cursor-pointer font-normal">
                                    I'm an Agency
                                  </Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription>
                              This helps us personalize your experience
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Conditional Brand Name */}
                      {watchedAccountType === "brand" && (
                        <FormField
                          control={form.control}
                          name="brandName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Brand Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your brand name"
                                  {...field}
                                  data-testid="input-brand-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      {/* Conditional Agency Name */}
                      {watchedAccountType === "agency" && (
                        <FormField
                          control={form.control}
                          name="agencyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Agency Name *</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your agency name"
                                  {...field}
                                  data-testid="input-agency-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </>
                  )}

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
