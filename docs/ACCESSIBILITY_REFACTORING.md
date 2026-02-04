# CardSight Frontend - WCAG 2.0 AA Accessibility Refactoring

**Status:** In Progress  
**Compliance Target:** WCAG 2.0 AA  
**Certification:** CPACC-aligned implementation

---

## Overview

Comprehensive accessibility refactoring to ensure CardSight meets WCAG 2.0 AA standards with full keyboard navigability and optimized mobile touch controls.

---

## Phase 1: Semantic Structure & ARIA ✅

### Completed
- ✅ Added `.sr-only` utility class for screen reader text
- ✅ Implemented high-contrast focus indicators (3px solid outline)
- ✅ Added focus-visible styles for buttons, links, inputs
- ✅ Created accessibility utility functions (`/utils/accessibility.js`)

### In Progress
- 🔄 Converting non-semantic interactive elements to proper HTML
- 🔄 Adding proper labels to all form inputs
- 🔄 Reviewing and fixing icon accessibility

### Components to Audit
1. **IntakePage.jsx** - Form inputs need labels
2. **AccountSettings.jsx** - Profile form accessibility
3. **AddItemModal.jsx** - Modal form labels
4. **TradeModal.jsx** - Complex form accessibility
5. **LoginModal.jsx** - Auth form labels
6. **SignupModal.jsx** - Registration form labels

---

## Phase 2: Keyboard Navigation & Focus Management

### Focus Trap Implementation
- ✅ Created `useFocusTrap` hook in accessibility utils
- ⏳ Implement in all modals:
  - LoginModal
  - SignupModal
  - AddItemModal
  - TradeModal
  - CardDetailsModal
  - SellModal
  - All insight modals

### Focus Management Requirements
- Focus moves to first input when modal opens
- Focus returns to trigger button when modal closes
- Tab cycles through modal elements only
- Escape key closes modal
- Focus indicators visible on all interactive elements

### Skip Links
- ⏳ Add "Skip to Main Content" on:
  - Inventory page
  - Insights page
  - Trade History page
  - Saved Deals page

---

## Phase 3: Mobile & Touch Optimization

### Touch Target Requirements (44x44px minimum)
- ⏳ Audit all buttons for minimum size
- ⏳ Use `-m-2 p-2` pattern to increase hit area
- ⏳ Increase spacing in:
  - TradeHistory list items
  - InventoryCard grid
  - SavedDeals list
  - Mobile bottom navigation

### Input Types for Mobile Keyboards
```jsx
// Price inputs
<input type="text" inputMode="decimal" />

// Quantity inputs
<input type="text" inputMode="numeric" />

// Phone numbers
<input type="tel" />

// Email
<input type="email" />

// Search
<input type="search" />
```

### Components Needing Input Type Updates
- IntakePage - price, quantity fields
- AddItemModal - price, quantity fields
- TradeModal - price, quantity fields
- AccountSettings - email field

---

## Phase 4: Contrast & Color Compliance

### Contrast Ratios (WCAG AA)
- **Normal text:** 4.5:1 minimum
- **Large text (18pt+):** 3:1 minimum
- **UI components:** 3:1 minimum

### Colors to Verify
```css
/* Light Mode */
--color-text-primary: #0f172a (on white) ✓
--color-text-secondary: #475569 (on white) ✓
--color-text-muted: #94a3b8 (on white) - CHECK
--color-accent: #6366f1 (on white) ✓

/* Dark Mode */
--color-text-primary: #f1f5f9 (on #0f172a) ✓
--color-text-secondary: #cbd5e1 (on #1e293b) ✓
--color-text-muted: #64748b (on #1e293b) - CHECK
```

### Action Items
- ⏳ Verify muted text contrast ratios
- ⏳ Test all badge colors
- ⏳ Verify button states (hover, disabled)
- ⏳ Check price display colors

---

## Component Refactoring Checklist

### High Priority (User-facing forms)
- [ ] **IntakePage.jsx**
  - Add labels to all inputs
  - Update input types for mobile
  - Ensure 44px touch targets
  - Add skip link

- [ ] **AccountSettings.jsx**
  - Add labels to profile form
  - Update email input type
  - CSV upload accessibility
  - Delete account confirmation

- [ ] **AddItemModal.jsx**
  - Implement focus trap
  - Add labels to all inputs
  - Update input types
  - Ensure keyboard navigation

- [ ] **TradeModal.jsx**
  - Implement focus trap
  - Complex form accessibility
  - Item selection keyboard support
  - Update input types

### Medium Priority (Navigation & Lists)
- [ ] **InventoryCard.jsx**
  - Convert action buttons to semantic elements
  - Add ARIA labels to icon buttons
  - Increase touch targets
  - Keyboard navigation for actions

- [ ] **TradeHistory.jsx**
  - Increase list item spacing
  - Add ARIA labels to actions
  - Keyboard navigation
  - Skip link

- [ ] **SavedDeals.jsx**
  - List accessibility
  - Action button labels
  - Keyboard navigation

### Low Priority (Modals & Overlays)
- [ ] **LoginModal.jsx**
  - Implement focus trap
  - Add labels
  - Error announcements

- [ ] **SignupModal.jsx**
  - Implement focus trap
  - Add labels
  - Validation announcements

- [ ] **All Insight Modals**
  - Focus trap implementation
  - Keyboard navigation
  - Close button accessibility

---

## Icon Accessibility Pattern

### Decorative Icons
```jsx
<Icon className="..." aria-hidden="true" />
```

### Interactive Icon-Only Buttons
```jsx
<button type="button" aria-label="Edit item">
  <Pencil className="w-5 h-5" aria-hidden="true" />
</button>
```

### Icons with Visible Text
```jsx
<button type="button">
  <Plus className="w-5 h-5" aria-hidden="true" />
  <span>Add Item</span>
</button>
```

---

## Toast Notification Accessibility

### Current Implementation
```jsx
import { toast } from 'react-hot-toast';
```

### Required Enhancement
```jsx
// Toaster should have role="status" or role="alert"
<Toaster
  position="top-center"
  toastOptions={{
    // Ensure announcements to screen readers
    ariaProps: {
      role: 'status',
      'aria-live': 'polite',
    },
  }}
/>
```

---

## Testing Checklist

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Shift+Tab reverses navigation
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Arrow keys work in dropdowns/lists
- [ ] Focus visible on all elements

### Screen Reader Testing
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Buttons have descriptive text
- [ ] Status messages announced
- [ ] Error messages announced
- [ ] Modal titles announced

### Mobile Touch Testing
- [ ] All buttons at least 44x44px
- [ ] Sufficient spacing between tap targets
- [ ] No hover-only functionality
- [ ] Correct keyboard types appear
- [ ] Zoom doesn't break layout

### Contrast Testing
- [ ] All text passes 4.5:1 (normal)
- [ ] Large text passes 3:1
- [ ] UI components pass 3:1
- [ ] Focus indicators visible
- [ ] Both light and dark modes tested

---

## Implementation Priority

1. **Critical** - Form accessibility (IntakePage, AccountSettings)
2. **High** - Modal focus traps and keyboard navigation
3. **High** - Touch target sizing for mobile
4. **Medium** - Icon accessibility labels
5. **Medium** - Skip links on main pages
6. **Low** - Enhanced toast announcements

---

## Resources

- [WCAG 2.0 Guidelines](https://www.w3.org/WAI/WCAG20/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Inclusive Components](https://inclusive-components.design/)

---

## Progress Tracking

**Phase 1:** 30% Complete  
**Phase 2:** 10% Complete  
**Phase 3:** 5% Complete  
**Phase 4:** 0% Complete  

**Overall:** 15% Complete
