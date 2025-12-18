# Manual Testing Guide

This document provides comprehensive test cases for manually testing all features of the URL Shortener application.

## Prerequisites

Before testing, ensure:
1. The dev server is running: `npm run dev`
2. Database is synced: `npm run db:push`
3. Environment variables are configured in `.env`

---

## 1. Authentication

### 1.1 Registration

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Register with valid data | 1. Go to `/en/register`<br>2. Enter name, email, password<br>3. Click "Sign Up" | Account created, redirect to dashboard |
| Register with existing email | 1. Try to register with an already used email | Error message: "Email already exists" |
| Register with weak password | 1. Enter password < 8 chars | Validation error shown |
| Password requirements | 1. Check password field shows requirements | Must show: 8+ chars, uppercase, lowercase, number |
| Confirm password mismatch | 1. Enter different passwords | Error: "Passwords do not match" |
| Empty form submission | 1. Click "Sign Up" without filling fields | All required field errors shown |

### 1.2 Login

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Login with valid credentials | 1. Go to `/en/login`<br>2. Enter email/password<br>3. Click "Sign In" | Redirect to dashboard |
| Login with wrong password | 1. Enter wrong password | Error: "Invalid credentials" |
| Login with non-existent email | 1. Enter unregistered email | Error: "Invalid credentials" |
| OAuth - Google | 1. Click "Continue with Google"<br>2. Complete OAuth flow | Account created/logged in |
| OAuth - GitHub | 1. Click "Continue with GitHub"<br>2. Complete OAuth flow | Account created/logged in |
| Remember me | 1. Check "Remember me"<br>2. Login<br>3. Close browser, reopen | Session persists |

### 1.3 Logout

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Logout | 1. Click user menu<br>2. Click "Sign Out" | Redirected to homepage |
| Session expiry | 1. Wait for session timeout | Prompted to re-login |

---

## 2. URL Shortening

### 2.1 Basic Shortening

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Shorten valid URL | 1. Go to homepage<br>2. Enter `https://example.com`<br>3. Click "Shorten URL" | Short URL generated (7-char code) |
| Shorten URL without protocol | 1. Enter `example.com` | Auto-adds https://, generates short URL |
| Invalid URL | 1. Enter `not-a-url` | Error: "Please enter a valid URL" |
| Empty URL | 1. Click "Shorten" without URL | Error: "URL is required" |
| Very long URL | 1. Enter URL > 2048 chars | Error: "URL too long" |
| Copy to clipboard | 1. Shorten a URL<br>2. Click "Copy Link" | URL copied, success message |
| Create another | 1. Shorten a URL<br>2. Click "Create Another" | Form resets for new URL |

### 2.2 Custom Alias

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Valid custom alias | 1. Click "Customize"<br>2. Enter alias: `my-link`<br>3. Shorten | Short URL with custom alias |
| Alias too short | 1. Enter alias: `ab` (< 3 chars) | Error: "Alias must be at least 3 characters" |
| Alias too long | 1. Enter alias > 50 chars | Error: "Alias must be less than 50 characters" |
| Invalid characters | 1. Enter alias: `my@link!` | Error: "Only letters, numbers, hyphens allowed" |
| Duplicate alias | 1. Use an existing alias | Error: "Alias already taken" |
| Reserved words | 1. Try alias: `api`, `admin`, `dashboard` | Error: "Reserved alias" |

### 2.3 Password Protection

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create protected link | 1. Enable password protection<br>2. Set password<br>3. Shorten | Link created with lock icon |
| Access protected link | 1. Visit short URL<br>2. Enter correct password | Redirect to destination |
| Wrong password | 1. Enter wrong password | Error: "Incorrect password" |
| Empty password on protected link | 1. Click "Access" without password | Error: "Password required" |

### 2.4 Link Expiration

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Set expiration date | 1. Enable expiration<br>2. Set future date<br>3. Shorten | Link shows expiration date |
| Access expired link | 1. Set expiration in past<br>2. Try to access | Error: "Link has expired" |
| No expiration (default) | 1. Create link without expiration | Link works indefinitely |

---

## 3. Bulk URL Shortening

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Bulk shorten valid URLs | 1. Go to `/en/bulk`<br>2. Enter 5 URLs (one per line)<br>3. Click "Shorten All" | All 5 URLs shortened |
| Mixed valid/invalid URLs | 1. Enter 3 valid + 2 invalid URLs | Valid ones shortened, errors for invalid |
| Exceed limit (100) | 1. Enter 101 URLs | Error: "Maximum 100 URLs per batch" |
| Download results | 1. Bulk shorten<br>2. Click "Download All" | CSV file downloaded |
| Copy all results | 1. Bulk shorten<br>2. Click "Copy All" | All short URLs copied |
| Empty input | 1. Click "Shorten All" without URLs | Error shown |

---

## 4. Dashboard

### 4.1 Link List

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View links | 1. Go to `/en/dashboard` | All user's links displayed |
| Empty state | 1. New user with no links | "No links yet" message + CTA |
| Link card info | 1. View any link card | Shows: short URL, original, clicks, date |
| Pagination | 1. Have > 10 links<br>2. Scroll or click "Load more" | More links loaded |

### 4.2 Search & Filter

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Search by URL | 1. Enter part of URL in search | Matching links shown |
| Search by alias | 1. Enter custom alias in search | Matching link shown |
| Filter by status - All | 1. Click "All" filter | All links shown |
| Filter by status - Active | 1. Click "Active" filter | Only non-expired links |
| Filter by status - Expired | 1. Click "Expired" filter | Only expired links |
| Filter - Password Protected | 1. Click "Password Protected" | Only protected links |
| Sort by Date | 1. Select "Sort by Date" | Newest first |
| Sort by Clicks | 1. Select "Sort by Clicks" | Most clicks first |
| Sort Alphabetical | 1. Select "Alphabetical" | A-Z order |

### 4.3 Link Actions

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Copy link | 1. Click copy icon on link card | URL copied, toast shown |
| View QR code | 1. Click QR icon | QR code modal appears |
| Download QR - PNG | 1. Open QR modal<br>2. Click "Download PNG" | PNG file downloaded |
| Download QR - SVG | 1. Open QR modal<br>2. Click "Download SVG" | SVG file downloaded |
| Edit link | 1. Click edit icon<br>2. Modify fields<br>3. Save | Changes saved |
| Delete link | 1. Click delete icon<br>2. Confirm | Link deleted |
| View stats | 1. Click stats icon | Navigate to stats page |

---

## 5. Link Statistics

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View stats page | 1. Go to link stats page | Overview cards shown |
| Total clicks | 1. View "Total Clicks" card | Correct count displayed |
| Unique visitors | 1. View "Unique Visitors" card | Unique count shown |
| Last click time | 1. View "Last Click" card | Timestamp shown |
| Clicks over time chart | 1. View chart | Line/bar chart with dates |
| Top countries | 1. View countries section | List with flags and counts |
| Device breakdown | 1. View devices | Desktop/Mobile/Tablet % |
| Browser breakdown | 1. View browsers | Chrome/Firefox/Safari etc. |
| OS breakdown | 1. View operating systems | Windows/Mac/iOS/Android etc. |
| Top referrers | 1. View referrers | Source URLs listed |
| Period filter - 7 days | 1. Select "Last 7 days" | Data for last week |
| Period filter - 30 days | 1. Select "Last 30 days" | Data for last month |
| Period filter - All time | 1. Select "All time" | All historical data |
| Export CSV | 1. Click "Export CSV" | CSV file downloaded |
| Export JSON | 1. Click "Export JSON" | JSON file downloaded |
| Empty stats | 1. View stats for link with 0 clicks | "No data yet" message |

---

## 6. QR Code Generation

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Generate QR | 1. Create link<br>2. Click QR icon | QR code displayed |
| QR size options | 1. Change size slider | QR size updates |
| QR color change | 1. Select foreground color | QR color updates |
| QR background change | 1. Select background color | Background updates |
| QR with margin | 1. Toggle "Include margin" | Margin added/removed |
| Scan QR code | 1. Generate QR<br>2. Scan with phone | Opens short URL |
| Download QR | 1. Click "Download" | Image downloaded |

---

## 7. Folders (Link Organization)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create folder | 1. Click "New Folder"<br>2. Enter name and color<br>3. Save | Folder created |
| Edit folder | 1. Click folder options<br>2. Edit name/color<br>3. Save | Changes saved |
| Delete folder | 1. Click delete on folder<br>2. Confirm | Folder deleted, links moved to uncategorized |
| Move link to folder | 1. On link, click "Move to Folder"<br>2. Select folder | Link moved |
| Remove from folder | 1. Click "Remove from Folder" | Link uncategorized |
| View folder links | 1. Click on folder | Only folder's links shown |
| Folder link count | 1. View folder | Shows "{count} links" |
| All Links view | 1. Click "All Links" | All links regardless of folder |

---

## 8. Tags

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Add tag to link | 1. Edit link<br>2. Add tag<br>3. Save | Tag appears on link |
| Remove tag | 1. Click X on tag | Tag removed |
| Filter by tag | 1. Click on a tag | Links with that tag shown |
| Multiple tags | 1. Add multiple tags to link | All tags displayed |
| Tag autocomplete | 1. Start typing existing tag | Suggestions shown |

---

## 9. Custom Domains

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Add domain | 1. Go to `/en/domains`<br>2. Enter domain<br>3. Submit | Domain added (unverified) |
| DNS verification | 1. Add TXT record as instructed<br>2. Click "Verify" | Domain verified |
| SSL provisioning | 1. After verification | SSL status shows progress |
| Use custom domain | 1. Create link<br>2. Select custom domain | Link uses your domain |
| Delete domain | 1. Click delete<br>2. Confirm | Domain removed |
| Invalid domain format | 1. Enter `not-valid` | Error: "Invalid domain" |
| Domain already in use | 1. Add already registered domain | Error: "Domain already registered" |
| Domain limit (per plan) | 1. Exceed plan's domain limit | Error: "Limit reached" |

---

## 10. Link Targeting

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Add device rule | 1. Edit link targeting<br>2. Add rule: Mobile -> URL1 | Rule saved |
| Add country rule | 1. Add rule: US -> URL1 | Rule saved |
| Add browser rule | 1. Add rule: Chrome -> URL1 | Rule saved |
| Test mobile redirect | 1. Access link from mobile device | Redirects to mobile URL |
| Test desktop redirect | 1. Access from desktop | Redirects to desktop URL |
| Default fallback | 1. Access from non-matching device | Goes to default URL |
| Delete rule | 1. Delete targeting rule | Rule removed |
| Rule priority | 1. Add multiple rules<br>2. Reorder | Higher priority matched first |

---

## 11. A/B Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create A/B test | 1. Go to link's A/B test<br>2. Add variants<br>3. Set weights<br>4. Start | Test active |
| Variant weights | 1. Set 70/30 split | Traffic distributed accordingly |
| View stats | 1. Click "View Statistics" | Clicks per variant shown |
| Pause test | 1. Click "Pause Test" | Test paused, default URL used |
| Resume test | 1. Click "Resume Test" | Test active again |
| End test | 1. Click "End Test" | Test ended, winner shown |
| Reset stats | 1. Click "Reset Statistics" | All counts reset to 0 |
| Min 2 variants | 1. Try creating with 1 variant | Error: "At least 2 variants required" |

---

## 12. Link Cloaking

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Enable iframe cloaking | 1. Edit link<br>2. Enable cloaking: iFrame | URL stays in address bar |
| Enable JS redirect | 1. Enable cloaking: JavaScript | JS redirect, URL hidden |
| Enable meta refresh | 1. Enable cloaking: Meta Refresh | Meta tag redirect |
| Custom title | 1. Set custom page title | Title shows in browser tab |
| Custom favicon | 1. Set favicon URL | Custom favicon displayed |
| Disable cloaking | 1. Toggle off cloaking | Normal redirect behavior |

---

## 13. Deep Linking

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Configure iOS deep link | 1. Edit link<br>2. Set iOS app scheme + fallback | Config saved |
| Configure Android deep link | 1. Set Android app scheme + fallback | Config saved |
| Test iOS redirect | 1. Access from iPhone<br>2. App installed | Opens in app |
| Test iOS fallback | 1. Access from iPhone<br>2. App not installed | Goes to App Store |
| Test Android redirect | 1. Access from Android | Opens in app or Play Store |
| Desktop fallback | 1. Access from desktop | Goes to web URL |

---

## 14. Bio Pages (Link-in-Bio)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create bio page | 1. Go to `/en/bio`<br>2. Enter username, title, bio<br>3. Save | Bio page created |
| Set profile picture | 1. Upload or enter avatar URL | Image displayed |
| Add links | 1. Click "Add Link"<br>2. Enter title and URL | Link added to page |
| Reorder links | 1. Drag and drop links | Order updated |
| Remove link | 1. Click remove on link | Link deleted |
| Change theme | 1. Select different theme | Theme applied |
| Custom CSS (Pro+) | 1. Add custom CSS | Styles applied |
| Preview page | 1. Click "Preview" | Opens bio page |
| Copy bio link | 1. Click "Copy Link" | URL copied |
| View bio stats | 1. View page stats | Views and click stats |
| Duplicate slug | 1. Use existing username | Error: "Username taken" |
| Invalid slug | 1. Use special characters | Error: "Invalid format" |

---

## 15. Retargeting Pixels

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Add Facebook Pixel | 1. Create pixel<br>2. Select Facebook<br>3. Enter Pixel ID | Pixel saved |
| Add Google Analytics | 1. Select GA4<br>2. Enter Measurement ID | Pixel saved |
| Add TikTok Pixel | 1. Select TikTok<br>2. Enter Pixel ID | Pixel saved |
| Invalid pixel ID | 1. Enter wrong format | Validation error |
| Attach pixel to link | 1. Edit link<br>2. Add pixel | Pixel attached |
| Remove pixel from link | 1. Remove pixel | Pixel detached |
| Pixel fires on click | 1. Click link with pixel<br>2. Check network tab | Pixel request sent |
| Delete pixel | 1. Delete pixel | Removed from all links |

---

## 16. Webhooks

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create webhook | 1. Go to webhooks<br>2. Enter URL and events<br>3. Save | Webhook created |
| Select events | 1. Choose events to subscribe | Events selected |
| Copy secret | 1. Click "Copy Secret" | Secret copied |
| Regenerate secret | 1. Click "Regenerate"<br>2. Confirm | New secret generated |
| Test webhook | 1. Click "Send Test" | Test payload sent |
| View logs | 1. Click "View Logs" | Delivery history shown |
| Pause webhook | 1. Toggle status off | Webhook paused |
| Delete webhook | 1. Delete and confirm | Webhook removed |
| Verify signature | 1. Receive webhook<br>2. Verify HMAC | Signature valid |

---

## 17. Workspaces (Team Collaboration)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create workspace | 1. Go to workspaces<br>2. Create new | Workspace created |
| Invite member | 1. Click "Invite"<br>2. Enter email and role<br>3. Send | Invitation sent |
| Accept invitation | 1. Click link in email<br>2. Accept | Joined workspace |
| Decline invitation | 1. Click decline | Invitation rejected |
| Change member role | 1. Select member<br>2. Change role | Role updated |
| Remove member | 1. Click remove<br>2. Confirm | Member removed |
| Leave workspace | 1. Click "Leave" | Left workspace |
| Transfer ownership | 1. As owner, transfer to admin | Ownership transferred |
| Delete workspace | 1. As owner, delete | Workspace deleted |
| Role permissions | 1. Test VIEWER can only view<br>2. MEMBER can create<br>3. ADMIN can manage | Permissions enforced |

---

## 18. Zapier Integration

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create subscription | 1. Enter Zapier webhook URL<br>2. Select event<br>3. Subscribe | Subscription active |
| Link created trigger | 1. Create a link | Zapier receives event |
| Link clicked trigger | 1. Click a link | Zapier receives event |
| Delete subscription | 1. Delete subscription | Unsubscribed |
| Invalid webhook URL | 1. Enter invalid URL | Validation error |

---

## 19. Browser Extension

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Create extension token | 1. Go to extension settings<br>2. Create token | Token displayed once |
| Copy token | 1. Click copy | Token copied |
| Revoke token | 1. Click "Revoke"<br>2. Confirm | Token invalidated |
| Token last used | 1. Use token<br>2. Check dashboard | "Last used" updated |
| Extension auth | 1. Enter token in extension | Successfully connected |
| Shorten via extension | 1. Click extension icon<br>2. Shorten current page | URL shortened |

---

## 20. Pricing & Subscriptions

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| View pricing page | 1. Go to `/en/pricing` | All plans displayed |
| Toggle monthly/yearly | 1. Click billing toggle | Prices update |
| Subscribe to plan | 1. Click "Upgrade"<br>2. Complete Stripe checkout | Plan active |
| Manage subscription | 1. Click "Manage Subscription" | Stripe portal opens |
| Cancel subscription | 1. Cancel in portal | Downgraded at period end |
| Plan limits enforced | 1. Try to exceed link limit | Error: "Limit reached" |
| Usage dashboard | 1. View usage stats | Current usage shown |

---

## 21. Internationalization (i18n)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Switch to English | 1. Click language selector<br>2. Choose English | UI in English |
| Switch to Arabic | 1. Choose Arabic | UI in Arabic, RTL layout |
| URL locale prefix | 1. Check URL | Shows `/en/` or `/ar/` |
| Persist language | 1. Change language<br>2. Navigate | Language persists |
| RTL layout | 1. View in Arabic | Text right-aligned, layout mirrored |

---

## 22. Theme (Dark/Light Mode)

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Switch to dark mode | 1. Click theme toggle | Dark theme applied |
| Switch to light mode | 1. Click toggle again | Light theme applied |
| System preference | 1. Set to "System" | Follows OS setting |
| Theme persists | 1. Change theme<br>2. Refresh page | Theme remembered |

---

## 23. API Endpoints

### 23.1 Shorten API

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| POST /api/shorten | 1. Send valid URL | 200 + short URL |
| Missing URL | 1. Send empty body | 400 error |
| Invalid URL | 1. Send malformed URL | 400 error |
| Rate limited | 1. Exceed rate limit | 429 error |
| Unauthorized | 1. No auth header | 401 error |

### 23.2 Links API

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| GET /api/links | 1. Fetch user's links | 200 + links array |
| GET /api/links/[id] | 1. Fetch specific link | 200 + link details |
| PUT /api/links/[id] | 1. Update link | 200 + updated link |
| DELETE /api/links/[id] | 1. Delete link | 200 success |
| Link not found | 1. Get non-existent ID | 404 error |
| Unauthorized | 1. Access other's link | 403 error |

### 23.3 Redirect API

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| GET /api/r/[code] | 1. Access short code | 302 redirect |
| Invalid code | 1. Non-existent code | 404 error |
| Expired link | 1. Access expired | 410 gone |
| Password required | 1. Access protected | Password prompt |

---

## 24. Security Testing

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| SSRF protection | 1. Try shortening `http://localhost` | Blocked |
| XSS in alias | 1. Try alias: `<script>alert(1)</script>` | Sanitized/rejected |
| SQL injection | 1. Try SQL in inputs | Properly escaped |
| CSRF protection | 1. Try cross-site request | Blocked |
| Rate limiting | 1. Send 100+ requests quickly | 429 after limit |
| Password hashing | 1. Check DB | Passwords are hashed |
| Session security | 1. Check cookies | HttpOnly, Secure flags |

---

## 25. Error Handling

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Network error | 1. Disable network<br>2. Try action | Error message shown |
| Server error | 1. Trigger 500 error | Error boundary shown |
| 404 page | 1. Go to invalid route | 404 page displayed |
| Form validation | 1. Submit invalid data | Inline errors shown |
| Toast notifications | 1. Complete actions | Success/error toasts |

---

## 26. Performance

| Test Case | Steps | Expected Result |
|-----------|-------|-----------------|
| Page load time | 1. Measure initial load | < 3 seconds |
| Link shortening speed | 1. Time API response | < 500ms |
| Dashboard with 100+ links | 1. Load dashboard | Smooth scrolling |
| Redirect speed | 1. Time redirect | < 100ms |
| Image optimization | 1. Check images | WebP/optimized formats |

---

## Quick Test Checklist

For rapid verification after deployments:

- [ ] Homepage loads
- [ ] Can shorten a URL
- [ ] Can login/logout
- [ ] Dashboard shows links
- [ ] Can view link stats
- [ ] QR code generates
- [ ] Language switching works
- [ ] Dark/light mode works
- [ ] Redirect works
- [ ] API returns valid responses

---

## Test Environments

| Environment | URL | Database |
|-------------|-----|----------|
| Development | localhost:3000 | Local PostgreSQL |
| Staging | staging.example.com | Staging DB |
| Production | example.com | Production DB |

---

## Reporting Issues

When reporting bugs, include:
1. Steps to reproduce
2. Expected vs actual behavior
3. Browser and OS
4. Screenshots/videos
5. Console errors
6. Network request details (if API related)
