import { useEffect, useState } from "react";
import { getUserSettings, updateUserSettings, getOrgSettings } from "@/services/settingsService";
import { setup2FA, verifyAndEnable2FA, disable2FA } from "@/services/authService";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
    const fetchData = async () => {
      try {
        const userSettings = await getUserSettings();
        if (userSettings.profile) {
          setProfile({
            displayName: userSettings.profile.displayName || "",
            phone: userSettings.profile.phone || ""
          });
        }
        if (userSettings.security) setSecurity(userSettings.security);
        if (userSettings.reminders) setReminders(userSettings.reminders);

        const orgSettings = await getOrgSettings();
        if (orgSettings.complianceSettings) setOrgCompliance(orgSettings.complianceSettings);
        // Integrations logic was removed, but if you want org integrations (e.g. knowing if MBR is enabled), 
        // you would need that in the backend. Currently removed as requested.
      } catch (error) {
        console.error("Failed to fetch settings", error);
      }
    };
    fetchData();
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateUserSettings({ profile });
      toast({
        title: "Profile saved",
        description: "Your profile has been updated.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    setSaving(true);
    try {
      await updateUserSettings({ security });
      toast({
        title: "Security preferences saved",
        description: "Your 2FA preference has been updated.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to save security settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const [show2FASetup, setShow2FASetup] = useState(false);
  const [qrCodeData, setQrCodeData] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [setupError, setSetupError] = useState("");

  const handleToggle2FA = async (checked: boolean) => {
    if (checked) {
      // Start Setup
      setSaving(true);
      try {
        const data = await setup2FA();
        setQrCodeData(data.qrCode);
        setShow2FASetup(true);
      } catch (error) {
        toast({ title: "Error", description: "Failed to initiate 2FA setup", variant: "destructive" });
      } finally {
        setSaving(false); // Stop loading, but don't toggle yet until verified
      }
    } else {
      // Disable 2FA
      setSaving(true);
      try {
        await disable2FA();
        setSecurity(prev => ({ ...prev, twoFactorEnabled: false }));
        toast({ title: "2FA Disabled", description: "Two-factor authentication has been turned off." });
      } catch (error) {
        toast({ title: "Error", description: "Failed to disable 2FA", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleVerify2FA = async () => {
    try {
      await verifyAndEnable2FA(verificationCode);
      setShow2FASetup(false);
      setSecurity(prev => ({ ...prev, twoFactorEnabled: true }));
      setVerificationCode("");
      toast({ title: "Success", description: "2FA is now enabled for your account." });
    } catch (error: any) {
      setSetupError(error.message || "Invalid code");
    }
  };
  const handleSaveReminders = async () => {
    setSaving(true);
    try {
      await updateUserSettings({ reminders });
      toast({
        title: "Reminder settings saved",
        description: "Document reminder preferences have been updated.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to save reminder settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </Button>
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
                  onCheckedChange={handleToggle2FA}
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                This toggle controls your preference only. Your firm admin can still enforce 2FA
                globally.
              </p>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSaveSecurity} disabled={saving}>
                  {saving ? "Saving..." : "Save security settings"}
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
                  id="doc-reminders"
                  checked={reminders.documentRemindersEnabled}
                  onCheckedChange={async (value) => {
                    setReminders(prev => ({ ...prev, documentRemindersEnabled: value }));
                    setSaving(true);
                    try {
                      await updateUserSettings({ reminders: { ...reminders, documentRemindersEnabled: value } });
                      toast({ title: "Saved", description: "Notification preference updated." });
                    } catch {
                      toast({ title: "Error", description: "Failed to save.", variant: "destructive" });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
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
                <Button variant="outline" onClick={handleSaveReminders} disabled={saving}>
                  {saving ? "Saving..." : "Save reminder settings"}
                </Button>
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

      {/* 2FA Setup Dialog */}
      <Dialog open={show2FASetup} onOpenChange={setShow2FASetup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (e.g., Google Authenticator, Authy).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrCodeData && (
              <img src={qrCodeData} alt="2FA QR Code" className="w-48 h-48 border rounded-lg" />
            )}
            <Input
              placeholder="Enter 6-digit code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              className="text-center text-lg tracking-widest max-w-[200px]"
            />
            {setupError && <p className="text-red-500 text-sm">{setupError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow2FASetup(false)}>Cancel</Button>
            <Button onClick={handleVerify2FA} disabled={!verificationCode || verificationCode.length !== 6}>
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


