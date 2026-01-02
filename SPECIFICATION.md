# Avatar Imaging CMS - Technical Specification

**Version:** 1.0
**Date:** 2026-01-02
**Status:** MVP Specification
**Platform:** Cloudflare Workers + D1 Database

---

## Executive Summary

Avatar Imaging CMS is an **automation-first, event-driven customer management system** designed specifically for medical imaging practices with attended appointments. The system manages the complete patient journey from lead capture through booking, attendance, and recall.

### Key Features:
- ✅ **Event-Driven Architecture** - Wix webhook integration for real-time booking sync
- ✅ **Pipeline Automation** - 4 distinct pipelines (Lead→Booking, Pre-Appointment, Post-Appointment, Partnerships)
- ✅ **Intelligent Task Management** - Priority-scored task queue with auto-assignment
- ✅ **Multi-Touch Attribution** - First-touch and last-touch tracking across all channels
- ✅ **Warmness Scoring** - AI-like lead prioritization based on intent, source, and engagement
- ✅ **SMS Automation** - Two-way messaging with confirmation detection
- ✅ **Comprehensive Reporting** - Weekly and monthly analytics with actionable insights

### Primary KPI:
**Attended Appointments** - Everything optimizes for getting patients in the door.

---

## System Architecture

### Technology Stack:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Runtime** | Cloudflare Workers | Edge compute, serverless functions |
| **Database** | Cloudflare D1 (SQLite) | Relational data storage |
| **Storage** | Cloudflare R2 | Document/file storage (optional) |
| **Cache** | Cloudflare KV | Session management, fast lookups |
| **Queue** | Cloudflare Queues | Async task processing |
| **Webhooks** | Wix Bookings API | Real-time booking events |
| **SMS** | ClickSend/MessageMedia | Two-way messaging (Australian) |
| **Frontend** | React + Tailwind CSS | Staff dashboard UI |

### Event Flow:

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTERNAL SOURCES                          │
│  • Wix Bookings (webhook)                                   │
│  • ManyChat (webhook)                                       │
│  • Meta Ads (UTM tracking)                                  │
│  • SMS Provider (inbound webhook)                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  EVENT PROCESSOR                             │
│  • Validates webhook signatures                             │
│  • Normalizes event data                                    │
│  • Creates immutable event log                              │
│  • Triggers automation engine                               │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴────────────┐
         ▼                        ▼
┌──────────────────┐    ┌──────────────────┐
│ AUTOMATION       │    │ DATA LAYER       │
│ ENGINE           │    │                  │
│ • Pipeline       │    │ • Contact        │
│   transitions    │    │ • Booking        │
│ • Task creation  │    │ • Touchpoint     │
│ • SMS scheduling │    │ • Task           │
│ • Attribution    │    │ • Event Log      │
│ • Warmness calc  │    │                  │
└────────┬─────────┘    └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  TASK QUEUE                                  │
│  • Priority calculation                                     │
│  • Staff assignment                                         │
│  • Due date management                                      │
│  • Overdue detection                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  STAFF DASHBOARD                             │
│  • Today's tasks view                                       │
│  • Contact timeline                                         │
│  • Pipeline visualization                                   │
│  • Reporting interface                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Model

### Core Entities

#### 1. Contact (Patient/Lead)

```sql
CREATE TABLE contacts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  source TEXT NOT NULL,              -- First-touch attribution
  current_pipeline TEXT NOT NULL,    -- lead_to_booking, pre_appointment, post_appointment, partnership
  current_stage TEXT NOT NULL,       -- Stage within pipeline
  warmness_score INTEGER DEFAULT 0,  -- Calculated score 0-100
  is_existing_patient BOOLEAN DEFAULT FALSE,
  created_at INTEGER NOT NULL,       -- Unix timestamp
  updated_at INTEGER NOT NULL,

  UNIQUE(phone),
  INDEX idx_pipeline_stage (current_pipeline, current_stage),
  INDEX idx_warmness (warmness_score DESC),
  INDEX idx_created (created_at DESC)
);
```

**Pipelines & Stages:**
- `lead_to_booking`: new_lead, contacted, engaged, booking_attempted, booked, dead_lost
- `pre_appointment`: booking_confirmed, reminded, confirmed, needs_attention, ready
- `post_appointment`: attended, review_requested, referral_invited, recall_due, cancelled_rescue, did_not_attend, dormant
- `partnership`: identified, qualified, contacted, in_discussion, active, completed

#### 2. Touchpoint

```sql
CREATE TABLE touchpoints (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,                 -- ad_click, manychat_interaction, sms_sent, sms_received, etc.
  source TEXT NOT NULL,               -- Meta, ManyChat, SMS, Email, Manual
  channel TEXT,                       -- Specific campaign/flow name
  details TEXT,                       -- JSON: campaign, message content, response, etc.
  is_attribution_event BOOLEAN DEFAULT FALSE,

  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  INDEX idx_contact_time (contact_id, timestamp DESC),
  INDEX idx_type (type),
  INDEX idx_attribution (is_attribution_event, timestamp DESC)
);
```

**Common Touchpoint Types:**
- `ad_click`, `landing_page_visit`, `form_submit`
- `manychat_subscribe`, `manychat_flow_complete`, `manychat_button_click`
- `sms_sent`, `sms_received`, `sms_delivered`, `sms_failed`
- `email_sent`, `email_opened`, `email_clicked`
- `call_attempted`, `call_connected`, `call_voicemail`
- `booking_created`, `booking_confirmed`, `booking_cancelled`, `booking_rescheduled`
- `appointment_attended`, `appointment_no_show`
- `review_requested`, `review_received`

#### 3. Booking

```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  wix_booking_id TEXT UNIQUE,        -- External reference
  contact_id TEXT NOT NULL,
  appointment_datetime INTEGER NOT NULL,
  service_type TEXT NOT NULL,        -- procedure, follow_up, routine
  urgency_level TEXT NOT NULL,       -- high, medium, low
  status TEXT NOT NULL,              -- scheduled, confirmed, cancelled, rescheduled
  outcome TEXT,                      -- null, attended, no_show
  payment_status TEXT,               -- unpaid, paid, pending
  first_touch_attribution TEXT,      -- Source that created the lead
  last_touch_attribution TEXT,       -- Last touchpoint before booking
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,

  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  INDEX idx_appointment_date (appointment_datetime),
  INDEX idx_contact (contact_id),
  INDEX idx_status (status),
  INDEX idx_outcome (outcome)
);
```

#### 4. Task

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  booking_id TEXT,                   -- Nullable
  type TEXT NOT NULL,                -- call, sms_followup, welcome_call, rescue, recall, review_request, etc.
  assigned_to TEXT,                  -- Staff user ID, nullable for auto-assignment
  due_datetime INTEGER NOT NULL,
  priority_score INTEGER NOT NULL,   -- Calculated 0-200
  status TEXT NOT NULL,              -- todo, in_progress, completed, cancelled
  created_by TEXT NOT NULL,          -- system or user_id
  completed_at INTEGER,
  notes TEXT,

  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  INDEX idx_assigned_due (assigned_to, due_datetime),
  INDEX idx_priority (priority_score DESC, due_datetime),
  INDEX idx_status (status, due_datetime)
);
```

**Task Types:**
- `call`: Generic call task
- `welcome_call`: New patient welcome
- `sms_followup`: Follow-up on SMS
- `rescue_call`: Cancelled booking rescue
- `recall_reminder`: Recall due reminder
- `review_request`: Request Google review
- `referral_invite`: Send referral program invite
- `no_show_followup`: No-show follow-up
- `confirmation_call`: No confirmation received

#### 5. Event Log (Immutable)

```sql
CREATE TABLE event_log (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  contact_id TEXT,
  booking_id TEXT,
  timestamp INTEGER NOT NULL,
  source TEXT NOT NULL,              -- wix, manychat, sms_provider, system, user
  raw_payload TEXT,                  -- JSON of original event
  processed_at INTEGER,

  INDEX idx_type_time (event_type, timestamp DESC),
  INDEX idx_contact (contact_id, timestamp DESC)
);
```

#### 6. Staff Users

```sql
CREATE TABLE staff_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,                -- admin, staff, readonly
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER NOT NULL,

  INDEX idx_active (is_active)
);
```

#### 7. SMS Messages (Two-Way Log)

```sql
CREATE TABLE sms_messages (
  id TEXT PRIMARY KEY,
  contact_id TEXT NOT NULL,
  direction TEXT NOT NULL,           -- inbound, outbound
  message_text TEXT NOT NULL,
  provider_message_id TEXT,          -- External reference
  status TEXT NOT NULL,              -- sent, delivered, failed, received
  sent_at INTEGER NOT NULL,
  delivered_at INTEGER,

  FOREIGN KEY (contact_id) REFERENCES contacts(id),
  INDEX idx_contact_time (contact_id, sent_at DESC),
  INDEX idx_direction (direction, sent_at DESC)
);
```

#### 8. Automation Rules (Configuration)

```sql
CREATE TABLE automation_rules (
  id TEXT PRIMARY KEY,
  trigger_event TEXT NOT NULL,       -- booking_created, sms_received, lead_created, etc.
  conditions TEXT,                   -- JSON: warmness >= 70, urgency = high, etc.
  actions TEXT NOT NULL,             -- JSON array of actions to execute
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 100,      -- Execution order

  INDEX idx_trigger_active (trigger_event, is_active)
);
```

**Example Automation Rule:**
```json
{
  "id": "rule_welcome_sms",
  "trigger_event": "lead_created",
  "conditions": null,
  "actions": [
    {
      "type": "send_sms",
      "template": "welcome_lead",
      "delay_seconds": 0
    },
    {
      "type": "create_task",
      "task_type": "sms_followup",
      "delay_seconds": 300
    },
    {
      "type": "update_pipeline",
      "stage": "new_lead"
    }
  ],
  "is_active": true,
  "priority": 100
}
```

---

## API Endpoints

### Webhook Endpoints (Public)

#### `POST /webhooks/wix/bookings`
**Purpose:** Receive booking events from Wix
**Authentication:** Webhook signature validation

**Request Body:**
```json
{
  "event": "bookings/created",
  "bookingId": "wix_12345",
  "contactId": "wix_contact_789",
  "serviceId": "service_abc",
  "startTime": "2026-01-05T10:00:00Z",
  "status": "scheduled",
  "customerInfo": {
    "name": "Jane Doe",
    "phone": "+61400000000",
    "email": "jane@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "contactId": "contact_abc123",
  "bookingId": "booking_xyz456"
}
```

**Actions:**
1. Validate webhook signature
2. Create/update Contact
3. Create/update Booking
4. Trigger automation rules
5. Return 200 OK immediately
6. Process automation asynchronously

---

#### `POST /webhooks/manychat`
**Purpose:** Receive ManyChat interaction events

**Request Body:**
```json
{
  "event": "flow_completed",
  "subscriber": {
    "name": "John Smith",
    "phone": "+61411222333",
    "email": "john@example.com"
  },
  "flow_name": "High Risk Inquiry",
  "buttons_clicked": ["Book Now", "Learn More"],
  "intent": "procedure"
}
```

**Actions:**
1. Create/update Contact
2. Log Touchpoint
3. Calculate warmness score
4. Trigger lead automation

---

#### `POST /webhooks/sms/inbound`
**Purpose:** Receive inbound SMS from provider

**Request Body (ClickSend format):**
```json
{
  "message_id": "cs_msg_12345",
  "from": "+61400000000",
  "to": "+61300000000",
  "body": "Yes I confirm",
  "timestamp": "2026-01-02T10:30:00Z"
}
```

**Actions:**
1. Match Contact by phone
2. Log SMS message
3. Create Touchpoint
4. Detect confirmation reply pattern
5. Update booking status if confirmation
6. Cancel pending tasks if engaged

---

### Internal API Endpoints (Staff Dashboard)

#### `GET /api/tasks`
**Purpose:** Get task list for staff member
**Authentication:** Session token

**Query Parameters:**
- `assigned_to`: User ID (optional, defaults to current user)
- `status`: `todo`, `in_progress`, `completed` (default: `todo`)
- `timeframe`: `overdue`, `today`, `upcoming` (default: `today`)

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_123",
      "type": "rescue_call",
      "contact": {
        "id": "contact_abc",
        "name": "Sarah Johnson",
        "phone": "+61400111222"
      },
      "booking": {
        "id": "booking_xyz",
        "appointment_datetime": 1704451200,
        "urgency_level": "high"
      },
      "priority_score": 150,
      "due_datetime": 1704441600,
      "status": "todo",
      "notes": "Procedure on Tuesday, needs urgent reschedule"
    }
  ],
  "counts": {
    "overdue": 2,
    "today": 5,
    "upcoming": 12
  }
}
```

---

#### `POST /api/tasks/:taskId/complete`
**Purpose:** Mark task as completed

**Request Body:**
```json
{
  "notes": "Called and rescheduled for next week",
  "outcome": "success"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "id": "task_123",
    "status": "completed",
    "completed_at": 1704445200
  }
}
```

---

#### `GET /api/contacts/:contactId`
**Purpose:** Get contact details with full timeline

**Response:**
```json
{
  "contact": {
    "id": "contact_abc",
    "name": "Sarah Johnson",
    "phone": "+61400111222",
    "email": "sarah@example.com",
    "source": "Meta Ads",
    "current_pipeline": "pre_appointment",
    "current_stage": "confirmed",
    "warmness_score": 85,
    "is_existing_patient": false
  },
  "bookings": [
    {
      "id": "booking_xyz",
      "appointment_datetime": 1704451200,
      "service_type": "procedure",
      "status": "confirmed",
      "urgency_level": "high"
    }
  ],
  "touchpoints": [
    {
      "timestamp": 1704400000,
      "type": "ad_click",
      "source": "Meta",
      "details": { "campaign": "High Risk Awareness" }
    },
    {
      "timestamp": 1704400300,
      "type": "manychat_flow_complete",
      "source": "ManyChat",
      "details": { "flow": "High Risk Inquiry" }
    }
  ],
  "tasks": [
    {
      "id": "task_456",
      "type": "confirmation_call",
      "status": "completed",
      "completed_at": 1704420000
    }
  ]
}
```

---

#### `POST /api/contacts`
**Purpose:** Create new contact manually

**Request Body:**
```json
{
  "name": "Alex Wong",
  "phone": "+61411333444",
  "email": "alex@example.com",
  "source": "Walk-in",
  "intent": "routine_check"
}
```

**Actions:**
1. Create Contact
2. Calculate initial warmness score
3. Trigger lead automation
4. Create welcome SMS task

---

#### `POST /api/sms/send`
**Purpose:** Send SMS manually from dashboard

**Request Body:**
```json
{
  "contact_id": "contact_abc",
  "message": "Hi Sarah! Just confirming your appointment tomorrow at 10am."
}
```

**Actions:**
1. Send via SMS provider
2. Log SMS message
3. Create Touchpoint
4. Return delivery status

---

#### `GET /api/reports/weekly`
**Purpose:** Generate weekly report

**Query Parameters:**
- `week_start`: ISO date (default: last Monday)

**Response:**
```json
{
  "period": {
    "start": "2026-01-05",
    "end": "2026-01-11"
  },
  "kpi": {
    "attended_appointments": 47,
    "attendance_rate": 0.84,
    "change_vs_last_week": 0.12
  },
  "funnel": {
    "new_leads": 63,
    "speed_to_lead_under_5min": 0.78,
    "contacted_same_day": 0.95,
    "booked": 24,
    "conversion_lead_to_booking": 0.38
  },
  "channels": [
    {
      "name": "Meta Ads",
      "attended_appointments": 18,
      "percentage": 0.38
    }
  ]
}
```

---

## Automation Rules Specification

### Pipeline A: Lead to Booking

#### Rule: On Lead Created
**Trigger:** `lead_created` event

**Actions:**
```json
[
  {
    "type": "calculate_warmness",
    "inputs": ["source", "intent", "engagement_signals"]
  },
  {
    "type": "send_sms",
    "template": "welcome_lead",
    "delay_seconds": 0,
    "message": "Hi {name}! Thanks for reaching out to {clinic}. We've received your inquiry about {intent}. A team member will call you within 5 minutes. Quick question: {booking_link}"
  },
  {
    "type": "create_task",
    "task_type": "call",
    "conditions": {"warmness": {"gte": 70}},
    "priority": "high",
    "due_in_seconds": 300
  },
  {
    "type": "create_task",
    "task_type": "sms_followup",
    "conditions": {"warmness": {"lt": 70}},
    "priority": "medium",
    "due_in_seconds": 300
  },
  {
    "type": "update_pipeline",
    "pipeline": "lead_to_booking",
    "stage": "new_lead"
  },
  {
    "type": "log_touchpoint",
    "touchpoint_type": "lead_created",
    "is_attribution": true
  }
]
```

---

#### Rule: On SMS Reply Received
**Trigger:** `sms_received` event

**Conditions:**
```json
{
  "current_pipeline": "lead_to_booking",
  "current_stage": {"in": ["new_lead", "contacted"]}
}
```

**Actions:**
```json
[
  {
    "type": "log_touchpoint",
    "touchpoint_type": "sms_received",
    "update_last_touch": true
  },
  {
    "type": "update_pipeline",
    "stage": "engaged"
  },
  {
    "type": "cancel_pending_tasks",
    "task_types": ["sms_followup", "call"]
  },
  {
    "type": "create_task",
    "task_type": "call",
    "priority": "high",
    "due_in_seconds": 7200,
    "notes": "Lead replied to SMS - follow up call needed"
  },
  {
    "type": "update_warmness",
    "delta": 10,
    "reason": "Replied within engagement window"
  }
]
```

---

#### Rule: On No Response (4 Hours)
**Trigger:** `cron_check` (runs every hour)

**Conditions:**
```json
{
  "current_stage": "contacted",
  "last_touchpoint_age_seconds": {"gte": 14400},
  "no_reply_received": true
}
```

**Actions:**
```json
[
  {
    "type": "send_sms",
    "template": "follow_up_no_response",
    "message": "Hi {name}, just checking if you saw my earlier message. Would {day} at {time} work for your appointment? Book here: {link}"
  },
  {
    "type": "create_task",
    "task_type": "call",
    "priority": "medium",
    "due_at": "end_of_business_day"
  },
  {
    "type": "update_warmness",
    "delta": -5,
    "reason": "No response after 4 hours"
  }
]
```

---

### Pipeline B: Pre-Appointment Care

#### Rule: On Booking Created
**Trigger:** `booking_created` event (from Wix webhook)

**Actions:**
```json
[
  {
    "type": "match_or_create_contact",
    "by": "phone"
  },
  {
    "type": "create_booking",
    "capture_attribution": true
  },
  {
    "type": "update_pipeline",
    "pipeline": "pre_appointment",
    "stage": "booking_confirmed"
  },
  {
    "type": "send_sms",
    "template": "booking_confirmation",
    "delay_seconds": 0,
    "message": "Great news {name}! Your appointment is confirmed for {date} at {time}. We'll send reminders. Reply STOP to opt out."
  },
  {
    "type": "create_task",
    "task_type": "welcome_call",
    "conditions": {"is_existing_patient": false},
    "due_at": "end_of_business_day"
  },
  {
    "type": "schedule_reminders",
    "reminders": [
      {
        "type": "sms",
        "template": "reminder_48hr",
        "time_before_appointment": 172800
      },
      {
        "type": "sms",
        "template": "reminder_24hr",
        "time_before_appointment": 86400
      },
      {
        "type": "sms",
        "template": "reminder_2hr",
        "time_before_appointment": 7200
      }
    ]
  },
  {
    "type": "log_touchpoint",
    "touchpoint_type": "booking_created"
  }
]
```

---

#### Rule: On Confirmation Reply (Y/Yes)
**Trigger:** `sms_received` event

**Conditions:**
```json
{
  "message_body": {"matches": "^(y|yes|confirm|confirmed|yep|yeah)$"},
  "current_pipeline": "pre_appointment",
  "current_stage": "reminded"
}
```

**Actions:**
```json
[
  {
    "type": "update_booking",
    "status": "confirmed"
  },
  {
    "type": "update_pipeline",
    "stage": "confirmed"
  },
  {
    "type": "cancel_pending_tasks",
    "task_types": ["confirmation_call"]
  },
  {
    "type": "update_warmness",
    "delta": 10,
    "reason": "Confirmed appointment"
  },
  {
    "type": "log_touchpoint",
    "touchpoint_type": "booking_confirmed_reply"
  }
]
```

---

#### Rule: On Booking Cancelled
**Trigger:** `booking_cancelled` event (from Wix webhook)

**Actions:**
```json
[
  {
    "type": "update_booking",
    "status": "cancelled"
  },
  {
    "type": "cancel_all_tasks",
    "booking_id": "{booking_id}"
  },
  {
    "type": "update_pipeline",
    "pipeline": "post_appointment",
    "stage": "cancelled_rescue"
  },
  {
    "type": "create_task",
    "task_type": "rescue_call",
    "conditions": {"urgency_level": "high"},
    "priority": "urgent",
    "due_in_seconds": 3600
  },
  {
    "type": "send_sms",
    "template": "cancellation_rescue",
    "delay_seconds": 0,
    "message": "Hi {name}, we're sorry you need to cancel. Is everything okay? We'd love to help reschedule."
  },
  {
    "type": "log_touchpoint",
    "touchpoint_type": "booking_cancelled"
  }
]
```

---

### Pipeline C: Post-Appointment

#### Rule: On Attended Appointment
**Trigger:** `booking_outcome_updated` event

**Conditions:**
```json
{
  "outcome": "attended"
}
```

**Actions:**
```json
[
  {
    "type": "update_pipeline",
    "pipeline": "post_appointment",
    "stage": "attended"
  },
  {
    "type": "send_sms",
    "template": "thank_you_attended",
    "message": "Thanks for visiting us today, {name}! Your care is our priority. We'll follow up soon."
  },
  {
    "type": "create_task",
    "task_type": "review_request",
    "due_in_seconds": 86400
  },
  {
    "type": "create_task",
    "task_type": "referral_invite",
    "due_in_seconds": 259200
  },
  {
    "type": "calculate_recall_date",
    "service_type_mapping": {
      "high_risk": 15552000,
      "routine": 31536000,
      "procedure_followup": "per_provider"
    }
  },
  {
    "type": "log_touchpoint",
    "touchpoint_type": "appointment_attended"
  }
]
```

---

#### Rule: On Recall Due
**Trigger:** `cron_check` (daily)

**Conditions:**
```json
{
  "recall_due_date": {"lte": "today"}
}
```

**Actions:**
```json
[
  {
    "type": "update_pipeline",
    "stage": "recall_due"
  },
  {
    "type": "send_sms",
    "template": "recall_reminder",
    "message": "Hi {name}, it's been {months} since your last visit. Dr. {doctor} recommends a follow-up. Book here: {link}"
  },
  {
    "type": "create_task",
    "task_type": "recall_call",
    "conditions": {"is_high_risk": true},
    "priority": "high"
  }
]
```

---

## Warmness Scoring Algorithm

### Calculation Formula:

```typescript
function calculateWarmness(contact: Contact, touchpoints: Touchpoint[]): number {
  let score = 0;

  // 1. INTENT TYPE (0-30 points)
  const intentScores = {
    'procedure': 30,
    'high_risk': 25,
    'follow_up': 20,
    'routine_check': 10,
    'general_inquiry': 5
  };
  score += intentScores[contact.intent] || 0;

  // 2. SOURCE (0-20 points)
  const sourceScores = {
    'referral': 20,
    'manychat_completed': 15,
    'meta_form': 10,
    'existing_patient': 10,
    'organic_search': 5,
    'word_of_mouth': 5
  };
  score += sourceScores[contact.source] || 0;

  // 3. ENGAGEMENT SIGNALS (0-40 points total)
  const engagementScores = {
    'sms_reply_1hr': 10,
    'sms_reply_24hr': 5,
    'resource_download': 10,
    'booking_link_click': 15,
    'email_open': 5
  };

  for (const touchpoint of touchpoints) {
    if (touchpoint.type in engagementScores) {
      score += engagementScores[touchpoint.type];
    }
  }

  // 4. SPEED TO LEAD (±10 points)
  const firstContact = touchpoints.find(t => t.type === 'sms_sent' || t.type === 'call_attempted');
  const leadCreated = touchpoints.find(t => t.type === 'lead_created');

  if (firstContact && leadCreated) {
    const responseTime = firstContact.timestamp - leadCreated.timestamp;

    if (responseTime <= 300) {        // 5 minutes
      score += 10;
    } else if (responseTime <= 3600) { // 1 hour
      score -= 5;
    } else if (responseTime >= 86400) { // 24 hours
      score -= 10;
    }
  }

  // Cap score at 0-100
  return Math.max(0, Math.min(100, score));
}
```

### Priority Mapping:

```typescript
function getLeadPriority(warmness: number): string {
  if (warmness >= 70) return 'HOT';     // Immediate call + SMS
  if (warmness >= 40) return 'WARM';    // Call + SMS
  return 'COOL';                        // SMS only, call if responds
}
```

---

## Task Priority Scoring

### Calculation Formula:

```typescript
function calculateTaskPriority(task: Task, contact: Contact, booking?: Booking): number {
  let score = 0;

  // 1. BASE SCORE by task type
  const baseScores = {
    'rescue_call': 100,
    'call_hot_lead': 90,
    'no_show_followup': 80,
    'confirmation_call': 75,
    'welcome_call': 60,
    'recall_call': 50,
    'review_request': 30,
    'referral_invite': 20
  };
  score += baseScores[task.type] || 50;

  // 2. URGENCY MULTIPLIER
  if (booking) {
    const urgencyMultipliers = {
      'high': 1.5,
      'medium': 1.2,
      'low': 1.0
    };
    score *= urgencyMultipliers[booking.urgency_level] || 1.0;
  }

  // 3. OVERDUE PENALTY (+20 per hour, max +100)
  const now = Date.now() / 1000;
  if (now > task.due_datetime) {
    const hoursOverdue = Math.floor((now - task.due_datetime) / 3600);
    score += Math.min(100, hoursOverdue * 20);
  }

  // 4. WARMNESS BOOST
  const warmnessDelta = (contact.warmness_score - 50) / 2;
  score += warmnessDelta;

  return Math.round(score);
}
```

### Priority Categories:

```typescript
function getTaskPriorityCategory(score: number): string {
  if (score >= 150) return 'URGENT';    // 🔴
  if (score >= 100) return 'HIGH';      // 🟠
  if (score >= 50)  return 'MEDIUM';    // 🟡
  return 'LOW';                          // 🟢
}
```

---

## SMS Template System

### Template Structure:

```typescript
interface SMSTemplate {
  id: string;
  name: string;
  content: string;              // With {placeholder} syntax
  category: string;             // welcome, reminder, rescue, recall, etc.
  placeholders: string[];       // List of required placeholders
  character_count: number;      // For preview
}
```

### Core Templates:

#### Welcome Lead
```
Hi {name}! Thanks for reaching out to {clinic}. We've received your inquiry about {intent}. A team member will call you within 5 minutes. Quick question: {booking_link}
```

#### Follow-Up No Response
```
Hi {name}, just checking if you saw my earlier message. Would {suggested_day} at {suggested_time} work for your appointment? Book here: {booking_link}
```

#### Booking Confirmation
```
Great news {name}! Your appointment is confirmed for {date} at {time}. We'll send reminders. Reply STOP to opt out.
```

#### Reminder T-48hr
```
Hi {name}, reminder: You have an appointment at {clinic} on {date} at {time}. Reply Y to confirm or call us to reschedule.
```

#### Reminder T-24hr
```
{name}, your appointment is tomorrow ({date}) at {time}. Please reply Y to confirm. See you soon!
```

#### Reminder T-2hr
```
See you in 2 hours, {name}! Your appointment at {clinic} is at {time} today. {address}
```

#### Cancellation Rescue
```
Hi {name}, we're sorry you need to cancel. Is everything okay? We'd love to help reschedule: {booking_link}
```

#### No-Show Follow-Up
```
Hi {name}, we missed you today. Is everything okay? We'd love to reschedule: {booking_link}
```

#### Review Request
```
Hi {name}, we hope your appointment went well! Would you mind leaving us a quick Google review? {review_link} — it helps others find quality skin care.
```

#### Referral Invite
```
Hi {name}! Love our service? Refer family & friends and get {incentive}. Share: {referral_link}
```

#### Recall Reminder
```
Hi {name}, it's been {months} since your last visit. Dr. {doctor_name} recommends a follow-up. Book here: {booking_link}
```

---

## Reporting Specification

### Weekly Report Data Points:

```typescript
interface WeeklyReport {
  period: {
    start: string;              // ISO date
    end: string;
  };
  kpi: {
    attended_appointments: number;
    change_vs_last_week: number; // Percentage
  };
  funnel: {
    new_leads: number;
    speed_to_lead_under_5min_percentage: number;
    contacted_same_day_percentage: number;
    booked_count: number;
    booked_percentage: number;
  };
  bookings: {
    created: number;
    new_patients: number;
    returning: number;
    confirmed_percentage: number;
  };
  appointments: {
    scheduled: number;
    attended: number;
    cancelled: number;
    no_shows: number;
    attendance_rate: number;
  };
  channels: Array<{
    name: string;
    attended_count: number;
    percentage: number;
  }>;
  attention_areas: {
    cancellations: number;
    high_urgency_cancellations: number;
    rebooked: number;
    still_in_rescue: number;
    no_shows: number;
  };
  reactivation: {
    recall_sent: number;
    recall_booked: number;
    recall_conversion_rate: number;
    cancelled_rebooked: number;
  };
  insights: string[];           // AI-generated insights (Phase 2)
}
```

---

## Deployment Configuration

### Environment Variables:

```bash
# Database
DATABASE_ID=your_d1_database_id

# External Services
WIX_WEBHOOK_SECRET=your_wix_webhook_secret
SMS_PROVIDER=clicksend
SMS_API_KEY=your_sms_api_key
SMS_API_USERNAME=your_username

# ManyChat
MANYCHAT_API_KEY=your_manychat_key
MANYCHAT_WEBHOOK_SECRET=your_webhook_secret

# Application
FRONTEND_URL=https://cms.avatarimaging.com.au
JWT_SECRET=your_jwt_secret
ENVIRONMENT=production

# Optional (Phase 2)
GA4_MEASUREMENT_ID=G-XXXXXXXXXX
GMAIL_API_CLIENT_ID=your_client_id
GMAIL_API_CLIENT_SECRET=your_client_secret
```

### Cloudflare Bindings:

```toml
# wrangler.toml

[[d1_databases]]
binding = "DB"
database_name = "avatar-imaging-cms"
database_id = "..."

[[kv_namespaces]]
binding = "SESSIONS"
id = "..."

[[queues.producers]]
binding = "AUTOMATION_QUEUE"
queue = "automation-queue"

[[queues.producers]]
binding = "SMS_QUEUE"
queue = "sms-queue"
```

---

## Security Considerations

### Webhook Security:

1. **Wix Webhooks:**
   - Validate webhook signature using Wix's signing algorithm
   - Check timestamp to prevent replay attacks
   - Whitelist Wix IP ranges (optional)

2. **ManyChat Webhooks:**
   - Validate `X-Hub-Signature` header
   - Use shared secret from ManyChat settings

3. **SMS Provider Webhooks:**
   - Validate provider-specific signature
   - Check message authenticity

### Data Protection:

1. **PII Handling:**
   - Phone numbers stored in E.164 format (`+61400000000`)
   - Email addresses normalized (lowercase)
   - No credit card storage (Wix handles payments)

2. **Access Control:**
   - Session-based authentication (JWT tokens)
   - Role-based access: `admin`, `staff`, `readonly`
   - Rate limiting on API endpoints

3. **Audit Trail:**
   - All sensitive operations logged to `event_log`
   - Immutable event log (no updates/deletes)
   - Staff user attribution on manual actions

---

## Performance Targets

### Response Times:

| Operation | Target | Notes |
|-----------|--------|-------|
| Webhook ingestion | <200ms | Return 200 OK, process async |
| Task list load | <300ms | Indexed queries |
| Contact timeline | <500ms | Pagination recommended |
| Report generation | <2s | Cache results for 1 hour |
| SMS send | <1s | Queue for async delivery |

### Scale Targets (MVP):

- **Contacts:** 10,000
- **Bookings/month:** 500
- **SMS/month:** 3,000
- **Tasks/day:** 100
- **Staff users:** 5-10

---

## MVP Feature Scope

### ✅ Included in MVP:

- [x] Wix Bookings webhook integration
- [x] Contact management (manual + webhook)
- [x] Pipeline automation (all 4 pipelines)
- [x] Task management with priority scoring
- [x] Two-way SMS automation
- [x] Warmness scoring (rules-based)
- [x] Multi-touch attribution tracking
- [x] Weekly/monthly reporting
- [x] Staff dashboard (task list, contact timeline)
- [x] Manual lead creation
- [x] Booking outcome tracking

### ❌ Deferred to Phase 2:

- [ ] ManyChat deep integration (webhook only in MVP)
- [ ] AI-powered insights (rules-based for now)
- [ ] Gmail API integration (manual email for MVP)
- [ ] GA4 real-time integration (manual UTM tracking)
- [ ] Advanced reporting dashboard (export CSV for MVP)
- [ ] Partnership pipeline automation (manual for MVP)
- [ ] Mobile app
- [ ] Multi-location support

---

## Testing Strategy

### Unit Tests:

- Warmness calculation algorithm
- Task priority scoring
- Pipeline state transitions
- SMS template rendering

### Integration Tests:

- Wix webhook → Contact/Booking creation
- SMS inbound → Task cancellation
- Booking cancellation → Rescue flow
- Confirmation reply → Status update

### Load Tests:

- 100 concurrent webhook requests
- 500 contacts with full timeline queries
- Daily task queue (100+ tasks)
- Monthly report generation (1000+ bookings)

---

## Success Metrics

### MVP Launch Criteria:

- [ ] 100% of Wix bookings sync successfully
- [ ] <5min average speed-to-lead
- [ ] 90%+ attendance rate for confirmed appointments
- [ ] 50%+ rescue rate for cancelled bookings
- [ ] Zero webhook failures over 24 hours
- [ ] All staff trained and using dashboard daily

### Business KPIs (Post-Launch):

- **Primary:** Attended appointments (trend up)
- **Secondary:** Attendance rate (maintain >85%)
- **Efficiency:** Speed-to-lead <5min (>80% of leads)
- **Quality:** Cancellation rescue rate (>50%)
- **Growth:** Recall conversion rate (>30%)

---

## Next Steps

1. **Answer Critical Questions** (from design.md Part 10)
2. **Initialize Project:**
   - Create `wrangler.toml`
   - Create `package.json`
   - Set up folder structure
3. **Database Migration:**
   - Create SQL schema file
   - Seed automation rules
   - Seed SMS templates
4. **Build Core Services:**
   - Webhook handlers
   - Automation engine
   - Task queue processor
5. **Build Dashboard UI:**
   - Task list view
   - Contact timeline
   - Manual actions

---

**Document Version:** 1.0
**Status:** Ready for Implementation
**Estimated Build Time:** 8 weeks to MVP launch
