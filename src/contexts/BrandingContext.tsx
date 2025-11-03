// @ts-nocheck
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { supabase } from '@/integrations/supabase/client';

const API_URL = import.meta.env.VITE_APIURL || 'http://localhost:8000';

export interface BrandingSettings {
  id?: string;
  organization_name: string;
  logo_url: string | null;
  sidebar_background_color: string;
  sidebar_text_color: string;
  body_background_color: string;
  body_text_color: string;
  primary_color: string;
  primary_foreground_color: string;
  accent_color: string;
  accent_foreground_color: string;
  created_at?: string;
  updated_at?: string;
}

interface BrandingContextType {
  branding: BrandingSettings | null;
  isLoading: boolean;
  refreshBranding: () => Promise<void>;
  updateBranding: (settings: Partial<BrandingSettings>) => Promise<boolean>;
  uploadLogo: (file: File) => Promise<string | null>;
  resetBranding: () => Promise<boolean>;
}

const defaultBranding: BrandingSettings = {
  organization_name: 'Audit Portal',
  logo_url: null,
  sidebar_background_color: '222 47% 11%',
  sidebar_text_color: '220 14% 96%',
  body_background_color: '210 40% 98%',
  body_text_color: '222 47% 11%',
  primary_color: '222 47% 11%',
  primary_foreground_color: '0 0% 100%',
  accent_color: '43 96% 56%',
  accent_foreground_color: '222 47% 11%',
};

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Apply CSS variables when branding changes
  const applyCSSVariables = useCallback((settings: BrandingSettings) => {
    const root = document.documentElement;
    
    console.log('🎨 Applying branding CSS variables:', settings);
    
    // Parse HSL values to calculate derived colors
    const parseSidebarHSL = (hsl: string) => {
      const [h, s, l] = hsl.split(' ').map(v => parseFloat(v.replace('%', '')));
      return { h, s, l };
    };
    
    const sidebarBg = parseSidebarHSL(settings.sidebar_background_color);
    const primaryColor = parseSidebarHSL(settings.primary_color);
    const bodyBg = parseSidebarHSL(settings.body_background_color);
    
    // ✅ AUTO-CALCULATE BODY TEXT COLOR based on background lightness
    // If body background is dark (< 50% lightness) → use white text
    // If body background is light (>= 50% lightness) → use dark gray text
    const bodyTextColor = bodyBg.l < 50 
      ? '0 0% 100%'        // White text for dark backgrounds
      : '222 47% 11%';     // Dark navy text for light backgrounds
    
    console.log(`🎨 Body background lightness: ${bodyBg.l}% → Using ${bodyBg.l < 50 ? 'WHITE' : 'DARK'} text`);
    
    // Core branding colors
    root.style.setProperty('--sidebar-background', settings.sidebar_background_color);
    root.style.setProperty('--sidebar-foreground', settings.sidebar_text_color);
    root.style.setProperty('--background', settings.body_background_color);
    root.style.setProperty('--foreground', bodyTextColor); // ✅ Dynamic text color!
    root.style.setProperty('--primary', settings.primary_color);
    root.style.setProperty('--primary-foreground', settings.primary_foreground_color);
    root.style.setProperty('--accent', settings.accent_color);
    root.style.setProperty('--accent-foreground', settings.accent_foreground_color);
    
    // ✅ Additional body text utilities for different emphasis levels
    root.style.setProperty('--body-text-heading', bodyTextColor); // Main headings
    root.style.setProperty('--body-text-subheading', bodyBg.l < 50 
      ? '0 0% 90%'        // Light gray for dark backgrounds
      : '215 25% 27%'     // Medium gray for light backgrounds
    );
    root.style.setProperty('--body-text-muted', bodyBg.l < 50 
      ? '0 0% 70%'        // Medium gray for dark backgrounds  
      : '220 9% 46%'      // Darker gray for light backgrounds
    );
    root.style.setProperty('--body-text-subtle', bodyBg.l < 50 
      ? '0 0% 50%'        // Darker gray for dark backgrounds
      : '220 9% 60%'      // Light gray for light backgrounds
    );
    
    // Sidebar utility variables (derived from main colors)
    root.style.setProperty('--sidebar-border', `${sidebarBg.h} ${sidebarBg.s}% ${Math.min(sidebarBg.l + 10, 95)}%`);
    root.style.setProperty('--sidebar-hover', `${sidebarBg.h} ${sidebarBg.s}% ${Math.min(sidebarBg.l + 5, 90)}%`);
    root.style.setProperty('--sidebar-active', `${sidebarBg.h} ${sidebarBg.s}% ${Math.min(sidebarBg.l + 8, 92)}%`);
    root.style.setProperty('--sidebar-muted', `${sidebarBg.h} ${Math.max(sidebarBg.s - 20, 5)}% ${Math.min(sidebarBg.l + 15, 80)}%`);
    
    // Logo container background (slightly lighter than sidebar)
    root.style.setProperty('--sidebar-logo-bg', `${sidebarBg.h} ${sidebarBg.s}% ${Math.min(sidebarBg.l + 12, 85)}%`);
    
    // Badge colors (using accent)
    root.style.setProperty('--badge-background', settings.accent_color);
    root.style.setProperty('--badge-foreground', settings.accent_foreground_color);
    
    // Button/Interactive element colors
    root.style.setProperty('--interactive-bg', `${primaryColor.h} ${primaryColor.s}% ${Math.min(primaryColor.l + 5, 95)}%`);
    root.style.setProperty('--interactive-hover', `${primaryColor.h} ${primaryColor.s}% ${Math.min(primaryColor.l + 10, 97)}%`);
    
    // Apply body background and dynamic text color directly to override Tailwind classes
    document.body.style.backgroundColor = `hsl(${settings.body_background_color})`;
    document.body.style.color = `hsl(${bodyTextColor})`; // ✅ Dynamic text!
    
    // Log to verify
    console.log('✅ CSS Variables applied:', {
      '--sidebar-background': root.style.getPropertyValue('--sidebar-background'),
      '--sidebar-border': root.style.getPropertyValue('--sidebar-border'),
      '--background': root.style.getPropertyValue('--background'),
      '--primary': root.style.getPropertyValue('--primary'),
      '--accent': root.style.getPropertyValue('--accent')
    });
  }, []);

  // Fetch branding settings
  const fetchBranding = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_URL}/api/branding`);
      const settings = response.data || defaultBranding;
      setBranding(settings);
      applyCSSVariables(settings);
    } catch (error) {
      console.error('Error fetching branding settings:', error);
      // Use default branding on error
      setBranding(defaultBranding);
      applyCSSVariables(defaultBranding);
    } finally {
      setIsLoading(false);
    }
  }, [applyCSSVariables]);

  // Initial fetch
  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Refresh branding
  const refreshBranding = useCallback(async () => {
    await fetchBranding();
  }, [fetchBranding]);

  // Update branding settings
  const updateBranding = useCallback(async (settings: Partial<BrandingSettings>): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        return false;
      }
      
      const response = await axios.put(
        `${API_URL}/api/branding`,
        settings,
        {
          headers: {
            'Authorization': `Bearer ${data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      const updatedSettings = response.data;
      setBranding(updatedSettings);
      applyCSSVariables(updatedSettings);
      return true;
    } catch (error) {
      console.error('Error updating branding settings:', error);
      return false;
    }
  }, [applyCSSVariables]);

  // Upload logo
  const uploadLogo = useCallback(async (file: File): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        return null;
      }
      
      const formData = new FormData();
      formData.append('logo', file);

      const response = await axios.post(
        `${API_URL}/api/branding/upload-logo`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${data.session?.access_token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data.logo_url;
    } catch (error) {
      console.error('Error uploading logo:', error);
      return null;
    }
  }, []);

  // Reset branding to defaults
  const resetBranding = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Session error:', error);
        return false;
      }
      
      const response = await axios.post(
        `${API_URL}/api/branding/reset`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${data.session?.access_token}`,
          },
        }
      );
      
      const resetSettings = response.data;
      setBranding(resetSettings);
      applyCSSVariables(resetSettings);
      return true;
    } catch (error) {
      console.error('Error resetting branding settings:', error);
      return false;
    }
  }, [applyCSSVariables]);

  return (
    <BrandingContext.Provider
      value={{
        branding,
        isLoading,
        refreshBranding,
        updateBranding,
        uploadLogo,
        resetBranding,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

