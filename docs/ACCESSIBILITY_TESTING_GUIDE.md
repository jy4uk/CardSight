# CardPilot Accessibility Testing Guide

**WCAG 2.0 AA Compliance Testing**  
**Date:** February 3, 2026

---

## Testing Overview

This guide provides comprehensive testing procedures to verify WCAG 2.0 AA compliance for the CardPilot frontend.

---

## 1. Keyboard Navigation Testing

### Test Procedure
1. **Disconnect mouse** or use keyboard only
2. **Tab through all interactive elements**
3. **Verify focus indicators** are visible
4. **Test all keyboard shortcuts**

### Checklist

#### General Navigation
- [ ] Tab moves focus forward through all interactive elements
- [ ] Shift+Tab moves focus backward
- [ ] Focus indicators are visible (3px solid outline + shadow)
- [ ] Focus order is logical and follows visual layout
- [ ] No keyboard traps (can escape from all components)

#### Buttons & Links
- [ ] Enter activates buttons and links
- [ ] Space activates buttons
- [ ] All buttons have visible focus state
- [ ] Icon-only buttons have aria-labels

#### Forms
- [ ] Tab moves between form fields
- [ ] Labels are associated with inputs
- [ ] Error messages are announced
- [ ] Required fields are indicated
- [ ] Form submission works via Enter key

#### Modals
- [ ] Focus moves to modal when opened
- [ ] Tab cycles only through modal elements
- [ ] Escape key closes modal
- [ ] Focus returns to trigger element on close
- [ ] Modal title is announced by screen reader

#### Dropdowns & Selects
- [ ] Arrow keys navigate options
- [ ] Enter/Space selects option
- [ ] Escape closes dropdown
- [ ] Selected option is announced

---

## 2. Screen Reader Testing

### Recommended Tools
- **macOS:** VoiceOver (Cmd+F5)
- **Windows:** NVDA (free) or JAWS
- **Chrome:** ChromeVox extension

### Test Procedure

#### VoiceOver (macOS)
```bash
# Enable VoiceOver
Cmd + F5

# Navigate
VO + Right Arrow (next item)
VO + Left Arrow (previous item)
VO + Space (activate)

# Rotor (navigate by headings, links, forms)
VO + U
```

### Checklist

#### Page Structure
- [ ] Page title is announced
- [ ] Headings are announced with level (h1, h2, h3)
- [ ] Heading hierarchy is logical
- [ ] Landmarks are announced (main, nav, section)
- [ ] Skip links are accessible

#### Forms
- [ ] All inputs have labels
- [ ] Labels are announced before input
- [ ] Required fields are announced
- [ ] Error messages are announced
- [ ] Field types are announced (email, tel, etc.)
- [ ] Placeholder text is not used as label

#### Buttons & Links
- [ ] Button purpose is clear from text/label
- [ ] Link destination is clear
- [ ] Icon-only buttons have aria-labels
- [ ] Loading states are announced
- [ ] Disabled state is announced

#### Images & Icons
- [ ] Decorative images have aria-hidden="true"
- [ ] Informative images have alt text
- [ ] Icons with meaning have aria-labels
- [ ] Icons with text have aria-hidden="true"

#### Dynamic Content
- [ ] Toast notifications are announced
- [ ] Error messages are announced
- [ ] Success messages are announced
- [ ] Loading states are announced
- [ ] Modal opening is announced

---

## 3. Mobile Touch Testing

### Test Devices
- **iOS:** iPhone (Safari)
- **Android:** Chrome/Samsung Browser
- **Tablet:** iPad/Android tablet

### Checklist

#### Touch Targets
- [ ] All buttons are at least 44x44px
- [ ] Sufficient spacing between tap targets (min 8px)
- [ ] No accidental taps on adjacent elements
- [ ] Touch targets extend beyond visual bounds if needed

#### Input Types
- [ ] Email inputs show email keyboard
- [ ] Tel inputs show phone keyboard
- [ ] Number inputs show numeric keyboard
- [ ] Decimal inputs show decimal keyboard
- [ ] Search inputs show search keyboard

#### Gestures
- [ ] Tap activates buttons/links
- [ ] Double-tap not required for any action
- [ ] Swipe gestures have keyboard alternatives
- [ ] Pinch-to-zoom works (not disabled)

#### Lists & Scrolling
- [ ] List items have adequate spacing (min 12px)
- [ ] Scrolling is smooth
- [ ] Pull-to-refresh works if implemented
- [ ] Bottom nav doesn't obscure content

---

## 4. Contrast Ratio Testing

### Tools
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Chrome DevTools Contrast Ratio](chrome://flags/#enable-experimental-web-platform-features)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### WCAG AA Requirements
- **Normal text:** 4.5:1 minimum
- **Large text (18pt+):** 3:1 minimum
- **UI components:** 3:1 minimum

### Test Colors

#### Light Mode
```css
/* Text on White Background */
--color-text-primary: #0f172a (on #ffffff) → 16.1:1 ✓
--color-text-secondary: #475569 (on #ffffff) → 8.6:1 ✓
--color-text-muted: #94a3b8 (on #ffffff) → 3.5:1 ⚠️ (check usage)

/* Accent Colors */
--color-accent: #6366f1 (on #ffffff) → 4.6:1 ✓
--color-success: #10b981 (on #ffffff) → 3.1:1 ⚠️
--color-error: #ef4444 (on #ffffff) → 3.9:1 ⚠️
```

#### Dark Mode
```css
/* Text on Dark Background */
--color-text-primary: #f1f5f9 (on #0f172a) → 15.5:1 ✓
--color-text-secondary: #cbd5e1 (on #1e293b) → 10.8:1 ✓
--color-text-muted: #64748b (on #1e293b) → 4.2:1 ⚠️

/* Accent Colors */
--color-accent: #818cf8 (on #0f172a) → 7.2:1 ✓
--color-success: #34d399 (on #0f172a) → 8.9:1 ✓
--color-error: #f87171 (on #0f172a) → 5.8:1 ✓
```

### Checklist
- [ ] All body text passes 4.5:1
- [ ] All headings pass 4.5:1
- [ ] Large text (18pt+) passes 3:1
- [ ] Button text passes 4.5:1
- [ ] Link text passes 4.5:1
- [ ] Form labels pass 4.5:1
- [ ] Error messages pass 4.5:1
- [ ] Focus indicators pass 3:1
- [ ] UI component borders pass 3:1
- [ ] Both light and dark modes tested

---

## 5. Component-Specific Testing

### IntakePage
- [ ] Skip link works (Tab → Enter)
- [ ] All 4 sections have proper headings
- [ ] "Record Purchase" button accessible
- [ ] "Record Trade" button accessible
- [ ] Keyboard navigation between sections

### AccountSettings
- [ ] Modal opens with focus on first input
- [ ] Tab navigation works in all tabs
- [ ] Profile form labels are associated
- [ ] Email input has type="email"
- [ ] CSV upload is keyboard accessible
- [ ] Delete account confirmation accessible
- [ ] Modal closes with Escape key
- [ ] Focus returns to trigger button

### InventoryCard
- [ ] Card actions are keyboard accessible
- [ ] Edit button has aria-label
- [ ] Delete button has aria-label
- [ ] View details button accessible
- [ ] Touch targets are 44x44px minimum

### TradeHistory
- [ ] List items have adequate spacing
- [ ] Trade details are keyboard accessible
- [ ] Delete button has confirmation
- [ ] Refresh button accessible
- [ ] Empty state is announced

### Modals (Login, Signup, AddItem, Trade)
- [ ] Focus trap works
- [ ] First input receives focus
- [ ] Tab cycles through modal only
- [ ] Escape closes modal
- [ ] Close button has aria-label
- [ ] Form validation is announced
- [ ] Error messages have role="alert"

---

## 6. Automated Testing

### Tools
- **axe DevTools** (Chrome/Firefox extension)
- **Lighthouse** (Chrome DevTools)
- **WAVE** (Web Accessibility Evaluation Tool)

### axe DevTools
```bash
# Install
Chrome Web Store → axe DevTools

# Run
1. Open DevTools (F12)
2. Click "axe DevTools" tab
3. Click "Scan ALL of my page"
4. Review violations
```

### Lighthouse
```bash
# Run Accessibility Audit
1. Open DevTools (F12)
2. Click "Lighthouse" tab
3. Select "Accessibility" only
4. Click "Analyze page load"
5. Target: 95+ score
```

### Expected Results
- **axe:** 0 violations, 0 serious issues
- **Lighthouse:** 95+ accessibility score
- **WAVE:** 0 errors, minimal alerts

---

## 7. Manual Inspection Checklist

### HTML Semantics
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Semantic HTML (button, a, nav, main, section)
- [ ] No div/span with onClick (use button)
- [ ] Form elements have labels
- [ ] Lists use ul/ol/li
- [ ] Tables use proper structure

### ARIA Usage
- [ ] aria-label on icon-only buttons
- [ ] aria-labelledby for sections
- [ ] aria-describedby for error messages
- [ ] aria-invalid on error fields
- [ ] aria-required on required fields
- [ ] aria-hidden on decorative icons
- [ ] aria-live for dynamic content
- [ ] role="alert" for errors
- [ ] role="dialog" for modals
- [ ] role="tab" for tabs

### Focus Management
- [ ] Focus indicators visible
- [ ] Focus order is logical
- [ ] No focus traps (except modals)
- [ ] Focus returns after modal close
- [ ] Skip links present on main pages

---

## 8. Browser & Device Matrix

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Chrome Android
- [ ] Samsung Internet

### Screen Readers
- [ ] VoiceOver + Safari (macOS/iOS)
- [ ] NVDA + Firefox (Windows)
- [ ] JAWS + Chrome (Windows)

---

## 9. Common Issues & Fixes

### Issue: Focus not visible
**Fix:** Check focus-visible styles in index.css

### Issue: Screen reader not announcing
**Fix:** Add aria-label or ensure proper label association

### Issue: Modal focus trap not working
**Fix:** Verify Modal component implementation

### Issue: Touch targets too small
**Fix:** Add touch-target class (min 44x44px)

### Issue: Contrast ratio failing
**Fix:** Adjust color values in CSS variables

### Issue: Form validation not announced
**Fix:** Add role="alert" to error messages

---

## 10. Testing Schedule

### Pre-Release
- [ ] Full keyboard navigation test
- [ ] Screen reader test (VoiceOver)
- [ ] Mobile touch test (iOS + Android)
- [ ] Contrast ratio verification
- [ ] Automated tools (axe + Lighthouse)

### Post-Release
- [ ] User feedback monitoring
- [ ] Accessibility bug reports
- [ ] Quarterly accessibility audit
- [ ] Update testing guide as needed

---

## 11. Success Criteria

### Minimum Requirements (WCAG 2.0 AA)
- ✓ All functionality keyboard accessible
- ✓ Focus indicators visible
- ✓ Contrast ratios meet 4.5:1 (normal text)
- ✓ Form labels properly associated
- ✓ Error messages announced
- ✓ Touch targets minimum 44x44px
- ✓ Screen reader compatible
- ✓ No keyboard traps

### Target Metrics
- **Lighthouse Score:** 95+
- **axe Violations:** 0
- **Manual Test Pass Rate:** 100%
- **User Feedback:** Positive accessibility reports

---

## 12. Resources

### Documentation
- [WCAG 2.0 Guidelines](https://www.w3.org/WAI/WCAG20/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)

### Training
- [Web Accessibility by Google](https://www.udacity.com/course/web-accessibility--ud891)
- [WebAIM Training](https://webaim.org/training/)

---

## Report Template

```markdown
# Accessibility Test Report
**Date:** [Date]
**Tester:** [Name]
**Environment:** [Browser/Device]

## Test Results
- Keyboard Navigation: [Pass/Fail]
- Screen Reader: [Pass/Fail]
- Touch Targets: [Pass/Fail]
- Contrast Ratios: [Pass/Fail]
- Automated Tools: [Score]

## Issues Found
1. [Issue description]
   - Severity: [Critical/High/Medium/Low]
   - Location: [Component/Page]
   - Fix: [Recommended fix]

## Overall Assessment
[Pass/Fail with notes]
```

---

**Testing is an ongoing process. Regular audits ensure continued compliance.**
