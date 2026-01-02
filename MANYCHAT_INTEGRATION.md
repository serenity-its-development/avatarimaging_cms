# 💬 ManyChat Integration Guide

## Instagram/Facebook Messenger Automation for Avatar Imaging CRM

**Purpose:** Capture leads from Instagram/Facebook, manage conversations, and sync with CRM.

---

## 🎯 What ManyChat Does

ManyChat enables automated conversations on:
- **Instagram DMs** (Direct Messages)
- **Facebook Messenger**
- **SMS** (via ManyChat SMS)
- **WhatsApp** (premium feature)

### Use Cases for Avatar Imaging
1. **Lead Capture:** Auto-respond to Instagram DMs asking about services
2. **Appointment Booking:** Guide users to book appointments via chat
3. **FAQ Automation:** Answer common questions automatically
4. **Follow-ups:** Send booking reminders via Messenger
5. **Re-engagement:** Tag and segment subscribers for campaigns

---

## 🔌 Integration Architecture

```
Instagram/Facebook Messenger
         ↓
    ManyChat Platform (automation)
         ↓
    Webhook → CRM Worker
         ↓
    D1 Database (contacts, touchpoints)
         ↓
    AI Analysis (intent, sentiment)
```

---

## 📡 ManyChat API Capabilities

### Authentication
```
Authorization: Bearer YOUR_API_KEY
```

### Key Endpoints

#### 1. Send Messages
```javascript
POST /fb/subscriber/sendContent
{
  "subscriber_id": "123456789",
  "messages": [
    {
      "type": "text",
      "text": "Your appointment is confirmed for tomorrow at 10am!"
    }
  ]
}
```

#### 2. Get Subscriber Info
```javascript
GET /fb/subscriber/getInfo?subscriber_id=123456789

Response:
{
  "id": "123456789",
  "name": "John Smith",
  "email": "john@example.com",
  "phone": "+61400123456",
  "tags": ["lead", "interested-mri"],
  "custom_fields": {
    "preferred_location": "Brisbane"
  }
}
```

#### 3. Tag Subscribers
```javascript
POST /fb/subscriber/addTag
{
  "subscriber_id": "123456789",
  "tag_id": "456"  // or tag_name: "booked"
}

POST /fb/subscriber/removeTag
{
  "subscriber_id": "123456789",
  "tag_id": "456"
}
```

#### 4. Set Custom Fields
```javascript
POST /fb/subscriber/setCustomField
{
  "subscriber_id": "123456789",
  "field_id": "789",
  "field_value": "Brisbane Clinic"
}
```

#### 5. Send Flow
```javascript
POST /fb/subscriber/sendFlow
{
  "subscriber_id": "123456789",
  "flow_ns": "content20240101"  // Flow namespace/ID
}
```

---

## 🪝 Webhook Events (ManyChat → CRM)

ManyChat sends webhooks for various events. Configure in ManyChat dashboard.

### Webhook URL
```
https://avatarimaging_cms.mona-08d.workers.dev/webhooks/manychat
```

### Common Events

#### 1. New Subscriber
```json
{
  "event": "new_subscriber",
  "subscriber": {
    "id": "123456789",
    "name": "John Smith",
    "first_name": "John",
    "last_name": "Smith",
    "email": "john@example.com",
    "phone": "+61400123456",
    "subscribed_at": "2026-01-02T10:30:00Z",
    "source": "instagram_dm"
  }
}
```

**CRM Action:**
- Create new contact
- Tag as "instagram_lead"
- Calculate AI warmness score
- Add to nurture sequence

#### 2. User Sent Message
```json
{
  "event": "user_message",
  "subscriber_id": "123456789",
  "message": {
    "text": "Do you have appointments available this week?",
    "timestamp": "2026-01-02T10:35:00Z"
  }
}
```

**CRM Action:**
- Log touchpoint
- AI intent detection (booking inquiry)
- Create task for staff follow-up
- Auto-respond with availability

#### 3. Tag Added
```json
{
  "event": "tag_added",
  "subscriber_id": "123456789",
  "tag": {
    "id": "456",
    "name": "interested-ct-scan"
  }
}
```

**CRM Action:**
- Update contact stage
- Add to pipeline
- Trigger automation (send pricing info)

#### 4. Custom Field Updated
```json
{
  "event": "custom_field_updated",
  "subscriber_id": "123456789",
  "field": {
    "name": "appointment_date",
    "value": "2026-01-15"
  }
}
```

**CRM Action:**
- Create booking record
- Send confirmation SMS
- Add to calendar

---

## 🏗️ Implementation Plan

### Phase 1: Incoming Webhooks (Day 1)

**File:** `src/webhooks/ManyChatWebhookHandler.ts`

```typescript
export class ManyChatWebhookHandler {
  async handleNewSubscriber(data: any) {
    // Create contact in CRM
    const contact = await this.db.contacts.create({
      name: data.subscriber.name,
      email: data.subscriber.email,
      phone: data.subscriber.phone,
      source: 'manychat_instagram',
      current_pipeline: 'instagram_leads',
      current_stage: 'new'
    })

    // Calculate AI warmness
    await this.contactService.recalculateWarmness(contact.id)

    // Log touchpoint
    await this.db.touchpoints.create({
      contact_id: contact.id,
      channel: 'instagram_dm',
      type: 'new_subscriber',
      direction: 'inbound'
    })
  }

  async handleUserMessage(data: any) {
    // Find contact by subscriber_id
    const contact = await this.findByManyChatId(data.subscriber_id)

    // Log touchpoint
    await this.db.touchpoints.create({
      contact_id: contact.id,
      channel: 'instagram_dm',
      type: 'message_received',
      direction: 'inbound',
      notes: data.message.text
    })

    // AI intent detection
    const intent = await this.ai.detectIntent(data.message.text)

    // Auto-respond or create task
    if (intent.confidence > 0.8) {
      await this.handleIntent(contact, intent)
    } else {
      // Create task for manual review
      await this.db.tasks.create({
        contact_id: contact.id,
        type: 'follow_up',
        title: 'Instagram DM requires response',
        description: data.message.text,
        urgent: true
      })
    }
  }
}
```

### Phase 2: Outgoing Messages (Day 2)

**File:** `src/services/ManyChatService.ts`

```typescript
export class ManyChatService {
  private apiKey: string
  private baseUrl = 'https://api.manychat.com/fb'

  async sendMessage(subscriberId: string, message: string) {
    const response = await fetch(`${this.baseUrl}/subscriber/sendContent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    })

    return await response.json()
  }

  async addTag(subscriberId: string, tagName: string) {
    const response = await fetch(`${this.baseUrl}/subscriber/addTag`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        tag_name: tagName
      })
    })

    return await response.json()
  }

  async setCustomField(subscriberId: string, fieldName: string, value: any) {
    const response = await fetch(`${this.baseUrl}/subscriber/setCustomField`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        field_name: fieldName,
        field_value: value
      })
    })

    return await response.json()
  }
}
```

### Phase 3: AI-Powered Responses (Day 3)

```typescript
async handleIntent(contact: Contact, intent: AIIntent) {
  switch (intent.type) {
    case 'booking_inquiry':
      // Send available times via ManyChat
      await this.manychat.sendMessage(
        contact.manychat_subscriber_id,
        "We have availability this week! Would you prefer morning or afternoon?"
      )
      break

    case 'pricing_inquiry':
      // Send pricing flow
      await this.manychat.sendFlow(
        contact.manychat_subscriber_id,
        'pricing_flow_id'
      )
      break

    case 'location_inquiry':
      // Send location info
      await this.manychat.sendMessage(
        contact.manychat_subscriber_id,
        "We have 3 locations: Brisbane CBD, Gold Coast, and Sunshine Coast. Which is closest to you?"
      )
      break

    default:
      // Create task for human
      await this.createFollowUpTask(contact, intent)
  }
}
```

---

## 🎨 ManyChat Flow Examples

### Flow 1: Lead Qualification
```
User sends DM: "Do you do MRI scans?"
  ↓
ManyChat: "Yes! We offer MRI scans at all 3 locations.
           What area are you looking to scan?"
  ↓
User: "My knee"
  ↓
ManyChat: "Got it! Have you had knee issues before?"
  ↓
User: "Yes, sports injury"
  ↓
[Add tag: "mri_knee"]
[Add tag: "sports_injury"]
[Set custom field: scan_type = "MRI Knee"]
  ↓
ManyChat: "Would you like to book an appointment?
           📅 Yes, book now
           📞 I'll call later
           ℹ️ More info first"
  ↓
[Send webhook to CRM with all data]
```

### Flow 2: Appointment Confirmation
```
CRM triggers ManyChat when booking created
  ↓
ManyChat sends: "✅ Your MRI scan is confirmed!
                 📅 Date: Jan 15, 2026
                 🕐 Time: 10:00 AM
                 📍 Brisbane CBD Clinic

                 Reply CONFIRM to confirm or CHANGE to reschedule"
  ↓
User: "CONFIRM"
  ↓
[Add tag: "confirmed"]
[Send webhook to CRM: booking_confirmed]
  ↓
ManyChat: "Perfect! We'll send you a reminder 24 hours before.
           See you soon! 👋"
```

---

## 📋 Database Schema Updates

Add ManyChat subscriber ID to contacts table:

```sql
ALTER TABLE contacts
ADD COLUMN manychat_subscriber_id TEXT,
ADD COLUMN manychat_tags TEXT,  -- JSON array of tags
ADD COLUMN instagram_handle TEXT,
ADD COLUMN facebook_id TEXT;

CREATE INDEX idx_manychat_subscriber ON contacts(manychat_subscriber_id);
```

---

## 🔐 Configuration

### Environment Variables
```bash
MANYCHAT_API_KEY=your_api_key_here
MANYCHAT_PAGE_ID=your_facebook_page_id
MANYCHAT_WEBHOOK_SECRET=your_webhook_verification_secret
```

### Set in Production
```bash
export CLOUDFLARE_API_TOKEN=your_token
npx wrangler secret put MANYCHAT_API_KEY
npx wrangler secret put MANYCHAT_WEBHOOK_SECRET
```

---

## 🔧 ManyChat Setup Steps

### 1. Create ManyChat Account
1. Go to: https://manychat.com
2. Sign up (free plan available)
3. Connect Facebook Page
4. Connect Instagram Business Account

### 2. Get API Key
1. ManyChat Dashboard → Settings → API
2. Generate API key
3. Copy and save securely

### 3. Configure Webhook
1. Settings → Integrations → External Request
2. Add webhook URL: `https://avatarimaging_cms.mona-08d.workers.dev/webhooks/manychat`
3. Select events to send:
   - New subscriber
   - Tag added/removed
   - Custom field updated
   - User message received
4. Set verification secret

### 4. Create Flows
1. Automation → Flows
2. Create greeting flow (new subscribers)
3. Create booking flow
4. Create FAQ flow
5. Test each flow

### 5. Set Up Tags
Create these tags in ManyChat:
- `lead` - New subscriber
- `qualified` - Showed interest in services
- `booked` - Appointment scheduled
- `confirmed` - Appointment confirmed
- `interested-mri` - Interested in MRI
- `interested-ct` - Interested in CT
- `interested-xray` - Interested in X-Ray
- `brisbane`, `goldcoast`, `sunshinecoast` - Location preferences

### 6. Create Custom Fields
- `appointment_date` (Date)
- `scan_type` (Text)
- `preferred_location` (Text)
- `medical_condition` (Text)
- `referral_source` (Text)

---

## 🧪 Testing

### Test Webhook Locally
```bash
# Start local worker
npm run dev:worker

# Send test webhook
curl -X POST http://localhost:8787/webhooks/manychat \
  -H "Content-Type: application/json" \
  -H "X-ManyChat-Signature: test" \
  -d '{
    "event": "new_subscriber",
    "subscriber": {
      "id": "test123",
      "name": "Test User",
      "email": "test@example.com"
    }
  }'
```

### Test ManyChat Flow
1. Send DM to your Instagram business account
2. Check ManyChat Live Chat (see conversation)
3. Verify webhook fires in CRM logs
4. Check contact created in CRM database

---

## 💰 Pricing

### ManyChat Plans
- **Free:** 1,000 contacts, basic automation
- **Pro:** $15/month - Unlimited contacts, advanced features
- **Premium:** Custom pricing - Priority support, advanced integrations

### Instagram/Facebook
- **DMs:** Free (unlimited)
- **Sponsored messages:** Paid (reach non-contacts)

### Recommendation
Start with **Free plan** for testing, upgrade to **Pro** ($15/month) when you have >1,000 subscribers.

---

## 📊 Success Metrics

### KPIs to Track
- **Lead Capture Rate:** % of Instagram DMs that convert to contacts
- **Response Time:** Average time to first response (auto vs manual)
- **Booking Conversion:** % of DM conversations that result in bookings
- **Engagement Rate:** % of subscribers who interact with flows
- **Tag Accuracy:** % of contacts correctly tagged by automation

### Expected Results
- **80%+** lead capture (auto-create contact from DM)
- **<30 seconds** automated response time
- **15-25%** booking conversion from Instagram leads
- **60%+** engagement with automation flows

---

## 🎯 Integration Benefits

### For Avatar Imaging
1. **24/7 Availability:** Auto-respond to Instagram DMs anytime
2. **Lead Qualification:** AI + ManyChat filters serious inquiries
3. **Reduced Workload:** Automation handles 70% of common questions
4. **Better Tracking:** All Instagram leads in CRM automatically
5. **Personalization:** Custom fields for tailored follow-up

### For Patients
1. **Instant Responses:** No waiting for business hours
2. **Convenient Booking:** Book via Instagram (where they already are)
3. **Clear Communication:** Automated confirmations and reminders
4. **Easy Access:** DM is easier than phone calls for many

---

## 🚀 Next Steps

1. **Get ManyChat Account** (15 min)
   - Sign up at https://manychat.com
   - Connect Instagram + Facebook

2. **Configure API** (10 min)
   - Get API key
   - Set up webhook URL
   - Configure verification

3. **Build Webhook Handler** (1 hour)
   - Create `/webhooks/manychat` endpoint
   - Parse events
   - Sync with CRM

4. **Create Flows** (2 hours)
   - Greeting flow
   - Booking flow
   - FAQ automation

5. **Test & Launch** (1 hour)
   - Test all flows
   - Verify CRM sync
   - Go live!

---

**Ready to connect Instagram leads directly to your CRM?** 🚀

Total setup time: ~4-5 hours
Monthly cost: $0-15 (free tier sufficient to start)
