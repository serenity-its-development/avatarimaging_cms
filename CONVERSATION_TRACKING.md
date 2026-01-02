# 💬 Conversation Tracking - Complete History

## Overview

**Every conversation** with every contact is tracked across:
- ✅ SMS messages (inbound/outbound)
- ✅ Instagram DMs (inbound/outbound)
- ✅ Facebook messages (inbound/outbound)
- ✅ Email (future)
- ✅ Phone calls (manual entry)

**Nothing is lost. Complete audit trail.**

---

## 📊 3-Layer Tracking System

### Layer 1: Channel-Specific Tables

#### SMS Messages
```sql
-- Every SMS stored permanently
sms_messages: {
  id, contact_id, direction, message_body,
  provider, status, detected_intent,
  cost_aud, created_at, delivered_at
}
```

#### Instagram Messages (via ManyChat)
```sql
-- Logged in touchpoints + event_logs
touchpoints: {
  id, contact_id, channel: 'instagram',
  type: 'dm_received' | 'dm_sent',
  notes: "full message content",
  metadata: JSON with ManyChat data
}
```

### Layer 2: Unified Touchpoints
```sql
-- ALL interactions in one table
touchpoints: {
  id, contact_id, channel, type, direction,
  notes, metadata, created_at
}

-- Channels: sms, instagram, facebook, email, phone, in_person
```

### Layer 3: System Event Logs
```sql
-- System-wide audit trail
event_logs: {
  id, event_type, resource_type, resource_id,
  user_id, metadata, created_at
}
```

---

## 🎯 Real Contact History Example

### Sarah Johnson (@sarahjohnson) - Complete Timeline

```
┌─────────────────────────────────────────────────────────────────┐
│  CONTACT: Sarah Johnson                                         │
│  SOURCE: Instagram                                              │
│  ID: cnt_xyz789                                                 │
│  CREATED: Jan 1, 2026, 12:00 PM                                │
├─────────────────────────────────────────────────────────────────┤
│  CONVERSATION HISTORY (Newest First)                            │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 5, 2026 - 2:00 PM                                       │
│  📍 Channel: In-Person                                          │
│  📝 Type: Appointment completed                                 │
│  ↓  "Patient arrived on time, MRI scan completed successfully"  │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 4, 2026 - 10:00 AM                                      │
│  📍 Channel: Instagram                                          │
│  📝 Type: DM sent (outbound)                                    │
│  ↑  "Reminder: Your appointment is tomorrow at 2pm. See you    │
│      then!"                                                     │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 4:15 PM                                       │
│  📍 Channel: Instagram                                          │
│  📝 Type: DM received (inbound)                                 │
│  ↓  "Perfect! See you then."                                    │
│  🤖 Intent: booking_confirmation (confidence: 0.95)             │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 4:12 PM                                       │
│  📍 Channel: Instagram                                          │
│  📝 Type: DM sent (outbound)                                    │
│  ↑  "Great! I've booked you for Friday Jan 5 at 2pm. Address:  │
│      123 Medical St, Brisbane."                                 │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 4:10 PM                                       │
│  📍 Channel: Instagram                                          │
│  📝 Type: DM received (inbound)                                 │
│  ↓  "Yes please! Friday afternoon works best for me."          │
│  🤖 Intent: booking_confirmation (confidence: 0.88)             │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 4:05 PM                                       │
│  📍 Channel: Phone                                              │
│  📝 Type: Call outbound                                         │
│  ↑  "Called to discuss MRI booking. Answered, discussed dates. │
│      Prefers Friday. Following up via Instagram."               │
│  👤 Staff: John (Receptionist)                                  │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 3:30 PM                                       │
│  📍 Channel: Instagram                                          │
│  📝 Type: DM sent (outbound)                                    │
│  ↑  "Hi Sarah! Thanks for your interest in our MRI services.   │
│      We have availability this week. When works best for you?" │
│  👤 Staff: Emma (Sales)                                         │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 3:15 PM                                       │
│  📍 Channel: Instagram                                          │
│  📝 Type: Tag added                                             │
│  🏷️  "interested-mri"                                           │
│  🤖 Auto-tagged by AI based on message content                  │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 2, 2026 - 3:00 PM                                       │
│  📍 Channel: Instagram                                          │
│  📝 Type: DM received (inbound)                                 │
│  ↓  "Hi! I saw your post about bulk billing. Do you bulk bill  │
│      MRI scans? I need one urgently."                           │
│  🤖 Intent: interested-mri, booking_inquiry (confidence: 0.92)  │
│  🔥 Urgency detected: HIGH                                      │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 1, 2026 - 12:05 PM                                      │
│  📍 Channel: Instagram                                          │
│  📝 Type: Flow triggered                                        │
│  🤖 Flow: "welcome_new_subscriber"                              │
│  ↑  Sent: Welcome message + pricing info                        │
├─────────────────────────────────────────────────────────────────┤
│  📅 Jan 1, 2026 - 12:00 PM                                      │
│  📍 Channel: Instagram                                          │
│  📝 Type: New subscriber                                        │
│  ✅ Contact created                                             │
│  📊 Source: instagram                                           │
│  🆔 ManyChat ID: 123456789                                      │
└─────────────────────────────────────────────────────────────────┘

TOTAL INTERACTIONS: 11
CHANNELS USED: Instagram (8), Phone (1), In-Person (1)
TOTAL MESSAGES: 6 inbound, 3 outbound
AI INTENT DETECTIONS: 3
CONVERSION: New Subscriber → Booked → Completed (4 days)
```

---

## 📝 Database Queries for History

### Query 1: All SMS for a Contact

```sql
SELECT
  id,
  direction,
  message_body,
  detected_intent,
  intent_confidence,
  status,
  cost_aud,
  datetime(created_at/1000, 'unixepoch') as sent_at
FROM sms_messages
WHERE contact_id = 'cnt_123'
ORDER BY created_at DESC;
```

### Query 2: All Touchpoints (All Channels)

```sql
SELECT
  id,
  channel,
  type,
  direction,
  notes,
  datetime(created_at/1000, 'unixepoch') as interaction_at
FROM touchpoints
WHERE contact_id = 'cnt_123'
ORDER BY created_at DESC;
```

### Query 3: Combined View (SMS + Touchpoints)

```sql
-- Union of all interactions
SELECT
  'sms' as source_table,
  id,
  'sms' as channel,
  direction,
  message_body as content,
  detected_intent,
  created_at
FROM sms_messages
WHERE contact_id = 'cnt_123'

UNION ALL

SELECT
  'touchpoint' as source_table,
  id,
  channel,
  direction,
  notes as content,
  NULL as detected_intent,
  created_at
FROM touchpoints
WHERE contact_id = 'cnt_123'

ORDER BY created_at DESC;
```

### Query 4: Full Conversation with AI Analysis

```sql
SELECT
  s.id,
  s.direction,
  s.message_body,
  s.detected_intent,
  s.intent_confidence,
  s.cost_aud,
  a.model as ai_model,
  a.input_tokens,
  a.output_tokens,
  a.cost_usd as ai_cost,
  datetime(s.created_at/1000, 'unixepoch') as timestamp
FROM sms_messages s
LEFT JOIN ai_usage_logs a ON JSON_EXTRACT(a.context, '$.sms_id') = s.id
WHERE s.contact_id = 'cnt_123'
ORDER BY s.created_at DESC;
```

---

## 🎯 API Endpoints for Conversation History

### Get All Conversations for Contact

```bash
GET /api/contacts/cnt_123/conversations

Response:
{
  "contact_id": "cnt_123",
  "contact_name": "Sarah Johnson",
  "total_interactions": 11,
  "channels": ["instagram", "sms", "phone"],
  "conversations": [
    {
      "id": "sms_abc123",
      "channel": "sms",
      "direction": "inbound",
      "content": "I need to cancel my appointment",
      "intent": "booking_cancellation",
      "confidence": 0.95,
      "timestamp": "2026-01-02T14:30:00Z",
      "cost": 0.045
    },
    {
      "id": "tch_def456",
      "channel": "instagram",
      "direction": "outbound",
      "content": "Thanks for your interest! Here's our pricing...",
      "intent": null,
      "timestamp": "2026-01-02T16:02:00Z",
      "cost": 0
    }
  ]
}
```

### Get SMS History Only

```bash
GET /api/contacts/cnt_123/sms

Response:
{
  "contact_id": "cnt_123",
  "total_messages": 6,
  "inbound": 3,
  "outbound": 3,
  "total_cost_aud": 0.27,
  "messages": [
    {
      "id": "sms_abc123",
      "direction": "inbound",
      "message": "I need to cancel my appointment",
      "intent": "booking_cancellation",
      "confidence": 0.95,
      "status": "received",
      "timestamp": "2026-01-02T14:30:00Z"
    }
  ]
}
```

### Get Instagram History Only

```bash
GET /api/contacts/cnt_123/instagram

Response:
{
  "contact_id": "cnt_123",
  "manychat_subscriber_id": "123456789",
  "instagram_handle": "@sarahjohnson",
  "total_messages": 5,
  "messages": [
    {
      "id": "tch_abc123",
      "direction": "inbound",
      "content": "How much for an MRI?",
      "intent": "booking_inquiry",
      "confidence": 0.92,
      "timestamp": "2026-01-02T15:00:00Z"
    }
  ],
  "tags": ["lead", "interested-mri", "booked"],
  "flows_triggered": ["welcome_new_subscriber", "ct_pricing_info"]
}
```

---

## 📊 Conversation Analytics

### Query: Message Volume by Channel

```sql
SELECT
  channel,
  COUNT(*) as total_messages,
  SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
  SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound
FROM touchpoints
WHERE contact_id = 'cnt_123'
GROUP BY channel;
```

**Output:**
```
channel    | total_messages | inbound | outbound
-----------|----------------|---------|----------
instagram  | 8              | 5       | 3
sms        | 6              | 3       | 3
phone      | 1              | 0       | 1
```

### Query: Response Time Analysis

```sql
-- Average time to respond to inbound messages
WITH inbound_messages AS (
  SELECT
    id,
    contact_id,
    created_at,
    LEAD(created_at) OVER (PARTITION BY contact_id ORDER BY created_at) as next_message_time
  FROM sms_messages
  WHERE direction = 'inbound'
)
SELECT
  contact_id,
  AVG((next_message_time - created_at) / 60000.0) as avg_response_time_minutes
FROM inbound_messages
WHERE next_message_time IS NOT NULL
GROUP BY contact_id;
```

### Query: Intent Distribution

```sql
SELECT
  detected_intent,
  COUNT(*) as occurrences,
  AVG(intent_confidence) as avg_confidence
FROM sms_messages
WHERE contact_id = 'cnt_123'
  AND detected_intent IS NOT NULL
GROUP BY detected_intent
ORDER BY occurrences DESC;
```

**Output:**
```
detected_intent     | occurrences | avg_confidence
--------------------|-------------|---------------
booking_inquiry     | 3           | 0.91
booking_confirmation| 2           | 0.93
question            | 1           | 0.87
```

---

## 🔍 UI Display of Conversations

### Contact Detail Page - Conversation Tab

```
┌────────────────────────────────────────────────────────────┐
│  SARAH JOHNSON (@sarahjohnson)                             │
│  📍 Source: Instagram  •  🔥 Warmness: 85/100              │
├────────────────────────────────────────────────────────────┤
│  [Overview] [Conversations] [Bookings] [Tasks] [Notes]    │
├────────────────────────────────────────────────────────────┤
│  CONVERSATION HISTORY                                      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Filter: [All Channels ▼] [Last 30 days ▼]          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  📅 Today, 2:00 PM                                         │
│  ┌────────────────────────────────────────────┐           │
│  │ 🏥 In-Person                                │           │
│  │ Appointment completed successfully          │           │
│  └────────────────────────────────────────────┘           │
│                                                            │
│  📅 Yesterday, 10:00 AM                                    │
│  ┌────────────────────────────────────────────┐           │
│  │ 📷 Instagram (outbound)                     │           │
│  │ You: Reminder: Your appointment is tomorrow │           │
│  │ at 2pm. See you then!                       │           │
│  └────────────────────────────────────────────┘           │
│                                                            │
│  📅 Jan 2, 4:15 PM                                         │
│  ┌────────────────────────────────────────────┐           │
│  │ 📷 Instagram (inbound)                      │           │
│  │ Sarah: Perfect! See you then.               │           │
│  │ 🤖 Intent: booking_confirmation (95%)       │           │
│  └────────────────────────────────────────────┘           │
│                                                            │
│  📅 Jan 2, 4:12 PM                                         │
│  ┌────────────────────────────────────────────┐           │
│  │ 📷 Instagram (outbound)                     │           │
│  │ You: Great! I've booked you for Friday...   │           │
│  └────────────────────────────────────────────┘           │
│                                                            │
│  📅 Jan 2, 4:05 PM                                         │
│  ┌────────────────────────────────────────────┐           │
│  │ 📞 Phone (outbound) - John                  │           │
│  │ Called to discuss MRI booking. Answered...  │           │
│  └────────────────────────────────────────────┘           │
│                                                            │
│  [Load More (6 older messages)]                           │
│                                                            │
│  ┌──────────────────────────────────────────┐             │
│  │ Send Message:                             │             │
│  │ ┌──────────────────────────────────────┐ │             │
│  │ │ Type message...                      │ │             │
│  │ └──────────────────────────────────────┘ │             │
│  │ [SMS] [Instagram] [Email]   [Send →]    │             │
│  └──────────────────────────────────────────┘             │
└────────────────────────────────────────────────────────────┘

STATS:
• Total interactions: 11
• Response time: 12 min avg
• Channels: Instagram (8), Phone (1), In-Person (1)
• Conversion: 4 days (New → Completed)
```

---

## 🔐 Privacy & Data Retention

### GDPR Compliance

```typescript
// Delete all conversations for a contact
async deleteContactData(contactId: string) {
  // Delete SMS messages
  await db.execute(`DELETE FROM sms_messages WHERE contact_id = ?`, contactId)

  // Delete touchpoints
  await db.execute(`DELETE FROM touchpoints WHERE contact_id = ?`, contactId)

  // Delete event logs
  await db.execute(`DELETE FROM event_logs WHERE resource_id = ?`, contactId)

  // Anonymize contact
  await db.execute(`
    UPDATE contacts
    SET name = 'Deleted User',
        phone = NULL,
        email = NULL,
        data = '{}',
        manychat_subscriber_id = NULL,
        instagram_handle = NULL
    WHERE id = ?
  `, contactId)
}
```

### Data Retention Policy (Future)

```typescript
// Auto-delete old messages after 2 years
async archiveOldMessages() {
  const twoYearsAgo = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000)

  await db.execute(`
    DELETE FROM sms_messages
    WHERE created_at < ?
      AND contact_id NOT IN (
        SELECT id FROM contacts WHERE current_stage IN ('booked', 'completed')
      )
  `, twoYearsAgo)
}
```

---

## ✅ Tracking Checklist

- ✅ Every SMS message stored (inbound/outbound)
- ✅ Every Instagram DM logged
- ✅ Every Facebook message logged
- ✅ AI intent detected and stored
- ✅ Timestamps on all interactions
- ✅ Cost tracking (SMS)
- ✅ Staff attribution (who sent message)
- ✅ Full audit trail (event_logs)
- ✅ Query by contact, channel, date range
- ✅ API endpoints for conversation history
- ✅ UI displays complete timeline

**Nothing is lost. Complete conversation history forever.**

---

**Live Backend:** https://avatarimaging_cms.mona-08d.workers.dev
**Database Tables:** sms_messages, touchpoints, event_logs
**APIs:** `/api/contacts/{id}/conversations`, `/api/contacts/{id}/sms`
**Updated:** 2026-01-02
