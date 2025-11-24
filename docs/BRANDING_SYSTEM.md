# White-Label Branding System

## Overview

The Audit Portal now includes a comprehensive white-label branding system that allows different clients to customize the portal's appearance through an admin settings panel. This enables each client to brand the portal with their own colors and logo.

## Features

✅ **Customizable Colors:**
- Sidebar background and text colors
- Body/main content background and text colors
- Primary brand colors (for buttons and primary actions)
- Accent colors (for highlights and secondary elements)

✅ **Logo Management:**
- Upload custom logo
- Organization name customization
- Automatic application across the portal

✅ **Real-time Updates:**
- Changes apply immediately without page refresh
- CSS variables dynamically injected
- Persistent settings stored in database

## Architecture

### Database Layer
**Table:** `branding_settings`
- Stores all color configurations in HSL format
- Stores logo URL and organization name
- Single-row table (one configuration per portal instance)

**Storage Bucket:** `branding`
- Stores uploaded logo files
- Public access for viewing
- Admin-only upload/modify permissions

### Backend API
**Endpoints:**
- `GET /api/branding` - Fetch current branding settings (public)
- `PUT /api/branding` - Update branding settings (admin only)
- `POST /api/branding/upload-logo` - Upload logo file (admin only)
- `POST /api/branding/reset` - Reset to default settings (admin only)

**Files:**
- `src/controllers/brandingController.js` - API logic
- `src/routes/brandingRoutes.js` - Route definitions

### Frontend Layer

**Context:** `BrandingContext`
- Manages branding state globally
- Fetches settings on app load
- Applies CSS variables dynamically
- Provides hooks for updating settings

**Admin Page:** `BrandingSettings`
- Color pickers with live preview
- Logo upload interface
- Tabbed interface for organization
- Reset to defaults option

**Integration Points:**
- Sidebar component uses dynamic logo and colors
- All components inherit CSS variable changes automatically

## Usage

### For Administrators

1. **Access Settings:**
   - Login as admin user
   - Navigate to "Branding Settings" from the sidebar

2. **Customize Colors:**
   - Go to the "Colors" tab
   - Use color pickers or enter HSL values directly
   - See live preview of each color
   - Available sections:
     - Sidebar Colors
     - Body Colors
     - Brand Colors

3. **Upload Logo:**
   - Go to the "Logo & Branding" tab
   - Enter your organization name
   - Click "Choose Logo" to upload an image
   - Preview shows before saving
   - Any image size is accepted - automatically optimized to 512x512px max (maintains aspect ratio)
   - Supports PNG, JPG, SVG, and other image formats
   - Max file size: 5MB

4. **Save Changes:**
   - Click "Save Changes" button
   - Changes apply immediately across the portal

5. **Reset to Defaults:**
   - Click "Reset to Defaults" to restore original branding

### For Developers

#### Using Branding Context

```typescript
import { useBranding } from '@/contexts/BrandingContext';

function MyComponent() {
  const { branding, isLoading, updateBranding } = useBranding();
  
  // Access current settings
  const logoUrl = branding?.logo_url;
  const orgName = branding?.organization_name;
  
  // Update settings (admin only)
  await updateBranding({
    sidebar_background_color: '220 50% 20%'
  });
}
```

#### CSS Variables Available

The following CSS variables are automatically updated:

```css
--sidebar-background      /* Sidebar background color */
--sidebar-foreground      /* Sidebar text color */
--background              /* Main background color */
--foreground              /* Main text color */
--primary                 /* Primary brand color */
--primary-foreground      /* Text on primary color */
--accent                  /* Accent color */
--accent-foreground       /* Text on accent color */
```

Use them in your components:

```css
.my-element {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

## Color Format

Colors are stored in HSL (Hue, Saturation, Lightness) format:
- Format: `"H S% L%"` (e.g., `"220 50% 60%"`)
- HSL provides better manipulation and consistency
- Automatically converted to hex in color pickers

**Example:**
```
"222 47% 11%"  →  Dark Navy Blue
"43 96% 56%"   →  Gold/Amber
"210 40% 98%"  →  Off-white
```

## Database Schema

```sql
CREATE TABLE public.branding_settings (
  id UUID PRIMARY KEY,
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  sidebar_background_color TEXT NOT NULL,
  sidebar_text_color TEXT NOT NULL,
  body_background_color TEXT NOT NULL,
  body_text_color TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  primary_foreground_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  accent_foreground_color TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
```

## Security

- ✅ Only admin users can modify branding settings
- ✅ Logo uploads restricted to admin users
- ✅ File size limit: 5MB
- ✅ Only image files accepted
- ✅ Public viewing of branding for all users
- ✅ Row-level security (RLS) enabled

## Setup Instructions

### 1. Run Database Migrations

```bash
# Navigate to project directory
cd audit-portal-main

# Apply migrations (if using Supabase CLI)
supabase db push

# Or manually run the migration files in Supabase dashboard:
# - 20250805170000_create_branding_settings.sql
# - 20250805170001_create_branding_storage.sql
```

### 2. Backend Setup

Ensure the backend server includes the branding routes:
```javascript
// src/server.js
const brandingRoutes = require("./routes/brandingRoutes");
app.use("/api/branding", brandingRoutes);
```

### 3. Frontend Setup

The BrandingProvider is already wrapped around the app in `App.tsx`:
```typescript
<BrandingProvider>
  <AuthProvider>
    {/* Rest of app */}
  </AuthProvider>
</BrandingProvider>
```

### 4. Verify Installation

1. Login as admin
2. Check sidebar for "Branding Settings" link
3. Access the settings page
4. Try changing a color and saving
5. Verify the change appears immediately

## Troubleshooting

### Colors not updating
- Check browser console for errors
- Verify BrandingProvider is wrapping the app
- Check that CSS variables are being set on `document.documentElement`

### Logo upload fails
- Verify storage bucket `branding` exists in Supabase
- Check file size (max 5MB)
- Verify user has admin role
- Check backend logs for upload errors

### Changes not persisting
- Verify database connection
- Check RLS policies in Supabase
- Ensure admin role function exists: `public.has_role('admin')`

## Future Enhancements

Potential additions:
- [ ] Font customization
- [ ] Multiple theme presets
- [ ] Dark mode customization
- [ ] Custom CSS injection
- [ ] Email template branding
- [ ] PDF report branding
- [ ] Multi-tenant support (different branding per client account)

## API Documentation

### Get Branding Settings
```http
GET /api/branding
```

**Response:**
```json
{
  "id": "uuid",
  "organization_name": "Audit Portal",
  "logo_url": "https://...",
  "sidebar_background_color": "222 47% 11%",
  "sidebar_text_color": "220 14% 96%",
  "body_background_color": "210 40% 98%",
  "body_text_color": "222 47% 11%",
  "primary_color": "222 47% 11%",
  "primary_foreground_color": "0 0% 100%",
  "accent_color": "43 96% 56%",
  "accent_foreground_color": "222 47% 11%"
}
```

### Update Branding Settings
```http
PUT /api/branding
Authorization: Bearer {token}
Content-Type: application/json

{
  "organization_name": "My Company",
  "sidebar_background_color": "220 50% 20%"
}
```

### Upload Logo
```http
POST /api/branding/upload-logo
Authorization: Bearer {token}
Content-Type: multipart/form-data

logo: [file]
```

### Reset to Defaults
```http
POST /api/branding/reset
Authorization: Bearer {token}
```

## Support

For issues or questions:
1. Check this documentation
2. Review browser console for errors
3. Check backend logs
4. Verify database migrations are applied
5. Contact development team

---

**Version:** 1.0  
**Last Updated:** November 3, 2025  
**Maintained by:** Development Team

