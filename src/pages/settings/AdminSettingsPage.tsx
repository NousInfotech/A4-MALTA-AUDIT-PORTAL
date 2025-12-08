import { useState, useEffect } from "react";
import { getOrgSettings, updateOrgSettings } from "@/services/settingsService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Clock,
  Coins,
  Eye,
  HelpCircle,
  Lock,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FirmDefaults {
  timeZone: string;
  currency: string;
}

interface RoleControls {
  enableCustomRoles: boolean;
  restrictDeleteToAdmins: boolean;
  allowESignature: boolean;
  showActivityLogToManagers: boolean;
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

const FIRM_DEFAULTS_KEY = "admin-settings-firm-defaults";
const ROLE_CONTROLS_KEY = "admin-settings-role-controls";
const ORG_COMPLIANCE_KEY = "admin-settings-org-compliance";
const ORG_INTEGRATIONS_KEY = "admin-settings-org-integrations";

export const AdminSettingsPage = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firmDefaults, setFirmDefaults] = useState<FirmDefaults>({
    timeZone: "Europe/Malta",
    currency: "EUR",
  });

  const [roleControls, setRoleControls] = useState<RoleControls>({
    enableCustomRoles: false,
    restrictDeleteToAdmins: true,
    allowESignature: false,
    showActivityLogToManagers: false,
  });

  const [compliance, setCompliance] = useState<OrgComplianceContent>({
    faqsMarkdown: "",
    termsUrl: "",
    privacyUrl: "",
    dataRetentionPolicy: "",
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await getOrgSettings();
        if (data.firmDefaults) setFirmDefaults(data.firmDefaults);
        if (data.roleControls) setRoleControls(data.roleControls);
        if (data.complianceSettings) setCompliance(data.complianceSettings);
      } catch (error) {
        console.error("Failed to fetch org settings", error);
        toast({ title: "Error", description: "Could not load settings from server.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);

  const handleSaveFirmDefaults = async () => {
    setSaving(true);
    try {
      await updateOrgSettings({ firmDefaults });
      toast({
        title: "Firm defaults saved",
        description: "New engagements will use these defaults unless overridden.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoleControls = async () => {
    setSaving(true);
    try {
      await updateOrgSettings({ roleControls });
      toast({
        title: "Role and control settings saved",
        description: "These preferences are stored for this organization.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCompliance = async () => {
    setSaving(true);
    try {
      await updateOrgSettings({ complianceSettings: compliance });
      toast({
        title: "Compliance content saved",
        description: "Internal FAQs and legal links have been updated.",
      });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }



  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Firm Settings</h1>
        <p className="text-muted-foreground">
          Configure defaults, roles, controls, and integrations for your firm&apos;s Audit Portal.
        </p>
      </div>

      <Tabs defaultValue="firm" className="w-full">
        <TabsList className="w-full justify-start gap-2 overflow-x-auto">
          <TabsTrigger value="firm">Firm Defaults</TabsTrigger>
          <TabsTrigger value="roles">Roles & Controls</TabsTrigger>
          <TabsTrigger value="compliance">Compliance & Legal</TabsTrigger>

        </TabsList>

        {/* Firm Defaults */}
        <TabsContent value="firm" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Firm Defaults
              </CardTitle>
              <CardDescription>
                Set base configuration for time zone, currency, and regional formatting.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default time zone</Label>
                  <Input
                    id="timezone"
                    value={firmDefaults.timeZone}
                    onChange={(e) =>
                      setFirmDefaults((prev) => ({
                        ...prev,
                        timeZone: e.target.value,
                      }))
                    }
                    placeholder="e.g. Europe/Malta"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used for engagement deadlines, reminders, and activity logs.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Default currency</Label>
                  <Input
                    id="currency"
                    value={firmDefaults.currency}
                    onChange={(e) =>
                      setFirmDefaults((prev) => ({
                        ...prev,
                        currency: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. EUR, GBP, USD"
                  />
                  <p className="text-xs text-muted-foreground">
                    Applied to budgets, fee notes, and high‑level KPIs.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                <Clock className="h-3 w-3" />
                <span>Per‑engagement overrides will still be allowed where supported.</span>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveFirmDefaults} disabled={saving}>
                  {saving ? "Saving..." : "Save firm defaults"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role & Control Management */}
        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Roles & Access Controls
              </CardTitle>
              <CardDescription>
                Plan how roles, permissions, and control restrictions will behave in your firm.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="custom-roles">Enable custom roles</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow defining firm‑specific roles in addition to the built‑in roles.
                  </p>
                </div>
                <Switch
                  id="custom-roles"
                  checked={roleControls.enableCustomRoles}
                  onCheckedChange={(value) =>
                    setRoleControls((prev) => ({ ...prev, enableCustomRoles: value }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="restrict-delete">Restrict destructive actions to admins</Label>
                  <p className="text-sm text-muted-foreground">
                    Only administrators can permanently delete engagements, clients, or library items.
                  </p>
                </div>
                <Switch
                  id="restrict-delete"
                  checked={roleControls.restrictDeleteToAdmins}
                  onCheckedChange={(value) =>
                    setRoleControls((prev) => ({ ...prev, restrictDeleteToAdmins: value }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="esign">E‑signature integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow integrations with providers like DocuSign or Adobe Sign for signing
                    engagement letters.
                  </p>
                </div>
                <Switch
                  id="esign"
                  checked={roleControls.allowESignature}
                  onCheckedChange={(value) =>
                    setRoleControls((prev) => ({ ...prev, allowESignature: value }))
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1 max-w-md">
                  <Label htmlFor="activity-visibility">Activity log visibility</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow managers (in addition to admins) to view the firm activity log.
                  </p>
                </div>
                <Switch
                  id="activity-visibility"
                  checked={roleControls.showActivityLogToManagers}
                  onCheckedChange={(value) =>
                    setRoleControls((prev) => ({ ...prev, showActivityLogToManagers: value }))
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleSaveRoleControls} disabled={saving}>
                  {saving ? "Saving..." : "Save role & control settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance & Legal */}
        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance, FAQs & Legal
              </CardTitle>
              <CardDescription>
                Document how your firm uses the portal and exposes information to staff.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="faqs">Firm FAQs (internal)</Label>
                  <Textarea
                    id="faqs"
                    className="min-h-[140px]"
                    value={compliance.faqsMarkdown}
                    onChange={(e) =>
                      setCompliance((prev) => ({
                        ...prev,
                        faqsMarkdown: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Use markdown or bullet lists to document naming conventions, workflows, and other
                    internal guidance for staff.
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="termsUrl">Terms of Use URL</Label>
                    <Input
                      id="termsUrl"
                      placeholder="https://yourfirm.com/terms"
                      value={compliance.termsUrl}
                      onChange={(e) =>
                        setCompliance((prev) => ({
                          ...prev,
                          termsUrl: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="privacyUrl">Privacy Policy URL</Label>
                    <Input
                      id="privacyUrl"
                      placeholder="https://yourfirm.com/privacy"
                      value={compliance.privacyUrl}
                      onChange={(e) =>
                        setCompliance((prev) => ({
                          ...prev,
                          privacyUrl: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retention">Data retention policy</Label>
                    <Textarea
                      id="retention"
                      className="min-h-[80px]"
                      value={compliance.dataRetentionPolicy}
                      onChange={(e) =>
                        setCompliance((prev) => ({
                          ...prev,
                          dataRetentionPolicy: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span>
                    These texts are stored locally for now. Once backend support is added, they should be
                    persisted per‑organization and surfaced across the portal.
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveCompliance} disabled={saving}>
                  {saving ? "Saving..." : "Save compliance content"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};


