# 🎨 Dynamic Text Color System - Complete Guide

**Feature:** Body text automatically adapts to light/dark backgrounds!

---

## ✨ **How It Works:**

### Auto-Contrast Logic:
```javascript
// In BrandingContext.tsx
const bodyBg = parseSidebarHSL(settings.body_background_color);

const bodyTextColor = bodyBg.l < 50 
  ? '0 0% 100%'        // WHITE text for dark backgrounds (< 50% lightness)
  : '222 47% 11%';     // DARK text for light backgrounds (>= 50% lightness)
```

**Result:**
- ✅ Black background (0% lightness) → **White text**
- ✅ Dark gray (40% lightness) → **White text**
- ✅ Medium gray (50% lightness) → **Dark text**
- ✅ White background (100% lightness) → **Dark text**

---

## 🎯 **Text Color Hierarchy:**

| Class | CSS Variable | Light BG | Dark BG | Usage |
|-------|-------------|----------|---------|-------|
| `.text-brand-body` | `--foreground` | Dark Gray | **White** | Main headings, important text |
| `.text-brand-heading` | `--body-text-heading` | Dark Gray | **White** | H1, H2 titles |
| `.text-brand-subheading` | `--body-text-subheading` | Medium Gray | Light Gray | H3, H4 titles |
| `.text-brand-muted` | `--body-text-muted` | Dark Gray | Medium Gray | Labels, descriptions |
| `.text-brand-subtle` | `--body-text-subtle` | Light Gray | Dark Gray | Timestamps, placeholders |
| `.text-brand-sidebar` | `--sidebar-foreground` | Any | Any | Sidebar text (independent) |

---

## 📋 **What To Replace:**

### ✅ **MAIN HEADINGS** (Replace these):

```tsx
// ❌ Before
<h1 className="text-3xl font-semibold text-gray-900 mb-2">
  Good afternoon, Cleven!
</h1>

// ✅ After
<h1 className="text-3xl font-semibold text-brand-body mb-2">
  Good afternoon, Cleven!
</h1>
```

**Global Replace:**
```
FIND:    text-gray-900
REPLACE: text-brand-body
SCOPE:   Headings only (<h1>, <h2>, <CardTitle>, titles)
```

---

### ✅ **SUBHEADINGS** (Replace these):

```tsx
// ❌ Before
<h3 className="text-lg font-semibold text-gray-800 mb-4">
  System Analytics
</h3>

// ✅ After
<h3 className="text-lg font-semibold text-brand-subheading mb-4">
  System Analytics
</h3>
```

**Global Replace:**
```
FIND:    text-gray-800
REPLACE: text-brand-subheading
SCOPE:   Subheadings only (<h3>, <h4>, section titles)
```

---

### ✅ **BODY TEXT / LABELS** (Replace these):

```tsx
// ❌ Before  
<p className="text-gray-700">
  Keep up the great work!
</p>

// ✅ After
<p className="text-brand-muted">
  Keep up the great work!
</p>
```

**Global Replace:**
```
FIND:    text-gray-700
REPLACE: text-brand-muted
SCOPE:   Body paragraphs, descriptions
```

---

### ✅ **SECONDARY TEXT** (Replace these):

```tsx
// ❌ Before
<span className="text-sm text-gray-600">
  +0 this week
</span>

// ✅ After
<span className="text-sm text-brand-muted">
  +0 this week
</span>
```

**Global Replace:**
```
FIND:    text-gray-600
REPLACE: text-brand-muted
SCOPE:   Labels, metadata, counts
```

---

### ⚠️ **SUBTLE TEXT** (Optional):

```tsx
// ❌ Before
<span className="text-xs text-gray-500">
  Last updated: 2 hours ago
</span>

// ✅ After
<span className="text-xs text-brand-subtle">
  Last updated: 2 hours ago
</span>
```

**Global Replace:**
```
FIND:    text-gray-500
REPLACE: text-brand-subtle
SCOPE:   Timestamps, subtle info
```

---

## 🚀 **EXACT GLOBAL REPLACEMENTS:**

### Do these in VS Code (Ctrl+Shift+H):

```bash
# 1. Main Headings (181 instances)
FIND:    text-gray-900
REPLACE: text-brand-body
FILES:   src/**/*.tsx

# 2. Subheadings (226 instances)
FIND:    text-gray-800  
REPLACE: text-brand-subheading
FILES:   src/**/*.tsx

# 3. Body Text (473 instances)
FIND:    text-gray-700
REPLACE: text-brand-muted
FILES:   src/**/*.tsx

# 4. Secondary Text (585 instances)
FIND:    text-gray-600
REPLACE: text-brand-muted
FILES:   src/**/*.tsx

# 5. Subtle Text (80 instances) - OPTIONAL
FIND:    text-gray-500
REPLACE: text-brand-subtle
FILES:   src/**/*.tsx

# 6. Keep these as-is:
- text-gray-400 (placeholders) ✅ Keep
- text-gray-300 (very subtle) ✅ Keep
```

---

## 🎨 **Test Examples:**

### Example 1: Light Background
```
Body Background: 210 40% 98% (light blue-gray)
Body Text: 222 47% 11% (dark navy) ✅

text-brand-body → Dark Navy
text-brand-heading → Dark Navy  
text-brand-subheading → Medium Gray
text-brand-muted → Dark Gray
```

### Example 2: Dark Background
```
Body Background: 0 0% 10% (almost black)
Body Text: 0 0% 100% (white) ✅

text-brand-body → White
text-brand-heading → White
text-brand-subheading → Light Gray (90%)
text-brand-muted → Medium Gray (70%)
```

---

## 📊 **Replacement Summary:**

| Text Color | Count | New Class | Auto-Adapts? |
|-----------|-------|-----------|--------------|
| `text-gray-900` | 181 | `text-brand-body` | ✅ White/Dark |
| `text-gray-800` | 226 | `text-brand-subheading` | ✅ White/Gray |
| `text-gray-700` | 473 | `text-brand-muted` | ✅ Gray scale |
| `text-gray-600` | 585 | `text-brand-muted` | ✅ Gray scale |
| `text-gray-500` | 80 | `text-brand-subtle` | ✅ Gray scale |
| `text-gray-400` | 50 | Keep as-is | ❌ |
| `text-gray-300` | 200 | Keep as-is | ❌ |
| `text-white` | 350 | `text-brand-sidebar` | ✅ (on buttons/sidebar) |

**Total to Replace:** ~1,545 instances
**Estimated Time:** 10-15 minutes

---

## ✅ **Result:**

After replacements:
- ✅ User sets body background to **BLACK** → All text becomes **WHITE**
- ✅ User sets body background to **WHITE** → All text becomes **DARK GRAY**
- ✅ User sets body background to **BLUE** → Text adapts based on lightness
- ✅ Complete visual consistency across entire portal!

---

## 🎯 **Priority Order:**

1. **CRITICAL:** `text-gray-900` → `text-brand-body` (main headings) 🔥
2. **HIGH:** `text-gray-800` → `text-brand-subheading` (subheadings) 
3. **MEDIUM:** `text-gray-700` → `text-brand-muted` (body text)
4. **MEDIUM:** `text-gray-600` → `text-brand-muted` (labels)
5. **LOW:** `text-gray-500` → `text-brand-subtle` (optional)

Start with #1 and #2 - those are the most visible headings!

