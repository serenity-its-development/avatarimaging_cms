# 📬 Bidirectional Messaging - Complete Guide

## ✅ What's Built and Live

Your CRM now has **fully bidirectional** messaging with AI-powered automation across:
- **SMS** (via MobileMessage.com.au)
- **Instagram/Facebook Messenger** (via ManyChat)

---

## 🔄 How Bidirectional Messaging Works

### **1. SMS Messaging (MobileMessage.com.au)**

#### Outbound (CRM → Customer):
```typescript
// From your CRM, send SMS to a customer
POST /api/sms/send
{
  "contact_id": "cnt_123",
  "message": "Hi! Your MRI appointment is confirmed for tomorrow at 2pm."
}
```

**Features:**
- Send individual SMS
- Bulk SMS campaigns
- Scheduled SMS
- Cost: ~$0.04-0.06 AUD per SMS

#### Inbound (Customer → CRM):
**Customer texts your number → Webhook receives it:**
```
POST /webhooks/mobilemessage/incoming
```

**AI automatically:**
1. ✅ Finds or creates contact by phone number
2. ✅ Detects intent (booking, cancellation, question, etc.)
3. ✅ Creates appropriate task for staff
4. ✅ Sends auto-reply
5. ✅ Logs touchpoint and AI usage

**Example Flow:**
```
Customer texts: "I need to cancel my appointment"

↓ AI Intent Detection

Intent: "booking_cancellation"

↓ Automated Actions

1. Creates urgent task: "SMS: Customer wants to cancel"
2. Auto-replies: "We've received your cancellation request. Our team will contact you shortly to assist."
3. Logs touchpoint in contact history
```

---

### **2. Instagram/Facebook Messaging (ManyChat)**

#### Outbound (CRM → Subscriber):
```typescript
// Send message to Instagram subscriber
POST /api/manychat/send
{
  "subscriber_id": "123456",
  "message": "Thanks for your interest! Here's our pricing..."
}

// Or trigger an automated flow
POST /api/manychat/flow
{
  "subscriber_id": "123456",
  "flow_id": "welcome_flow"
}
```

**Features:**
- Send text messages
- Trigger automated flows
- Add/remove tags
- Update custom fields

#### Inbound (Subscriber → CRM):
**Customer DMs on Instagram → Webhook receives it:**
```
POST /webhooks/manychat
Event: user_message
```

**AI automatically:**
1. ✅ Syncs subscriber to CRM contact
2. ✅ Detects intent from message
3. ✅ Auto-tags based on interest (interested-mri, interested-ct, etc.)
4. ✅ Creates sales tasks
5. ✅ Calculates AI warmness score
6. ✅ Triggers ManyChat flows for responses

**Example Flow:**
```
Customer DMs on Instagram: "How much for an MRI scan?"

↓ AI Intent Detection

Intent: "booking_inquiry"

↓ Automated Actions

1. Creates contact in CRM (if new)
2. Adds ManyChat tag: "interested-mri"
3. Creates task: "Instagram lead interested in MRI"
4. Triggers ManyChat flow: "pricing_info"
5. Calculates warmness score (queued)
```

---

## 🎯 AI Intent Detection

### Supported Intents:

| Intent | Trigger Words | Auto Action |
|--------|--------------|-------------|
| `booking_confirmation` | "confirm", "yes", "confirmed" | Confirms appointment, sends confirmation SMS |
| `booking_cancellation` | "cancel", "can't make it" | Creates urgent cancellation task |
| `booking_inquiry` | "book", "appointment", "when" | Creates follow-up task, sends info |
| `question` | "how", "what", "why", "?" | Creates customer question task |
| `interested-mri` | "mri", "scan" | Tags contact, creates sales task |
| `interested-ct` | "ct", "cat scan" | Tags contact, creates sales task |
| `interested-xray` | "x-ray", "xray" | Tags contact, creates sales task |

### AI Models Used:
- **Intent Detection**: `@cf/meta/llama-3.2-1b-instruct` (~$0.0001 per message)
- **Warmness Scoring**: `@cf/meta/llama-3.1-8b-instruct` (~$0.001 per analysis)

---

## 📊 Database Tracking

Every message (inbound/outbound) is tracked:

### SMS Messages Table:
```sql
SELECT * FROM sms_messages;
-- Fields: id, contact_id, direction, message_body, provider,
--         status, detected_intent, intent_confidence, cost_aud
```

### Touchpoints Table:
```sql
SELECT * FROM touchpoints WHERE channel IN ('sms', 'instagram');
-- Logs every interaction with timestamp
```

### AI Usage Logs:
```sql
SELECT * FROM ai_usage_logs WHERE operation = 'sms_intent_detection';
-- Tracks AI costs and performance
```

---

## 🔧 Setup Required

### **1. MobileMessage SMS**

**Get API credentials:**
1. Sign up: https://mobilemessage.com.au/
2. Get API key from dashboard
3. Configure webhook URL: `https://avatarimaging_cms.mona-08d.workers.dev/webhooks/mobilemessage/incoming`

**Set secrets:**
```bash
npx wrangler secret put MOBILEMESSAGE_API_KEY
# Enter your API key

npx wrangler secret put MOBILEMESSAGE_WEBHOOK_SECRET
# Enter webhook secret (if provided)
```

**Update vars in wrangler.toml:**
```toml
MOBILEMESSAGE_FROM_NUMBER = "+61400123456"  # Your number
```

---

### **2. ManyChat Instagram/Facebook**

**Get API credentials:**
1. Go to: https://manychat.com/
2. Connect your Instagram/Facebook page
3. Go to Settings → API
4. Copy API key
5. Configure webhook: `https://avatarimaging_cms.mona-08d.workers.dev/webhooks/manychat`

**Set secrets:**
```bash
npx wrangler secret put MANYCHAT_API_KEY
# Enter your API key

npx wrangler secret put MANYCHAT_WEBHOOK_SECRET
# Enter webhook secret
```

**Update vars in wrangler.toml:**
```toml
MANYCHAT_PAGE_ID = "123456789"  # Your page ID
MANYCHAT_ENABLED = "true"
```

---

## 🧪 Testing Bidirectional Messaging

### Test SMS:
```bash
# 1. Send outbound SMS
curl -X POST https://avatarimaging_cms.mona-08d.workers.dev/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "cnt_123",
    "message": "Test message"
  }'

# 2. Simulate inbound SMS webhook
curl -X POST https://avatarimaging_cms.mona-08d.workers.dev/webhooks/mobilemessage/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+61400123456",
    "to": "+61400000000",
    "message": "I want to cancel my appointment",
    "timestamp": "2026-01-02T12:00:00Z",
    "message_id": "msg_123"
  }'

# 3. Check tasks created
curl https://avatarimaging_cms.mona-08d.workers.dev/api/tasks?status=pending
```

### Test Instagram/Facebook:
```bash
# 1. Send message to subscriber
curl -X POST https://avatarimaging_cms.mona-08d.workers.dev/api/manychat/send \
  -H "Content-Type: application/json" \
  -d '{
    "subscriber_id": "123456",
    "message": "Thanks for your interest!"
  }'

# 2. Simulate inbound message webhook
curl -X POST https://avatarimaging_cms.mona-08d.workers.dev/webhooks/manychat \
  -H "Content-Type: application/json" \
  -d '{
    "event": "user_message",
    "subscriber_id": "123456",
    "message": {
      "text": "How much for an MRI?",
      "timestamp": "2026-01-02T12:00:00Z"
    }
  }'

# 3. Check contact created/updated
curl https://avatarimaging_cms.mona-08d.workers.dev/api/contacts?limit=10
```

---

## 📈 Message Flow Examples

### Example 1: New Lead from Instagram
```
1. New follower DMs: "Hi! I'm interested in CT scans"
   ↓
2. Webhook → /webhooks/manychat (event: user_message)
   ↓
3. AI detects intent: "interested-ct"
   ↓
4. Actions:
   - Creates contact in CRM
   - Adds ManyChat tag: "interested-ct"
   - Creates task: "Instagram lead interested in CT"
   - Triggers flow: "ct_pricing_info"
   - Queues warmness calculation
   ↓
5. ManyChat auto-replies with CT info
   ↓
6. Staff sees task in CRM dashboard
   ↓
7. Staff follows up with personalized message from CRM
```

### Example 2: SMS Appointment Confirmation
```
1. Customer receives: "Confirm your MRI appointment for Jan 5 at 2pm? Reply YES to confirm."
   ↓
2. Customer texts: "YES"
   ↓
3. Webhook → /webhooks/mobilemessage/incoming
   ↓
4. AI detects intent: "booking_confirmation"
   ↓
5. Actions:
   - Finds pending booking
   - Updates status: "confirmed"
   - Sets confirmed_at timestamp
   - Auto-replies: "✓ Your appointment is confirmed! We'll see you soon."
   ↓
6. No staff intervention needed!
```

### Example 3: Bulk SMS Campaign with Responses
```
1. Staff sends bulk SMS from CRM:
   "New year special: 20% off all scans! Reply INTERESTED for details."
   ↓
2. 50 customers receive SMS
   ↓
3. 10 customers reply "INTERESTED"
   ↓
4. Webhook processes each reply:
   - AI detects intent: "inquiry"
   - Creates follow-up task for each
   - Auto-replies with details
   ↓
5. Staff sees 10 warm leads in task list
   ↓
6. Staff follows up with personalized offers
```

---

## 💰 Cost Breakdown

### SMS (MobileMessage):
- **Outbound**: ~$0.045 AUD per SMS
- **Inbound**: Free (included)
- **AI processing**: ~$0.0001 USD per message
- **Total cost per conversation**: ~$0.05 AUD

### Instagram/Facebook (ManyChat):
- **Messages**: Free (unlimited)
- **ManyChat subscription**: ~$15-50 USD/month (based on subscribers)
- **AI processing**: ~$0.0001 USD per message
- **Total cost**: Fixed monthly fee

---

## 🚀 Current Status

✅ **Backend deployed** with bidirectional messaging
✅ **Database schema** updated with integration fields
✅ **Webhook endpoints** live and ready:
   - `/webhooks/mobilemessage/incoming`
   - `/webhooks/mobilemessage/delivery`
   - `/webhooks/manychat`
✅ **AI intent detection** operational
✅ **Auto-reply logic** implemented

⏳ **Next steps:**
1. Set up MobileMessage account + API keys
2. Set up ManyChat account + webhook
3. Test with real messages
4. Monitor AI accuracy and tune intents

---

## 📚 Related Documentation

- [INTEGRATIONS_PLAN.md](INTEGRATIONS_PLAN.md) - Full integration roadmap
- [MANYCHAT_INTEGRATION.md](MANYCHAT_INTEGRATION.md) - ManyChat setup guide
- API Docs:
  - MobileMessage: https://mobilemessage.com.au/api-docs
  - ManyChat: https://api.manychat.com/swagger

---

**Live Backend:** https://avatarimaging_cms.mona-08d.workers.dev
**Version:** 87554a29-d130-4d26-b7f4-65fce525ab1b
**Updated:** 2026-01-02
