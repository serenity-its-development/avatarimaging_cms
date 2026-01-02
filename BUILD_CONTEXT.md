# Build Context: Avatar Imaging CRM → Clinic ERP on OneOS
**Date:** 2026-01-02
**Vision:** Medical Clinic ERP Suite running as OneOS Actor ecosystem
**Current Phase:** Phase 1 - CRM Module (Standalone, OneOS-Ready)

---

## Executive Summary

We are building a **complete Medical Clinic ERP system** that will eventually run on the **OneOS platform** as a suite of interconnected actors. However, because OneOS is currently unproven for production workloads, we're starting with a **standalone build** that follows OneOS architectural patterns to enable **seamless migration** when OneOS is ready.

### Key Strategy:
- **Ship urgently:** Build Avatar CRM standalone (Cloudflare Workers)
- **Think long-term:** Follow OneOS patterns (DatabaseGateway, Actor semantics)
- **Migrate easily:** 1-2 week migration when OneOS is production-ready

---

## Full Vision: Clinic ERP Suite on OneOS

```
┌──────────────────────────────────────────────────────────────────┐
│  OneOS Platform                                                  │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │  SecurityGuard     │  │  Alex              │                │
│  │  (RBAC, IP)        │  │  (NL Queries)      │                │
│  └────────────────────┘  └────────────────────┘                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Clinic ERP Actor Suite                                   │  │
│  │                                                            │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │  │
│  │  │ CRMActor    │  │ BillingActor │  │ InventoryActor │  │  │
│  │  │ (Phase 1)   │  │ (Phase 2)    │  │ (Phase 3)      │  │  │
│  │  │             │  │              │  │                │  │  │
│  │  │ - Contacts  │  │ - Invoices   │  │ - Stock Mgmt   │  │  │
│  │  │ - Bookings  │  │ - Payments   │  │ - Orders       │  │  │
│  │  │ - Tasks     │  │ - Insurance  │  │ - Suppliers    │  │  │
│  │  │ - Warmness  │  │ - Claims     │  │ - Expiry Track │  │  │
│  │  └─────────────┘  └──────────────┘  └────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────┐ │  │
│  │  │ StaffingActor  │  │ PatientPortal  │  │ ForgeActor │ │  │
│  │  │ (Phase 4)      │  │ Actor (Phase5) │  │ (Reports)  │ │  │
│  │  │                │  │                │  │            │ │  │
│  │  │ - Schedules    │  │ - Self-booking │  │ - Custom   │ │  │
│  │  │ - Shifts       │  │ - Results      │  │   Reports  │ │  │
│  │  │ - Leave        │  │ - Documents    │  │ - Charts   │ │  │
│  │  │ - Payroll      │  │ - Messaging    │  │ - AI       │ │  │
│  │  └────────────────┘  └────────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  ObjectStore (Unified Database)                           │  │
│  │  All actors share same object graph                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Inter-Actor Communication Examples:

```typescript
// Alex query: "Show me unpaid invoices for patients who no-showed last month"
Alex → CRMActor.query({ type: 'no_shows', date_range: 'last_month' })
     → BillingActor.query({ type: 'unpaid_invoices', patient_ids: [...] })
     → Forge.generate_report(data)

// Automatic workflow: Appointment completed → Generate invoice
CRMActor.emit('appointment_completed', { booking_id, patient_id })
  → BillingActor.handleEvent('create_invoice', { booking_id })
  → PatientPortalActor.handleEvent('notify_patient', { invoice_id })

// Inventory depletion: Medical supplies low
InventoryActor.emit('stock_low', { item: 'Contrast Dye', current: 5, min: 20 })
  → StaffingActor.handleEvent('create_task', { type: 'order_supplies' })
  → Alex.notify('admin', 'Contrast Dye stock low (5 remaining)')
```

---

## Phase Roadmap

### **Phase 1: CRM Module (Current - 6-8 weeks)**
**Status:** Building standalone, OneOS-ready
**Deployment:** Cloudflare Workers (independent)

**Features:**
- ✅ Contact management (multi-location, RBAC)
- ✅ Booking management (Wix integration)
- ✅ Task automation (AI-powered priority)
- ✅ SMS automation (2-way, intent detection)
- ✅ Email marketing (Gmail API, AI campaigns)
- ✅ Advanced reporting (AI analytics)
- ✅ Warmness scoring (AI-enhanced)
- ✅ HIPAA compliance (audit log, encryption, BAA-ready)
- ✅ IP whitelist (IPv4/IPv6)
- ✅ Multi-location support

**OneOS-Ready Patterns:**
- DatabaseGateway (single DB access point)
- Event-driven (Cloudflare Queues → OneOS messages)
- Actor semantics (self-contained services)
- Deny-by-default security

**Migration Effort to OneOS:** 1-2 weeks

---

### **Phase 2: Billing Module (3-4 months post-Phase 1)**
**Status:** Not started
**Deployment:** OneOS Actor (if ready) OR standalone

**Features:**
- Invoice generation (auto-create from bookings)
- Payment processing (Stripe/Square)
- Insurance claims (Medicare, private insurance)
- Payment plans & installments
- Overdue management (automated reminders)
- Financial reporting (P&L, revenue by service)
- AI-powered revenue forecasting

**Depends On:**
- CRMActor (patient/booking data)

**Provides To:**
- PatientPortalActor (invoice access)
- StaffingActor (commission calculations)

---

### **Phase 3: Inventory Module (4-5 months post-Phase 1)**
**Status:** Not started
**Deployment:** OneOS Actor

**Features:**
- Stock management (medical supplies, consumables)
- Supplier management
- Purchase orders
- Expiry tracking (critical for medical supplies)
- Usage analytics (cost per procedure)
- AI-powered reorder predictions

**Depends On:**
- BillingActor (cost allocation)

**Provides To:**
- CRMActor (procedure availability)
- StaffingActor (inventory tasks)

---

### **Phase 4: Staffing Module (5-6 months post-Phase 1)**
**Status:** Not started
**Deployment:** OneOS Actor

**Features:**
- Doctor/staff schedules
- Shift management
- Leave requests (approval workflow)
- Payroll integration
- Performance tracking
- AI-powered optimal staffing

**Depends On:**
- CRMActor (appointment schedules)
- BillingActor (commission calculations)

**Provides To:**
- CRMActor (staff availability for bookings)

---

### **Phase 5: Patient Portal (6-7 months post-Phase 1)**
**Status:** Not started
**Deployment:** OneOS Actor (public-facing)

**Features:**
- Self-service booking (Wix replacement)
- View test results
- Download invoices/receipts
- Secure messaging with clinic
- Document upload (referrals, insurance)
- AI chatbot (pre-screening questions)

**Depends On:**
- CRMActor (bookings, contacts)
- BillingActor (invoices, payments)

**Provides To:**
- Patients (public-facing UI)

---

## OneOS Architecture Principles (Followed in Phase 1)

### 1. **Single Database Gateway**

**Why:** In OneOS, all actors use ObjectStore. In standalone, we use DatabaseGateway to simulate this.

```typescript
// ❌ BAD: Direct DB access in route handler
app.get('/contacts', async (c) => {
  const contacts = await c.env.DB.prepare('SELECT * FROM contacts').all()
  return c.json(contacts)
})

// ✅ GOOD: Access through DatabaseGateway
app.get('/contacts', async (c) => {
  const contacts = await c.get('db').contacts.list({
    tenant_id: c.get('tenant').id
  })
  return c.json(contacts)
})

// MIGRATION: Just swap DatabaseGateway implementation
// D1DatabaseGateway → OneOSDatabaseGateway
// Services/routes unchanged!
```

### 2. **Actor Semantics (Self-Contained)**

**Why:** OneOS actors are isolated, message-driven units. We build CRM as if it's already an actor.

```typescript
// Current: Standalone Worker
export default {
  async fetch(request, env, ctx) {
    // Handle HTTP requests
  },
  async queue(batch, env, ctx) {
    // Handle queue messages
  }
}

// Future: OneOS Actor
export class CRMActor extends Actor {
  async handleQuery(query, ctx) {
    // Same logic, different interface
  },
  async handleCommand(command, ctx) {
    // Same logic, different interface
  },
  async handleMessage(message, ctx) {
    // Queue consumers become message handlers
  }
}
```

### 3. **Event-Driven (Message Passing)**

**Why:** Actors communicate via messages, not direct function calls.

```typescript
// Current: Cloudflare Queues
await env.AUTOMATION_QUEUE.send({
  type: 'contact_created',
  contact_id: contact.id
})

// Future: OneOS Message Passing
await this.send('automation_actor', {
  type: 'contact_created',
  contact_id: contact.id
})

// Logic stays identical!
```

### 4. **Deny-by-Default Security**

**Why:** OneOS SecurityGuard enforces deny-by-default. We implement same pattern.

```typescript
// Every request checked against RBAC
async function rbacMiddleware(permission: string) {
  return async (c: Context, next: Next) => {
    const allowed = await c.get('db').permissions.check({
      user_id: c.get('user').id,
      tenant_id: c.get('tenant').id,
      permission
    })

    if (!allowed) return c.json({ error: 'Forbidden' }, 403)
    return next()
  }
}

// Future: SecurityGuard handles this automatically
// Middleware can be removed, SecurityGuard checks before actor sees request
```

### 5. **Immutable Audit Trail**

**Why:** OneOS ObjectStore logs all mutations. We replicate with hipaa_audit_log.

```typescript
// Current: Manual audit logging
await db.hipaaAuditLog.create({
  user_id, action, resource_type, resource_id, ...
})

// Future: Automatic (ObjectStore logs all creates/updates/deletes)
// hipaa_audit_log becomes a view over ObjectStore events
```

### 6. **AI as First-Class Citizen**

**Why:** OneOS has platform AI layer. We build AILayer abstraction to match.

```typescript
// Current: Direct Workers AI calls
const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {...})

// Better: Through AILayer abstraction
const result = await ai.analyzeWarmness(contact, touchpoints)

// Future: OneOS AI router
const result = await this.platform.ai.analyze('warmness', {contact, touchpoints})
// Platform picks best model, caches, logs usage
```

---

## Migration Strategy: Standalone → OneOS

### When to Migrate:

**Migrate when ALL of the following are true:**
1. ✅ OneOS is production-stable (proven uptime, performance)
2. ✅ OneOS ObjectStore supports complex queries (filters, joins, pagination)
3. ✅ OneOS SecurityGuard is HIPAA-compliant (formal BAA available)
4. ✅ Phase 2+ modules are ready (BillingActor benefits from shared ObjectStore)
5. ✅ Alex/Forge integration provides value (natural language queries, custom reports)

### Migration Steps (1-2 weeks):

#### **Week 1: Infrastructure**

**Day 1-2: Create OneOSDatabaseGateway**
```typescript
// Implement DatabaseGateway interface using ObjectStore
class OneOSDatabaseGateway implements DatabaseGateway {
  constructor(private objectStore: ObjectStore) {}

  contacts = new OneOSContactRepository(this.objectStore)
  bookings = new OneOSBookingRepository(this.objectStore)
  tasks = new OneOSTaskRepository(this.objectStore)
  // ...
}

// Map SQL schema to ObjectStore types
// contacts table → { type: 'contact', tenant: 'sydney', data: {...} }
```

**Day 3-4: Wrap as CRMActor**
```typescript
export class CRMActor extends Actor {
  name = 'clinic_crm'

  // Inject OneOSDatabaseGateway
  private db = new OneOSDatabaseGateway(this.objectStore)
  private ai = new AILayer(this.platform.ai)
  private queue = new OneOSQueueGateway(this.platform)

  async handleCommand(command: Command, ctx: Context) {
    // Route commands to existing services
    const services = this.getServices() // ContactService, BookingService, etc.

    if (command.type === 'create_contact') {
      return await services.contact.create(command.data, ctx)
    }
    // Services unchanged - same code!
  }

  async handleQuery(query: Query, ctx: Context) {
    // Route queries to existing services
  }

  async handleMessage(message: Message, ctx: Context) {
    // Queue consumers become message handlers
  }
}
```

**Day 5: Remove middleware (rely on SecurityGuard)**
- Delete RBAC middleware (SecurityGuard handles)
- Delete IP whitelist middleware (SecurityGuard handles)
- Keep HIPAA audit middleware (transitionally, until ObjectStore audit is proven)

#### **Week 2: Testing & Deployment**

**Day 6-8: Integration testing**
- Test all API endpoints (should work identically)
- Test Alex integration ("Show me high warmness leads")
- Test Forge integration (custom reports)
- Load testing (same performance as standalone?)

**Day 9-10: Data migration**
```bash
# Export from D1
wrangler d1 export avatarimaging-crm-prod > backup.sql

# Convert SQL to ObjectStore objects
node scripts/migrate-to-objectstore.js backup.sql

# Import to OneOS ObjectStore
oneos import clinic_crm objectstore.json
```

**Day 11-12: Parallel deployment**
- Deploy CRMActor to OneOS staging
- Run both systems in parallel (1 week)
- Compare audit logs, performance metrics
- Gradual cutover by location (Sydney first, then others)

**Day 13-14: Cutover**
- Switch DNS to OneOS CRMActor
- Monitor for issues
- Decommission standalone Worker

---

## Why This Approach Works

### ✅ **Urgency Satisfied**
- Ship Avatar CRM standalone in 6-8 weeks
- Start generating revenue immediately
- No OneOS dependency blocking launch

### ✅ **Future-Proof**
- DatabaseGateway abstraction = easy migration
- Service layer unchanged when migrating
- Event-driven = already actor-like

### ✅ **Incremental Value**
- CRM works standalone (value today)
- Billing module can be standalone too (if OneOS still not ready)
- Migrate modules one-by-one as OneOS matures

### ✅ **No Wasted Work**
- Services written once, work in both environments
- AI layer abstraction reused in OneOS
- RBAC logic becomes reference for SecurityGuard integration

### ✅ **De-Risked**
- Prove CRM works before committing to OneOS
- Validate market fit independently
- OneOS failure doesn't kill the product

---

## Key Architectural Decisions

### Decision 1: DatabaseGateway Pattern

**Why:** Single point of database access enables swapping D1 → ObjectStore

**Trade-off:**
- ❌ Slight performance overhead (abstraction layer)
- ✅ Massive migration simplification (change 1 file, entire app switches)

**Verdict:** Worth it. Migration is 90% easier.

---

### Decision 2: AI Everywhere

**Why:** OneOS vision is AI-native. Every service should have AI capabilities.

**Implementation:**
```typescript
// Every service gets AILayer injected
class ContactService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer, // ← AI is a dependency
    private queue: QueueGateway
  ) {}

  async create(data) {
    // AI enrichment before saving
    const enriched = await this.ai.enrichContact(data)
    return await this.db.contacts.create(enriched)
  }
}
```

**AI Use Cases (CRM Module):**
1. Warmness scoring (intent + engagement analysis)
2. SMS intent detection (confirm/cancel/reschedule)
3. Email campaign generation (subject + body)
4. Report insights (trend analysis, recommendations)
5. Contact enrichment (extract intent from free-text)
6. Task prioritization (predict urgency)
7. No-show prediction (flag high-risk bookings)

---

### Decision 3: Multi-Tenancy (Multi-Location)

**Why:** Clinic ERP needs multi-location from day 1

**Implementation:**
- Every table has `tenant_id` (foreign key to `locations`)
- Middleware extracts tenant from JWT/subdomain
- All queries scoped to tenant automatically

**OneOS Advantage:**
- ObjectStore has native tenant isolation
- Migration makes tenant handling even cleaner

---

### Decision 4: HIPAA Compliance Built-In

**Why:** Medical data = strict compliance requirements

**Implementation:**
- Immutable audit log (hipaa_audit_log table)
- Every API request logged (who, what, when, where)
- PHI access flag (track access to Protected Health Info)
- Encryption at rest/transit (Cloudflare built-in)
- IP whitelist (restrict access to known locations)

**OneOS Advantage:**
- Platform-wide BAA (one agreement covers all actors)
- SecurityGuard enforces compliance automatically

---

## Build Checklist (Phase 1)

### ✅ Foundation
- [x] Database schema (001_initial_schema.sql)
- [x] Enterprise features schema (002_enterprise_features.sql)
- [x] TypeScript types (env.ts, entities.ts)
- [x] Project structure (src/, migrations/, tests/)
- [x] wrangler.toml configuration
- [x] package.json dependencies

### 🔨 In Progress
- [ ] DatabaseGateway interface
- [ ] D1DatabaseGateway implementation
- [ ] Repository layer (ContactRepository, BookingRepository, etc.)
- [ ] AILayer abstraction
- [ ] Service layer (ContactService, BookingService, etc.)
- [ ] Middleware (RBAC, IP whitelist, HIPAA audit)
- [ ] Route handlers (thin routing layer)
- [ ] Queue consumers (automation, SMS)
- [ ] Cron jobs (reminders, recalls, warmness recalc)

### ⏭️ Not Started
- [ ] Gmail API integration (email marketing)
- [ ] Wix webhook handlers
- [ ] ManyChat webhook handlers
- [ ] SMS provider integration (ClickSend)
- [ ] React frontend (staff dashboard)
- [ ] Advanced reporting UI
- [ ] Testing suite
- [ ] Deployment scripts
- [ ] Documentation

---

## Developer Reference

### Project Structure
```
/root/git/avatarimaging_crm/
├── migrations/
│   ├── 001_initial_schema.sql          # Core CRM tables
│   └── 002_enterprise_features.sql     # Multi-location, RBAC, email, HIPAA
├── src/
│   ├── gateway/
│   │   ├── DatabaseGateway.ts          # Interface (DB abstraction)
│   │   ├── D1DatabaseGateway.ts        # D1 implementation (current)
│   │   └── OneOSDatabaseGateway.ts     # OneOS implementation (future)
│   ├── repositories/
│   │   ├── ContactRepository.ts
│   │   ├── BookingRepository.ts
│   │   ├── TaskRepository.ts
│   │   └── ...
│   ├── services/
│   │   ├── ContactService.ts           # Business logic + AI
│   │   ├── BookingService.ts
│   │   ├── EmailMarketingService.ts
│   │   ├── ReportingService.ts
│   │   └── ...
│   ├── ai/
│   │   └── AILayer.ts                  # Workers AI abstraction
│   ├── middleware/
│   │   ├── rbac.ts                     # Role-based access control
│   │   ├── ipWhitelist.ts              # IPv4/IPv6 whitelist
│   │   ├── hipaaAudit.ts               # Audit logging
│   │   └── tenant.ts                   # Multi-location isolation
│   ├── webhooks/
│   │   ├── wix.ts
│   │   ├── manychat.ts
│   │   └── sms.ts
│   ├── queues/
│   │   ├── automation.ts               # Automation queue consumer
│   │   └── sms.ts                      # SMS queue consumer
│   ├── cron/
│   │   ├── reminders.ts                # Daily/hourly reminders
│   │   └── warmness.ts                 # Recalculate warmness scores
│   ├── actors/
│   │   └── CRMActor.ts                 # Future: OneOS actor wrapper
│   ├── types/
│   │   ├── env.ts                      # Cloudflare bindings
│   │   └── entities.ts                 # Database entities
│   └── index.ts                        # Entry point (Hono app)
├── public/                             # React frontend (Phase 1.5)
├── tests/                              # Vitest tests
├── scripts/                            # Utility scripts
├── docs/
│   ├── ARCHITECTURE.md                 # Technical architecture
│   ├── BUILD_CONTEXT.md                # This file
│   ├── SPECIFICATION.md                # Full spec
│   ├── CLOUDFLARE_ARCHITECTURE.md      # Cloudflare deployment
│   ├── WORKERS_AI_INTEGRATION.md       # AI use cases
│   └── ENTERPRISE_GAP_ANALYSIS.md      # vs Salesforce/HubSpot
├── wrangler.toml                       # Cloudflare config
└── package.json                        # Dependencies
```

---

## Quick Start (For Future Developers)

### Setup
```bash
cd /root/git/avatarimaging_crm
npm install
```

### Local Development
```bash
# Start frontend + worker simultaneously
npm run dev:all

# Or separate terminals:
npm run dev          # Vite (React frontend)
npm run dev:worker   # Wrangler (Cloudflare Worker)
```

### Database
```bash
# Initialize local D1 database
npm run db:init

# Query local database
npm run db:shell

# Production database
npm run db:init:prod
npm run db:shell:prod
```

### Deployment
```bash
# Deploy to development
npm run deploy:dev

# Deploy to production
npm run deploy
```

### Testing
```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## Contact & Maintenance

**Primary Developer:** [Your Name]
**Project Start:** 2026-01-02
**Expected Phase 1 Completion:** 2026-02-15 (6 weeks)
**OneOS Migration Target:** 2026-Q3 (when OneOS production-ready)

**Critical Files for OneOS Migration:**
1. `src/gateway/DatabaseGateway.ts` - Interface definition
2. `src/services/*.ts` - Business logic (stays unchanged)
3. `src/ai/AILayer.ts` - AI abstraction (stays unchanged)
4. `src/actors/CRMActor.ts` - Actor wrapper (create during migration)

**Don't Touch During Migration:**
- Service layer (ContactService, BookingService, etc.)
- AI layer (already abstracted)
- Type definitions (entities.ts)

**Must Change During Migration:**
- DatabaseGateway implementation (D1 → ObjectStore)
- Index.ts (Hono app → Actor handleCommand/handleQuery)
- Middleware (remove RBAC/IP whitelist, rely on SecurityGuard)

---

**Build Context Version:** 1.0
**Last Updated:** 2026-01-02
**Status:** Phase 1 in progress - building standalone with OneOS migration path
