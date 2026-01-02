# ✅ Post-Deployment Checklist

Complete these steps after deploying the frontend to Cloudflare Pages.

---

## 1. Test Frontend Deployment

### Open the App
```
https://avatarimaging-crm.pages.dev
```

### Check All Pages Load
- [ ] Dashboard (`/`)
- [ ] Contacts (`/contacts`)
- [ ] Tasks (`/tasks`)
- [ ] Pipeline (`/pipeline`)

---

## 2. Test API Connectivity

### Open Browser Console (F12)

You should see API calls in the Network tab:
- [ ] `GET /health` → Returns `{"status":"ok","ai":"enabled"}`
- [ ] `GET /api/reports/dashboard` → Returns dashboard stats
- [ ] `GET /api/contacts` → Returns contacts array

### If You See CORS Errors
✅ **Good news:** CORS is already enabled on backend!

Current setting: `Access-Control-Allow-Origin: *` (allows all origins)

The frontend should work immediately. However, for production security, update CORS to only allow your specific domain (see section 5 below).

---

## 3. Test Core Features

### Dashboard
- [ ] Stats cards display numbers (not loading forever)
- [ ] Recent contacts list populates
- [ ] Urgent tasks show up
- [ ] Charts/graphs render

### Contacts Page
- [ ] Table loads with data
- [ ] Click a contact → side panel opens
- [ ] AI warmness score displays with color
- [ ] Inline editing works (double-click a cell)
- [ ] Search bar filters contacts

### Tasks Page
- [ ] Toggle between List and Kanban views
- [ ] Tasks display in both modes
- [ ] Can drag tasks in Kanban view
- [ ] Status updates when dragging

### Pipeline
- [ ] Drag contacts between stages
- [ ] Contact cards show in correct columns
- [ ] Dropping updates the backend

---

## 4. Test AI Features

### Floating AI Command
- [ ] Press **Cmd+K** (or **Ctrl+K**) → panel appears
- [ ] Type a message and submit → gets AI response
- [ ] Click microphone icon → voice input activates (if supported)
- [ ] Drag the panel → repositions
- [ ] Resize the panel → changes size
- [ ] Adjust transparency slider → panel becomes translucent
- [ ] Drag to left edge (< 80px) → docks to sidebar
- [ ] Press Escape → closes panel

### Voice Input (Browser Compatibility)
- ✅ **Chrome/Edge:** Full support
- ⚠️ **Safari:** Partial support
- ❌ **Firefox:** Not supported (Web Speech API)

If voice doesn't work: It's browser-dependent, not a bug!

---

## 5. Update CORS for Production (Recommended)

Currently, the backend allows requests from **any origin** (`*`). This is fine for testing, but for production, restrict to your specific domain.

### Update Backend CORS

Edit [src/router/Router.ts](src/router/Router.ts#L54-L58):

**Current:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

**Production (after deployment):**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://avatarimaging-crm.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}
```

### If You Want to Allow Multiple Domains

```typescript
const allowedOrigins = [
  'https://avatarimaging-crm.pages.dev',
  'https://crm.avatarimaging.com.au', // Custom domain
  'http://localhost:5173' // Local development
]

const origin = request.headers.get('Origin') || ''
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true'
}
```

### Deploy Updated Worker

```bash
cd /root/git/avatarimaging_crm
npx wrangler deploy
```

---

## 6. Performance Check

### Page Load Time
- [ ] Initial load < 3 seconds
- [ ] Subsequent navigation instant (React Router)

### API Response Time
- [ ] Dashboard stats < 500ms
- [ ] Contact list < 1 second
- [ ] AI warmness calculation < 2 seconds

### Check Build Size
The production build is optimized:
```
Total: 272 KB (uncompressed)
Gzipped: 82 KB
```

**This is excellent!** Most enterprise CRMs are 2-5 MB.

---

## 7. Browser Compatibility

Tested and should work in:
- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Safari 14+
- ✅ Firefox 88+

**Required features:**
- ES2020 support
- Fetch API
- LocalStorage
- Web Speech API (optional for voice)

---

## 8. Mobile Responsiveness

Test on mobile device or use Chrome DevTools responsive mode:
- [ ] Sidebar collapses on mobile
- [ ] Tables scroll horizontally
- [ ] FloatingAICommand adjusts to screen size
- [ ] Touch drag-and-drop works on Pipeline

---

## 9. Data Verification

### Create Test Contact
1. Go to Contacts page
2. Click "Add Contact"
3. Fill in details:
   ```
   Name: Test Patient
   Phone: +61400000000
   Email: test@example.com
   Source: Website
   ```
4. Submit
5. [ ] Contact appears in table
6. [ ] AI warmness calculated automatically
7. [ ] Contact ID is ULID format (26 characters)

### Create Test Task
1. Go to Tasks page
2. Click "New Task"
3. Fill in:
   ```
   Title: Follow up with Test Patient
   Contact: Select "Test Patient"
   Priority: High
   Due Date: Tomorrow
   ```
4. Submit
5. [ ] Task appears in list
6. [ ] Shows in "Urgent" section if high priority

---

## 10. Check Analytics

### Cloudflare Dashboard
Go to: https://dash.cloudflare.com

#### Pages Analytics
- Workers & Pages → avatarimaging-crm → Analytics
- [ ] Requests graph shows traffic
- [ ] No 4xx/5xx errors
- [ ] Average response time < 500ms

#### Worker Analytics
- Workers & Pages → avatarimaging_cms → Analytics
- [ ] API requests being logged
- [ ] Check "Invocations" count
- [ ] Monitor CPU time

#### D1 Database
- Workers & Pages → D1 → avatarimaging-crm-db
- [ ] Check "Queries" count
- [ ] Monitor "Rows read/written"
- [ ] Storage usage increasing

---

## 11. Optional: Custom Domain

If you want to use `crm.avatarimaging.com.au` instead of `.pages.dev`:

### Add Custom Domain to Pages

1. Go to: https://dash.cloudflare.com/pages
2. Select project: `avatarimaging-crm`
3. Click "Custom domains" tab
4. Click "Set up a custom domain"
5. Enter: `crm.avatarimaging.com.au`
6. Follow DNS instructions

### Update CORS Headers

After adding custom domain, update backend CORS (see section 5) to include the new domain.

---

## 12. Security Checklist

- [ ] CORS restricted to your domain (not `*`)
- [ ] No API keys exposed in frontend code
- [ ] All secrets in Worker environment variables
- [ ] HTTPS enforced (Cloudflare handles this automatically)
- [ ] Content Security Policy configured (optional)

---

## 13. Backup Database

Before making major changes:

```bash
npx wrangler d1 export avatarimaging-crm-db --remote --output=backup-$(date +%Y%m%d).sql
```

Store backups in a safe location (not in git!).

---

## 14. Monitor Costs

### Expected Monthly Costs
- Cloudflare Workers Paid: **$5/month**
- D1 Database: **Free** (up to 5GB)
- Workers AI: **~$6/month** (estimated based on usage)
- Queues: **Free** (up to 1M operations)
- **Total: ~$11/month**

### Monitor Usage
- Workers & Pages → Plans & Billing
- Check:
  - [ ] Worker invocations
  - [ ] AI inference calls
  - [ ] D1 storage
  - [ ] Queue operations

---

## 15. Future Enhancements

Once the core is working, consider:

### Authentication
- [ ] Implement Google OAuth (code already scaffolded)
- [ ] Add user roles (Admin, Staff, Viewer)
- [ ] Session management

### Integrations
- [ ] Configure ClickSend for SMS (add API key to secrets)
- [ ] Connect Wix Bookings webhook
- [ ] Set up email provider (SendGrid/Mailgun)

### Automation
- [ ] Enable cron triggers in wrangler.toml
- [ ] Test scheduled tasks (reminders, warmness calc, reports)

### Custom Fields
- [ ] Add company-specific data fields
- [ ] Custom pipeline stages
- [ ] Custom task types

---

## 🎉 Deployment Complete!

If all items above are checked, your CRM is **production-ready**!

**Live URLs:**
- Frontend: https://avatarimaging-crm.pages.dev
- Backend: https://avatarimaging_cms.mona-08d.workers.dev

**What You Built:**
- ✅ Full-stack AI-powered CRM
- ✅ 4 main pages with 30+ components
- ✅ Drag-and-drop interfaces
- ✅ Voice-controlled AI assistant
- ✅ Real-time data synchronization
- ✅ Production-optimized (82 KB gzipped)

---

## 🐛 Common Issues & Fixes

### Issue: "Failed to fetch" errors
**Cause:** Backend might be down or CORS issue
**Fix:**
```bash
curl https://avatarimaging_cms.mona-08d.workers.dev/health
```
Should return: `{"status":"ok","ai":"enabled"}`

### Issue: AI features not working
**Cause:** Workers AI binding might not be configured
**Fix:** Check wrangler.toml has `[ai]` binding (it does!)

### Issue: Blank dashboard
**Cause:** No data in database yet
**Fix:** Create test contacts via the UI or API

### Issue: Voice input not working
**Cause:** Browser doesn't support Web Speech API
**Fix:** Use Chrome/Edge for voice features

---

**Last Updated:** 2026-01-02
**Frontend Version:** 1.0.0
**Backend Version:** 1.0.0
