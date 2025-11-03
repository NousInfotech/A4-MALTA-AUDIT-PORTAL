# White-Label Branding System - Quick Setup Guide

## 🚀 Quick Start

Your portal now has a complete white-label branding system! Here's how to set it up and use it.

## ✅ What's Included

1. **Database Migration** - Stores branding settings
2. **Backend API** - Manages branding CRUD operations
3. **Admin Settings Page** - User-friendly interface for customization
4. **Frontend Context** - Global state management
5. **Dynamic Theming** - Real-time color updates

## 📋 Setup Steps

### Step 1: Apply Database Migrations

Run these migrations in your Supabase dashboard or using the CLI:

1. **Migration 1:** `20250805170000_create_branding_settings.sql`
   - Creates `branding_settings` table
   - Sets up default branding
   - Configures permissions

2. **Migration 2:** `20250805170001_create_branding_storage.sql`
   - Creates `branding` storage bucket
   - Sets up file upload permissions

**To apply via Supabase Dashboard:**
- Go to SQL Editor
- Copy and paste each migration file
- Click "Run"

### Step 2: Restart Backend Server

The backend routes are already added. Just restart your server:

```bash
cd A4-MALTA-AUDIT-BACKEND
npm start
```

### Step 3: Restart Frontend

The frontend is already configured. Restart your dev server:

```bash
cd audit-portal-main
npm run dev
```

### Step 4: Test the System

1. **Login as Admin:**
   - Go to `http://localhost:8080/login`
   - Login with admin credentials

2. **Access Branding Settings:**
   - Look for "Branding Settings" in the sidebar
   - Click to open settings page

3. **Customize Your Branding:**
   - **Colors Tab:** Change sidebar, body, and brand colors
   - **Logo Tab:** Upload your logo and set organization name
   - Click "Save Changes"

4. **Verify Changes:**
   - Changes should apply immediately
   - Check sidebar for new logo and colors
   - Navigate around to see consistent theming

## 🎨 What You Can Customize

### Colors (HSL Format)

| Setting | Description | Default Value |
|---------|-------------|---------------|
| Sidebar Background | Main sidebar color | `222 47% 11%` (Dark Navy) |
| Sidebar Text | Text/icons in sidebar | `220 14% 96%` (Light Gray) |
| Body Background | Main content area | `210 40% 98%` (Off-white) |
| Body Text | Default text color | `222 47% 11%` (Dark Navy) |
| Primary Color | Buttons, primary actions | `222 47% 11%` (Dark Navy) |
| Primary Text | Text on primary color | `0 0% 100%` (White) |
| Accent Color | Highlights, badges | `43 96% 56%` (Gold) |
| Accent Text | Text on accent color | `222 47% 11%` (Dark Navy) |

### Logo & Branding

- **Organization Name:** Displayed in sidebar header
- **Logo Image:** 
  - Recommended size: 200x200px
  - Max file size: 5MB
  - Formats: JPG, PNG, SVG, WebP

## 🎯 How It Works

```
┌─────────────────────────────────────┐
│   Admin Changes Branding Settings   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Settings Saved to Database         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  BrandingContext Fetches Update     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  CSS Variables Applied Dynamically  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  All Components Update Instantly    │
└─────────────────────────────────────┘
```

## 📱 Features

- ✅ **Live Color Picker** - Visual color selection with preview
- ✅ **HSL Input** - Direct HSL value entry for precise control
- ✅ **Color Preview** - See colors before saving
- ✅ **Logo Upload** - Drag-and-drop or click to upload
- ✅ **Logo Preview** - Preview before saving
- ✅ **Reset to Defaults** - One-click restore to original
- ✅ **Real-time Updates** - No page refresh needed
- ✅ **Persistent Storage** - Settings saved to database
- ✅ **Security** - Admin-only access

## 🔐 Security

- Only users with `admin` role can modify branding
- All users can view branding (for consistent UI)
- Logo uploads restricted to admins
- File size and type validation
- Row-level security enabled

## 🐛 Troubleshooting

### Issue: "Branding Settings" not appearing in sidebar
**Solution:** Ensure you're logged in as an admin user

### Issue: Colors not updating after save
**Solution:** 
1. Check browser console for errors
2. Verify database migrations are applied
3. Check backend server is running
4. Hard refresh the page (Ctrl+Shift+R)

### Issue: Logo upload fails
**Solution:**
1. Verify file size is under 5MB
2. Ensure file is an image (JPG, PNG, etc.)
3. Check Supabase storage bucket `branding` exists
4. Verify you have admin permissions

### Issue: Backend errors
**Solution:**
1. Check backend console logs
2. Verify `brandingRoutes` is added to `server.js`
3. Ensure Supabase connection is working
4. Check if `has_role('admin')` function exists in database

## 📖 Documentation

For detailed documentation, see: [`docs/BRANDING_SYSTEM.md`](docs/BRANDING_SYSTEM.md)

## 🎉 You're All Set!

Your portal is now ready for white-label branding. Each client can have their own unique look while keeping all the powerful audit features.

### Next Steps:

1. ✅ Test with your company branding
2. ✅ Document your brand colors for easy reference
3. ✅ Train admin users on using the settings
4. ✅ Consider creating brand presets for quick switching

---

**Need Help?** Check the full documentation in `docs/BRANDING_SYSTEM.md`

