# Avatar Imaging CRM - Architecture
**Version:** 2.0 (OneOS-Ready Standalone)
**Date:** 2026-01-02

---

## Philosophy: Build for Today, Migrate for Tomorrow

This system is built as a **standalone Cloudflare Workers application** that follows **OneOS architectural patterns** to enable easy migration when OneOS is production-ready.

### Core Principles:

1. **Single Database Gateway** - All DB access through one abstraction layer
2. **Service Layer Isolation** - Business logic never touches DB directly
3. **Event-Driven** - Queues for async work, not tight coupling
4. **Actor-Ready** - Self-contained, message-driven architecture
5. **AI Everywhere** - Every service has AI capabilities
6. **Deny-by-Default Security** - RBAC + IP whitelist at entry

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│  HTTP/Webhooks (External Interface)                         │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Middleware Layer                                           │
│  • IP Whitelist (IPv4/IPv6)                                 │
│  • RBAC (Role-Based Access Control)                         │
│  • HIPAA Audit Logging                                      │
│  • Tenant Isolation (Multi-Location)                        │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Route Handlers (Thin - just routing)                       │
│  • /api/contacts → ContactService                           │
│  • /api/bookings → BookingService                           │
│  • /webhooks/wix → WixWebhookService                        │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Service Layer (Business Logic + AI)                        │
│  • ContactService (AI warmness, enrichment)                 │
│  • BookingService (AI scheduling optimization)              │
│  • TaskService (AI prioritization)                          │
│  • EmailMarketingService (AI campaign generation)           │
│  • ReportingService (AI analytics & insights)               │
│  • AutomationService (AI rule evaluation)                   │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Layer (Workers AI)                                      │
│  • analyzeWarmness()                                        │
│  • detectSMSIntent()                                        │
│  • generateReport()                                         │
│  • enrichContact()                                          │
│  • optimizeSchedule()                                       │
│  • generateEmailCampaign()                                  │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  DatabaseGateway (SINGLE POINT OF DB ACCESS)                │
│  • contacts.*                                               │
│  • bookings.*                                               │
│  • tasks.*                                                  │
│  • locations.*                                              │
│  • permissions.*                                            │
└─────────────────────────────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Cloudflare D1 Database                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Components

### 1. DatabaseGateway (Migration Point)

**Purpose:** Single abstraction layer for all database access

**Current Implementation:** Cloudflare D1
**Future Implementation:** OneOS ObjectStore

```typescript
// Interface stays the same, implementation swaps
interface DatabaseGateway {
  contacts: ContactRepository
  bookings: BookingRepository
  tasks: TaskRepository
  locations: LocationRepository
  permissions: PermissionRepository
}

// TODAY: D1 implementation
class D1DatabaseGateway implements DatabaseGateway {
  constructor(private db: D1Database) {}

  contacts = new D1ContactRepository(this.db)
  bookings = new D1BookingRepository(this.db)
  // ...
}

// FUTURE: OneOS ObjectStore implementation
class OneOSDatabaseGateway implements DatabaseGateway {
  constructor(private objectStore: ObjectStore) {}

  contacts = new OneOSContactRepository(this.objectStore)
  bookings = new OneOSBookingRepository(this.objectStore)
  // ...
}
```

**Migration Impact:** Change 1 file, entire app switches to OneOS

---

### 2. Service Layer (Business Logic)

**Purpose:** All business logic and AI integration

**Key Pattern:** Services never touch database directly

```typescript
class ContactService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private queue: QueueGateway
  ) {}

  async create(data: CreateContactInput, context: Context): Promise<Contact> {
    // 1. AI enrichment
    const enriched = await this.ai.enrichContact(data)

    // 2. Database via gateway (not direct DB access)
    const contact = await this.db.contacts.create({
      ...enriched,
      tenant_id: context.tenant_id
    })

    // 3. Emit event (automation triggers)
    await this.queue.send('automation', {
      type: 'contact_created',
      contact_id: contact.id
    })

    return contact
  }
}
```

**Migration Impact:** Zero - services work identically with OneOS

---

### 3. Middleware (Security & Compliance)

#### IP Whitelist Middleware
```typescript
// Supports IPv4 and IPv6
async function ipWhitelistMiddleware(c: Context, next: Next) {
  const clientIP = c.req.header('CF-Connecting-IP')
  const tenant = c.get('tenant')

  const whitelist = await c.get('db').permissions.getIPWhitelist(tenant.id)

  if (!isIPAllowed(clientIP, whitelist)) {
    return c.json({ error: 'IP not whitelisted' }, 403)
  }

  return next()
}
```

#### RBAC Middleware
```typescript
async function rbacMiddleware(requiredPermission: string) {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    const tenant = c.get('tenant')

    const hasPermission = await c.get('db').permissions.check({
      user_id: user.id,
      tenant_id: tenant.id,
      permission: requiredPermission
    })

    if (!hasPermission) {
      return c.json({ error: 'Permission denied' }, 403)
    }

    return next()
  }
}
```

#### HIPAA Audit Middleware
```typescript
async function hipaaAuditMiddleware(c: Context, next: Next) {
  const startTime = Date.now()
  const user = c.get('user')
  const tenant = c.get('tenant')

  // Execute request
  await next()

  // Log all access (immutable audit trail)
  await c.get('db').auditLog.create({
    user_id: user.id,
    tenant_id: tenant.id,
    action: c.req.method,
    resource: c.req.path,
    ip_address: c.req.header('CF-Connecting-IP'),
    user_agent: c.req.header('User-Agent'),
    duration_ms: Date.now() - startTime,
    timestamp: Date.now()
  })
}
```

---

### 4. AI Layer (Workers AI)

**Purpose:** Centralized AI capabilities for all services

```typescript
class AILayer {
  constructor(private ai: Ai) {}

  // Warmness scoring with AI
  async analyzeWarmness(contact: Contact, touchpoints: Touchpoint[]) {
    const prompt = `Analyze this medical appointment lead...`

    const result = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 256
    })

    return JSON.parse(result.response)
  }

  // Email campaign generation
  async generateEmailCampaign(params: CampaignParams) {
    const prompt = `Generate a professional email campaign...`

    return await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 512
    })
  }

  // Advanced analytics report generation
  async generateInsights(data: ReportData) {
    const prompt = `Analyze this clinic data and provide insights...`

    return await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1024
    })
  }

  // SMS intent detection
  async detectSMSIntent(message: string, context: any) {
    const prompt = `Classify this patient SMS reply...`

    return await this.ai.run('@cf/meta/llama-3.2-1b-instruct', {
      prompt,
      max_tokens: 128
    })
  }
}
```

---

### 5. Multi-Location (Tenant Isolation)

Every request is scoped to a location (tenant):

```typescript
// Middleware extracts tenant from JWT/subdomain
async function tenantMiddleware(c: Context, next: Next) {
  // Option 1: Subdomain (sydney.avatarimaging.com)
  const subdomain = c.req.header('Host')?.split('.')[0]

  // Option 2: JWT claim
  const token = c.req.header('Authorization')
  const claims = verifyJWT(token)

  const tenant = await c.get('db').locations.findByCode(
    subdomain || claims.location
  )

  c.set('tenant', tenant)
  return next()
}

// All database queries scoped to tenant
class D1ContactRepository {
  async list(tenantId: string, filters: Filters) {
    return this.db.prepare(`
      SELECT * FROM contacts
      WHERE tenant_id = ?
      AND ...
    `).bind(tenantId).all()
  }
}
```

---

### 6. Email Marketing Service (New - Phase 1)

```typescript
class EmailMarketingService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer,
    private gmail: GmailClient
  ) {}

  async createCampaign(params: CampaignParams, context: Context) {
    // 1. AI generates campaign content
    const campaign = await this.ai.generateEmailCampaign({
      goal: params.goal,
      audience: params.audience,
      tone: 'professional, caring'
    })

    // 2. Save campaign
    const saved = await this.db.campaigns.create({
      tenant_id: context.tenant_id,
      subject: campaign.subject,
      body_html: campaign.html,
      body_text: campaign.text,
      status: 'draft'
    })

    return saved
  }

  async sendCampaign(campaignId: string, context: Context) {
    const campaign = await this.db.campaigns.get(campaignId)
    const recipients = await this.db.contacts.list(context.tenant_id, {
      filters: campaign.audience_filters
    })

    // Batch send via Gmail API
    for (const contact of recipients) {
      await this.gmail.send({
        to: contact.email,
        subject: campaign.subject,
        html: this.renderTemplate(campaign.body_html, contact)
      })

      // Track touchpoint
      await this.db.touchpoints.create({
        contact_id: contact.id,
        type: 'email_sent',
        channel: 'email',
        campaign_id: campaign.id
      })
    }
  }
}
```

---

### 7. Advanced Reporting Service (AI-Powered)

```typescript
class ReportingService {
  constructor(
    private db: DatabaseGateway,
    private ai: AILayer
  ) {}

  async generateAdvancedReport(params: ReportParams, context: Context) {
    // 1. Query raw data
    const data = await this.db.analytics.query({
      tenant_id: context.tenant_id,
      date_range: params.date_range,
      metrics: params.metrics
    })

    // 2. AI analysis
    const insights = await this.ai.generateInsights({
      data,
      focus: params.focus // 'no_show_reduction', 'warmness_trends', etc.
    })

    // 3. Generate visualizations
    const charts = this.generateCharts(data, insights.recommended_charts)

    return {
      summary: insights.summary,
      key_findings: insights.findings,
      recommendations: insights.recommendations,
      charts,
      raw_data: data
    }
  }

  // Natural language query support (prepare for Alex integration)
  async queryNaturalLanguage(query: string, context: Context) {
    // AI converts NL to structured query
    const structuredQuery = await this.ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt: `Convert this natural language query to JSON:
        "${query}"

        Available metrics: bookings, no_shows, warmness, revenue
        Available dimensions: location, date, service_type

        Return JSON: { metrics: [], dimensions: [], filters: [], date_range: {} }
      `
    })

    const parsed = JSON.parse(structuredQuery.response)
    return await this.generateAdvancedReport(parsed, context)
  }
}
```

---

## OneOS Migration Path

### Current State: Standalone
```typescript
// src/index.ts
const app = new Hono<{ Bindings: Env }>()

// Dependency injection
app.use('*', async (c, next) => {
  const db = new D1DatabaseGateway(c.env.DB)
  const ai = new AILayer(c.env.AI)
  const queue = new CloudflareQueueGateway(c.env.AUTOMATION_QUEUE)

  c.set('db', db)
  c.set('ai', ai)
  c.set('queue', queue)

  await next()
})

// Routes
app.post('/api/contacts', rbac('contacts:create'), async (c) => {
  const service = new ContactService(c.get('db'), c.get('ai'), c.get('queue'))
  const contact = await service.create(await c.req.json(), c.get('context'))
  return c.json(contact)
})
```

### Future State: OneOS Actor
```typescript
// src/actors/AvatarImagingActor.ts
export class AvatarImagingActor extends Actor {
  // Same services, different gateway!
  private db = new OneOSDatabaseGateway(this.objectStore)
  private ai = new AILayer(this.platform.ai)
  private queue = new OneOSQueueGateway(this.platform.queue)

  async handleCommand(command: Command, context: Context) {
    if (command.type === 'create_contact') {
      const service = new ContactService(this.db, this.ai, this.queue)
      return await service.create(command.data, context)
    }
  }
}
```

**Migration Effort:** 1-2 weeks
- Create OneOSDatabaseGateway (implement same interface)
- Wrap services in Actor handleCommand/handleQuery
- Update deployment config
- **Services, AI layer, business logic: unchanged**

---

## Database Schema Updates for Enterprise Features

### New Tables:

#### 1. Locations (Multi-Location Support)
```sql
CREATE TABLE locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,        -- 'sydney', 'melbourne'
  address TEXT,
  timezone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  settings TEXT DEFAULT '{}',       -- JSON: { booking_buffer, operating_hours }
  created_at INTEGER NOT NULL
);
```

#### 2. Permissions (RBAC)
```sql
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,                -- 'admin', 'doctor', 'receptionist', 'readonly'
  resource TEXT NOT NULL,            -- 'contacts', 'bookings', 'reports'
  action TEXT NOT NULL,              -- 'create', 'read', 'update', 'delete'
  conditions TEXT DEFAULT '{}',      -- JSON: { own_location_only: true }
  created_at INTEGER NOT NULL,
  UNIQUE(role, resource, action)
);

CREATE TABLE user_permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  location_id TEXT NOT NULL,
  role TEXT NOT NULL,
  custom_permissions TEXT DEFAULT '[]', -- JSON: override permissions
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES staff_users(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

#### 3. IP Whitelist
```sql
CREATE TABLE ip_whitelist (
  id TEXT PRIMARY KEY,
  location_id TEXT NOT NULL,
  ip_address TEXT NOT NULL,         -- CIDR notation: 203.0.113.0/24, 2001:db8::/32
  ip_version INTEGER NOT NULL,      -- 4 or 6
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);
```

#### 4. Email Campaigns
```sql
CREATE TABLE email_campaigns (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  audience_filters TEXT NOT NULL,   -- JSON: { source: 'meta_ad', warmness: '>70' }
  status TEXT NOT NULL,             -- 'draft', 'scheduled', 'sending', 'completed'
  scheduled_at INTEGER,
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES locations(id)
);
```

#### 5. HIPAA Audit Log
```sql
CREATE TABLE hipaa_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,             -- 'READ', 'CREATE', 'UPDATE', 'DELETE'
  resource_type TEXT NOT NULL,      -- 'contact', 'booking', 'sms_message'
  resource_id TEXT,
  ip_address TEXT NOT NULL,
  user_agent TEXT,
  request_path TEXT,
  request_method TEXT,
  duration_ms INTEGER,
  timestamp INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES staff_users(id),
  FOREIGN KEY (tenant_id) REFERENCES locations(id)
);

CREATE INDEX idx_hipaa_audit_timestamp ON hipaa_audit_log(timestamp DESC);
CREATE INDEX idx_hipaa_audit_user ON hipaa_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_hipaa_audit_resource ON hipaa_audit_log(resource_type, resource_id);
```

---

## Technology Stack

### Runtime
- Cloudflare Workers (serverless edge)
- Hono.js (web framework)

### Database
- Cloudflare D1 (SQLite at edge)
- **Migration path:** OneOS ObjectStore

### AI
- Cloudflare Workers AI
  - Llama 3.1 8B (general intelligence)
  - Llama 3.2 1B (fast intent detection)
  - Mistral 7B (backup model)

### Queue
- Cloudflare Queues
- **Migration path:** OneOS message passing

### External Integrations
- Gmail API (email marketing)
- ClickSend/MessageMedia (SMS)
- Wix Bookings (webhook)
- ManyChat (webhook)

---

## Deployment

### Current: Standalone
```bash
wrangler deploy --env=production
```

### Future: OneOS Actor
```bash
oneos deploy actor avatar_imaging
```

---

## HIPAA Compliance Checklist

- ✅ **Encryption at rest** - Cloudflare D1 encrypted
- ✅ **Encryption in transit** - HTTPS only
- ✅ **Access controls** - RBAC + IP whitelist
- ✅ **Audit trails** - Immutable hipaa_audit_log
- ✅ **Data retention** - Configurable per location
- ✅ **User authentication** - Google OAuth + session management
- ✅ **Automatic logoff** - JWT expiry
- ⏳ **BAA with Cloudflare** - Requires Enterprise plan ($200/month)
- ⏳ **Staff training** - Documentation + onboarding

---

## Next Steps

1. **Update database schema** (locations, permissions, IP whitelist, campaigns, HIPAA audit)
2. **Build DatabaseGateway** (abstraction layer)
3. **Build middleware** (RBAC, IP whitelist, HIPAA audit)
4. **Build services** (Contact, Booking, Task, EmailMarketing, Reporting)
5. **Integrate AI layer** (Workers AI everywhere)
6. **Build Gmail integration** (email marketing)
7. **Build advanced reporting** (AI analytics)
8. **Testing & deployment**

**Timeline:** 6-8 weeks for Phase 1 (extended enterprise features)

---

**Architecture Version:** 2.0
**Status:** Ready for implementation
**OneOS Migration:** Estimated 1-2 weeks when ready
