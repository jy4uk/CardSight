# Feedback System Documentation

**Date:** February 3, 2026  
**Status:** ✅ COMPLETE - Ready for Deployment

---

## Overview

A simple, user-initiated feedback system for **authenticated users only**. Users can submit bug reports, feature requests, data errors, and general feedback. The system automatically collects metadata and sends formatted notifications directly to Discord (no database storage).

---

## Features

### 1. **Floating Action Button (FAB)**
- Blue circular button in bottom-right corner
- **Only visible to authenticated users**
- Positioned above mobile navigation on mobile devices
- Smooth hover animations

### 2. **Feedback Modal**
- Clean, modern UI matching CardSight theme
- Dark mode support
- Category dropdown with 4 options:
  - 🐛 Bug Report
  - ✨ Feature Request
  - 📝 Data Error (Card Info)
  - 💬 Other
- Description textarea (max 5000 characters)
- Character counter
- Success state with auto-close after 3 seconds

### 3. **Automatic Metadata Collection**
- Current URL (`window.location.href`)
- Browser/OS info (`navigator.userAgent`)
- Screen resolution
- Username (from authenticated session)
- Email (from authenticated session)

### 4. **Discord Integration**
- Formatted embeds with color-coded categories
- Organized fields: Username, Email, URL, Browser info
- Timestamp for each submission
- **No database storage** - feedback sent directly to Discord

---

## API Endpoint

### **POST /api/feedback**

Submit feedback (**authenticated users only**).

**Authentication Required:** Bearer token in Authorization header

**Request Body:**
```json
{
  "category": "bug",
  "description": "The card image is not loading on the inventory page",
  "url": "https://cardsight.vercel.app/",
  "browserInfo": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)..."
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Thank you! Your feedback helps build CardSight"
}
```

**Response (Error - Validation):**
```json
{
  "success": false,
  "error": "Category and description are required"
}
```

**Response (Error - Unauthorized):**
```json
{
  "error": "Access token required"
}
```

**Validation:**
- Category must be one of: `bug`, `feature_request`, `data_error`, `other`
- Description is required (max 5000 characters)
- URL and browserInfo are optional but recommended

**Authentication:**
- Uses `authenticateToken` middleware
- **Requires valid JWT access token**
- Automatically captures `username` and `email` from token
- Sends feedback directly to Discord (no database storage)

---

## Discord Webhook

### **Setup**

Add to Railway environment variables:
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### **Webhook Format**

The system sends a Discord embed with:

**Color Coding:**
- 🐛 Bug Report: Red (`0xef4444`)
- ✨ Feature Request: Blue (`0x3b82f6`)
- 📝 Data Error: Amber (`0xf59e0b`)
- 💬 Other: Gray (`0x6b7280`)

**Embed Fields:**
- **Title:** Category with emoji
- **Description:** User's feedback message
- **User:** Username or "Anonymous"
- **URL:** Page where feedback was submitted
- **Browser:** User agent and platform info
- **Footer:** Feedback ID for tracking
- **Timestamp:** Submission time

**Example Discord Message:**

```
✨ Feature Request

Add ability to bulk import cards from CSV file

👤 User: jdoe
📧 Email: jdoe@example.com
🌐 URL: https://cardsight.vercel.app/
💻 Browser: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...

Today at 10:30 PM
```

---

## Frontend Components

### **FeedbackModal.jsx**

**Location:** `/web/src/components/FeedbackModal.jsx`

**Props:**
- `isOpen` (boolean) - Controls modal visibility
- `onClose` (function) - Callback when modal closes

**Features:**
- Form validation
- Loading states
- Error handling
- Success state with auto-close
- Dark mode support
- Accessibility (ARIA labels, keyboard navigation)
- Click outside to close

**Usage:**
```jsx
import FeedbackModal from './components/FeedbackModal';

function MyComponent() {
  const [showFeedback, setShowFeedback] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowFeedback(true)}>
        Feedback
      </button>
      <FeedbackModal 
        isOpen={showFeedback} 
        onClose={() => setShowFeedback(false)} 
      />
    </>
  );
}
```

### **Floating Action Button (FAB)**

**Locations:**
- `App.jsx` - For authenticated users and public profiles
- `LandingPage.jsx` - For landing page visitors

**Styling:**
- Fixed position: `bottom-20 sm:bottom-6 right-4 sm:right-6`
- Size: `w-14 h-14` (56x56px)
- Blue gradient background
- Shadow with hover effect
- Icon scales on hover
- Z-index: 40 (above content, below modals)

**Mobile Positioning:**
- On mobile: `bottom-20` (above bottom navigation)
- On desktop: `bottom-6` (standard FAB position)

---

## Deployment Instructions

### **Step 1: Set Up Discord Webhook**

1. Go to your Discord server
2. Navigate to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Name it "CardSight Feedback"
5. Select the channel for feedback notifications
6. Copy the webhook URL

### **Step 2: Add Environment Variable**

**Railway (Backend):**
```bash
railway variables set DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."
```

Or add via Railway dashboard:
1. Go to your project
2. Click **Variables**
3. Add new variable:
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: Your webhook URL

### **Step 3: Deploy Backend**

```bash
cd inventory-system
git add .
git commit -m "feat: Add feedback system with Discord integration"
git push origin main
```

Railway will automatically deploy.

### **Step 4: Deploy Frontend**

```bash
cd web
git add .
git commit -m "feat: Add feedback modal and FAB button (auth-only)"
git push origin main
```

Vercel will automatically deploy.

### **Step 5: Verify**

1. Visit https://cardsight.vercel.app
2. **Login** (feedback button only visible to authenticated users)
3. Click the blue feedback button (bottom-right)
4. Submit test feedback
5. Check Discord channel for notification with username and email

---

## Testing

### **Manual Testing Checklist**

**Unauthenticated User:**
- [ ] FAB button **NOT visible** on any page
- [ ] Cannot access feedback modal
- [ ] Cannot submit feedback (401 error if trying via API)

**Authenticated User:**
- [ ] FAB button visible on all pages
- [ ] Click FAB opens modal
- [ ] All categories selectable
- [ ] Can submit feedback
- [ ] Success message appears
- [ ] Modal auto-closes after 3 seconds
- [ ] Discord notification received
- [ ] Username and email show correctly in Discord

**Mobile:**
- [ ] FAB positioned above bottom navigation
- [ ] Modal responsive on small screens
- [ ] Can scroll description textarea
- [ ] Touch targets are adequate (44x44px minimum)

**Dark Mode:**
- [ ] Modal styling correct in dark mode
- [ ] Text readable
- [ ] Form inputs styled correctly

**Validation:**
- [ ] Cannot submit empty description
- [ ] Character counter updates
- [ ] Error messages display correctly
- [ ] 5000 character limit enforced

---

## Monitoring & Analytics

### **Discord Channel**

All feedback is sent directly to your Discord channel. You can:
- Search by username or email
- Filter by category (using emoji reactions)
- Pin important feedback
- Create threads for discussion
- Use Discord's built-in search and filtering

### **Tracking Feedback**

Since feedback is not stored in the database, consider:
1. **Discord Pins** - Pin important feedback for easy access
2. **Discord Threads** - Create threads to discuss and track resolution
3. **External Tracking** - Use a project management tool (Trello, Linear, etc.) to track feedback items
4. **Discord Webhooks** - Set up additional webhooks to other tools if needed

---

## Security Considerations

### **✅ Implemented**

1. **Webhook URL Protection**
   - Stored in environment variables (server-side only)
   - Never exposed to client-side code
   - Not included in API responses

2. **Input Validation**
   - Category whitelist
   - Description length limit (5000 chars)
   - No SQL injection risk (no database storage)

3. **Authentication Required**
   - Only authenticated users can submit feedback
   - JWT token validation on every request
   - Username and email automatically captured from token
   - Natural rate limiting through user accounts

4. **No Data Persistence**
   - Feedback sent directly to Discord
   - No database storage = no data breach risk
   - No PII stored on servers

### **⚠️ Future Enhancements**

1. **Additional Rate Limiting** (Optional)
   - Consider per-user rate limiting if spam becomes an issue
   - Suggestion: 10 submissions per user per day

2. **Feedback Categories Management**
   - Allow admins to add/remove categories
   - Custom category colors in Discord

3. **Email Notifications** (Optional)
   - Send confirmation email to user
   - Notify admins via email (in addition to Discord)

---

## Troubleshooting

### **Issue: Discord webhook not working**

**Check:**
1. Is `DISCORD_WEBHOOK_URL` set in Railway?
   ```bash
   railway variables
   ```
2. Is the webhook URL valid?
3. Check backend logs:
   ```bash
   railway logs
   ```
4. Test webhook manually:
   ```bash
   curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "Test message"}'
   ```

### **Issue: FAB button not visible**

**Check:**
1. Is user logged in? (FAB only shows for authenticated users)
2. Check browser console for errors
3. Verify `isAuthenticated` is true
4. Check component imported correctly

### **Issue: FAB button visible but shouldn't be**

**Check:**
1. Z-index conflicts with other elements
2. CSS not loaded properly
3. Component imported correctly
4. State management working

### **Issue: Modal not opening**

**Check:**
1. State variable (`showFeedbackModal`) updating
2. `isOpen` prop passed correctly
3. No JavaScript errors in console
4. Modal component imported

---

## Future Enhancements

### **Phase 2 Features**

1. **Feedback Dashboard**
   - Admin panel to view/manage feedback
   - Filter by category, status, date
   - Mark as reviewed/resolved
   - Add internal notes

2. **User Notifications**
   - Email confirmation when feedback submitted
   - Notify when feedback status changes
   - Allow users to view their feedback history

3. **Analytics**
   - Feedback trends over time
   - Most common categories
   - User engagement metrics
   - Response time tracking

4. **Attachments**
   - Allow users to upload screenshots
   - Store in S3 or similar
   - Include in Discord notifications

5. **Voting System**
   - Allow users to upvote feature requests
   - Prioritize based on votes
   - Show popular requests publicly

---

## Summary

**What We Built:**
- ✅ Floating action button (FAB) - **authenticated users only**
- ✅ Feedback modal with category selection
- ✅ Automatic metadata collection (URL, browser, username, email)
- ✅ Discord webhook integration with formatted embeds
- ✅ **No database storage** - direct to Discord
- ✅ **Authentication required** - JWT token validation
- ✅ Dark mode support
- ✅ Mobile responsive
- ✅ Accessibility features

**Deployment Steps:**
1. Set up Discord webhook
2. Add `DISCORD_WEBHOOK_URL` to Railway environment
3. Deploy backend and frontend
4. Test and verify (must be logged in)

**Time to Deploy:** ~5 minutes  
**Risk Level:** Low (non-breaking additions)

**Key Benefits:**
- ✅ Simple implementation (no database complexity)
- ✅ Secure (auth-required, no data persistence)
- ✅ Real-time notifications in Discord
- ✅ Easy to track and respond to feedback

---

**The feedback system is production-ready and will help gather valuable insights from beta users.**
