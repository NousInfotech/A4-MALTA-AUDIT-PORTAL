# Bulk Color Replacement Guide

## 🎯 Mission: Replace 292 instances of bg-gray-900 and bg-gray-800

### 📊 Statistics
- **Total matches:** 292
- **Files affected:** 82
- **Pages:** 26 files (137 matches)
- **Components:** 56 files (155 matches)

---

## ⚡ SUPER QUICK CHEAT SHEET

**For 90% of cases, use these simple rules:**

```
1. Page background (min-h-screen) in Dashboards    → bg-brand-body
2. Page background (min-h-screen) in Auth          → bg-brand-sidebar
3. Modals, Dialogs, Dark Cards                     → bg-brand-sidebar
4. Buttons, Interactive elements                    → bg-brand-hover
5. Hover states: hover:bg-gray-900                 → hover:bg-brand-active
6. Hover states: hover:bg-gray-800                 → hover:bg-brand-hover
7. With opacity (/80, /50, etc.)                   → Use inline style
8. Active state (selected/current)                 → bg-brand-active
```

**When in doubt:** Use `bg-brand-sidebar` for dark, `bg-brand-body` for light

---

## 🚦 QUICK DECISION TABLE

Use this table to decide which brand class to use:

| Original Class | Context | Replace With | Condition |
|----------------|---------|--------------|-----------|
| `bg-gray-900` | Page container (dashboard) | `bg-brand-body` | IF file is *Dashboard.tsx AND has min-h-screen |
| `bg-gray-900` | Page container (auth) | `bg-brand-sidebar` | IF file is Login/Signup AND has min-h-screen |
| `bg-gray-900` | Modal/Dialog background | `bg-brand-sidebar` | IF inside modal/dialog component |
| `bg-gray-900` | Card background | `bg-brand-sidebar` | IF has rounded + shadow classes |
| `bg-gray-900` | Button background | `bg-brand-sidebar` | IF is button/link element |
| `bg-gray-900` | Section background | `bg-brand-sidebar` | IF is content section |
| `bg-gray-900/80` | With opacity | Inline style | ALWAYS use: `style={{ backgroundColor: 'hsl(var(--sidebar-background) / 0.8)' }}` |
| `bg-gray-800` | Button/Interactive | `bg-brand-hover` | IF has onClick or is interactive |
| `bg-gray-800` | Hover state base | `bg-brand-hover` | IF paired with hover:bg-gray-900 |
| `bg-gray-800` | Card in light page | `bg-brand-sidebar` | IF surrounded by light bg |
| `bg-gray-800/50` | With opacity | Inline style | ALWAYS use: `style={{ backgroundColor: 'hsl(var(--sidebar-hover) / 0.5)' }}` |
| `hover:bg-gray-900` | Hover effect | `hover:bg-brand-active` | ALWAYS |
| `hover:bg-gray-800` | Hover effect | `hover:bg-brand-hover` | ALWAYS |
| Active: `bg-gray-900` | Ternary true side | `bg-brand-active` | IF in isActive/isSelected ternary |
| Inactive: `bg-gray-800` | Ternary false side | `bg-brand-hover` | IF in isActive/isSelected ternary |

---

## 🔄 Replacement Rules with Conditions

### Rule 1: Dark UI Elements (Modals, Cards, Sections)
**CONDITION:** Element is a modal, card, dialog, or dark section in the UI

```tsx
// Pattern: bg-gray-900
// Replace with: bg-brand-sidebar

// ❌ Before
<div className="bg-gray-900 rounded-lg p-4">

// ✅ After
<div className="bg-brand-sidebar rounded-lg p-4">
```

**When to use `bg-brand-sidebar`:**
- ✅ Modals and dialogs
- ✅ Dark cards or sections
- ✅ Header/navigation bars
- ✅ Sidebar-style elements
- ✅ Dark containers with light text

---

### Rule 2: Light Page Backgrounds
**CONDITION:** Element is a main page container or light background area

```tsx
// Pattern: bg-gray-900 OR bg-gray-50 OR bg-white
// Replace with: bg-brand-body

// ❌ Before
<div className="min-h-screen bg-gray-900">
<div className="bg-white p-4">

// ✅ After  
<div className="min-h-screen bg-brand-body">
<div className="bg-brand-body p-4">
```

**When to use `bg-brand-body`:**
- ✅ Page containers (`min-h-screen`)
- ✅ Main content areas
- ✅ Light/white backgrounds
- ✅ Dashboard backgrounds
- ✅ Form containers

---

### Rule 3: Hover States
**CONDITION:** Element has hover interaction

```tsx
// Pattern: bg-gray-800 hover:bg-gray-900
// Replace with: bg-brand-hover hover:bg-brand-active

// ❌ Before
<button className="bg-gray-800 hover:bg-gray-900">

// ✅ After
<button className="bg-brand-hover hover:bg-brand-active">
```

**When to use `bg-brand-hover`:**
- ✅ Interactive buttons/links
- ✅ Clickable cards
- ✅ Menu items
- ✅ Tabs
- ✅ Any element with hover effect

**When to use `hover:bg-brand-active`:**
- ✅ Paired with `bg-brand-hover`
- ✅ Stronger hover feedback
- ✅ Important actions

---

### Rule 4: Active/Selected States
**CONDITION:** Element shows active or selected state

```tsx
// Pattern: Ternary with bg-gray classes for active state
// Replace with: Brand active classes

// ❌ Before
<div className={isActive ? 'bg-gray-900' : 'bg-gray-800'}>
<div className={isActive ? 'bg-gray-800' : 'bg-transparent'}>

// ✅ After
<div className={isActive ? 'bg-brand-active' : 'bg-brand-hover'}>
<div className={isActive ? 'bg-brand-active' : 'bg-transparent'}>
```

**When to use `bg-brand-active`:**
- ✅ Selected tab
- ✅ Active menu item
- ✅ Checked checkbox container
- ✅ Selected card
- ✅ Current step in wizard

---

### Rule 5: Opacity/Transparency
**CONDITION:** Element needs semi-transparent background

```tsx
// Pattern: bg-gray-900/80, bg-gray-900/50, etc.
// Replace with: Inline style with CSS variable

// ❌ Before
<div className="bg-gray-900/80 backdrop-blur-md">
<div className="bg-gray-800/50">

// ✅ After
<div 
  className="backdrop-blur-md"
  style={{ backgroundColor: 'hsl(var(--sidebar-background) / 0.8)' }}
>
<div style={{ backgroundColor: 'hsl(var(--sidebar-hover) / 0.5)' }}>
```

**Opacity mapping:**
- `/80` → `/ 0.8`
- `/50` → `/ 0.5`
- `/30` → `/ 0.3`
- `/20` → `/ 0.2`

**When to use opacity:**
- ✅ Modal overlays
- ✅ Backdrop elements
- ✅ Glassmorphism effects
- ✅ Subtle backgrounds

---

### Rule 6: Context-Based Decisions
**CONDITION:** Determine replacement based on file context

```tsx
// AUTH PAGES (Login, Signup)
bg-gray-900 → bg-brand-sidebar (keep dark theme)

// DASHBOARD PAGES  
bg-gray-900 → bg-brand-body (light theme)
bg-gray-800 → bg-brand-sidebar (dark cards in light theme)

// MODAL/DIALOG COMPONENTS
bg-gray-900 → bg-brand-sidebar
bg-gray-800 → bg-brand-hover

// NAVIGATION COMPONENTS
bg-gray-900 → bg-brand-sidebar
bg-gray-800 → bg-brand-hover
```

---

### Rule 7: Special Cases

#### 7a. Full-page Dark Background
```tsx
// CONDITION: Page should stay dark (auth pages)
// ❌ Before
<div className="min-h-screen bg-gray-900">

// ✅ After
<div className="min-h-screen bg-brand-sidebar">
```

#### 7b. Card in Light Page
```tsx
// CONDITION: Dark card on light background
// ❌ Before
<div className="bg-gray-900 rounded-lg shadow-xl">

// ✅ After
<div className="bg-brand-sidebar rounded-lg shadow-xl">
```

#### 7c. Input Fields
```tsx
// CONDITION: Input in dark context
// ❌ Before
<Input className="bg-gray-800 border-gray-700">

// ✅ After
<Input 
  className="border-brand-sidebar"
  style={{ backgroundColor: 'hsl(var(--sidebar-hover))' }}
>
```

#### 7d. Table Rows
```tsx
// CONDITION: Alternating row colors
// ❌ Before
<tr className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900'}>

// ✅ After
<tr className={index % 2 === 0 ? 'bg-brand-hover' : 'bg-brand-sidebar'}>
```

---

## 🔍 Conditional Find & Replace Strategy

### Strategy 1: By File Type

#### **Auth Pages** (LoginPage, SignupPage, PendingApprovalPage)
```
CONDITION: Keep dark theme
Find:    bg-gray-900
Replace: bg-brand-sidebar

Find:    bg-gray-800
Replace: bg-brand-hover
```

#### **Dashboard Pages** (AdminDashboard, EmployeeDashboard, ClientDashboard)
```
CONDITION: Light theme with dark cards

// Page containers
Find:    min-h-screen bg-gray-900
Replace: min-h-screen bg-brand-body

// Dark cards/sections
Find:    bg-gray-900
Replace: bg-brand-sidebar

// Interactive elements
Find:    bg-gray-800
Replace: bg-brand-hover
```

#### **Modal/Dialog Components**
```
CONDITION: Dark modals on any background

Find:    bg-gray-900
Replace: bg-brand-sidebar

Find:    bg-gray-800
Replace: bg-brand-hover
```

#### **Navigation Components**
```
CONDITION: Match sidebar theme

Find:    bg-gray-900
Replace: bg-brand-sidebar

Find:    bg-gray-800
Replace: bg-brand-hover
```

---

### Strategy 2: By Pattern

#### **Pattern A: Hover Combinations**
```regex
# Find hover pairs and replace together
Find:    bg-gray-800(\s+)hover:bg-gray-900
Replace: bg-brand-hover$1hover:bg-brand-active

Find:    hover:bg-gray-900
Replace: hover:bg-brand-active

Find:    hover:bg-gray-800
Replace: hover:bg-brand-hover
```

#### **Pattern B: Active/Conditional States**
```regex
# In ternary/conditional expressions
Find:    'bg-gray-900'(\s*):(\s*)'bg-gray-800'
Replace: 'bg-brand-active'$1:$2'bg-brand-hover'

Find:    "bg-gray-900"(\s*):(\s*)"bg-gray-800"
Replace: "bg-brand-active"$1:$2"bg-brand-hover"
```

#### **Pattern C: Opacity Variants**
```regex
# MUST be manual - convert to inline styles
Find:    bg-gray-900/80
Action:  Replace className with style={{ backgroundColor: 'hsl(var(--sidebar-background) / 0.8)' }}

Find:    bg-gray-900/50
Action:  Replace with style={{ backgroundColor: 'hsl(var(--sidebar-background) / 0.5)' }}

Find:    bg-gray-800/50
Action:  Replace with style={{ backgroundColor: 'hsl(var(--sidebar-hover) / 0.5)' }}
```

#### **Pattern D: Dark Mode Variants**
```regex
# Keep dark: prefix as-is for now (theme toggle support)
Find:    dark:bg-gray-900
Action:  SKIP (or replace with dark:bg-brand-sidebar if needed)

Find:    dark:bg-gray-800  
Action:  SKIP (or replace with dark:bg-brand-hover if needed)
```

---

### Strategy 3: By Element Type

#### **Buttons & Interactive**
```
IF element is <button>, <Link>, or has onClick:
  bg-gray-900 → bg-brand-sidebar
  bg-gray-800 → bg-brand-hover
  hover:bg-gray-900 → hover:bg-brand-active
  hover:bg-gray-800 → hover:bg-brand-hover
```

#### **Cards & Containers**
```
IF element is <Card>, <div> with shadow, or rounded container:
  bg-gray-900 → bg-brand-sidebar
  bg-gray-800 → bg-brand-hover
```

#### **Page Wrappers**
```
IF element has min-h-screen, h-screen, or is top-level container:
  THEN check context:
    - Auth pages: bg-gray-900 → bg-brand-sidebar
    - Dashboard pages: bg-gray-900 → bg-brand-body
    - Modal pages: bg-gray-900 → bg-brand-sidebar
```

#### **Table Elements**
```
IF element is <tr>, <td>, <th>:
  bg-gray-900 → bg-brand-sidebar
  bg-gray-800 → bg-brand-hover
  
IF alternating rows:
  even: bg-brand-hover
  odd: bg-brand-sidebar
```

---

## 🤖 Automated Replacement Decision Tree

```
START
  |
  ├─> Is it a page container (min-h-screen)?
  |     ├─> YES → Is it auth page?
  |     |          ├─> YES → bg-brand-sidebar
  |     |          └─> NO → bg-brand-body
  |     |
  |     └─> NO → Is it a modal/dialog?
  |              ├─> YES → bg-brand-sidebar
  |              |
  |              └─> NO → Is it interactive (hover/click)?
  |                       ├─> YES → Is it bg-gray-900?
  |                       |          ├─> YES → bg-brand-sidebar
  |                       |          └─> NO (bg-gray-800) → bg-brand-hover
  |                       |
  |                       └─> NO → Is it a card/section?
  |                                ├─> YES → bg-brand-sidebar
  |                                └─> NO → Check opacity → use inline style
```

---

## 📝 File-by-File Checklist

### Pages - Admin (5 files)
- [ ] `AdminDashboard.tsx` (9 matches) - ✅ DONE (bg-amber-50 already fixed)
- [ ] `PromptManagement.tsx` (1 match)
- [ ] `AuditorLogs.tsx` (9 matches)
- [ ] `UserManagement.tsx` (5 matches)
- [ ] `ISQMQuestionnairePage.tsx` (7 matches)

### Pages - Employee (15 files)
- [ ] `EmployeeDashboard.tsx` (8 matches)
- [ ] `EngagementDetails.tsx` (10 matches)
- [ ] `EngagementKYC.tsx` (7 matches)
- [ ] `EngagementManagement.tsx` (8 matches)
- [ ] `ClientDetail.tsx` (9 matches)
- [ ] `ClientManagement.tsx` (4 matches)
- [ ] `CreateEngagement.tsx` (7 matches)
- [ ] `AddClient.tsx` (6 matches)
- [ ] `EditClient.tsx` (5 matches)
- [ ] `Library.tsx` (8 matches)
- [ ] `KYCManagement.tsx` (4 matches)
- [ ] `ISQMQuestionnairePage.tsx` (7 matches)
- [ ] `CompanyDetail.tsx` (2 matches)

### Pages - Client (6 files)
- [ ] `ClientDashboard.tsx` (3 matches)
- [ ] `ClientEngagements.tsx` (2 matches)
- [ ] `DocumentRequests.tsx` (5 matches)
- [ ] `ClientPbcDocumentsModal.tsx` (2 matches)
- [ ] `KycUpload.tsx` (2 matches)

### Pages - Auth (3 files)
- [ ] `LoginPage.tsx` (3 matches)
- [ ] `SignupPage.tsx` (3 matches)
- [ ] `PendingApprovalPage.tsx` (1 match)

### Components - UI (5 files)
- [ ] `admin-comprehensive-navigation.tsx` (9 matches)
- [ ] `comprehensive-navigation.tsx` (14 matches)
- [ ] `client-comprehensive-navigation.tsx` (6 matches)
- [ ] `portal-analytics.tsx` (4 matches)
- [ ] `navigation-chart.tsx` (1 match)

### Components - ISQM (12 files)
- [ ] `ISQMPolicyGenerator.tsx` (9 matches)
- [ ] `ISQMDocumentManager.tsx` (8 matches)
- [ ] `ISQMAnalytics.tsx` (4 matches)
- [ ] `QuestionnaireTab.tsx` (4 matches)
- [ ] `WorkflowProgress.tsx` (4 matches)
- [ ] `QNAGeneratorDemo.tsx` (4 matches)
- [ ] Plus 6 dialog files (1 match each)

### Components - Other (39 files)
- [ ] Various component files...

---

## 🚀 EXECUTION PLAN: Step-by-Step Replacement with Conditions

### Phase 1: Preparation (2 minutes)
1. **Commit your current changes** (safety backup)
2. **Open Find & Replace** (Ctrl+Shift+H)
3. **Enable Regex mode** (Click `.*` icon or Alt+R)
4. **Set scope:** `files to include: src/**/*.tsx`

---

### Phase 2: Dashboard Pages First (High Priority)

#### Step 1: Fix Dashboard Page Containers
```
CONDITION: Only in dashboard files
Files to include: src/pages/**/Dashboard.tsx

Find:    (min-h-screen|h-screen)\s+([\w-]*\s+)*bg-gray-900
Replace: $1 $2bg-brand-body
```
**Review matches:** Should be ~3-5 dashboard page containers  
**Action:** Replace All

#### Step 2: Fix Dark Cards in Dashboards
```
CONDITION: Card/section backgrounds
Files to include: src/pages/**/Dashboard.tsx

Find:    \bbl-gray-900\b
Replace: bg-brand-sidebar
```
**Review matches:** Should show cards, modals, sections  
**Action:** Review each → Replace

---

### Phase 3: Hover State Replacements (Global)

#### Step 3: Replace Hover Combinations First
```
CONDITION: Elements with both bg and hover states
Files to include: src/**/*.tsx

Find:    bg-gray-800(\s+)([\w-]*\s+)*hover:bg-gray-900
Replace: bg-brand-hover$1$2hover:bg-brand-active
```
**Expected:** ~40-60 matches  
**Action:** Replace All

#### Step 4: Standalone Hover States
```
Files to include: src/**/*.tsx

Find:    \bhover:bg-gray-900\b
Replace: hover:bg-brand-active

Find:    \bhover:bg-gray-800\b
Replace: hover:bg-brand-hover
```
**Action:** Replace All for each

---

### Phase 4: Simple Replacements (Global)

#### Step 5: Replace Remaining bg-gray-900
```
CONDITION: Not already replaced
Files to include: src/**/*.tsx

Find:    \bbg-gray-900\b
Replace: bg-brand-sidebar
```
**Expected:** ~30-50 matches  
**Action:** Review first 10 → If correct pattern, Replace All

#### Step 6: Replace Remaining bg-gray-800  
```
CONDITION: Not already replaced
Files to include: src/**/*.tsx

Find:    \bbg-gray-800\b
Replace: bg-brand-hover
```
**Expected:** ~30-50 matches  
**Action:** Review first 10 → If correct pattern, Replace All

---

### Phase 5: Conditional/Ternary Expressions

#### Step 7: Fix Active State Ternaries
```
CONDITION: Ternary operators with gray backgrounds
Files to include: src/**/*.tsx
Enable: Regex

Find:    (['"])bg-gray-900\1(\s*):(\s*)(['"])bg-gray-800\4
Replace: $1bg-brand-active$1$2:$3$4bg-brand-hover$4
```
**Expected:** ~10-20 matches  
**Action:** Review each → Replace

#### Step 8: Fix Reverse Ternaries
```
Find:    (['"])bg-gray-800\1(\s*):(\s*)(['"])bg-gray-900\4
Replace: $1bg-brand-hover$1$2:$3$4bg-brand-active$4
```
**Action:** Review each → Replace

---

### Phase 6: Opacity Variants (Manual Review Required)

#### Step 9: Find Opacity Variants
```
CONDITION: Has opacity modifier (/number)
Files to include: src/**/*.tsx
Enable: Regex

Find:    bg-gray-900/\d+
```
**Action:** Review each match, replace manually:

**Replacement template:**
```tsx
// From:
<div className="bg-gray-900/80 backdrop-blur">

// To:
<div 
  className="backdrop-blur"
  style={{ backgroundColor: 'hsl(var(--sidebar-background) / 0.8)' }}
>
```

#### Step 10: bg-gray-800 with Opacity
```
Find:    bg-gray-800/\d+
```
**Action:** Manual replacement using `--sidebar-hover`

---

### Phase 7: Special Cases

#### Step 11: Auth Pages Review
```
Files to include: src/pages/auth/*.tsx

Action: Review each file manually
- Keep dark theme aesthetic
- Ensure bg-brand-sidebar is used
- Check contrast with text
```

#### Step 12: Modal Overlays
```
Find:    fixed inset-0 bg-(gray-900|gray-800|black)
```
**Action:** Review and possibly keep or use brand overlay

---

### Phase 8: Verification

#### Step 13: Search for Remaining Grays
```
Find:    bg-gray-(900|800)
Files to include: src/**/*.tsx
```
**Expected:** 0 results  
**If found:** Review context and replace appropriately

#### Step 14: Check for Broken Patterns
```
Find:    bg-brand-hover hover:bg-brand-sidebar
```
**Expected:** 0 results (should be hover:bg-brand-active)  
**Action:** Fix any found

---

## ✅ Post-Replacement Checklist

After all replacements:
- [ ] **Build the project:** `npm run build`
- [ ] **Check for errors:** Fix any TypeScript/build errors
- [ ] **Test all portals:**
  - [ ] Admin portal
  - [ ] Employee portal  
  - [ ] Client portal
  - [ ] Auth pages
- [ ] **Test with different branding colors:**
  - [ ] Try bright colors (red, blue, green)
  - [ ] Verify hover states work
  - [ ] Check active states
  - [ ] Validate contrast/readability
- [ ] **Commit changes:** `git commit -m "Replace hardcoded gray colors with brand CSS variables"`

---

## 🌳 VISUAL DECISION FLOWCHART

```
Found: bg-gray-900 or bg-gray-800
           |
           ├─→ Has opacity? (/80, /50, etc.)
           |   └─→ YES → Use inline style
           |             - bg-gray-900/80 → style={{ backgroundColor: 'hsl(var(--sidebar-background) / 0.8)' }}
           |             - bg-gray-800/50 → style={{ backgroundColor: 'hsl(var(--sidebar-hover) / 0.5)' }}
           |
           ├─→ Is it hover: prefix?
           |   └─→ YES → hover:bg-gray-900 → hover:bg-brand-active
           |             hover:bg-gray-800 → hover:bg-brand-hover
           |
           ├─→ Has min-h-screen or h-screen?
           |   └─→ YES → Is it dashboard page?
           |             ├─→ YES → bg-brand-body (light theme)
           |             └─→ NO (auth page) → bg-brand-sidebar (dark theme)
           |
           ├─→ Is it in modal/dialog component?
           |   └─→ YES → bg-brand-sidebar
           |
           ├─→ Is it interactive? (button, link, onClick)
           |   └─→ YES → bg-gray-900 → bg-brand-sidebar
           |             bg-gray-800 → bg-brand-hover
           |
           ├─→ Is it in active/selected ternary?
           |   └─→ YES → Active side → bg-brand-active
           |             Inactive side → bg-brand-hover
           |
           └─→ Default case
               └─→ bg-gray-900 → bg-brand-sidebar
                   bg-gray-800 → bg-brand-hover
```

---

## 🎯 CONDITIONAL RULES SUMMARY

### IF-THEN-ELSE Logic

```javascript
// Rule Engine
function getReplacementClass(originalClass, context) {
  
  // RULE 1: Opacity handling (HIGHEST PRIORITY)
  if (originalClass.includes('/')) {
    const opacity = originalClass.match(/\/(\d+)/)[1];
    const opacityDecimal = parseInt(opacity) / 100;
    
    if (originalClass.includes('bg-gray-900')) {
      return `inline-style: backgroundColor: 'hsl(var(--sidebar-background) / ${opacityDecimal})'`;
    }
    if (originalClass.includes('bg-gray-800')) {
      return `inline-style: backgroundColor: 'hsl(var(--sidebar-hover) / ${opacityDecimal})'`;
    }
  }
  
  // RULE 2: Hover states (SECOND PRIORITY)
  if (originalClass.startsWith('hover:')) {
    if (originalClass === 'hover:bg-gray-900') return 'hover:bg-brand-active';
    if (originalClass === 'hover:bg-gray-800') return 'hover:bg-brand-hover';
  }
  
  // RULE 3: Page containers (THIRD PRIORITY)
  if (context.hasClass('min-h-screen') || context.hasClass('h-screen')) {
    if (context.filename.includes('Dashboard')) {
      return 'bg-brand-body'; // Light theme for dashboards
    }
    if (context.filename.includes('Login') || context.filename.includes('Signup')) {
      return 'bg-brand-sidebar'; // Dark theme for auth
    }
  }
  
  // RULE 4: Modal/Dialog contexts
  if (context.isModal || context.isDialog) {
    if (originalClass === 'bg-gray-900') return 'bg-brand-sidebar';
    if (originalClass === 'bg-gray-800') return 'bg-brand-hover';
  }
  
  // RULE 5: Interactive elements
  if (context.isButton || context.isLink || context.hasOnClick) {
    if (originalClass === 'bg-gray-900') return 'bg-brand-sidebar';
    if (originalClass === 'bg-gray-800') return 'bg-brand-hover';
  }
  
  // RULE 6: Active/Selected states (in ternaries)
  if (context.inTernary && context.isActiveSide) {
    if (originalClass === 'bg-gray-900') return 'bg-brand-active';
    if (originalClass === 'bg-gray-800') return 'bg-brand-active';
  }
  if (context.inTernary && !context.isActiveSide) {
    return 'bg-brand-hover';
  }
  
  // RULE 7: Default fallback
  if (originalClass === 'bg-gray-900') return 'bg-brand-sidebar';
  if (originalClass === 'bg-gray-800') return 'bg-brand-hover';
  
  return originalClass; // No change
}
```

---

## ⚠️ Important Notes

1. **Auth pages** → Use `bg-brand-sidebar` (keep dark theme)
2. **Dashboard pages** → Use `bg-brand-body` for page, `bg-brand-sidebar` for cards
3. **Modal overlays** (`bg-gray-900/80`) → **MUST** use inline styles
4. **Hover combinations** → Replace in one step: `bg-gray-800 hover:bg-gray-900` → `bg-brand-hover hover:bg-brand-active`
5. **Preserve semantic colors** → Keep red (errors), green (success), yellow (warnings)
6. **Test after replacement** → Try different brand colors to verify everything works
7. **Dark mode classes** (`dark:bg-gray-*`) → Skip for now or replace if needed

---

## 🧪 Testing Checklist

After replacement, test:
- [ ] Admin dashboard
- [ ] Employee dashboard
- [ ] Client dashboard
- [ ] All modals and dialogs
- [ ] Navigation components
- [ ] ISQM pages
- [ ] KYC pages
- [ ] Engagement pages
- [ ] Auth pages (login/signup)

Change branding colors to bright/distinctive colors to verify all instances are dynamic.

---

## 📈 Progress Tracking

Update as you complete files:
- Admin pages: 0/5
- Employee pages: 0/15
- Client pages: 0/6
- Auth pages: 0/3
- Components: 0/56

**Total Progress: 0/82 files (0%)**

---

## 🎓 FINAL EXECUTION SUMMARY

### Use This Simple 3-Step Process:

#### **STEP 1: Quick Wins (Ctrl+Shift+H in VS Code)**

```
Files to include: src/**/*.tsx
Enable regex: YES

# Replace 1: Hover combinations (do this FIRST)
Find:    bg-gray-800(\s+)hover:bg-gray-900
Replace: bg-brand-hover$1hover:bg-brand-active
→ Click "Replace All"

# Replace 2: Simple hover states
Find:    \bhover:bg-gray-900\b
Replace: hover:bg-brand-active
→ Click "Replace All"

Find:    \bhover:bg-gray-800\b
Replace: hover:bg-brand-hover
→ Click "Replace All"
```

#### **STEP 2: Context-Aware (Do file by file)**

For each file, ask yourself:
- **Is this a Dashboard?** → Page container = `bg-brand-body`, cards = `bg-brand-sidebar`
- **Is this Auth page?** → Everything = `bg-brand-sidebar`
- **Is this a Modal?** → Everything = `bg-brand-sidebar`

Then replace:
```
bg-gray-900 → [decision from above]
bg-gray-800 → bg-brand-hover (90% of cases)
```

#### **STEP 3: Opacity & Manual Fixes**

```
Find:    bg-gray-(900|800)/\d+
→ Review each
→ Replace with inline style
```

---

## ✅ COMPLETION CRITERIA

You're done when:
1. ✅ Search `bg-gray-900` returns 0 results (excluding dark: prefix)
2. ✅ Search `bg-gray-800` returns 0 results (excluding dark: prefix)
3. ✅ All pages look correct with default branding
4. ✅ All pages adapt when branding colors change
5. ✅ No build errors
6. ✅ All hover states work correctly

---

**Created:** November 3, 2025  
**Status:** ✅ Ready for execution with complete conditional logic  
**Estimated Time:** 30-45 minutes for all 292 instances

