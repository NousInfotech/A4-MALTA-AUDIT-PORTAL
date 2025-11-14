# Library Module - Complete Test Guide

## 🧪 Comprehensive Testing Workflow

This document provides step-by-step instructions to test all features of the Library Module.

---

## Prerequisites

1. **Backend Running:**
   ```bash
   cd A4-MALTA-AUDIT-BACKEND
   npm install speakeasy qrcode archiver
   npm run dev
   ```

2. **Frontend Running:**
   ```bash
   cd audit-portal-main
   npm run dev
   ```

3. **User Roles Available:**
   - Partner/Manager (full access)
   - Employee/Junior Auditor (limited access)
   - Client (view/upload only)
   - Admin (full access)

---

## Test Workflow 1: Basic Folder Operations

### 1.1 View Predefined Folders
**Steps:**
1. Navigate to Library page (`/employee/library` or similar route)
2. Check left sidebar for predefined folders:
   - ✅ Engagement Letters
   - ✅ Client Documents
   - ✅ Audit Working Papers
   - ✅ Final Deliverables
   - ✅ Prior Year Files

**Expected Result:**
- All 5 predefined folders visible
- Each folder shows folder icon
- Folders are clickable

---

### 1.2 Create Custom Folder
**Steps:**
1. Click "New Folder" button
2. Enter folder name: `Test Folder 2024`
3. Click "Create Folder"
4. Verify folder appears in sidebar

**Expected Result:**
- Folder created successfully
- Toast notification: "Folder created"
- New folder visible in sidebar

**Test Cases:**
- ✅ Valid folder name
- ❌ Empty folder name (should fail)
- ❌ Special characters like `/`, `\` (should fail)
- ❌ Duplicate folder name (should show error)

---

### 1.3 Rename Folder
**Steps:**
1. Select a folder (click on it)
2. Click "Rename Folder" button
3. Change name to: `Renamed Test Folder`
4. Click "Rename"

**Expected Result:**
- Folder renamed successfully
- Toast notification: "Folder renamed"
- Updated name visible in sidebar

---

### 1.4 Delete Folder
**Steps:**
1. Select a folder
2. Click folder menu (three dots) → "Delete"
3. Confirm deletion in dialog
4. Click "Delete" in confirmation dialog

**Expected Result:**
- Folder deleted successfully
- Toast notification: "Folder deleted"
- Folder removed from sidebar
- All files in folder also deleted

---

## Test Workflow 2: Document Upload

### 2.1 Upload via File Input
**Steps:**
1. Select a folder (e.g., "Client Documents")
2. Click "Upload" button
3. Select multiple files:
   - `test-document.pdf` (PDF)
   - `test-spreadsheet.xlsx` (Excel)
   - `test-image.jpg` (Image)
   - `test-word.docx` (Word)
4. Wait for upload to complete

**Expected Result:**
- Files upload successfully
- Toast notification: "Upload complete, X file(s) uploaded"
- Files appear in file list
- Each file shows:
  - File icon
  - File name
  - Upload date
  - Uploader name and role
  - Version number (v1)

**Test Cases:**
- ✅ Multiple files upload
- ✅ Different file types (.pdf, .docx, .xlsx, .jpg)
- ❌ File > 20MB (should show error)
- ❌ Invalid file type (should show error)

---

### 2.2 Drag and Drop Upload
**Steps:**
1. Select a folder
2. Drag files from file explorer
3. Drop onto the drag-and-drop zone
4. Verify visual feedback (border highlight)
5. Wait for upload

**Expected Result:**
- Drag zone highlights when dragging over
- Files upload successfully
- Toast notification appears
- Files appear in list

**Test Cases:**
- ✅ Single file drag-drop
- ✅ Multiple files drag-drop
- ✅ Visual feedback during drag

---

### 2.3 Version Upload (Re-upload Same File)
**Steps:**
1. Upload a file: `document-v1.pdf`
2. Upload the same file again: `document-v1.pdf`
3. Check version number

**Expected Result:**
- First upload: Version 1
- Second upload: Version 2
- Old version saved in history
- Toast shows version number

---

## Test Workflow 3: Document Viewing & Preview

### 3.1 View File List
**Steps:**
1. Select a folder with files
2. View files in list mode
3. Switch to grid mode (toggle button)

**Expected Result:**
- Files displayed in list view
- Files displayed in grid view
- File icons correct for each type
- File names visible
- Upload dates visible

---

### 3.2 Preview PDF
**Steps:**
1. Find a PDF file
2. Click "Preview" button (eye icon)
3. View PDF in modal

**Expected Result:**
- PDF opens in preview modal
- Full-screen preview available
- Can scroll through PDF pages
- Close button works

---

### 3.3 Preview Image
**Steps:**
1. Find an image file (.jpg, .png)
2. Click "Preview" button
3. View image in modal

**Expected Result:**
- Image displays in preview modal
- Image scales properly
- Full image visible

---

### 3.4 Preview Word Document
**Steps:**
1. Find a Word file (.docx, .doc)
2. Click "Preview" button
3. View document in Office Online Viewer

**Expected Result:**
- Word document opens in iframe
- Office Online Viewer loads document
- Document content visible

---

## Test Workflow 4: Version History

### 4.1 View Version History
**Steps:**
1. Select a file that has multiple versions
2. Click "Version History" button (clock icon)
3. View version list

**Expected Result:**
- Version history dialog opens
- Shows all versions (v1, v2, v3...)
- Each version shows:
  - Version number
  - Upload date
  - Uploader name
  - File size
  - "Latest" badge on current version

---

### 4.2 Restore Old Version
**Steps:**
1. Open version history for a file
2. Find an old version (not latest)
3. Click "Restore" button
4. Confirm restoration

**Expected Result:**
- Old version restored
- New version created (v4, v5, etc.)
- Toast notification: "Version restored"
- File list refreshes
- Previous version saved in history

---

## Test Workflow 5: Advanced Search & Filter

### 5.1 Basic Search
**Steps:**
1. Select a folder with multiple files
2. Type in search box: `test`
3. View filtered results

**Expected Result:**
- Files filtered by name containing "test"
- Results update as you type
- Search is case-insensitive

---

### 5.2 Advanced Filters
**Steps:**
1. Click "Filters" button
2. Set filters:
   - File Type: PDF
   - Sort By: Upload Date
   - Order: Descending
   - Date From: [Select date]
   - Date To: [Select date]
3. Click outside or apply filters

**Expected Result:**
- Filter panel expands
- Files filtered by selected criteria
- Results sorted correctly
- Date range filtering works

**Test Cases:**
- ✅ Filter by file type
- ✅ Sort by upload date
- ✅ Sort by file name
- ✅ Sort by file size
- ✅ Date range filtering
- ✅ Clear filters button

---

## Test Workflow 6: Bulk Operations

### 6.1 Select Multiple Files
**Steps:**
1. Select a folder with multiple files
2. Click checkbox on first file
3. Click checkbox on second file
4. Click checkbox on third file
5. Click "Select All" checkbox in header

**Expected Result:**
- Individual checkboxes work
- Selected files highlighted
- Select all selects all files
- Deselect all clears selection
- Selection count visible

---

### 6.2 Bulk Download
**Steps:**
1. Select multiple files (3-5 files)
2. Click "Download (X)" button
3. Wait for ZIP file generation
4. Verify download

**Expected Result:**
- ZIP file downloads
- File name: `[folder-name]-files.zip`
- ZIP contains all selected files
- Files maintain original names
- Toast notification: "Download started"

---

## Test Workflow 7: File Operations

### 7.1 Download File
**Steps:**
1. Select a file
2. Click "Download" button
3. Verify file downloads

**Expected Result:**
- File downloads successfully
- Original filename preserved
- Download count incremented
- Activity logged

---

### 7.2 Move File Between Folders
**Steps:**
1. Select a file
2. Click "Move" button (folder icon)
3. Select destination folder from dropdown
4. Confirm move

**Expected Result:**
- File moved to new folder
- File removed from old folder
- Toast notification: "Moved"
- Activity logged

---

### 7.3 Delete File
**Steps:**
1. Select a file
2. Click "Delete" button (trash icon)
3. Confirm deletion in dialog
4. Click "Delete"

**Expected Result:**
- File deleted successfully
- File removed from list
- Toast notification: "File deleted"
- Activity logged

---

## Test Workflow 8: Activity Logging

### 8.1 View File Activity
**Steps:**
1. Select a file
2. Click "Activity Log" button (checkmark icon)
3. View activity history

**Expected Result:**
- Activity dialog opens
- Shows all activities:
  - Upload
  - Download
  - View
  - Delete
  - Move
  - Restore
- Each activity shows:
  - Action type
  - User name and role
  - Timestamp
  - Details (if any)

---

## Test Workflow 9: Two-Factor Authentication (2FA)

> **Note:** 2FA can be managed in two ways:
> 1. **Via Admin Portal UI** (Recommended): Navigate to `/admin/2fa` for a user-friendly interface
> 2. **Via API**: Use REST API endpoints for programmatic access

### 9.1 Enable 2FA for Folder (Email Method)
**Steps:**
1. Login as Partner/Manager/Admin
2. Select a folder
3. Open folder settings (if available) OR use API directly:
   ```bash
   POST /api/global-library/2fa/enable
   Body: { "folderName": "Final Deliverables", "method": "email" }
   ```
4. Verify 2FA enabled

**Expected Result:**
- 2FA enabled for folder
- Folder marked as requiring 2FA

---

### 9.2 Enable 2FA for Folder (TOTP Method)
**Steps:**
1. Login as Partner/Manager/Admin
2. Generate TOTP secret:
   ```bash
   POST /api/global-library/2fa/generate-secret
   Body: { "folderName": "Final Deliverables" }
   ```
3. Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
4. Enter verification code from app
5. Enable 2FA:
   ```bash
   POST /api/global-library/2fa/enable
   Body: { 
     "folderName": "Final Deliverables", 
     "method": "totp",
     "secret": "[secret from step 2]",
     "token": "[code from authenticator app]"
   }
   ```

**Expected Result:**
- QR code generated
- Secret displayed
- 2FA enabled successfully
- TOTP verification works

---

### 9.3 Access 2FA-Protected Folder (Email OTP)
**Steps:**
1. Login as any user
2. Try to access folder with 2FA enabled
3. 2FA dialog should appear automatically
4. Select "Email" method
5. Click "Resend Code" (or code sent automatically)
6. Enter 6-digit code from email
7. Click "Verify"

**Expected Result:**
- 2FA dialog appears when accessing protected folder
- Email OTP sent (check email or dev console)
- Code input accepts 6 digits only
- Verification successful
- Access granted to folder
- 2FA valid for 24 hours

**Test Cases:**
- ✅ Valid OTP code
- ❌ Invalid OTP code (should show error)
- ❌ Expired OTP code
- ✅ Resend code functionality

---

### 9.4 Access 2FA-Protected Folder (TOTP)
**Steps:**
1. Login as any user
2. Try to access folder with TOTP 2FA enabled
3. 2FA dialog appears
4. Select "Authenticator App" method
5. Open authenticator app
6. Enter 6-digit code from app
7. Click "Verify"

**Expected Result:**
- 2FA dialog appears
- TOTP method available
- Code input works
- Verification successful
- Access granted

**Test Cases:**
- ✅ Valid TOTP code
- ❌ Invalid TOTP code
- ❌ Code from wrong app/secret

---

### 9.5 Disable 2FA
**Steps:**
1. Login as Partner/Manager/Admin
2. Disable 2FA:
   ```bash
   POST /api/global-library/2fa/disable
   Body: { "folderName": "Final Deliverables" }
   ```

**Expected Result:**
- 2FA disabled successfully
- Folder no longer requires 2FA
- Users can access without verification

---

### 9.6 Manage 2FA via Admin Portal (NEW)
**Steps:**
1. Login as **Employee (Auditor)** or **Admin**
2. Navigate to Admin Portal: `/admin/2fa`
   - Or click "Folder 2FA Settings" in Admin Quick Navigation
3. View all library folders and their 2FA status
4. For folders without 2FA:
   - Click **"Email"** button to enable Email OTP 2FA
   - Click **"TOTP"** button to enable Authenticator App 2FA
5. For folders with 2FA enabled:
   - See current method badge (Email OTP or Authenticator App)
   - Change method using dropdown selector
   - Click **"Disable"** to remove 2FA protection
6. For TOTP setup:
   - QR code appears automatically when TOTP is selected
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Manual entry key also displayed below QR code
   - Enter verification code from app to complete setup

**Expected Result:**
- All folders listed with 2FA status badges
- Email OTP enables immediately (no verification needed)
- TOTP shows QR code for scanning
- Method can be changed without disabling first
- 2FA can be disabled with one click
- Status updates immediately after changes
- Toast notifications confirm actions

**UI Features:**
- ✅ Green badge: "2FA Enabled" for protected folders
- ✅ Gray badge: "2FA Disabled" for unprotected folders
- ✅ Method badges: "Email OTP" or "Authenticator App"
- ✅ QR code display for TOTP setup
- ✅ Manual entry key shown for TOTP
- ✅ Info card explaining both 2FA methods
- ✅ Real-time status updates

**Test Cases:**
- ✅ Enable Email OTP for a folder
- ✅ Enable TOTP for a folder (QR code appears)
- ✅ Change from Email to TOTP
- ✅ Change from TOTP to Email
- ✅ Disable 2FA
- ✅ View QR code for TOTP
- ✅ See manual entry key for TOTP
- ✅ Status updates after enabling/disabling

**Access Control:**
- ✅ Employees (Auditors) can access `/admin/2fa`
- ✅ Admins can access `/admin/2fa`
- ✅ Both roles can enable/disable 2FA for any folder
- ✅ Permission checks ensure only authorized users can manage 2FA

---

## Test Workflow 10: Session Timeout

### 10.1 Session Activity Tracking
**Steps:**
1. Login and navigate to Library
2. Perform various actions (upload, download, view)
3. Wait 25 minutes without activity
4. Check for warning notification

**Expected Result:**
- Warning appears 5 minutes before timeout (at 25 minutes)
- Warning shows: "Your session will expire in X minutes"
- "Refresh Session" button available

---

### 10.2 Refresh Session
**Steps:**
1. When warning appears
2. Click "Refresh Session" button
3. Verify session extended

**Expected Result:**
- Session refreshed
- Warning disappears
- Toast notification: "Session refreshed"
- Session extended by 30 minutes

---

### 10.3 Session Expiration
**Steps:**
1. Wait for full 30 minutes of inactivity
2. Try to perform an action
3. Verify session expired

**Expected Result:**
- Session expired message
- User prompted to refresh page
- Actions blocked until session refreshed

---

## Test Workflow 11: Role-Based Access Control (RBAC)

### 11.1 Partner/Manager Access
**Steps:**
1. Login as Partner or Manager
2. Test all operations:
   - Create folder ✅
   - Upload files ✅
   - Delete files ✅
   - Delete folders ✅
   - Approve documents ✅
   - Enable/disable 2FA ✅

**Expected Result:**
- All operations allowed
- No permission errors

---

### 11.2 Employee/Junior Auditor Access
**Steps:**
1. Login as Employee or Junior Auditor
2. Test operations:
   - Create folder ❌ (should fail)
   - Upload files ✅
   - View files ✅
   - Delete files ❌ (should fail)
   - Delete folders ❌ (should fail)
   - Approve documents ❌ (should fail)

**Expected Result:**
- Upload and view allowed
- Delete and manage operations blocked
- Error messages: "Insufficient permissions"

---

### 11.3 Client Access
**Steps:**
1. Login as Client
2. Test operations:
   - View assigned folders ✅
   - Upload to assigned folders ✅
   - Delete files ❌
   - Create folders ❌

**Expected Result:**
- Limited access based on folder permissions
- Can only view/upload to assigned folders

---

## Test Workflow 12: File Metadata & Tags

### 12.1 Update File Metadata
**Steps:**
1. Select a file
2. Use API to update metadata:
   ```bash
   PATCH /api/global-library/files/metadata?folder=[folder]&fileName=[file]
   Body: {
     "description": "Test document description",
     "tags": ["important", "audit", "2024"],
     "status": "approved"
   }
   ```

**Expected Result:**
- Metadata updated successfully
- Description saved
- Tags saved
- Status updated
- Activity logged

---

## Test Workflow 13: Integration Points

### 13.1 Link Document to Engagement
**Steps:**
1. Upload file with engagement ID:
   ```bash
   POST /api/global-library/files/upload
   FormData: {
     folder: "Client Documents",
     file: [file],
     engagementId: "[engagement-id]"
   }
   ```

**Expected Result:**
- File uploaded
- Linked to engagement
- Searchable by engagement ID

---

### 13.2 Link Document to Client
**Steps:**
1. Upload file with client ID:
   ```bash
   POST /api/global-library/files/upload
   FormData: {
     folder: "Client Documents",
     file: [file],
     clientId: "[client-id]"
   }
   ```

**Expected Result:**
- File uploaded
- Linked to client
- Searchable by client ID

---

## Test Workflow 14: Error Handling

### 14.1 Test Error Scenarios
**Test Cases:**

1. **Upload File > 20MB**
   - Expected: Error message "File size must be less than 20 MB"

2. **Invalid File Type**
   - Expected: Error message "File type .exe not allowed"

3. **Access Folder Without Permission**
   - Expected: Error "Insufficient permissions"

4. **Access 2FA Folder Without Verification**
   - Expected: 2FA dialog appears

5. **Invalid 2FA Token**
   - Expected: Error "Invalid 2FA token"

6. **Delete Non-Existent File**
   - Expected: Error "File not found"

7. **Move File to Non-Existent Folder**
   - Expected: Error "Folder not found"

---

## Test Workflow 15: UI/UX Features

### 15.1 Responsive Design
**Steps:**
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)

**Expected Result:**
- Layout adapts to screen size
- Touch-friendly on mobile
- All features accessible

---

### 15.2 Loading States
**Steps:**
1. Perform slow operations (upload large file, bulk download)
2. Verify loading indicators

**Expected Result:**
- Loading spinners appear
- Buttons disabled during operations
- Progress feedback visible

---

### 15.3 Toast Notifications
**Steps:**
1. Perform various actions
2. Verify toast notifications

**Expected Result:**
- Success toasts (green)
- Error toasts (red)
- Info toasts (blue)
- Toasts auto-dismiss

---

## Complete Test Checklist

### ✅ Folder Operations
- [ ] View predefined folders
- [ ] Create custom folder
- [ ] Rename folder
- [ ] Delete folder
- [ ] Folder permissions

### ✅ File Upload
- [ ] Upload via file input
- [ ] Drag and drop upload
- [ ] Multiple file upload
- [ ] Version upload (re-upload)
- [ ] File size validation
- [ ] File type validation

### ✅ File Viewing
- [ ] List view
- [ ] Grid view
- [ ] PDF preview
- [ ] Image preview
- [ ] Word document preview

### ✅ Version Control
- [ ] View version history
- [ ] Restore old version
- [ ] Version numbering

### ✅ Search & Filter
- [ ] Basic search
- [ ] Filter by file type
- [ ] Filter by date range
- [ ] Sort by various fields
- [ ] Clear filters

### ✅ Bulk Operations
- [ ] Select multiple files
- [ ] Select all
- [ ] Bulk download (ZIP)

### ✅ File Operations
- [ ] Download file
- [ ] Move file
- [ ] Delete file
- [ ] View activity log

### ✅ 2FA Security
- [ ] Enable 2FA (Email)
- [ ] Enable 2FA (TOTP)
- [ ] Generate QR code
- [ ] Verify Email OTP
- [ ] Verify TOTP
- [ ] Access protected folder
- [ ] Disable 2FA
- [ ] Access 2FA Management page (`/admin/2fa`)
- [ ] Enable 2FA via Admin Portal UI
- [ ] Change 2FA method via Admin Portal
- [ ] View QR code in Admin Portal
- [ ] Disable 2FA via Admin Portal

### ✅ Session Management
- [ ] Session activity tracking
- [ ] Timeout warning (5 min before)
- [ ] Refresh session
- [ ] Session expiration

### ✅ RBAC
- [ ] Partner/Manager permissions
- [ ] Employee permissions
- [ ] Client permissions
- [ ] Admin permissions

### ✅ Error Handling
- [ ] File size errors
- [ ] File type errors
- [ ] Permission errors
- [ ] 2FA errors
- [ ] Network errors

---

## Quick Test Script

Run these commands in sequence to test all features:

```bash
# 1. Create folder
POST /api/global-library/folders
Body: { "name": "Test Folder" }

# 2. Upload file
POST /api/global-library/files/upload
FormData: folder=Test Folder, file=[test.pdf]

# 3. List files
GET /api/global-library/files?folder=Test Folder

# 4. Get versions
GET /api/global-library/files/versions?folder=Test Folder&fileName=test.pdf

# 5. Preview file
GET /api/global-library/files/preview?folder=Test Folder&fileName=test.pdf

# 6. Download file
GET /api/global-library/files/download?folder=Test Folder&fileName=test.pdf

# 7. Get activity
GET /api/global-library/files/activity?folder=Test Folder&fileName=test.pdf

# 8. Enable 2FA (Option A: Via Admin Portal UI)
Navigate to: /admin/2fa
- Click "Email" or "TOTP" button for desired folder
- For TOTP: Scan QR code and verify

# 8. Enable 2FA (Option B: Via API)
POST /api/global-library/2fa/enable
Body: { "folderName": "Test Folder", "method": "email" }

# 9. Verify 2FA
POST /api/global-library/2fa/verify
Body: { "folderName": "Test Folder", "token": "123456" }

# 10. Update session
POST /api/global-library/session/activity

# 11. Delete file
DELETE /api/global-library/files
Body: { "folder": "Test Folder", "fileName": "test.pdf" }
```

---

## Expected Results Summary

✅ **All Features Working:**
- Document upload (drag-drop + file input)
- Folder management (create, rename, delete)
- Version control (history + restore)
- Preview (PDF, images, Word)
- Search & filter (advanced)
- Bulk operations (select + download ZIP)
- 2FA (Email + TOTP with QR)
  - **Admin Portal UI** (`/admin/2fa`) for easy management
  - API endpoints for programmatic access
- Session timeout warnings
- RBAC permissions
- Activity logging
- File operations (move, delete, download)

---

## Troubleshooting

### Common Issues:

1. **2FA Not Working:**
   - Check `ENCRYPTION_KEY` in environment variables
   - Verify speakeasy and qrcode installed
   - Check session token in headers

2. **Upload Fails:**
   - Check file size (< 20MB)
   - Verify file type allowed
   - Check folder permissions

3. **Preview Not Working:**
   - For Word files: Ensure public URLs or use signed URLs
   - Check browser console for errors

4. **Session Timeout Not Showing:**
   - Verify session activity endpoint called
   - Check UserSession model in database

---

## Test Data Recommendations

Create test files:
- `test-document.pdf` (small PDF, < 1MB)
- `test-spreadsheet.xlsx` (Excel file)
- `test-image.jpg` (Image file)
- `test-word.docx` (Word document)
- `test-large.pdf` (> 20MB) - for error testing

---

**Happy Testing! 🚀**

