import { useEffect, useState } from "react";
import { getUserSettings, updateUserSettings, getOrgSettings } from "@/services/settingsService";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setup2FA, verifyAndEnable2FA, disable2FA } from "@/services/authService";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
    const fetchData = async () => {
      try {
        // Fetch User Settings
        const userSettings = await getUserSettings();
        if (userSettings.profile) setProfile(prev => ({ ...prev, contactName: userSettings.profile.displayName }));
        // Note: contactName in component vs displayName in backend. Keeping them aligned locally for now.
        if (userSettings.security) setSecurity(userSettings.security);
        if (userSettings.reminders) setNotifications(userSettings.reminders);

        // Fetch Org Settings (for compliance)
        const orgSettings = await getOrgSettings();
        if (orgSettings.complianceSettings) setOrgCompliance(orgSettings.complianceSettings);
      } catch (error) {
        console.error("Failed to load settings", error);
      }
    };
    fetchData();
  }, []);

  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateUserSettings({ profile: { displayName: profile.contactName } });
      toast({
        title: "Profile saved",
        description: "Your contact name has been updated.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to save profile.", variant: "destructive" });
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
      setSaving(true);
      try {
        const data = await setup2FA();
        setQrCodeData(data.qrCode);
        setShow2FASetup(true);
      } catch (error) {
        toast({ title: "Error", description: "Failed to initiate 2FA setup", variant: "destructive" });
      } finally {
        setSaving(false);
      }
    } else {
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

  const handleSaveSecurity = async () => {
    // This function is kept for the manual "Save" button if needed, 
    // but the toggle usually acts immediately for 2FA. 
    // We can keep it to sync other security settings if added later.
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

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await updateUserSettings({ reminders: notifications });
      toast({
        title: "Notification settings saved",
        description: "Your reminder preferences have been updated.",
      });
    } catch {
      toast({ title: "Error", description: "Failed to save notification settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
                <Button onClick={handleSaveProfile} disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </Button>
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
                  onCheckedChange={handleToggle2FA}
                  disabled={saving}
                />
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Actual 2FA enforcement depends on your firm&apos;s security configuration.
              </p>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSaveSecurity} disabled={saving}>
                  {saving ? "Saving..." : "Save security settings"}
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
                  onCheckedChange={async (value) => {
                    setNotifications(prev => ({ ...prev, documentRemindersEnabled: value }));
                    setSaving(true);
                    try {
                      await updateUserSettings({ reminders: { ...notifications, documentRemindersEnabled: value } });
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
                <Button variant="outline" onClick={handleSaveNotifications} disabled={saving}>
                  {saving ? "Saving..." : "Save notification settings"}
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


