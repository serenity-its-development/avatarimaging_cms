# Frontend Finalization Sprint
**Goal:** Complete functional frontend with full backend integration
**Duration:** Focused sprint (push regularly!)
**Date:** 2026-01-02

---

## Sprint Objective
Build a fully functional, beautiful CRM frontend that:
- ✅ Connects to deployed backend API (`avatarimaging_cms.mona-08d.workers.dev`)
- ✅ Implements all core pages (Dashboard, Contacts, Tasks, Pipeline, Calendar)
- ✅ Has real data flow from D1 database
- ✅ Deployed to Cloudflare Pages
- ✅ Production-ready UX

---

## Sprint Tasks

### Phase 1: API Integration Foundation (30 min)
**Goal:** Setup API client for backend communication

- [x] Create API client service (`src/frontend/lib/api.ts`)
- [x] Setup React Query for data fetching
- [x] Configure CORS and API base URL
- [x] Create custom hooks for API calls
- [x] Test connection to deployed worker

**Deliverable:** Working API client with health check

---

### Phase 2: Contacts Page (1 hour)
**Goal:** Full CRUD for contacts with side panel

- [ ] Build contacts data table with API integration
- [ ] Implement inline editing → PATCH `/api/contacts/:id`
- [ ] Create contact side panel (slide-out)
  - Contact details
  - Touchpoint timeline
  - AI warmness breakdown
  - Quick actions (SMS, call, email)
- [ ] Add "New Contact" button → POST `/api/contacts`
- [ ] Search and filter functionality
- [ ] Color-coded rows by warmness

**API Endpoints:**
```
GET    /api/contacts          # List all
GET    /api/contacts/:id      # Get one
POST   /api/contacts          # Create
PATCH  /api/contacts/:id      # Update
DELETE /api/contacts/:id      # Delete
POST   /api/contacts/:id/recalculate-warmness
```

**Deliverable:** Fully functional contacts page

---

### Phase 3: Tasks Page (45 min)
**Goal:** Task management with Kanban and list views

- [ ] Build task list view (priority queue)
  - Group by: Urgent, Today, This Week
  - Countdown timers for urgent tasks
- [ ] Build task Kanban view
  - Columns: To Do, In Progress, Done
  - Drag-and-drop with API update
- [ ] Task creation form
- [ ] Task completion toggle
- [ ] Assignee filter

**API Endpoints:**
```
GET    /api/tasks             # List all
POST   /api/tasks             # Create
PATCH  /api/tasks/:id         # Update
DELETE /api/tasks/:id         # Delete
```

**Deliverable:** Task management with dual views

---

### Phase 4: Calendar View (1 hour)
**Goal:** Visual booking calendar

- [ ] Build month view calendar grid
- [ ] Build week view calendar
- [ ] Build day view schedule
- [ ] Fetch bookings from API
- [ ] Click date → create booking form
- [ ] Click booking → side panel with details
- [ ] Color-code by service type
- [ ] Show availability gaps

**API Endpoints:**
```
GET    /api/bookings          # List all
GET    /api/bookings?date=... # Filter by date
POST   /api/bookings          # Create
PATCH  /api/bookings/:id      # Update
DELETE /api/bookings/:id      # Cancel
```

**Deliverable:** Interactive booking calendar

---

### Phase 5: Dashboard Real Data (30 min)
**Goal:** Connect dashboard to live API

- [ ] Replace mock data with API calls
- [ ] Fetch stats (contacts count, tasks count, bookings today)
- [ ] Fetch urgent tasks from API
- [ ] Fetch AI insights
- [ ] Fetch recent contacts
- [ ] Auto-refresh every 30 seconds
- [ ] Loading states

**API Endpoints:**
```
GET /api/reports/dashboard     # Dashboard stats
GET /api/tasks?urgent=true     # Urgent tasks
GET /api/contacts?recent=true  # Recent contacts
```

**Deliverable:** Live dashboard with real-time data

---

### Phase 6: Pipeline Enhancement (30 min)
**Goal:** Connect pipeline to contacts API

- [ ] Fetch contacts grouped by pipeline stage
- [ ] Drag card → update contact stage (PATCH)
- [ ] Real warmness scores from AI
- [ ] Real-time stage metrics
- [ ] Add contact to pipeline

**API Endpoints:**
```
GET    /api/contacts?pipeline=new_lead
PATCH  /api/contacts/:id       # Update stage
```

**Deliverable:** Live pipeline with drag-and-drop

---

### Phase 7: AI Command Integration (30 min)
**Goal:** Connect Floating AI to backend AI

- [ ] POST AI queries to `/api/ai/query`
- [ ] Display AI responses in toast
- [ ] Implement quick commands:
  - "Show hot leads" → Filter contacts by warmness > 80
  - "My tasks today" → Navigate to tasks page filtered
  - "Generate report" → Download report
  - "Find contacts" → Open contacts with search
- [ ] Voice command processing

**API Endpoints:**
```
POST /api/ai/query
{
  "message": "Show hot leads",
  "context": { "user_id": "..." }
}
```

**Deliverable:** Functional AI command palette

---

### Phase 8: Messages & Notifications (30 min)
**Goal:** SMS/Email message interface

- [ ] Build messages inbox page
- [ ] Fetch SMS/email threads
- [ ] Send SMS from contact page
- [ ] Send email from contact page
- [ ] Notification bell → recent messages
- [ ] Unread count badge

**API Endpoints:**
```
GET  /api/messages             # List all
POST /api/messages/sms         # Send SMS
POST /api/messages/email       # Send email
```

**Deliverable:** Messaging interface

---

### Phase 9: Reports Page (30 min)
**Goal:** Analytics and insights

- [ ] Build reports dashboard
- [ ] Performance metrics (conversion rates)
- [ ] Attribution funnel
- [ ] AI performance stats
- [ ] Export to CSV/PDF
- [ ] Date range filters

**API Endpoints:**
```
GET /api/reports/performance
GET /api/reports/attribution
GET /api/reports/ai-usage
```

**Deliverable:** Reports and analytics

---

### Phase 10: Settings Page (20 min)
**Goal:** Configuration interface

- [ ] User profile settings
- [ ] Integration status (Wix, ManyChat, ClickSend)
- [ ] AI configuration (models, thresholds)
- [ ] Notification preferences
- [ ] API key management

**Deliverable:** Settings page

---

### Phase 11: Authentication (45 min)
**Goal:** Google OAuth login

- [ ] Build login page
- [ ] Google OAuth button
- [ ] Handle OAuth callback
- [ ] Store JWT token
- [ ] Protected routes
- [ ] Logout functionality
- [ ] Session persistence

**API Endpoints:**
```
GET /auth/google
GET /auth/google/callback
```

**Deliverable:** Secure authentication

---

### Phase 12: Deployment (30 min)
**Goal:** Deploy to Cloudflare Pages

- [ ] Create Cloudflare Pages project
- [ ] Configure build settings
  - Build command: `npm run build`
  - Output directory: `dist`
- [ ] Setup custom domain (optional)
- [ ] Configure environment variables
- [ ] Setup automatic deployments (git push)
- [ ] Test production build

**Deliverable:** Live production frontend

---

## Git Commit Strategy

**Commit frequently (every 30-60 min) with clear messages:**

```bash
# After each phase
git add .
git commit -m "feat: Complete Contacts page with API integration"
git push

# Example commits:
git commit -m "feat: Setup API client and React Query"
git commit -m "feat: Build Contacts page with side panel"
git commit -m "feat: Add task Kanban board with drag-and-drop"
git commit -m "feat: Create calendar month/week/day views"
git commit -m "feat: Connect Dashboard to live API"
git commit -m "feat: Integrate AI command palette with backend"
git commit -m "feat: Deploy to Cloudflare Pages"
```

---

## API Integration Checklist

For each page, ensure:
- ✅ Loading states (skeleton loaders)
- ✅ Error handling (toast notifications)
- ✅ Empty states (no data UI)
- ✅ Optimistic updates (instant UI feedback)
- ✅ Auto-refresh (polling or WebSockets)
- ✅ Proper HTTP methods (GET/POST/PATCH/DELETE)
- ✅ CORS configured correctly

---

## Testing Checklist

Before each commit:
- ✅ `npm run build` succeeds
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Data fetches correctly
- ✅ CRUD operations work
- ✅ UI looks good (responsive)

---

## Performance Targets

- Bundle size: < 250 KB gzipped ✅ (Currently 66 KB)
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3.5s
- Lighthouse Score: > 90

---

## Progress Tracking

### Completed ✅
- [x] Foundation (Tailwind, components, layout)
- [x] Dashboard (static)
- [x] Pipeline (static)
- [x] Kanban Board component
- [x] FloatingAICommand (drag, resize, voice)

### In Progress 🚧
- [ ] API Client setup
- [ ] Contacts page
- [ ] Tasks page
- [ ] Calendar view
- [ ] Backend integration

### Pending ⏳
- [ ] Messages page
- [ ] Reports page
- [ ] Settings page
- [ ] Authentication
- [ ] Deployment

---

## Success Criteria

Sprint is complete when:
1. ✅ All core pages built and functional
2. ✅ Full API integration with backend
3. ✅ No mock data (all live from D1)
4. ✅ Deployed to production (Cloudflare Pages)
5. ✅ End-to-end testing passes
6. ✅ Beautiful UX (Monday.com/HubSpot quality)

---

**Let's build! Push frequently, test continuously, ship fast! 🚀**
