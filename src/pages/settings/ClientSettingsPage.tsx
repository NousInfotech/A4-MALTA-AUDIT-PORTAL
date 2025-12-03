import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  FileText,
  HelpCircle,
  KeyRound,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ClientProfileSettings {
  contactName: string;
}

interface ClientSecuritySettings {
  twoFactorEnabled: boolean;
}

interface ClientNotificationSettings {
  documentRemindersEnabled: boolean;
  reminderDaysBeforeDue: number;
}

interface OrgComplianceContent {
  faqsMarkdown: string;
  termsUrl: string;
  privacyUrl: string;
  dataRetentionPolicy: string;
}

const CLIENT_PROFILE_KEY = "client-settings-profile";
const CLIENT_SECURITY_KEY = "client-settings-security";
const CLIENT_REMINDER_KEY = "client-settings-reminders";
const ORG_COMPLIANCE_KEY = "admin-settings-org-compliance";

export const ClientSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ClientProfileSettings>(() => {
    if (typeof window === "undefined") {
      return { contactName: user?.name || "" };
    }
    try {
      const stored = localStorage.getItem(CLIENT_PROFILE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return { contactName: user?.name || "" };
  });
  const [security, setSecurity] = useState<ClientSecuritySettings>({
    twoFactorEnabled: false,
  });
  const [notifications, setNotifications] = useState<ClientNotificationSettings>({
    documentRemindersEnabled: true,
    reminderDaysBeforeDue: 3,
  });
  const [orgCompliance, setOrgCompliance] = useState<OrgComplianceContent | null>(null);

  useEffect(() => {
    try {
      const storedSecurity = localStorage.getItem(CLIENT_SECURITY_KEY);
      if (storedSecurity) {
        setSecurity(JSON.parse(storedSecurity));
      }
      const storedReminders = localStorage.getItem(CLIENT_REMINDER_KEY);
      if (storedReminders) {
        setNotifications(JSON.parse(storedReminders));
      }
      const storedCompliance = localStorage.getItem(ORG_COMPLIANCE_KEY);
      if (storedCompliance) {
        setOrgCompliance(JSON.parse(storedCompliance));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSaveProfile = () => {
    // Future: call client profile update API
    toast({
      title: "Profile saved",
      description: "Your contact name has been updated for this portal session.",
    });
    localStorage.setItem(CLIENT_PROFILE_KEY, JSON.stringify(profile));
  };

  const handleSaveSecurity = () => {
    localStorage.setItem(CLIENT_SECURITY_KEY, JSON.stringify(security));
    toast({
      title: "Security preferences saved",
      description: "Your 2FA preference has been stored locally. Backend enforcement is pending.",
    });
  };

  const handleSaveNotifications = () => {
    localStorage.setItem(CLIENT_REMINDER_KEY, JSON.stringify(notifications));
    toast({
      title: "Notification settings saved",
      description: "Your reminder preferences have been updated.",
    });
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Client Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile, security, and notifications for the client portal.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start gap-2 overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Data & Privacy</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Update your contact details for this client account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact name</Label>
                  <Input
                    id="contactName"
                    value={profile.contactName}
                    onChange={(e) =>
                      setProfile((prev) => ({
                        ...prev,
                        contactName: e.target.value,
                      }))
                    }
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user?.email || ""} disabled />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email changes are handled by your audit firm. Contact your engagement lead if this
                    is incorrect.
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveProfile}>Save profile</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Security & 2FA
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your client portal access.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="twofa-client">Two‑factor authentication</Label>
                  <p className="text-sm text-muted-foreground">
                    Require a second step (email or authenticator app) when signing in.
                  </p>
                </div>
                <Switch
                  id="twofa-client"
                  checked={security.twoFactorEnabled}
                  onCheckedChange={(value) =>
                    setSecurity((prev) => ({ ...prev, twoFactorEnabled: value }))
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Actual 2FA enforcement depends on your firm&apos;s security configuration.
              </p>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSaveSecurity}>
                  Save security settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications & Reminders
              </CardTitle>
              <CardDescription>
                Control how you are reminded about document requests and engagement updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="doc-reminders-client">Document request reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders when requested documents are pending or due soon.
                  </p>
                </div>
                <Switch
                  id="doc-reminders-client"
                  checked={notifications.documentRemindersEnabled}
                  onCheckedChange={(value) =>
                    setNotifications((prev) => ({ ...prev, documentRemindersEnabled: value }))
                  }
                />
              </div>

              <div className="space-y-2 max-w-xs">
                <Label htmlFor="reminder-days-client">Remind me before due date (days)</Label>
                <Input
                  id="reminder-days-client"
                  type="number"
                  min={1}
                  max={30}
                  value={notifications.reminderDaysBeforeDue}
                  onChange={(e) =>
                    setNotifications((prev) => ({
                      ...prev,
                      reminderDaysBeforeDue: Number(e.target.value) || 1,
                    }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Used for document‑request reminders once backend scheduling is in place.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
                <div className="text-sm text-muted-foreground">
                  For detailed channel settings (email, push, in‑app), use the notification page.
                </div>
                <Button variant="outline" asChild>
                  <Link to="/client/settings/notifications">Open notification settings</Link>
                </Button>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSaveNotifications}>
                  Save notification settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data & Privacy */}
        <TabsContent value="privacy" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Data & Privacy
              </CardTitle>
              <CardDescription>
                Understand how your data is used and request exports if needed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Data export</Label>
                <p className="text-sm text-muted-foreground">
                  You will be able to request an export of documents, engagement information, and
                  activity related to your organization. This will be delivered securely by your
                  audit firm.
                </p>
                <Button variant="outline" disabled>
                  Request data export (coming from backend)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Legal documents</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    •{" "}
                    {orgCompliance?.termsUrl ? (
                      <a
                        href={orgCompliance.termsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Terms of Use
                      </a>
                    ) : (
                      <Link to="/legal/terms" className="underline">
                        Terms of Use
                      </Link>
                    )}
                  </p>
                  <p>
                    •{" "}
                    {orgCompliance?.privacyUrl ? (
                      <a
                        href={orgCompliance.privacyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Privacy Policy
                      </a>
                    ) : (
                      <Link to="/legal/privacy" className="underline">
                        Privacy Policy
                      </Link>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>
                  For privacy questions, contact your engagement lead or the firm&apos;s data
                  protection officer.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};


