# Avatar Imaging CRM - Frontend Specification

**Design System:** Monday.com Vibe + HubSpot CRM-inspired
**Tech Stack:** React 18 + TypeScript + TailwindCSS + Vite
**Date:** 2026-01-02

---

## Design Principles

### Visual Style
- **Clean & Medical-Grade:** Professional healthcare aesthetic
- **Vibe-Inspired:** Soft shadows, rounded corners (8-12px), spacious padding
- **Color-Coded:** Status indicators throughout (success green, warning orange, danger red, AI purple)
- **Micro-Interactions:** Smooth animations (200-300ms transitions)

### User Experience
- **Data-First:** Information hierarchy optimized for medical scheduling
- **AI-Everywhere:** Prominent AI features (warmness scores, insights, command palette)
- **Keyboard-Driven:** Cmd+K command palette, keyboard shortcuts
- **Responsive:** Mobile-first design, works on tablets/phones

---

## Components Library

### Base UI Components

#### 1. **Button**
- Variants: `primary` | `secondary` | `outline` | `ghost` | `danger`
- Sizes: `sm` | `md` | `lg`
- States: Default, hover, active, loading, disabled
- Features: Loading spinner, icon support

#### 2. **Card**
- Parts: `CardHeader` | `CardTitle` | `CardContent` | `CardFooter`
- Features: Hover elevation, border highlight
- Usage: Stats, forms, content containers

#### 3. **Badge**
- Variants: `default` | `success` | `warning` | `danger` | `primary` | `ai`
- Sizes: `sm` | `md` | `lg`
- Features: Dot indicator, color-coding

#### 4. **Avatar**
- Sizes: `sm` (32px) | `md` (40px) | `lg` (48px) | `xl` (64px)
- Features: Fallback initials, online status dot, gradient background

#### 5. **DataTable** (Monday.com-style)
- Features:
  - Inline cell editing (click to edit)
  - Sortable columns (click header)
  - Color-coded rows by status/warmness
  - Quick action buttons per row
  - Hover row highlight
- Use Cases: Contacts list, task queue, reports

#### 6. **Toast Notifications**
- Variants: `success` | `error` | `info` | `ai`
- Features: Auto-dismiss (5s), manual close, icon indicators
- Position: Bottom-right fixed

#### 7. **FloatingAICommand** ⭐ (Unique Feature)
- **Features:**
  - Draggable anywhere on screen
  - Resizable (300-800px width, 250-600px height)
  - Transparency slider (30-100%)
  - Dock to sidebar (drag to left edge)
  - Voice input (Web Speech API)
  - Keyboard shortcut: `Cmd+K` / `Ctrl+K`
  - Persistent settings (localStorage)
  - Quick command buttons
  - Minimize/maximize
- **Position:** Floating bottom-right by default
- **AI Features:** Natural language processing, voice recognition

---

## Layout Components

### 1. **Sidebar Navigation** (Fixed Left, 256px)
- Logo + branding
- Navigation links with icons:
  - Dashboard (LayoutDashboard)
  - Contacts (Users)
  - Tasks (CheckSquare)
  - Pipeline (TrendingUp)
  - Calendar (Calendar)
  - Messages (MessageSquare)
  - Reports (BarChart3)
  - AI Insights (Sparkles) - highlighted
  - Settings (Settings) - footer
- Active state: Primary blue background
- AI Insights: Gradient purple background when active

### 2. **Header** (Fixed Top, 64px)
- Search bar (global search)
- Notification bell (with badge count)
- User profile dropdown (avatar + name + role)

### 3. **MainLayout**
- Sidebar (left, fixed)
- Header (top, fixed)
- Content area (margin-left: 256px, padding-top: 64px)

---

## Page Specifications

### 1. **Dashboard** ✅
**Layout:** Grid + Cards

**Components:**
- **Stats Grid (4 columns):**
  - Active Contacts (Users icon, blue)
  - Pending Tasks (CheckSquare icon, orange)
  - Bookings Today (Calendar icon, green)
  - Avg Warmness (Sparkles icon, purple gradient)
  - Each card shows: value, trend (↑↓), percentage change

- **Urgent Tasks Panel:**
  - Time-sensitive tasks (5-min speed-to-lead)
  - Due time countdown
  - Priority badges (urgent=red, high=orange)

- **AI Insights Panel:**
  - Gradient cards (purple to blue)
  - Real-time AI recommendations
  - High-intent lead alerts
  - Speed-to-lead warnings

- **Recent Contacts Table:**
  - Columns: Contact (avatar+name+phone), AI Warmness (progress bar), Stage (badge), Source
  - Click row → open side panel

### 2. **Contacts Page** (To Build)
**Layout:** Table + Side Panel (HubSpot-style)

**Components:**
- **Data Table:**
  - Columns: Name, Phone, Email, Warmness Score, Stage, Source, Last Contact
  - Inline editing on click
  - Sortable by warmness
  - Color-coded rows (warmness-based)

- **Side Panel** (slide-out on click):
  - Contact details
  - Touchpoint timeline
  - AI warmness breakdown
  - Quick actions (call, SMS, email)
  - Associated bookings

### 3. **Tasks Page** (To Build)
**Layout:** Priority Queue + Kanban Toggle

**Components:**
- **View Toggle:** List | Kanban
- **Priority Queue (List View):**
  - Grouped by: Urgent (<5min), Today, This Week
  - Each task card:
    - Title + contact name
    - Due time countdown
    - Priority badge
    - Assignee avatar
    - Quick actions (complete, snooze, reassign)

- **Kanban Board (Board View):**
  - Columns: To Do, In Progress, Completed, Cancelled
  - Drag-and-drop cards
  - Column card count
  - Add card button

### 4. **Pipeline Page** (To Build)
**Layout:** Kanban Board (Monday.com-style)

**Columns:**
- New Lead (purple)
- Contacted (blue)
- Qualified (teal)
- Booked (green)
- Attended (gray)
- Lost (red)

**Card Content:**
- Contact name + avatar
- Warmness score (progress bar)
- Source badge
- Days in stage
- Assignee
- Due date (if applicable)

**Features:**
- Drag cards between stages
- Auto-pipeline progression triggers
- Stage metrics (conversion rates)

### 5. **Calendar Page** (To Build)
**Layout:** Month/Week/Day Views

**Components:**
- **View Switcher:** Month | Week | Day
- **Calendar Grid:**
  - Booking cards (color-coded by service type)
  - Hover: Show booking details
  - Click: Open booking side panel

- **Today's Schedule Sidebar:**
  - Upcoming appointments
  - Gaps in schedule
  - No-show alerts

### 6. **AI Insights Page** (To Build)
**Layout:** Dashboard Grid

**Components:**
- **AI Performance Metrics:**
  - Warmness accuracy rate
  - Intent detection success
  - AI-generated insights count

- **Top Recommendations:**
  - High-value leads to contact
  - At-risk patients (churn prediction)
  - Optimal outreach times

- **AI Usage Log:**
  - Recent AI operations
  - Cost tracking
  - Model performance

---

## Kanban Board Specification

### Design (Monday.com-inspired)

**Column Structure:**
```
┌─────────────────────────────────────┐
│ ● Column Title            [5] [+]   │ ← Header
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ Card Title                     │  │
│  │ Description...                 │  │
│  │ ━━━━━━━━━━ 87/100 Warmness    │  │ ← Warmness Bar
│  │ [tag] [tag]                    │  │
│  │ ──────────────────────────     │  │
│  │ 👤 John   🔴 Urgent   ⏰ 5min │  │ ← Footer
│  └───────────────────────────────┘  │
│  ... more cards ...                 │
└─────────────────────────────────────┘
```

**Features:**
- Drag & drop between columns
- Color-coded column headers
- Card count + column limit
- Add card button (+)
- Card hover: Elevation shadow
- Warmness progress bar (if applicable)
- Priority badges
- Due date countdown
- Assignee avatar
- Tags/labels

---

## Calendar View Specification

### Design (HubSpot-inspired)

**Month View:**
```
┌────────────────────────────────────────────────┐
│  December 2026          [Month▼] [Week] [Day] │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┬────┤
│ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │ Sun      │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼────┤
│  1  │  2  │  3  │  4  │  5  │  6  │  7       │
│     │ 🔵  │ 🟢  │     │ 🔵  │     │          │
│     │ MRI │ Scan│     │ MRI │     │          │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴────┘
```

**Booking Card Colors:**
- 🔵 MRI Scan (blue)
- 🟢 Routine Checkup (green)
- 🟡 Follow-up (yellow)
- 🔴 Urgent (red)

**Features:**
- Click date → Add booking
- Click booking → Side panel with details
- Drag to reschedule
- Today highlight
- No-show indicators
- Availability gaps highlighted

---

## Data Visualization Standards

### Progress Bars (Warmness Score)
```css
/* Color Thresholds */
0-39:  Blue (#3B82F6)
40-59: Blue (#3B82F6)
60-79: Orange (#F97316)
80-100: Red (#EF4444)
```

### Status Badges
- **Active/Scheduled:** Green background, green text
- **Pending/In Progress:** Orange background, orange text
- **Cancelled/No-show:** Red background, red text
- **Completed:** Gray background, gray text

### Priority Indicators
- **Urgent:** Red dot + red text (blinking animation)
- **High:** Orange dot + orange text
- **Medium:** Blue dot + blue text
- **Low:** Gray dot + gray text

---

## Color Palette

### Primary (Medical Blue)
- 50: `#eff6ff`
- 500: `#3b82f6` (Primary brand)
- 700: `#1d4ed8`

### Success (Green)
- 50: `#f0fdf4`
- 500: `#10b981`
- 700: `#047857`

### Warning (Orange)
- 50: `#fff7ed`
- 500: `#f97316`
- 700: `#c2410c`

### Danger (Red)
- 50: `#fef2f2`
- 500: `#ef4444`
- 700: `#b91c1c`

### AI (Purple)
- 50: `#faf5ff`
- 500: `#a855f7`
- 700: `#7e22ce`

### Neutral (Gray)
- 50: `#f9fafb` (Background)
- 200: `#e5e7eb` (Borders)
- 600: `#4b5563` (Text secondary)
- 900: `#111827` (Text primary)

---

## Animations & Transitions

### Standard Durations
- **Fast:** 150ms (hover states)
- **Normal:** 200-300ms (UI transitions)
- **Slow:** 400-500ms (page transitions)

### Keyframes
- `slide-in-right`: Panel slides from right (300ms)
- `fade-in`: Opacity 0 → 1 (200ms)
- `scale-in`: Scale 0.95 → 1 (200ms)
- `pulse`: AI indicators (1s infinite)

---

## Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile Adaptations
- Sidebar: Collapse to hamburger menu
- Tables: Horizontal scroll
- Kanban: Single column stack
- Calendar: Week view default

---

## Accessibility (WCAG AAA)

### Requirements
- ✅ Color contrast ratio ≥ 7:1 for text
- ✅ Keyboard navigation (Tab, Enter, Esc)
- ✅ ARIA labels for icons
- ✅ Focus indicators (2px blue outline)
- ✅ Screen reader support

---

## Performance Targets

- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3.5s
- **Bundle Size:** < 250 KB (gzipped)
- **Lighthouse Score:** > 90

---

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Voice Input:** Chrome/Edge only (Web Speech API)

---

## Future Enhancements

1. **Real-time Collaboration:**
   - Live cursors (multiple users)
   - Presence indicators
   - Conflict resolution

2. **Advanced AI Features:**
   - Predictive text in AI command
   - AI-suggested actions inline
   - Voice commands for navigation

3. **Dark Mode:**
   - Toggle in settings
   - System preference sync

4. **Offline Support:**
   - Service worker
   - IndexedDB caching
   - Sync when online

---

**Status:** ✅ Foundation Complete | 🚧 Pages In Progress | ⏳ Future
