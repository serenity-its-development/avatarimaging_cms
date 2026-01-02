# 🎯 Automatic Lead & Contact Creation

## Overview

Your CRM **automatically creates leads and contacts** from:
- ✅ SMS messages (inbound)
- ✅ Instagram DMs (via ManyChat)
- ✅ Facebook Messenger (via ManyChat)

**No manual data entry required!**

---

## 📱 Lead Source 1: SMS (MobileMessage)

### Trigger: Customer Texts Your Number

**What Happens:**
```javascript
// Customer texts: "Hi, how much for an MRI?"
// Phone: +61412345678

↓ Webhook receives message

↓ System checks: Does contact exist?

if (no) {
  ✅ CREATE NEW CONTACT:
  {
    id: "cnt_abc123",
    phone: "+61412345678",
    name: null,                    // Will be enriched later
    source: "sms_inbound",
    current_pipeline: "sms_leads",
    current_stage: "new",
    created_at: 2026-01-02T12:00:00Z
  }
}

↓ AI analyzes message

Intent: "booking_inquiry"

↓ Create touchpoint

{
  channel: "sms",
  type: "sms_received",
  direction: "inbound",
  notes: "Hi, how much for an MRI?"
}

↓ Create task for staff

{
  type: "follow_up",
  title: "SMS: Booking inquiry",
  urgent: false,
  status: "pending"
}

↓ Auto-reply

"Thanks for your interest! Our team will get back to you within 30 minutes to help with your booking."

↓ Queue warmness calculation

Background job calculates AI warmness score
```

**Result:**
- ✅ Contact created in CRM
- ✅ Shows in dashboard under "sms_leads" pipeline
- ✅ Task assigned to staff
- ✅ Customer received auto-reply
- ✅ All conversation logged

**CRM View:**
```
Contacts > sms_leads > new
├─ +61412345678 (New)
│  Source: sms_inbound
│  Last contact: 2 minutes ago
│  Warmness: Calculating...
│  Tasks: 1 pending
```

---

## 📷 Lead Source 2: Instagram (ManyChat)

### Trigger 1: New Subscriber

**What Happens:**
```javascript
// Someone follows your Instagram and clicks "Send Message"

↓ ManyChat webhook: "new_subscriber"

{
  subscriber: {
    id: "123456789",
    name: "Sarah Johnson",
    instagram_username: "@sarahjohnson",
    phone: null,
    email: null,
    tags: [],
    source: "instagram_story"
  }
}

↓ Sync to CRM

✅ CREATE NEW CONTACT:
{
  id: "cnt_xyz789",
  name: "Sarah Johnson",
  instagram_handle: "@sarahjohnson",
  manychat_subscriber_id: "123456789",
  source: "instagram",
  current_pipeline: "instagram_leads",
  current_stage: "new",
  created_at: 2026-01-02T12:00:00Z
}

↓ Add ManyChat tag

ManyChat.addTag(subscriber_id, "lead")

↓ Queue warmness calculation

Background job analyzes profile + behavior

↓ Log event

{
  event_type: "instagram_new_subscriber",
  resource_type: "contact",
  resource_id: "cnt_xyz789"
}
```

### Trigger 2: User Message

**What Happens:**
```javascript
// Sarah DMs: "Interested in CT scans, what's the cost?"

↓ ManyChat webhook: "user_message"

↓ Find contact by subscriber_id

Contact found: cnt_xyz789

↓ AI analyzes message

Intent: "interested-ct" + "booking_inquiry"
Confidence: 0.92

↓ Update contact

{
  manychat_tags: ["lead", "interested-ct"]
}

↓ Create sales task

{
  type: "sales_follow_up",
  title: "Instagram lead interested in CT",
  description: "Contact tagged as interested-ct in ManyChat",
  urgent: true
}

↓ Trigger ManyChat flow

Flow: "ct_pricing_info" (sends pricing, booking link)

↓ Update stage based on engagement

if (clicked_booking_link) {
  current_stage: "qualified"
}
```

**Result:**
- ✅ Contact enriched with Instagram data
- ✅ Auto-tagged based on interest
- ✅ Sales task created
- ✅ Automated flow sent pricing info
- ✅ Pipeline stage updated

**CRM View:**
```
Contacts > instagram_leads > qualified
├─ Sarah Johnson (@sarahjohnson)
│  Source: instagram
│  Tags: lead, interested-ct
│  Last contact: 5 minutes ago
│  Warmness: 75/100 (High)
│  Tasks: 1 urgent
```

---

## 📊 Pipeline Progression

### How Contacts Move Through Pipelines

```
NEW CONTACT CREATED
      ↓
   Pipeline: sms_leads / instagram_leads / facebook_leads
      ↓
   Stage: new
      ↓
[AI Warmness Calculation]
      ↓
   ↓ (if inquiry/interested)
   Stage: qualified
      ↓
   ↓ (if tag: appointment_booked)
   Stage: booked
      ↓
   ↓ (after appointment)
   Stage: completed
```

### Stage Triggers

| Current Stage | Trigger | New Stage |
|--------------|---------|-----------|
| `new` | Message contains interest keywords | `qualified` |
| `qualified` | ManyChat tag: "appointment_booked" | `booked` |
| `qualified` | Booking confirmed via SMS | `booked` |
| `booked` | Appointment completed | `completed` |
| Any | Tag: "cancelled" | Archive |

---

## 🤖 AI-Powered Enrichment

### Warmness Score Calculation

Every new contact gets analyzed:

```typescript
// Queued background job
calculateWarmness(contact_id: "cnt_abc123")

↓ AI analyzes:
- Message content
- Response time
- Engagement level
- Touchpoint history
- Intent signals

↓ Generates score:
{
  warmness_score: 85,
  warmness_reasoning: "High urgency indicated, immediate response, specific service request",
  confidence: 0.92
}

↓ Updates contact:
Contact.warmness_score = 85
Contact.warmness_updated_at = now()
```

**CRM shows:**
```
Contact: +61412345678
Warmness: 85/100 🔥 (HOT LEAD!)
Reasoning: "High urgency indicated, immediate response, specific service request"
```

---

## 📈 Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│               LEAD SOURCES                          │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐        │
│  │   SMS    │  │ Instagram │  │ Facebook │        │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘        │
│       │              │              │               │
└───────┼──────────────┼──────────────┼───────────────┘
        │              │              │
        ▼              ▼              ▼
   ┌────────────────────────────────────────┐
   │      WEBHOOK HANDLERS                  │
   │  /webhooks/mobilemessage/incoming      │
   │  /webhooks/manychat                    │
   └────────────┬───────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────┐
   │      CONTACT CREATION                  │
   │  • Find or create contact              │
   │  • Assign to pipeline                  │
   │  • Set initial stage: "new"            │
   └────────────┬───────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────┐
   │      AI PROCESSING                     │
   │  • Detect intent                       │
   │  • Calculate warmness                  │
   │  • Extract metadata                    │
   └────────────┬───────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────┐
   │      AUTOMATED ACTIONS                 │
   │  • Create tasks                        │
   │  • Send auto-replies                   │
   │  • Update tags                         │
   │  • Trigger flows                       │
   └────────────┬───────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────┐
   │      CRM DATABASE                      │
   │  contacts, touchpoints, tasks,         │
   │  sms_messages, ai_usage_logs           │
   └────────────┬───────────────────────────┘
                │
                ▼
   ┌────────────────────────────────────────┐
   │      FRONTEND DASHBOARD                │
   │  • Pipeline view                       │
   │  • Contact cards                       │
   │  • Task list                           │
   │  • Warmness scores                     │
   └────────────────────────────────────────┘
```

---

## 🎯 Real-World Examples

### Example 1: Cold Lead → Hot Lead (SMS)

```
Day 1, 10:00am: Unknown number texts
├─ Message: "Can I get an MRI without a referral?"
├─ ✅ Contact created (source: sms_inbound)
├─ Pipeline: sms_leads, Stage: new
├─ Auto-reply: "We'll call you within 30min"
├─ Task created for staff
└─ Warmness: 45/100 (calculating...)

Day 1, 10:15am: Staff calls, leaves voicemail

Day 1, 2:30pm: Customer texts back
├─ Message: "Yes I need it urgently, can you fit me in today?"
├─ AI detects: URGENT inquiry
├─ ✅ Stage updated: new → qualified
├─ ✅ Warmness updated: 45 → 85 (HOT!)
├─ Task updated: urgent = true
└─ Staff notified

Day 1, 3:00pm: Staff books appointment
├─ ✅ Stage updated: qualified → booked
├─ Booking created in system
└─ Confirmation SMS sent

Day 2, 10:00am: Customer arrives for MRI
├─ ✅ Stage updated: booked → completed
├─ Marked as existing patient
└─ Follow-up task created (7 days)
```

### Example 2: Instagram → Booked Appointment

```
Day 1: New Instagram follower clicks "Send Message"
├─ ✅ Contact created (source: instagram)
├─ Name: "Emma Roberts"
├─ Handle: @emmaroberts
├─ Pipeline: instagram_leads, Stage: new
└─ ManyChat sends welcome message

Day 1, 5min later: Emma replies
├─ Message: "I saw your post about bulk billing. Do you bulk bill CT scans?"
├─ AI detects: interested-ct, billing_question
├─ ✅ Tags: ["lead", "interested-ct", "bulk-billing"]
├─ ✅ Stage: new → qualified
├─ Sales task created
└─ ManyChat flow: "ct_bulk_billing_info"

Day 1, 10min later: Emma clicks "Book Now" button
├─ ManyChat webhook: custom_field_updated
├─ Field: appointment_date = "2026-01-05T14:00:00Z"
├─ ✅ Stage: qualified → booked
├─ ✅ Booking created in CRM
└─ Confirmation sent via Instagram

Day 5: Emma arrives for appointment
├─ ✅ Stage: booked → completed
├─ Marked as existing patient
├─ NPS survey sent via Instagram
└─ Future: Can message her directly for follow-ups
```

---

## 💡 Benefits

### Zero Manual Data Entry
- Contacts auto-created from messages
- Pipeline auto-assigned based on source
- Tags auto-applied based on AI intent
- Tasks auto-created for staff follow-up

### Intelligent Routing
- Hot leads (warmness 70+) flagged as urgent
- Booking inquiries create immediate tasks
- Cancellations create urgent tasks
- Questions routed to appropriate staff

### Complete History
- Every message logged
- All touchpoints tracked
- AI decisions recorded
- Cost per lead calculated

### Scalability
- Handle 1000s of messages per day
- AI processes all automatically
- Staff only handles qualified leads
- Auto-replies reduce staff workload

---

## 📊 Reporting

### Available Metrics:

```sql
-- Leads by source
SELECT source, COUNT(*) as count
FROM contacts
WHERE created_at > DATE('now', '-30 days')
GROUP BY source;

-- Results:
-- sms_inbound: 45
-- instagram: 78
-- facebook: 23
-- website_form: 12

-- Conversion rate by pipeline
SELECT
  current_pipeline,
  COUNT(*) as total_leads,
  SUM(CASE WHEN current_stage = 'booked' THEN 1 ELSE 0 END) as booked,
  ROUND(SUM(CASE WHEN current_stage = 'booked' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as conversion_rate
FROM contacts
GROUP BY current_pipeline;

-- Results:
-- sms_leads: 45 total, 12 booked, 26.67% conversion
-- instagram_leads: 78 total, 34 booked, 43.59% conversion
-- facebook_leads: 23 total, 8 booked, 34.78% conversion

-- Average warmness by source
SELECT source, AVG(warmness_score) as avg_warmness
FROM contacts
WHERE warmness_score IS NOT NULL
GROUP BY source;

-- Results:
-- instagram: 72 (highest quality)
-- sms_inbound: 58
-- facebook: 65
```

---

## 🚀 Current Status

✅ **Automatic contact creation** - Live and operational
✅ **Pipeline assignment** - Auto-assigns based on source
✅ **AI enrichment** - Warmness scores calculated
✅ **Task automation** - Auto-creates follow-up tasks
✅ **Auto-replies** - Instant responses to customers
✅ **Tag management** - AI-based auto-tagging
✅ **Stage progression** - Automatic pipeline movement

**No setup required - already working!**

---

## 🔧 Customization Options

### Add Custom Pipelines:

```typescript
// In ContactService or via API
createPipeline({
  name: "referral_leads",
  stages: ["new", "contacted", "qualified", "booked"],
  auto_assign_sources: ["doctor_referral", "partner_referral"]
})
```

### Add Custom Intents:

```typescript
// In AILayer.detectIntent()
if (message.includes("bulk bill")) {
  return {
    intent: "bulk_billing_inquiry",
    confidence: 0.95,
    suggested_tags: ["bulk-billing"],
    suggested_stage: "qualified"
  }
}
```

### Add Custom Auto-Replies:

```typescript
// In MobileMessageService.handleIntent()
case 'urgent':
  await this.send({
    contact_id: contact.id,
    message: "We've flagged your request as urgent. You'll hear from us within 15 minutes."
  })
  break
```

---

**Live Backend:** https://avatarimaging_cms.mona-08d.workers.dev
**Updated:** 2026-01-02
