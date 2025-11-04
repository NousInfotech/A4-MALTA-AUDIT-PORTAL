// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useBranding, ThemeSuggestion } from '@/contexts/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, RefreshCw, Save, Palette, Layout, Image as ImageIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ThemeSuggestionModal } from '@/components/admin/ThemeSuggestionModal';

const ColorPicker: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}> = ({ label, value, onChange, description }) => {
  // Convert HSL to hex for color input
  const hslToHex = (hsl: string) => {
    const [h, s, l] = hsl.split(' ').map((v) => parseFloat(v.replace('%', '')));
    const hue = h;
    const saturation = s / 100;
    const lightness = l / 100;

    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const m = lightness - chroma / 2;

    let r = 0, g = 0, b = 0;
    if (hue >= 0 && hue < 60) { r = chroma; g = x; b = 0; }
    else if (hue >= 60 && hue < 120) { r = x; g = chroma; b = 0; }
    else if (hue >= 120 && hue < 180) { r = 0; g = chroma; b = x; }
    else if (hue >= 180 && hue < 240) { r = 0; g = x; b = chroma; }
    else if (hue >= 240 && hue < 300) { r = x; g = 0; b = chroma; }
    else if (hue >= 300 && hue < 360) { r = chroma; g = 0; b = x; }

    const toHex = (val: number) => {
      const hex = Math.round((val + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Convert hex to HSL
  const hexToHsl = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) h = ((g - b) / delta) % 6;
      else if (max === g) h = (b - r) / delta + 2;
      else h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return `${h} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const hexValue = hslToHex(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={label}>{label}</Label>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="flex gap-2">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-16 h-10 rounded border border-input cursor-pointer"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="220 14% 96%"
          className="flex-1"
        />
      </div>
      <div
        className="w-full h-8 rounded border border-input"
        style={{ backgroundColor: `hsl(${value})` }}
      />
    </div>
  );
};

export const BrandingSettings: React.FC = () => {
  const { branding, isLoading, updateBranding, uploadLogo, resetBranding, refreshBranding } = useBranding();
  const [formData, setFormData] = useState(branding || {});
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [themeSuggestions, setThemeSuggestions] = useState<ThemeSuggestion[]>([]);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (branding) {
      setFormData(branding);
    }
  }, [branding]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let logoUrl = formData.logo_url;
      let suggestions: ThemeSuggestion[] = [];

      // Upload logo if a new file was selected
      if (logoFile) {
        const result = await uploadLogo(logoFile);
        if (result) {
          logoUrl = result.logo_url;
          suggestions = result.theme_suggestions || [];
          
          // If we have theme suggestions, show the modal
          if (suggestions.length > 0) {
            setThemeSuggestions(suggestions);
            setPendingLogoUrl(logoUrl);
            setShowThemeModal(true);
            setIsSaving(false);
            return; // Don't save yet, wait for user to choose or skip
          }
        } else {
          toast.error('Failed to upload logo');
          setIsSaving(false);
          return;
        }
      }

      // Update branding settings (either no logo was uploaded, or no suggestions were generated)
      const success = await updateBranding({
        ...formData,
        logo_url: logoUrl,
      });

      if (success) {
        toast.success('Branding settings updated successfully');
        setLogoFile(null);
        setLogoPreview(null);
        await refreshBranding();
      } else {
        toast.error('Failed to update branding settings');
      }
    } catch (error) {
      console.error('Error saving branding:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectTheme = async (theme: ThemeSuggestion) => {
    setIsSaving(true);
    try {
      // Apply the selected theme colors along with the logo
      const success = await updateBranding({
        ...formData,
        logo_url: pendingLogoUrl,
        ...theme.colors,
      });

      if (success) {
        toast.success(`Applied "${theme.name}" theme successfully!`);
        setLogoFile(null);
        setLogoPreview(null);
        setPendingLogoUrl(null);
        setThemeSuggestions([]);
        await refreshBranding();
      } else {
        toast.error('Failed to apply theme');
      }
    } catch (error) {
      console.error('Error applying theme:', error);
      toast.error('An error occurred while applying theme');
    } finally {
      setIsSaving(false);
      setShowThemeModal(false);
    }
  };

  const handleSkipTheme = async () => {
    setIsSaving(true);
    try {
      // Just save the logo without theme changes
      const success = await updateBranding({
        ...formData,
        logo_url: pendingLogoUrl,
      });

      if (success) {
        toast.success('Logo updated successfully');
        setLogoFile(null);
        setLogoPreview(null);
        setPendingLogoUrl(null);
        setThemeSuggestions([]);
        await refreshBranding();
      } else {
        toast.error('Failed to update logo');
      }
    } catch (error) {
      console.error('Error updating logo:', error);
      toast.error('An error occurred');
    } finally {
      setIsSaving(false);
      setShowThemeModal(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const success = await resetBranding();
      if (success) {
        toast.success('Branding settings reset to defaults');
        setLogoFile(null);
        setLogoPreview(null);
        await refreshBranding();
      } else {
        toast.error('Failed to reset branding settings');
      }
    } catch (error) {
      console.error('Error resetting branding:', error);
      toast.error('An error occurred while resetting');
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Branding Settings</h1>
        <p className="text-brand-body">
          Customize your portal's appearance with your brand colors and logo
        </p>
      </div>

      <Tabs defaultValue="colors" className="space-y-6">
        <TabsList>
          <TabsTrigger value="colors">
            <Palette className="h-4 w-4 mr-2" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="logo">
            <ImageIcon className="h-4 w-4 mr-2" />
            Logo & Branding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="colors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sidebar Colors</CardTitle>
              <CardDescription>
                Customize the appearance of your navigation sidebar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label="Sidebar Background"
                value={formData.sidebar_background_color || '222 47% 11%'}
                onChange={(val) => setFormData({ ...formData, sidebar_background_color: val })}
                description="Main background color of the sidebar"
              />
              <Separator />
              <ColorPicker
                label="Sidebar Text"
                value={formData.sidebar_text_color || '220 14% 96%'}
                onChange={(val) => setFormData({ ...formData, sidebar_text_color: val })}
                description="Text and icon color in the sidebar"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Body Colors</CardTitle>
              <CardDescription>
                Customize the main content area colors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label="Body Background"
                value={formData.body_background_color || '210 40% 98%'}
                onChange={(val) => setFormData({ ...formData, body_background_color: val })}
                description="Background color of the main content area"
              />
              <Separator />
              <ColorPicker
                label="Body Text"
                value={formData.body_text_color || '222 47% 11%'}
                onChange={(val) => setFormData({ ...formData, body_text_color: val })}
                description="Default text color"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Brand Colors</CardTitle>
              <CardDescription>
                Primary and accent colors for buttons and highlights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ColorPicker
                label="Primary Color"
                value={formData.primary_color || '222 47% 11%'}
                onChange={(val) => setFormData({ ...formData, primary_color: val })}
                description="Main brand color for buttons and primary actions"
              />
              <Separator />
              <ColorPicker
                label="Primary Text"
                value={formData.primary_foreground_color || '0 0% 100%'}
                onChange={(val) => setFormData({ ...formData, primary_foreground_color: val })}
                description="Text color on primary colored backgrounds"
              />
              <Separator />
              <ColorPicker
                label="Accent Color"
                value={formData.accent_color || '43 96% 56%'}
                onChange={(val) => setFormData({ ...formData, accent_color: val })}
                description="Secondary color for highlights and accents"
              />
              <Separator />
              <ColorPicker
                label="Accent Text"
                value={formData.accent_foreground_color || '222 47% 11%'}
                onChange={(val) => setFormData({ ...formData, accent_foreground_color: val })}
                description="Text color on accent colored backgrounds"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>
                Set your organization name and logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={formData.organization_name || ''}
                  onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
                  placeholder="Audit Portal"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Upload your organization's logo (recommended size: 200x200px, max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Logo
                  </Button>
                  {logoFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {logoFile.name}
                    </p>
                  )}
                </div>

                {(logoPreview || formData.logo_url) && (
                  <div className="flex flex-col items-center gap-2">
                    <Label>Preview</Label>
                    <div className="w-32 h-32 border-2 border-dashed border-input rounded-lg flex items-center justify-center bg-muted p-2">
                      <img
                        src={logoPreview || formData.logo_url || ''}
                        alt="Logo preview"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving || isResetting}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isResetting ? 'animate-spin' : ''}`} />
          Reset to Defaults
        </Button>
        <Button onClick={handleSave} disabled={isSaving || isResetting}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Theme Suggestion Modal */}
      <ThemeSuggestionModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        suggestions={themeSuggestions}
        onSelectTheme={handleSelectTheme}
        onSkip={handleSkipTheme}
      />
    </div>
  );
};

export default BrandingSettings;

