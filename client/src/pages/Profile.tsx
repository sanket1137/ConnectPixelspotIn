import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Edit2, Save, X, Shield, Play } from "lucide-react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const INDUSTRIES = [
  "Technology", "Retail", "Healthcare", "Finance", "Education",
  "Real Estate", "Hospitality", "Entertainment", "Transportation",
  "Food & Beverage", "Manufacturing", "Other"
];

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [isBankEditing, setIsBankEditing] = useState(false);
  const [showMobileDialog, setShowMobileDialog] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const [formData, setFormData] = useState({
    companyName: user?.companyName || "",
    industry: user?.industry || "",
    gstNumber: user?.gstNumber || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
  });

  const [bankFormData, setBankFormData] = useState({
    bankAccountName: user?.bankAccountName || "",
    bankAccountNumber: user?.bankAccountNumber || "",
    bankIfscCode: user?.bankIfscCode || "",
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest("POST", "/api/profile/update", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const sendMobileOTPMutation = useMutation({
    mutationFn: async (mobile: string) => {
      return await apiRequest("POST", "/api/profile/send-mobile-otp", { mobileNumber: mobile });
    },
    onSuccess: () => {
      setOtpSent(true);
      toast({
        title: "OTP sent",
        description: "Please check your mobile for the verification code.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send OTP",
        description: error.message || "Could not send OTP",
        variant: "destructive",
      });
    },
  });

  const verifyMobileOTPMutation = useMutation({
    mutationFn: async (data: { mobileNumber: string; otp: string }) => {
      return await apiRequest("POST", "/api/profile/verify-mobile-otp", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Mobile verified",
        description: "Your mobile number has been verified successfully.",
      });
      setShowMobileDialog(false);
      setMobileNumber("");
      setOtp("");
      setOtpSent(false);
    },
    onError: (error: any) => {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    },
  });

  const updateBankDetailsMutation = useMutation({
    mutationFn: async (data: typeof bankFormData) => {
      return await apiRequest("PATCH", "/api/owner/bank-details", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Bank details updated",
        description: "Your bank account details have been saved successfully.",
      });
      setIsBankEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update bank details",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      companyName: user?.companyName || "",
      industry: user?.industry || "",
      gstNumber: user?.gstNumber || "",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
    });
    setIsEditing(false);
  };

  const handleSendMobileOTP = () => {
    if (!mobileNumber || mobileNumber.length !== 10) {
      toast({
        title: "Invalid mobile number",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive",
      });
      return;
    }
    sendMobileOTPMutation.mutate(mobileNumber);
  };

  const handleVerifyMobileOTP = () => {
    if (!otp || otp.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP",
        variant: "destructive",
      });
      return;
    }
    verifyMobileOTPMutation.mutate({ mobileNumber, otp });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account information and preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Account Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Your basic account details</CardDescription>
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  data-testid="button-edit-profile"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Name</Label>
                <p className="font-medium text-foreground" data-testid="text-user-name">{user?.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground" data-testid="text-user-email">{user?.email}</p>
                  {user?.emailVerified ? (
                    <Badge variant="default" className="gap-1" data-testid="badge-email-verified">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1" data-testid="badge-email-unverified">
                      <XCircle className="w-3 h-3" />
                      Not Verified
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Role</Label>
                <p className="font-medium text-foreground capitalize" data-testid="text-user-role">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Mobile Number</Label>
                <div className="flex items-center gap-2">
                  {user?.mobileNumber ? (
                    <>
                      <p className="font-medium text-foreground" data-testid="text-user-mobile">
                        +91 {user.mobileNumber}
                      </p>
                      {user?.mobileVerified ? (
                        <Badge variant="default" className="gap-1" data-testid="badge-mobile-verified">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1" data-testid="badge-mobile-unverified">
                          <XCircle className="w-3 h-3" />
                          Not Verified
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMobileDialog(true)}
                      data-testid="button-add-mobile"
                    >
                      Add Mobile Number
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {isEditing && (
              <>
                <hr className="my-4" />
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="companyName">Company Name *</Label>
                      <Input
                        id="companyName"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        placeholder="Enter company name"
                        data-testid="input-company-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry *</Label>
                      <Select
                        value={formData.industry}
                        onValueChange={(value) => setFormData({ ...formData, industry: value })}
                      >
                        <SelectTrigger data-testid="select-industry">
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                      <Input
                        id="gstNumber"
                        value={formData.gstNumber}
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                        placeholder="Enter GST number"
                        data-testid="input-gst-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Enter city"
                        data-testid="input-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                      >
                        <SelectTrigger data-testid="select-state">
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDIAN_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter full address"
                        data-testid="input-address"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={updateProfileMutation.isPending}
                      data-testid="button-save-profile"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!isEditing && (
              <>
                <hr className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Company Name</Label>
                    <p className="font-medium text-foreground" data-testid="text-company-name">
                      {user?.companyName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Industry</Label>
                    <p className="font-medium text-foreground" data-testid="text-industry">
                      {user?.industry || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">GST Number</Label>
                    <p className="font-medium text-foreground" data-testid="text-gst-number">
                      {user?.gstNumber || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">City</Label>
                    <p className="font-medium text-foreground" data-testid="text-city">
                      {user?.city || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">State</Label>
                    <p className="font-medium text-foreground" data-testid="text-state">
                      {user?.state || "Not provided"}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm text-muted-foreground">Address</Label>
                    <p className="font-medium text-foreground" data-testid="text-address">
                      {user?.address || "Not provided"}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Verification Status
            </CardTitle>
            <CardDescription>Keep your account secure by verifying your contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Email Verification</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              {user?.emailVerified ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="w-4 h-4" />
                  Pending
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Mobile Verification</p>
                <p className="text-sm text-muted-foreground">
                  {user?.mobileNumber ? `+91 ${user.mobileNumber}` : "Not added"}
                </p>
              </div>
              {user?.mobileNumber ? (
                user?.mobileVerified ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Verified
                  </Badge>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMobileNumber(user.mobileNumber || "");
                      setShowMobileDialog(true);
                    }}
                    data-testid="button-verify-mobile"
                  >
                    Verify Now
                  </Button>
                )
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMobileDialog(true)}
                  data-testid="button-add-mobile-verify"
                >
                  Add Mobile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bank Details - Screen Owners only */}
        {user?.role === "screen_owner" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Bank Details</CardTitle>
                  <CardDescription>Required to receive payouts for approved bookings</CardDescription>
                </div>
                {!isBankEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBankFormData({
                        bankAccountName: user?.bankAccountName || "",
                        bankAccountNumber: user?.bankAccountNumber || "",
                        bankIfscCode: user?.bankIfscCode || "",
                      });
                      setIsBankEditing(true);
                    }}
                    data-testid="button-edit-bank-details"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    {user?.bankAccountNumber ? "Edit" : "Add Bank Details"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isBankEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Holder Name</Label>
                    <p className="font-medium text-foreground" data-testid="text-bank-account-name">
                      {user?.bankAccountName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Account Number</Label>
                    <p className="font-medium text-foreground" data-testid="text-bank-account-number">
                      {user?.bankAccountNumber
                        ? `••••${user.bankAccountNumber.slice(-4)}`
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">IFSC Code</Label>
                    <p className="font-medium text-foreground" data-testid="text-bank-ifsc">
                      {user?.bankIfscCode || "Not provided"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="bankAccountName">Account Holder Name *</Label>
                      <Input
                        id="bankAccountName"
                        value={bankFormData.bankAccountName}
                        onChange={(e) => setBankFormData({ ...bankFormData, bankAccountName: e.target.value })}
                        placeholder="Name as on bank account"
                        data-testid="input-bank-account-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankAccountNumber">Account Number *</Label>
                      <Input
                        id="bankAccountNumber"
                        value={bankFormData.bankAccountNumber}
                        onChange={(e) => setBankFormData({ ...bankFormData, bankAccountNumber: e.target.value.replace(/\D/g, "") })}
                        placeholder="Bank account number"
                        data-testid="input-bank-account-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="bankIfscCode">IFSC Code *</Label>
                      <Input
                        id="bankIfscCode"
                        value={bankFormData.bankIfscCode}
                        onChange={(e) => setBankFormData({ ...bankFormData, bankIfscCode: e.target.value.toUpperCase() })}
                        placeholder="e.g. HDFC0001234"
                        maxLength={11}
                        data-testid="input-bank-ifsc"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => updateBankDetailsMutation.mutate(bankFormData)}
                      disabled={
                        updateBankDetailsMutation.isPending ||
                        !bankFormData.bankAccountName.trim() ||
                        !bankFormData.bankAccountNumber.trim() ||
                        !bankFormData.bankIfscCode.trim()
                      }
                      data-testid="button-save-bank-details"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {updateBankDetailsMutation.isPending ? "Saving..." : "Save Bank Details"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsBankEditing(false)}
                      data-testid="button-cancel-bank-edit"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Welcome Tour */}
        <Card>
          <CardHeader>
            <CardTitle>Welcome Tour</CardTitle>
            <CardDescription>Replay the interactive onboarding tour</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => {
                const dashboardPath = user?.role === "advertiser" 
                  ? "/advertiser?tour=true"
                  : user?.role === "screen_owner"
                  ? "/owner?tour=true"
                  : "/admin?tour=true";
                setLocation(dashboardPath);
              }}
              data-testid="button-replay-tour"
            >
              <Play className="w-4 h-4 mr-2" />
              Replay Welcome Tour
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Verification Dialog */}
      <Dialog open={showMobileDialog} onOpenChange={setShowMobileDialog}>
        <DialogContent data-testid="dialog-mobile-verification">
          <DialogHeader>
            <DialogTitle>
              {user?.mobileNumber ? "Verify Mobile Number" : "Add Mobile Number"}
            </DialogTitle>
            <DialogDescription>
              {otpSent
                ? "Enter the 6-digit OTP sent to your mobile number"
                : "Enter your mobile number to receive a verification code"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!otpSent ? (
              <div>
                <Label htmlFor="mobile">Mobile Number</Label>
                <div className="flex gap-2 mt-2">
                  <div className="w-16">
                    <Input value="+91" disabled />
                  </div>
                  <Input
                    id="mobile"
                    type="tel"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    data-testid="input-mobile-number"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit OTP"
                  className="mt-2"
                  data-testid="input-mobile-otp"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            {!otpSent ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMobileDialog(false);
                    setMobileNumber("");
                    setOtp("");
                    setOtpSent(false);
                  }}
                  data-testid="button-cancel-mobile"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMobileOTP}
                  disabled={sendMobileOTPMutation.isPending || mobileNumber.length !== 10}
                  data-testid="button-send-otp"
                >
                  {sendMobileOTPMutation.isPending ? "Sending..." : "Send OTP"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setOtpSent(false)}
                  data-testid="button-back-to-mobile"
                >
                  Back
                </Button>
                <Button
                  onClick={handleVerifyMobileOTP}
                  disabled={verifyMobileOTPMutation.isPending || otp.length !== 6}
                  data-testid="button-verify-otp"
                >
                  {verifyMobileOTPMutation.isPending ? "Verifying..." : "Verify OTP"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
