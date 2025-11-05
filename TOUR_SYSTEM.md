# 🎮 Interactive Onboarding Tour System

## Overview

The Audit Portal includes an interactive tutorial system (similar to Figma or game tutorials) that guides new users through complex features with step-by-step instructions.

## Features

- ✨ **Spotlight Effect** - Highlights the exact UI element being explained
- 🎯 **Auto-Scrolling** - Automatically scrolls to show highlighted elements
- 🔄 **Fixed Positioning** - Highlight stays in place even when scrolling
- ➡️ **Directional Arrows** - Animated arrows point to target elements
- 📊 **Progress Tracking** - Shows current step and overall progress
- 💾 **Persistent State** - Remembers which tours users have completed
- 🔁 **Restart Anytime** - Users can replay tours via "Show Tutorial" button

## Current Tours

### 1. Branding Settings Tour (11 Steps)

Guides admins through customizing their portal's appearance:

1. Welcome message and overview
2. Understanding Colors vs Logo tabs
3. Sidebar color customization
4. Body/content area colors
5. Primary and accent colors
6. Switching to Logo tab
7. Setting organization name
8. Adding organization subtitle
9. Uploading company logo
10. Saving changes
11. Reset to defaults option

## How It Works

### For New Users

When a new admin visits **Branding Settings** for the first time:
1. Page loads normally
2. After 1 second, tour automatically starts
3. Interactive overlay appears with spotlight on first element
4. User follows step-by-step instructions
5. Progress is saved to database
6. Tour won't show again after completion

### Restarting Tours

Click the **"Show Tutorial"** button (with help icon) in the top-right corner of any page with a tour.

### Skipping Tours

Users can click **"Skip Tour"** at any time. The tour won't show again unless manually restarted.

## Technical Architecture

### Backend

**Model:** `UserTour.js`
```javascript
{
  user_id: String,
  completed_tours: [String],
  skipped_tours: [String],
  last_tour_date: Date
}
```

**API Endpoints:**
- `GET /api/tours` - Get user's tour progress
- `POST /api/tours/complete` - Mark tour as completed
- `POST /api/tours/skip` - Skip a tour
- `POST /api/tours/reset` - Reset tour (admin only)

### Frontend

**Context:** `TourContext.tsx` - Manages tour state globally

**Components:**
- `TourSpotlight.tsx` - Reusable spotlight/tooltip component
- `BrandingTour.tsx` - Specific tour for branding settings

## Creating New Tours

To create a tour for another page:

1. **Create tour component** (e.g., `UserManagementTour.tsx`):

```tsx
import { TourSpotlight, TourStep } from './TourSpotlight';
import { useTour } from '@/contexts/TourContext';

const TOUR_NAME = 'user-management';

export const UserManagementTour = () => {
  const { isTourCompleted, isTourSkipped, completeTour, skipTour } = useTour();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="user-list"]',
      title: 'User List',
      description: 'View all users here...',
      position: 'right',
    },
    // Add more steps...
  ];

  // Auto-show logic and handlers...
};
```

2. **Add data-tour attributes** to target elements:

```tsx
<div data-tour="user-list">
  {/* Your content */}
</div>
```

3. **Import and use** in your page:

```tsx
import { UserManagementTour } from '@/components/tour/UserManagementTour';

// In your component
<UserManagementTour />
```

## Best Practices

### Tour Step Design

✅ **Do:**
- Keep descriptions concise (1-2 sentences)
- Use action-oriented language ("Click here to...", "Change this to...")
- Highlight one element per step
- Order steps logically (top to bottom, left to right)
- Use 6-12 steps per tour (not too short, not too long)

❌ **Don't:**
- Write long paragraphs
- Highlight multiple elements in one step
- Skip crucial features
- Make tours too technical

### Positioning

Choose tooltip position to avoid covering the highlighted element:
- **top** - Tooltip above element (arrow points down)
- **bottom** - Tooltip below element (arrow points up)
- **left** - Tooltip left of element (arrow points right)
- **right** - Tooltip right of element (arrow points left)

### Testing

1. Clear browser localStorage
2. Create a new admin user
3. Visit the page with the tour
4. Verify tour shows automatically
5. Test all navigation (Next, Back, Skip)
6. Verify completion is saved

## Future Enhancements

Potential additions:
- 🎬 Video tutorials embedded in tours
- 🌐 Multi-language support
- 📱 Mobile-optimized tours
- 🎨 Tour for each major feature
- 📧 Email reminder for incomplete tours
- 🏆 Gamification (badges for completing tours)

## Database Schema

```javascript
UserTour {
  user_id: "uuid-here",
  completed_tours: ["branding-settings", "user-management"],
  skipped_tours: ["engagement-creation"],
  last_tour_date: "2025-11-05T12:00:00.000Z",
  createdAt: "2025-11-01T10:00:00.000Z",
  updatedAt: "2025-11-05T12:00:00.000Z"
}
```

## Support

The tour system is designed to be:
- **Client-friendly** - No technical knowledge required
- **Self-guided** - Users can explore at their own pace
- **Non-intrusive** - Can be skipped or dismissed
- **Professional** - Polished UI matching your brand

---

**Built for multi-client SaaS deployment** - Each client gets personalized onboarding based on their usage patterns.


## Overview

The Audit Portal includes an interactive tutorial system (similar to Figma or game tutorials) that guides new users through complex features with step-by-step instructions.

## Features

- ✨ **Spotlight Effect** - Highlights the exact UI element being explained
- 🎯 **Auto-Scrolling** - Automatically scrolls to show highlighted elements
- 🔄 **Fixed Positioning** - Highlight stays in place even when scrolling
- ➡️ **Directional Arrows** - Animated arrows point to target elements
- 📊 **Progress Tracking** - Shows current step and overall progress
- 💾 **Persistent State** - Remembers which tours users have completed
- 🔁 **Restart Anytime** - Users can replay tours via "Show Tutorial" button

## Current Tours

### 1. Branding Settings Tour (11 Steps)

Guides admins through customizing their portal's appearance:

1. Welcome message and overview
2. Understanding Colors vs Logo tabs
3. Sidebar color customization
4. Body/content area colors
5. Primary and accent colors
6. Switching to Logo tab
7. Setting organization name
8. Adding organization subtitle
9. Uploading company logo
10. Saving changes
11. Reset to defaults option

## How It Works

### For New Users

When a new admin visits **Branding Settings** for the first time:
1. Page loads normally
2. After 1 second, tour automatically starts
3. Interactive overlay appears with spotlight on first element
4. User follows step-by-step instructions
5. Progress is saved to database
6. Tour won't show again after completion

### Restarting Tours

Click the **"Show Tutorial"** button (with help icon) in the top-right corner of any page with a tour.

### Skipping Tours

Users can click **"Skip Tour"** at any time. The tour won't show again unless manually restarted.

## Technical Architecture

### Backend

**Model:** `UserTour.js`
```javascript
{
  user_id: String,
  completed_tours: [String],
  skipped_tours: [String],
  last_tour_date: Date
}
```

**API Endpoints:**
- `GET /api/tours` - Get user's tour progress
- `POST /api/tours/complete` - Mark tour as completed
- `POST /api/tours/skip` - Skip a tour
- `POST /api/tours/reset` - Reset tour (admin only)

### Frontend

**Context:** `TourContext.tsx` - Manages tour state globally

**Components:**
- `TourSpotlight.tsx` - Reusable spotlight/tooltip component
- `BrandingTour.tsx` - Specific tour for branding settings

## Creating New Tours

To create a tour for another page:

1. **Create tour component** (e.g., `UserManagementTour.tsx`):

```tsx
import { TourSpotlight, TourStep } from './TourSpotlight';
import { useTour } from '@/contexts/TourContext';

const TOUR_NAME = 'user-management';

export const UserManagementTour = () => {
  const { isTourCompleted, isTourSkipped, completeTour, skipTour } = useTour();
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const tourSteps: TourStep[] = [
    {
      target: '[data-tour="user-list"]',
      title: 'User List',
      description: 'View all users here...',
      position: 'right',
    },
    // Add more steps...
  ];

  // Auto-show logic and handlers...
};
```

2. **Add data-tour attributes** to target elements:

```tsx
<div data-tour="user-list">
  {/* Your content */}
</div>
```

3. **Import and use** in your page:

```tsx
import { UserManagementTour } from '@/components/tour/UserManagementTour';

// In your component
<UserManagementTour />
```

## Best Practices

### Tour Step Design

✅ **Do:**
- Keep descriptions concise (1-2 sentences)
- Use action-oriented language ("Click here to...", "Change this to...")
- Highlight one element per step
- Order steps logically (top to bottom, left to right)
- Use 6-12 steps per tour (not too short, not too long)

❌ **Don't:**
- Write long paragraphs
- Highlight multiple elements in one step
- Skip crucial features
- Make tours too technical

### Positioning

Choose tooltip position to avoid covering the highlighted element:
- **top** - Tooltip above element (arrow points down)
- **bottom** - Tooltip below element (arrow points up)
- **left** - Tooltip left of element (arrow points right)
- **right** - Tooltip right of element (arrow points left)

### Testing

1. Clear browser localStorage
2. Create a new admin user
3. Visit the page with the tour
4. Verify tour shows automatically
5. Test all navigation (Next, Back, Skip)
6. Verify completion is saved

## Future Enhancements

Potential additions:
- 🎬 Video tutorials embedded in tours
- 🌐 Multi-language support
- 📱 Mobile-optimized tours
- 🎨 Tour for each major feature
- 📧 Email reminder for incomplete tours
- 🏆 Gamification (badges for completing tours)

## Database Schema

```javascript
UserTour {
  user_id: "uuid-here",
  completed_tours: ["branding-settings", "user-management"],
  skipped_tours: ["engagement-creation"],
  last_tour_date: "2025-11-05T12:00:00.000Z",
  createdAt: "2025-11-01T10:00:00.000Z",
  updatedAt: "2025-11-05T12:00:00.000Z"
}
```

## Support

The tour system is designed to be:
- **Client-friendly** - No technical knowledge required
- **Self-guided** - Users can explore at their own pace
- **Non-intrusive** - Can be skipped or dismissed
- **Professional** - Polished UI matching your brand

---

**Built for multi-client SaaS deployment** - Each client gets personalized onboarding based on their usage patterns.

