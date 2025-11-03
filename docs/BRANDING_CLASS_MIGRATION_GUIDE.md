# Branding Class Migration Guide

Quick reference for replacing Tailwind color classes with brand-aware utility classes.

## 🎨 Background Colors

### Old → New
```tsx
// Main content backgrounds
 bg-brand-body     → bg-brand-body
bg-white        → bg-brand-body
bg-gray-50      → bg-brand-body

// Primary brand backgrounds
bg-blue-600     → bg-brand-primary
bg-indigo-600   → bg-brand-primary

// Accent backgrounds
bg-amber-500    → bg-brand-accent
bg-yellow-400   → bg-brand-accent

// Sidebar backgrounds
bg-gray-900     → bg-brand-sidebar
bg-black        → bg-brand-sidebar

// Hover states
bg-gray-800     → bg-brand-hover
bg-gray-100     → bg-brand-hover

// Active/Selected states
bg-gray-700     → bg-brand-active

// Muted/Disabled
bg-gray-200     → bg-brand-muted
```

## 🖊️ Text Colors

### Old → New
```tsx
// Body text
text-brand-body   → text-brand-body
text-black      → text-brand-body

// Primary text
text-blue-600   → text-brand-primary
text-indigo-600 → text-brand-primary

// Accent text
text-amber-500  → text-brand-accent
text-yellow-600 → text-brand-accent

// Sidebar text
text-white      → text-brand-sidebar  (for sidebar elements)
text-gray-300   → text-brand-sidebar
```

## 🔲 Border Colors

### Old → New
```tsx
// Primary borders
border-blue-600     → border-brand-primary
border-gray-200     → border-brand-sidebar

// Accent borders
border-amber-500    → border-brand-accent
```

## 🎯 Complete Examples

### Example 1: Card Component
```tsx
// ❌ Before
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <h3 className="text-brand-body font-bold">Title</h3>
  <p className="text-gray-600">Description</p>
</div>

// ✅ After
<div className="bg-brand-body border border-brand-sidebar rounded-lg p-4">
  <h3 className="text-brand-body font-bold">Title</h3>
  <p className="text-brand-body opacity-70">Description</p>
</div>
```

### Example 2: Button Component
```tsx
// ❌ Before
<button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
  Click Me
</button>

// ✅ After (Option 1: Using utility class)
<button className="btn-brand-primary">
  Click Me
</button>

// ✅ After (Option 2: Using individual classes)
<button className="bg-brand-primary text-white px-4 py-2 rounded hover:bg-brand-primary hover:opacity-90">
  Click Me
</button>
```

### Example 3: Badge Component
```tsx
// ❌ Before
<span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs">
  New
</span>

// ✅ After
<span className="badge-brand">
  New
</span>
```

### Example 4: Hover Effects
```tsx
// ❌ Before
<div className="p-4 hover:bg-gray-100 cursor-pointer">
  Hover me
</div>

// ✅ After
<div className="p-4 hover:bg-brand-hover cursor-pointer">
  Hover me
</div>
```

### Example 5: Active/Selected States
```tsx
// ❌ Before
<div className={cn(
  "p-3 rounded",
  isActive ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100"
)}>
  Item
</div>

// ✅ After
<div className={cn(
  "p-3 rounded",
  isActive ? "bg-brand-active text-brand-primary" : "hover:bg-brand-hover"
)}>
  Item
</div>
```

## 🔍 How to Find and Replace

### 1. Search for common patterns:
```bash
# Find all bg-amber
grep -r "bg-amber" src/

# Find all bg-blue  
grep -r "bg-blue" src/

# Find all bg-gray
grep -r "bg-gray" src/

# Find all text-gray
grep -r "text-gray" src/
```

### 2. Priority files to update:
- [ ] `src/pages/admin/*.tsx` - Admin pages
- [ ] `src/pages/employee/*.tsx` - Employee pages
- [ ] `src/pages/client/*.tsx` - Client pages
- [ ] `src/components/ui/*.tsx` - UI components
- [ ] `src/components/**/*.tsx` - All components

## 📋 Available Utility Classes

### Background Classes
- `.bg-brand-primary` - Primary brand color
- `.bg-brand-accent` - Accent color
- `.bg-brand-body` - Main body background
- `.bg-brand-sidebar` - Sidebar background
- `.bg-brand-hover` - Hover state
- `.bg-brand-active` - Active/selected state
- `.bg-brand-muted` - Muted/disabled state

### Text Classes
- `.text-brand-primary` - Primary brand text
- `.text-brand-accent` - Accent text
- `.text-brand-body` - Body text
- `.text-brand-sidebar` - Sidebar text

### Border Classes
- `.border-brand-primary` - Primary brand border
- `.border-brand-accent` - Accent border
- `.border-brand-sidebar` - Sidebar border

### Interactive Classes
- `.hover:bg-brand-hover` - Hover background
- `.hover:bg-brand-primary` - Hover primary
- `.hover:bg-brand-accent` - Hover accent

### Component Classes
- `.badge-brand` - Complete badge styling
- `.btn-brand-primary` - Primary button styling
- `.btn-brand-accent` - Accent button styling

## 🎨 Color Mapping Reference

| Purpose | Old Tailwind | New Brand Class | CSS Variable |
|---------|-------------|-----------------|--------------|
| Main background | `bg-amber-50`, `bg-white` | `bg-brand-body` | `--background` |
| Main text | `text-brand-body` | `text-brand-body` | `--foreground` |
| Primary color | `bg-blue-600` | `bg-brand-primary` | `--primary` |
| Accent color | `bg-amber-500` | `bg-brand-accent` | `--accent` |
| Sidebar BG | `bg-gray-900` | `bg-brand-sidebar` | `--sidebar-background` |
| Sidebar text | `text-white` | `text-brand-sidebar` | `--sidebar-foreground` |
| Hover state | `bg-gray-100` | `bg-brand-hover` | `--sidebar-hover` |
| Active state | `bg-gray-200` | `bg-brand-active` | `--sidebar-active` |
| Borders | `border-gray-200` | `border-brand-sidebar` | `--sidebar-border` |
| Badges | Custom | `badge-brand` | `--badge-background` |

## ✅ Benefits

1. **Consistency** - All colors match the brand
2. **Dynamic** - Colors update when admin changes branding
3. **Maintainable** - One place to update colors
4. **Accessible** - Maintains proper contrast ratios
5. **White-label ready** - Different clients can have different colors

## 🚀 Quick Migration Script

To help with migration, here's a regex find/replace guide:

```
Find: bg-amber-50
Replace: bg-brand-body

Find: bg-blue-600
Replace: bg-brand-primary

Find: bg-gray-900
Replace: bg-brand-sidebar

Find: text-brand-body
Replace: text-brand-body

Find: border-gray-200
Replace: border-brand-sidebar
```

---

**Note:** After replacing classes, always test with different branding colors to ensure proper contrast and visibility!

**Last Updated:** November 3, 2025

