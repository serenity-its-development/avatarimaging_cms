# Avatar Imaging CMS - Cloudflare Workers Architecture

**Platform:** Cloudflare Workers (Serverless Edge Computing)
**Database:** Cloudflare D1 (SQLite at the edge)
**Version:** 1.0
**Date:** 2026-01-02

---

## Why Cloudflare Workers?

### ✅ Perfect Fit for This Use Case:

| Requirement | Cloudflare Solution | Why It Works |
|-------------|---------------------|--------------|
| **Webhook Processing** | Workers instant response | <100ms response time, handles Wix/ManyChat webhooks |
| **Event-Driven** | Workers + Queues | Async automation processing, no blocking |
| **Global Performance** | 330+ edge locations | Low latency for Australian users |
| **Cost-Effective** | 100K requests/day FREE | Perfect for MVP (500 bookings/month) |
| **Scalability** | Auto-scaling | Handles traffic spikes (campaign launches) |
| **Database** | D1 (SQLite) | Relational data, SQL queries, 5GB free |
| **SMS Queue** | Queues | Rate limiting, retry logic built-in |
| **Reliability** | 99.99% uptime SLA | Critical for medical appointments |

### Cost Estimate (MVP):

```
Monthly Volume:
- 500 bookings/month
- 100 leads/week = 400/month
- 3,000 SMS/month (6 SMS per booking average)
- 100 tasks/day = 3,000/month
- 10 staff users (dashboard access)

Cloudflare Workers Cost:
- Requests: ~50K/month (webhooks + API + dashboard)
  - FREE (under 100K/day limit)
- D1 Database: ~100K reads, 10K writes/month
  - FREE (under limits)
- Queues: 3,000 messages/month (SMS queue)
  - FREE (1M messages/month free)
- Total Cloudflare: $0/month for MVP ✅

External Services:
- SMS (ClickSend): ~$120/month (3,000 SMS @ $0.04 each)
- Wix Bookings: Included in client's existing plan
- Total Infrastructure: ~$120/month
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Wix Bookings │  │  ManyChat    │  │ ClickSend SMS│         │
│  │  (webhooks)  │  │  (webhooks)  │  │  (API + hook)│         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼─────────────────┘
          │                  │                  │
          │ HTTPS POST       │ HTTPS POST       │ HTTPS POST
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────────────┐
│             CLOUDFLARE WORKERS (EDGE NETWORK)                    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Main Worker (src/index.ts)                                │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Router (Hono.js)                                      │ │ │
│  │  │  • /webhooks/wix                                      │ │ │
│  │  │  • /webhooks/manychat                                 │ │ │
│  │  │  • /webhooks/sms/inbound                              │ │ │
│  │  │  • /api/* (staff dashboard API)                       │ │ │
│  │  │  • /* (static frontend assets)                        │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Webhook Handlers (src/webhooks/)                     │ │ │
│  │  │  • wix-handler.ts                                     │ │ │
│  │  │  • manychat-handler.ts                                │ │ │
│  │  │  • sms-handler.ts                                     │ │ │
│  │  │  → Validate signature                                 │ │ │
│  │  │  → Log to event_log                                   │ │ │
│  │  │  → Queue automation job                               │ │ │
│  │  │  → Return 200 OK (<100ms)                             │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ API Handlers (src/api/)                              │ │ │
│  │  │  • tasks.ts - Task CRUD                              │ │ │
│  │  │  • contacts.ts - Contact management                   │ │ │
│  │  │  • bookings.ts - Booking management                   │ │ │
│  │  │  • reports.ts - Analytics generation                  │ │ │
│  │  │  • sms.ts - Manual SMS sending                        │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Queue Consumers (separate workers)                        │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Automation Queue Consumer (src/queues/automation.ts) │ │ │
│  │  │  • Process automation rules                           │ │ │
│  │  │  • Update pipeline stages                             │ │ │
│  │  │  • Create tasks                                       │ │ │
│  │  │  • Queue SMS messages                                 │ │ │
│  │  │  • Calculate warmness scores                          │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ SMS Queue Consumer (src/queues/sms.ts)               │ │ │
│  │  │  • Send SMS via ClickSend API                         │ │ │
│  │  │  • Handle rate limiting                               │ │ │
│  │  │  • Log delivery status                                │ │ │
│  │  │  • Retry on failure                                   │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Scheduled Tasks (Cron Triggers)                           │ │
│  │  • Every 15 min: Check no-response leads (4hr window)     │ │
│  │  • Every hour: Send T-48hr/T-24hr/T-2hr reminders         │ │
│  │  • Daily: Recall due checks, dormant lead cleanup         │ │
│  │  • Weekly: Generate weekly report                          │ │
│  │  • Monthly: Generate monthly report                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE SERVICES                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ D1 Database (SQLite)                                       │ │
│  │  • contacts, bookings, tasks, touchpoints                  │ │
│  │  • event_log, sms_messages, staff_users                   │ │
│  │  • automation_rules (configuration)                        │ │
│  │  Binding: env.DB                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ KV Namespace (Key-Value Store)                             │ │
│  │  • Session tokens (staff authentication)                   │ │
│  │  • Report cache (1 hour TTL)                               │ │
│  │  Binding: env.SESSIONS                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Queues                                                      │ │
│  │  • automation-queue (automation jobs)                      │ │
│  │  • sms-queue (SMS sending)                                 │ │
│  │  Bindings: env.AUTOMATION_QUEUE, env.SMS_QUEUE            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
/root/git/avatarimaging_crm/
├── wrangler.toml                   # Cloudflare Workers configuration
├── package.json                    # Node.js dependencies
├── tsconfig.json                   # TypeScript configuration
├── .dev.vars.example               # Environment variables template
├── README.md                       # Project overview
├── SPECIFICATION.md                # Technical specification
├── CLOUDFLARE_ARCHITECTURE.md      # This file
│
├── src/                            # Backend (TypeScript)
│   ├── index.ts                    # Main worker entry point
│   │
│   ├── types/                      # TypeScript types
│   │   ├── env.ts                  # Environment bindings
│   │   ├── database.ts             # Database schema types
│   │   └── api.ts                  # API request/response types
│   │
│   ├── webhooks/                   # Webhook handlers
│   │   ├── wix-handler.ts          # Wix Bookings webhook
│   │   ├── manychat-handler.ts     # ManyChat webhook
│   │   └── sms-handler.ts          # SMS inbound webhook
│   │
│   ├── api/                        # API route handlers
│   │   ├── tasks.ts                # GET/POST /api/tasks
│   │   ├── contacts.ts             # GET/POST /api/contacts
│   │   ├── bookings.ts             # GET/POST /api/bookings
│   │   ├── sms.ts                  # POST /api/sms/send
│   │   └── reports.ts              # GET /api/reports/{weekly|monthly}
│   │
│   ├── services/                   # Business logic services
│   │   ├── automation-engine.ts    # Process automation rules
│   │   ├── warmness-calculator.ts  # Calculate lead warmness
│   │   ├── priority-calculator.ts  # Calculate task priority
│   │   ├── attribution.ts          # Multi-touch attribution
│   │   └── sms-service.ts          # SMS provider integration
│   │
│   ├── queues/                     # Queue consumers
│   │   ├── automation.ts           # Automation queue consumer
│   │   └── sms.ts                  # SMS queue consumer
│   │
│   ├── cron/                       # Scheduled tasks
│   │   ├── reminders.ts            # Send booking reminders
│   │   ├── no-response-check.ts    # Check 4hr no-response leads
│   │   ├── recall-check.ts         # Send recall reminders
│   │   └── reports.ts              # Generate weekly/monthly reports
│   │
│   ├── repositories/               # Database access layer
│   │   ├── contacts.ts             # Contact CRUD operations
│   │   ├── bookings.ts             # Booking CRUD operations
│   │   ├── tasks.ts                # Task CRUD operations
│   │   ├── touchpoints.ts          # Touchpoint logging
│   │   └── events.ts               # Event log (immutable)
│   │
│   └── utils/                      # Utility functions
│       ├── validation.ts           # Input validation
│       ├── auth.ts                 # Authentication helpers
│       └── templates.ts            # SMS template rendering
│
├── public/                         # Frontend (React)
│   ├── index.html                  # Main HTML entry
│   ├── dashboard.tsx               # Staff dashboard app
│   ├── components/                 # React components
│   │   ├── TaskList.tsx            # Today's tasks view
│   │   ├── ContactTimeline.tsx     # Contact interaction history
│   │   ├── PipelineView.tsx        # Pipeline visualization
│   │   └── Reports.tsx             # Weekly/monthly reports
│   └── styles/                     # CSS (Tailwind)
│
├── migrations/                     # Database migrations
│   ├── 001_initial_schema.sql      # Core tables
│   ├── 002_seed_automation.sql     # Automation rules
│   └── 003_seed_templates.sql      # SMS templates
│
└── tests/                          # Test suites
    ├── webhooks.test.ts            # Webhook handler tests
    ├── automation.test.ts          # Automation engine tests
    └── calculations.test.ts        # Warmness/priority tests
```

---

## Cloudflare Workers Configuration

### `wrangler.toml`

```toml
name = "avatar-imaging-cms"
main = "src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "avatar-imaging-production"
database_id = "REPLACE_WITH_YOUR_DATABASE_ID"

# KV Namespace (Sessions)
[[kv_namespaces]]
binding = "SESSIONS"
id = "REPLACE_WITH_YOUR_KV_ID"

# Queues
[[queues.producers]]
binding = "AUTOMATION_QUEUE"
queue = "automation-queue"

[[queues.producers]]
binding = "SMS_QUEUE"
queue = "sms-queue"

# Queue Consumers
[[queues.consumers]]
queue = "automation-queue"
max_batch_size = 10
max_batch_timeout = 30

[[queues.consumers]]
queue = "sms-queue"
max_batch_size = 5
max_batch_timeout = 10

# Cron Triggers
[triggers]
crons = [
  "*/15 * * * *",   # Every 15 min - No-response check, reminder scheduling
  "0 * * * *",      # Every hour - Send scheduled reminders
  "0 0 * * *",      # Daily at midnight - Recall checks, dormant cleanup
  "0 9 * * 1",      # Weekly Monday 9am - Generate weekly report
  "0 9 1 * *"       # Monthly 1st 9am - Generate monthly report
]

# Environment Variables (non-sensitive)
[vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://cms.avatarimaging.com.au"
SMS_PROVIDER = "clicksend"

# Secrets (set via CLI: wrangler secret put SECRET_NAME)
# WIX_WEBHOOK_SECRET
# SMS_API_KEY
# SMS_API_USERNAME
# MANYCHAT_API_KEY
# JWT_SECRET

# Development environment
[env.dev]
name = "avatar-imaging-cms-dev"
vars.ENVIRONMENT = "development"

# Staging environment
[env.staging]
name = "avatar-imaging-cms-staging"
vars.ENVIRONMENT = "staging"
```

---

## Environment Interface (TypeScript)

```typescript
// src/types/env.ts

export interface Env {
  // Cloudflare Bindings
  DB: D1Database;
  SESSIONS: KVNamespace;
  AUTOMATION_QUEUE: Queue;
  SMS_QUEUE: Queue;

  // Environment Variables
  ENVIRONMENT: 'development' | 'staging' | 'production';
  FRONTEND_URL: string;
  SMS_PROVIDER: 'clicksend' | 'messagemedia';

  // Secrets
  WIX_WEBHOOK_SECRET: string;
  SMS_API_KEY: string;
  SMS_API_USERNAME: string;
  MANYCHAT_API_KEY: string;
  MANYCHAT_WEBHOOK_SECRET: string;
  JWT_SECRET: string;
}
```

---

## Main Worker Entry Point

```typescript
// src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './types/env';

// Route handlers
import { wixWebhookHandler } from './webhooks/wix-handler';
import { manychatWebhookHandler } from './webhooks/manychat-handler';
import { smsWebhookHandler } from './webhooks/sms-handler';
import { tasksRouter } from './api/tasks';
import { contactsRouter } from './api/contacts';
import { bookingsRouter } from './api/bookings';
import { smsRouter } from './api/sms';
import { reportsRouter } from './api/reports';

// Queue consumers
import { automationQueueHandler } from './queues/automation';
import { smsQueueHandler } from './queues/sms';

// Cron handlers
import { sendReminders } from './cron/reminders';
import { checkNoResponse } from './cron/no-response-check';
import { checkRecallDue } from './cron/recall-check';
import { generateWeeklyReport } from './cron/reports';

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', logger());
app.use('/api/*', cors());

// Webhooks (public endpoints)
app.post('/webhooks/wix/bookings', wixWebhookHandler);
app.post('/webhooks/manychat', manychatWebhookHandler);
app.post('/webhooks/sms/inbound', smsWebhookHandler);

// API Routes (authenticated)
app.route('/api/tasks', tasksRouter);
app.route('/api/contacts', contactsRouter);
app.route('/api/bookings', bookingsRouter);
app.route('/api/sms', smsRouter);
app.route('/api/reports', reportsRouter);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: Date.now() }));

// Main export
export default {
  // HTTP requests
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },

  // Queue handlers
  async queue(batch: MessageBatch<any>, env: Env, ctx: ExecutionContext): Promise<void> {
    const queueName = batch.queue;

    if (queueName === 'automation-queue') {
      await automationQueueHandler(batch, env, ctx);
    } else if (queueName === 'sms-queue') {
      await smsQueueHandler(batch, env, ctx);
    }
  },

  // Scheduled handlers (cron)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;

    // Every 15 minutes
    if (cron === '*/15 * * * *') {
      await checkNoResponse(env, ctx);
      await sendReminders(env, ctx, 'schedule'); // Schedule upcoming reminders
    }

    // Every hour
    if (cron === '0 * * * *') {
      await sendReminders(env, ctx, 'send'); // Send due reminders
    }

    // Daily
    if (cron === '0 0 * * *') {
      await checkRecallDue(env, ctx);
    }

    // Weekly (Monday 9am)
    if (cron === '0 9 * * 1') {
      await generateWeeklyReport(env, ctx);
    }

    // Monthly (1st 9am)
    if (cron === '0 9 1 * *') {
      await generateWeeklyReport(env, ctx, 'monthly');
    }
  }
};
```

---

## Key Cloudflare Workers Patterns

### 1. Fast Webhook Response (Non-Blocking)

```typescript
// src/webhooks/wix-handler.ts

export async function wixWebhookHandler(c: Context<{ Bindings: Env }>) {
  const env = c.env;
  const body = await c.req.json();

  // 1. Validate webhook signature (FAST)
  const signature = c.req.header('X-Wix-Webhook-Signature');
  if (!validateWixSignature(signature, body, env.WIX_WEBHOOK_SECRET)) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  // 2. Log to event_log (FAST - single INSERT)
  await env.DB.prepare(`
    INSERT INTO event_log (id, event_type, timestamp, source, raw_payload)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    'booking_created',
    Date.now(),
    'wix',
    JSON.stringify(body)
  ).run();

  // 3. Queue automation job (FAST - no processing)
  await env.AUTOMATION_QUEUE.send({
    type: 'booking_created',
    data: body
  });

  // 4. Return 200 OK immediately (<100ms total)
  return c.json({ success: true }, 200);
}
```

### 2. Queue Consumer (Batch Processing)

```typescript
// src/queues/automation.ts

export async function automationQueueHandler(
  batch: MessageBatch<AutomationMessage>,
  env: Env,
  ctx: ExecutionContext
) {
  for (const message of batch.messages) {
    try {
      const { type, data } = message.body;

      if (type === 'booking_created') {
        await processBookingCreated(data, env);
      } else if (type === 'sms_received') {
        await processSmsReceived(data, env);
      } else if (type === 'lead_created') {
        await processLeadCreated(data, env);
      }

      message.ack(); // Acknowledge successful processing
    } catch (error) {
      console.error('Queue processing error:', error);
      message.retry(); // Retry on failure
    }
  }
}

async function processBookingCreated(data: any, env: Env) {
  // 1. Create/update Contact
  const contact = await matchOrCreateContact(data.customerInfo, env);

  // 2. Create Booking
  const booking = await createBooking(data, contact.id, env);

  // 3. Update pipeline
  await updateContactPipeline(contact.id, 'pre_appointment', 'booking_confirmed', env);

  // 4. Send confirmation SMS (queue it)
  await env.SMS_QUEUE.send({
    contact_id: contact.id,
    template: 'booking_confirmation',
    variables: {
      name: contact.name,
      date: formatDate(booking.appointment_datetime),
      time: formatTime(booking.appointment_datetime)
    }
  });

  // 5. Create tasks
  if (!contact.is_existing_patient) {
    await createTask({
      contact_id: contact.id,
      booking_id: booking.id,
      type: 'welcome_call',
      due_datetime: getEndOfDay()
    }, env);
  }

  // 6. Schedule reminders
  await scheduleReminders(booking.id, booking.appointment_datetime, env);
}
```

### 3. D1 Database Queries (Optimized)

```typescript
// src/repositories/tasks.ts

export async function getTasksForStaff(
  staffId: string,
  timeframe: 'overdue' | 'today' | 'upcoming',
  env: Env
) {
  const now = Date.now() / 1000;
  const todayStart = getStartOfDay();
  const todayEnd = getEndOfDay();

  let query = `
    SELECT
      t.*,
      c.name as contact_name,
      c.phone as contact_phone,
      b.appointment_datetime,
      b.urgency_level
    FROM tasks t
    JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN bookings b ON t.booking_id = b.id
    WHERE t.assigned_to = ?
      AND t.status = 'todo'
  `;

  const params: any[] = [staffId];

  if (timeframe === 'overdue') {
    query += ` AND t.due_datetime < ?`;
    params.push(now);
  } else if (timeframe === 'today') {
    query += ` AND t.due_datetime >= ? AND t.due_datetime <= ?`;
    params.push(todayStart, todayEnd);
  } else {
    query += ` AND t.due_datetime > ?`;
    params.push(todayEnd);
  }

  query += ` ORDER BY t.priority_score DESC, t.due_datetime ASC LIMIT 100`;

  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results;
}
```

### 4. Cron Job Pattern (Scheduled)

```typescript
// src/cron/reminders.ts

export async function sendReminders(env: Env, ctx: ExecutionContext, mode: 'schedule' | 'send') {
  const now = Date.now() / 1000;

  if (mode === 'schedule') {
    // Schedule upcoming reminders (T-48hr, T-24hr, T-2hr)
    const upcomingBookings = await env.DB.prepare(`
      SELECT * FROM bookings
      WHERE status IN ('scheduled', 'confirmed')
        AND appointment_datetime > ?
        AND appointment_datetime < ?
    `).bind(now, now + 172800).all(); // Next 48 hours

    for (const booking of upcomingBookings.results) {
      // Check if T-48hr reminder needed
      const t48hr = booking.appointment_datetime - 172800;
      if (t48hr > now && t48hr < now + 900) { // Within next 15 min
        await env.SMS_QUEUE.send({
          contact_id: booking.contact_id,
          template: 'reminder_48hr',
          scheduled_at: t48hr
        });
      }

      // Similar for T-24hr, T-2hr...
    }
  } else {
    // Send due reminders
    const dueReminders = await env.DB.prepare(`
      SELECT * FROM sms_queue
      WHERE status = 'scheduled'
        AND scheduled_at <= ?
    `).bind(now).all();

    for (const reminder of dueReminders.results) {
      await env.SMS_QUEUE.send(reminder);
    }
  }
}
```

---

## Deployment Workflow

### Initial Setup:

```bash
# 1. Install Wrangler CLI
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login

# 3. Create D1 database
wrangler d1 create avatar-imaging-production
# Copy database_id to wrangler.toml

# 4. Create KV namespace
wrangler kv:namespace create "SESSIONS"
# Copy id to wrangler.toml

# 5. Run migrations
wrangler d1 execute avatar-imaging-production --file=migrations/001_initial_schema.sql
wrangler d1 execute avatar-imaging-production --file=migrations/002_seed_automation.sql
wrangler d1 execute avatar-imaging-production --file=migrations/003_seed_templates.sql

# 6. Set secrets
wrangler secret put WIX_WEBHOOK_SECRET
wrangler secret put SMS_API_KEY
wrangler secret put SMS_API_USERNAME
wrangler secret put MANYCHAT_API_KEY
wrangler secret put MANYCHAT_WEBHOOK_SECRET
wrangler secret put JWT_SECRET

# 7. Deploy!
wrangler deploy
```

### Development Workflow:

```bash
# Local development
wrangler dev

# Test with local D1
wrangler dev --local

# Deploy to staging
wrangler deploy --env staging

# Deploy to production
wrangler deploy --env production
```

---

## Performance Optimization

### 1. Database Indexes (Critical):

```sql
-- High-frequency queries
CREATE INDEX idx_tasks_assigned_due ON tasks(assigned_to, due_datetime);
CREATE INDEX idx_contacts_pipeline ON contacts(current_pipeline, current_stage);
CREATE INDEX idx_bookings_datetime ON bookings(appointment_datetime);
CREATE INDEX idx_touchpoints_contact_time ON touchpoints(contact_id, timestamp DESC);

-- Webhook lookups
CREATE UNIQUE INDEX idx_contacts_phone ON contacts(phone);
CREATE UNIQUE INDEX idx_bookings_wix_id ON bookings(wix_booking_id);
```

### 2. Caching Strategy:

```typescript
// Cache weekly/monthly reports (KV)
const cacheKey = `report:weekly:${weekStart}`;
const cached = await env.SESSIONS.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const report = await generateWeeklyReport(weekStart, env);

// Cache for 1 hour
await env.SESSIONS.put(cacheKey, JSON.stringify(report), {
  expirationTtl: 3600
});

return report;
```

### 3. Batch Operations:

```typescript
// Batch INSERT for touchpoints
const statements = touchpoints.map(t =>
  env.DB.prepare(`INSERT INTO touchpoints (...) VALUES (...)`)
    .bind(t.id, t.contact_id, t.timestamp, ...)
);

await env.DB.batch(statements);
```

---

## Monitoring & Observability

### Cloudflare Analytics:

- Request count (webhooks, API, cron)
- Error rates
- Response times (P50, P95, P99)
- Queue message processing time

### Custom Logging:

```typescript
// Structured logging
console.log(JSON.stringify({
  timestamp: Date.now(),
  level: 'info',
  event: 'booking_created',
  contact_id: contact.id,
  booking_id: booking.id,
  duration_ms: Date.now() - startTime
}));
```

### Error Tracking:

```typescript
// Catch and log errors
try {
  await processAutomation(event, env);
} catch (error) {
  console.error(JSON.stringify({
    timestamp: Date.now(),
    level: 'error',
    event_type: event.type,
    error: error.message,
    stack: error.stack
  }));

  // Optionally send to external service (Sentry, Datadog, etc.)
  throw error; // Re-throw to trigger retry
}
```

---

## Security Best Practices

### 1. Webhook Signature Validation:

```typescript
function validateWixSignature(signature: string, body: any, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}
```

### 2. API Authentication:

```typescript
async function authenticateStaff(c: Context<{ Bindings: Env }>): Promise<StaffUser | null> {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const sessionData = await c.env.SESSIONS.get(`session:${token}`);
  if (!sessionData) return null;

  return JSON.parse(sessionData);
}
```

### 3. Rate Limiting (per IP):

```typescript
async function rateLimitWebhook(c: Context<{ Bindings: Env }>): Promise<boolean> {
  const ip = c.req.header('CF-Connecting-IP');
  const key = `ratelimit:webhook:${ip}`;

  const count = await c.env.SESSIONS.get(key);
  if (count && parseInt(count) > 100) { // 100 requests per minute
    return false; // Rate limited
  }

  await c.env.SESSIONS.put(key, String((parseInt(count || '0') + 1)), {
    expirationTtl: 60
  });

  return true; // Allowed
}
```

---

## Cost Optimization

### Free Tier Limits (Cloudflare):

| Service | Free Tier | MVP Usage | Cost |
|---------|-----------|-----------|------|
| Workers Requests | 100K/day | ~2K/day | $0 |
| D1 Reads | 5M/day | ~5K/day | $0 |
| D1 Writes | 100K/day | ~500/day | $0 |
| D1 Storage | 5 GB | <100 MB | $0 |
| KV Reads | 100K/day | ~1K/day | $0 |
| KV Writes | 1K/day | ~100/day | $0 |
| Queues | 1M messages/month | ~5K/month | $0 |

**Total Cloudflare: $0/month for MVP** ✅

### External Costs:

- **SMS (ClickSend):** ~$0.04/SMS × 3,000/month = **$120/month**
- **Domain:** ~$15/year = **$1.25/month**

**Total Infrastructure: ~$121/month**

---

## Next Steps

1. ✅ Review specification
2. ✅ Review Cloudflare architecture (this document)
3. ⏭️ Create database migration SQL files
4. ⏭️ Create `wrangler.toml` and `package.json`
5. ⏭️ Build webhook handlers
6. ⏭️ Build automation engine
7. ⏭️ Build staff dashboard UI
8. ⏭️ Deploy to staging
9. ⏭️ Test end-to-end
10. ⏭️ Launch MVP! 🚀

---

**Ready to build? Let's create the database schema next!**
