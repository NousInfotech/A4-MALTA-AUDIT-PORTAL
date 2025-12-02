import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Bell,
  FileText,
  HelpCircle,
  KeyRound,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EmployeeProfileSettings {
  displayName: string;
  phone?: string;
}

interface LocalSecuritySettings {
  twoFactorEnabled: boolean;
}

interface ReminderSettings {
  documentRemindersEnabled: boolean;
  reminderDaysBeforeDue: number;
}

interface OrgComplianceContent {
  faqsMarkdown: string;
  termsUrl: string;
  privacyUrl: string;
  dataRetentionPolicy: string;
}

interface OrgIntegrationSettings {
  accountingEnabled: boolean;
  accountingNotes: string;
  mbrEnabled: boolean;
  mbrUrl: string;
  eSignatureEnabled: boolean;
  eSignatureProvider: string;
  eSignatureNotes: string;
}

const EMPLOYEE_PROFILE_KEY = "employee-settings-profile";
const SECURITY_KEY = "employee-settings-security";
const REMINDER_KEY = "employee-settings-reminders";
const ORG_COMPLIANCE_KEY = "admin-settings-org-compliance";
const ORG_INTEGRATIONS_KEY = "admin-settings-org-integrations";

export const EmployeeSettingsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<EmployeeProfileSettings>(() => {
    if (typeof window === "undefined") {
      return { displayName: user?.name || "" };
    }
    try {
      const stored = localStorage.getItem(EMPLOYEE_PROFILE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // ignore
    }
    return { displayName: user?.name || "" };
  });
  const [security, setSecurity] = useState<LocalSecuritySettings>({
    twoFactorEnabled: false,
  });
  const [reminders, setReminders] = useState<ReminderSettings>({
    documentRemindersEnabled: true,
    reminderDaysBeforeDue: 3,
  });
  const [orgCompliance, setOrgCompliance] = useState<OrgComplianceContent | null>(null);
  const [orgIntegrations, setOrgIntegrations] = useState<OrgIntegrationSettings | null>(null);

  useEffect(() => {
    try {
      const storedSecurity = localStorage.getItem(SECURITY_KEY);
      if (storedSecurity) {
        setSecurity(JSON.parse(storedSecurity));
      }
      const storedReminders = localStorage.getItem(REMINDER_KEY);
      if (storedReminders) {
        setReminders(JSON.parse(storedReminders));
      }
      const storedCompliance = localStorage.getItem(ORG_COMPLIANCE_KEY);
      if (storedCompliance) {
        setOrgCompliance(JSON.parse(storedCompliance));
      }
      const storedIntegrations = localStorage.getItem(ORG_INTEGRATIONS_KEY);
      if (storedIntegrations) {
        setOrgIntegrations(JSON.parse(storedIntegrations));
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem(EMPLOYEE_PROFILE_KEY, JSON.stringify(profile));
    toast({
      title: "Profile saved",
      description: "Your profile has been updated locally. Contact admin to change email.",
    });
  };

  const handleSaveSecurity = () => {
    localStorage.setItem(SECURITY_KEY, JSON.stringify(security));
    toast({
      title: "Security preferences saved",
      description: "Your 2FA preference has been stored for this device.",
    });
  };

  const handleSaveReminders = () => {
    localStorage.setItem(REMINDER_KEY, JSON.stringify(reminders));
    toast({
      title: "Reminder settings saved",
      description: "Document reminder preferences have been updated.",
    });
  };

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal account, notifications, and integrations.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start gap-2 overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="legal">Help & Legal</TabsTrigger>
        </TabsList>

        {/* Profile & Account */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Profile & Account
              </CardTitle>
              <CardDescription>Update your basic profile information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Name</Label>
              <Input
                id="displayName"
                value={profile.displayName}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    displayName: e.target.value,
                  }))
                }
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user?.email || ""} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Email is managed by your firm administrator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                value={profile.phone || ""}
                onChange={(e) =>
                  setProfile((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
                placeholder="+356 0000 0000"
              />
              <p className="text-xs text-muted-foreground">
                Used for future SMS or phone‑based notifications if enabled by your firm.
              </p>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <Label>Password</Label>
            <p className="text-sm text-muted-foreground">
              For security reasons, password changes are handled via the{" "}
              <Link to="/auth/reset-password" className="underline">
                password reset flow
              </Link>
              .
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveProfile}>Save profile</Button>
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* Security / 2FA */}
        <TabsContent value="security" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Security & 2FA
              </CardTitle>
              <CardDescription>
                Additional protections for your Audit Portal account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 max-w-md">
              <Label htmlFor="twofa">Two‑factor authentication</Label>
              <p className="text-sm text-muted-foreground">
                Require a second step (email or authenticator app) when signing in.
              </p>
            </div>
            <Switch
              id="twofa"
              checked={security.twoFactorEnabled}
              onCheckedChange={(value) =>
                setSecurity((prev) => ({ ...prev, twoFactorEnabled: value }))
              }
            />
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            This toggle controls your preference only. Your firm admin can still enforce 2FA
            globally.
          </p>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleSaveSecurity}>
              Save security settings
            </Button>
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications / Reminders */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications & Reminders
              </CardTitle>
              <CardDescription>
                Configure reminders and open advanced notification settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1 max-w-md">
              <Label htmlFor="document-reminders">Document reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders when documents or requests are pending or approaching their due
                date.
              </p>
            </div>
            <Switch
              id="document-reminders"
              checked={reminders.documentRemindersEnabled}
              onCheckedChange={(value) =>
                setReminders((prev) => ({ ...prev, documentRemindersEnabled: value }))
              }
            />
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="reminder-days">Remind me before due date (days)</Label>
            <Input
              id="reminder-days"
              type="number"
              min={1}
              max={30}
              value={reminders.reminderDaysBeforeDue}
              onChange={(e) =>
                setReminders((prev) => ({
                  ...prev,
                  reminderDaysBeforeDue: Number(e.target.value) || 1,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Used for future document‑reminder features across the portal.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
            <div className="text-sm text-muted-foreground">
              For channel‑level settings (email, push, sound), use the advanced notification page.
            </div>
            <Button variant="outline" asChild>
              <Link to="/settings/notifications">Open advanced notification settings</Link>
            </Button>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={handleSaveReminders}>
              Save reminder settings
            </Button>
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations & External Links */}
        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Integrations & External Services
              </CardTitle>
              <CardDescription>
                Manage personal connections to external tools used in your engagements.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Organization integrations</Label>
              <p className="text-sm text-muted-foreground">
                These settings are configured by your admin. You can see what is currently enabled for
                your firm.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1 border rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Accounting APIs</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {orgIntegrations?.accountingEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {orgIntegrations?.accountingNotes ||
                    "Connect accounting systems like Xero or QuickBooks when your admin enables them."}
                </p>
              </div>

              <div className="space-y-1 border rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">MBR integration</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {orgIntegrations?.mbrEnabled ? "Enabled" : "Optional"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Open the Malta Business Registry in a new tab to search for company records.
                </p>
                <Button variant="outline" asChild size="sm" className="mt-2">
                  <a
                    href={orgIntegrations?.mbrUrl || "https://mbr.mt"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open MBR website
                  </a>
                </Button>
              </div>

              <div className="space-y-1 border rounded-xl p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">E‑signature</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                    {orgIntegrations?.eSignatureEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {orgIntegrations?.eSignatureProvider
                    ? `Provider: ${orgIntegrations.eSignatureProvider}`
                    : "Your firm can configure providers like DocuSign or Adobe Sign."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
          </Card>
        </TabsContent>

        {/* Help, FAQs, Legal */}
        <TabsContent value="legal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Help, FAQs & Legal
              </CardTitle>
              <CardDescription>
                Find answers and understand how your data is used.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>FAQs & Support</Label>
              <Textarea
                className="min-h-[80px]"
                readOnly
                value={
                  orgCompliance?.faqsMarkdown ||
                  "Your firm can publish FAQs here to explain conventions (naming, review process, deadlines, etc.).\n\nFor now, contact your firm administrator for help."
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Legal & Privacy</Label>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  •{" "}
                  {orgCompliance?.termsUrl ? (
                    <a href={orgCompliance.termsUrl} target="_blank" rel="noreferrer" className="underline">
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
                    <a href={orgCompliance.privacyUrl} target="_blank" rel="noreferrer" className="underline">
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
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
            <FileText className="h-3 w-3" />
            <span>
              These settings affect only your personal account. Firm‑wide defaults are managed in the
              Admin Portal.
            </span>
          </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};


