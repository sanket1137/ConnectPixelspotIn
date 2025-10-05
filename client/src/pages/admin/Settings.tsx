import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Bell, Shield, Database } from "lucide-react";

export default function Settings() {
  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-serif">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage platform settings and configuration</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <SettingsIcon className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>General Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform-name">Platform Name</Label>
              <Input id="platform-name" defaultValue="PixelSpot" className="mt-2" />
            </div>
            <div>
              <Label htmlFor="support-email">Support Email</Label>
              <Input id="support-email" type="email" placeholder="support@pixelspot.com" className="mt-2" />
            </div>
            <Button disabled>Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-2/10 rounded-lg">
                <Bell className="w-5 h-5 text-chart-2" />
              </div>
              <CardTitle>Notifications</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Notification settings coming soon...
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-3/10 rounded-lg">
                <Shield className="w-5 h-5 text-chart-3" />
              </div>
              <CardTitle>Security</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Security settings coming soon...
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-chart-4/10 rounded-lg">
                <Database className="w-5 h-5 text-chart-4" />
              </div>
              <CardTitle>Database</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Database management coming soon...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
