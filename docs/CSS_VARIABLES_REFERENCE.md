# CSS Variables Reference - Branding System

This document lists all available CSS variables that can be used throughout the application for consistent branding.

## 🎨 Core Branding Colors

These are set directly from the branding settings in the database:

### Sidebar Colors
```css
--sidebar-background        /* Main sidebar background color */
--sidebar-foreground        /* Text/icon color in sidebar */
```

**Usage:**
```tsx
<div style={{ backgroundColor: `hsl(var(--sidebar-background))` }} />
<p style={{ color: `hsl(var(--sidebar-foreground))` }} />
```

### Body/Content Colors
```css
--background                /* Main content area background */
--foreground                /* Default text color */
```

**Usage:**
```tsx
<div style={{ backgroundColor: `hsl(var(--background))` }} />
<p style={{ color: `hsl(var(--foreground))` }} />
```

### Primary Brand Colors
```css
--primary                   /* Primary brand color (buttons, CTAs) */
--primary-foreground        /* Text on primary color backgrounds */
```

**Usage:**
```tsx
<button style={{ 
  backgroundColor: `hsl(var(--primary))`,
  color: `hsl(var(--primary-foreground))`
}} />
```

### Accent Colors
```css
--accent                    /* Accent color (highlights, badges) */
--accent-foreground         /* Text on accent color backgrounds */
```

**Usage:**
```tsx
<span style={{ 
  backgroundColor: `hsl(var(--accent))`,
  color: `hsl(var(--accent-foreground))`
}} />
```

---

## 🛠️ Utility Variables (Auto-Generated)

These are automatically calculated from the core colors for consistent UI elements:

### Sidebar Utilities
```css
--sidebar-border            /* Border color (10% lighter than background) */
--sidebar-hover             /* Hover state (5% lighter) */
--sidebar-active            /* Active/selected state (8% lighter) */
--sidebar-muted             /* Muted/disabled elements (15% lighter, less saturated) */
--sidebar-logo-bg           /* Logo container background (12% lighter) */
```

**Usage:**
```tsx
// Border
<div style={{ borderColor: `hsl(var(--sidebar-border))` }} />

// Hover state
<button style={{ backgroundColor: `hsl(var(--sidebar-hover))` }} />

// Active state
<div style={{ backgroundColor: `hsl(var(--sidebar-active))` }} />

// Muted text
<span style={{ color: `hsl(var(--sidebar-muted))` }} />

// Logo container
<div style={{ backgroundColor: `hsl(var(--sidebar-logo-bg))` }} />
```

### Badge Colors
```css
--badge-background          /* Badge background (uses accent color) */
--badge-foreground          /* Badge text color */
```

**Usage:**
```tsx
<span style={{ 
  backgroundColor: `hsl(var(--badge-background))`,
  color: `hsl(var(--badge-foreground))`
}}>New</span>
```

### Interactive Element Colors
```css
--interactive-bg            /* Interactive elements background */
--interactive-hover         /* Interactive elements hover state */
```

**Usage:**
```tsx
<button 
  style={{ backgroundColor: `hsl(var(--interactive-bg))` }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `hsl(var(--interactive-hover))`}
/>
```

---

## 📝 Usage Examples

### Example 1: Custom Card Component
```tsx
function BrandedCard({ children }) {
  return (
    <div style={{
      backgroundColor: `hsl(var(--background))`,
      color: `hsl(var(--foreground))`,
      border: `1px solid hsl(var(--sidebar-border))`
    }}>
      {children}
    </div>
  );
}
```

### Example 2: Custom Button
```tsx
function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: `hsl(var(--primary))`,
        color: `hsl(var(--primary-foreground))`,
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none'
      }}
    >
      {children}
    </button>
  );
}
```

### Example 3: Badge Component
```tsx
function Badge({ label }) {
  return (
    <span style={{
      backgroundColor: `hsl(var(--badge-background))`,
      color: `hsl(var(--badge-foreground))`,
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 500
    }}>
      {label}
    </span>
  );
}
```

### Example 4: Hover Effect
```tsx
function HoverCard({ children }) {
  return (
    <div
      style={{ 
        backgroundColor: 'transparent',
        transition: 'all 0.3s'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = `hsl(var(--sidebar-hover))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </div>
  );
}
```

### Example 5: With Opacity
```tsx
function SemiTransparent() {
  return (
    <div style={{
      backgroundColor: `hsl(var(--sidebar-background) / 0.8)`, // 80% opacity
      color: `hsl(var(--sidebar-foreground) / 0.9)`  // 90% opacity
    }} />
  );
}
```

---

## 🎯 Best Practices

### ✅ DO:
- Use CSS variables for all colors instead of hardcoded values
- Use utility variables (hover, active, border) for consistent UI
- Test color contrast for accessibility
- Use opacity modifiers for semi-transparent elements

### ❌ DON'T:
- Don't use hardcoded colors like `#000000`, `bg-black`, `text-gray-400`
- Don't create your own color derivatives (use the utility variables)
- Don't mix CSS variables with Tailwind color classes

---

## 🔄 How Colors Are Calculated

The utility variables are automatically calculated from the core colors:

```typescript
// Example: Sidebar border is 10% lighter
const sidebarBg = { h: 222, s: 47%, l: 11% };
const sidebarBorder = { h: 222, s: 47%, l: 21% };  // l + 10%

// Example: Sidebar hover is 5% lighter
const sidebarHover = { h: 222, s: 47%, l: 16% };  // l + 5%
```

This ensures all UI elements maintain consistent relationships with the brand colors.

---

## 🔧 Updating Branding

Admins can update all these colors through the **Branding Settings** page:

1. Go to **Admin** → **Branding Settings**
2. Use the color pickers to choose colors
3. Click **Save Changes**
4. All CSS variables update automatically across the entire portal

---

## 📊 Variable Summary Table

| Variable | Source | Purpose |
|----------|--------|---------|
| `--sidebar-background` | Direct | Sidebar background |
| `--sidebar-foreground` | Direct | Sidebar text |
| `--background` | Direct | Body background |
| `--foreground` | Direct | Body text |
| `--primary` | Direct | Primary brand color |
| `--primary-foreground` | Direct | Primary text |
| `--accent` | Direct | Accent color |
| `--accent-foreground` | Direct | Accent text |
| `--sidebar-border` | Calculated | Borders (+10% lightness) |
| `--sidebar-hover` | Calculated | Hover states (+5% lightness) |
| `--sidebar-active` | Calculated | Active states (+8% lightness) |
| `--sidebar-muted` | Calculated | Muted elements (+15% lightness, -20% saturation) |
| `--sidebar-logo-bg` | Calculated | Logo containers (+12% lightness) |
| `--badge-background` | Accent | Badge backgrounds |
| `--badge-foreground` | Accent | Badge text |
| `--interactive-bg` | Primary | Interactive elements (+5% lightness) |
| `--interactive-hover` | Primary | Interactive hover (+10% lightness) |

---

**Version:** 1.0  
**Last Updated:** November 3, 2025  
**Maintained by:** Development Team

