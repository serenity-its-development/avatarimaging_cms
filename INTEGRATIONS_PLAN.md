# 🔌 Real-World Integrations Plan

## Avatar Imaging CRM - Integration Roadmap

**Date:** January 2, 2026
**Priority:** Production-ready integrations

---

## 📋 Integration Overview

### Essential Integrations (Build Now)
1. **Wix Bookings** - Appointment sync & management
2. **Gmail/Google Workspace** - Email communication & OAuth
3. **SendGrid** - Bulk email campaigns + SMS (premium option)
4. **MobileMessage.com.au** - Cost-effective SMS (Australian provider)

### Current Status
- ✅ Infrastructure ready (Workers, D1, Queues, AI)
- ✅ Database schema supports all integrations
- ✅ Service layer partially built (SMS, Email stubs)
- ⏳ Webhook handlers need implementation
- ⏳ API credentials need configuration

---

## 🎯 Integration 1: Wix Bookings

### Purpose
Sync appointment bookings from Wix website to CRM automatically.

### Features
- ✅ Webhook receiver for new bookings
- ✅ Create/update contacts from booking data
- ✅ Create booking records in CRM
- ✅ Send confirmation SMS via MobileMessage
- ✅ Add to Google Calendar (via Gmail API)
- ✅ AI-powered booking insights

### Wix Webhook Events
```json
{
  "event": "bookings/created",
  "data": {
    "booking_id": "abc123",
    "service": "MRI Scan",
    "customer": {
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+61400123456"
    },
    "start_time": "2026-01-15T10:00:00Z",
    "end_time": "2026-01-15T10:30:00Z",
    "location": "Brisbane Clinic"
  }
}
```

### Implementation
- **Endpoint:** `/webhooks/wix/bookings`
- **Verification:** HMAC signature with `WIX_WEBHOOK_SECRET`
- **Processing:** Create contact → Create booking → Send SMS → Log event

### Configuration Required
```bash
WIX_WEBHOOK_SECRET=your_secret_here
WIX_SITE_ID=your_wix_site_id
WIX_BOOKING_CALENDAR_ID=your_calendar_id
```

### Wix Setup Steps
1. Go to: Wix Dashboard → Settings → Webhooks
2. Add webhook URL: `https://avatarimaging_cms.mona-08d.workers.dev/webhooks/wix/bookings`
3. Select events: `bookings/created`, `bookings/updated`, `bookings/cancelled`
4. Copy webhook secret
5. Test connection

---

## 🎯 Integration 2: Gmail / Google Workspace

### Purpose
- Send emails from CRM (confirmations, reminders, campaigns)
- OAuth authentication for users
- Google Calendar sync
- Contact import from Google Contacts

### Features
- ✅ OAuth 2.0 authentication
- ✅ Send emails via Gmail API
- ✅ Calendar event creation
- ✅ Email templates with tracking
- ✅ Read receipts and engagement tracking

### Gmail API Capabilities
```javascript
// Send email
POST /gmail/v1/users/me/messages/send

// Create calendar event
POST /calendar/v3/calendars/primary/events

// Get contacts
GET /people/v1/people/me/connections
```

### Implementation
- **Auth Flow:** OAuth 2.0 with Google
- **Scopes:**
  - `gmail.send` - Send emails
  - `calendar.events` - Manage calendar
  - `contacts.readonly` - Read contacts
- **Token Storage:** D1 database (encrypted)

### Configuration Required
```bash
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://avatarimaging_cms.mona-08d.workers.dev/auth/google/callback
```

### Google Cloud Setup Steps
1. Go to: https://console.cloud.google.com
2. Create project: "Avatar Imaging CRM"
3. Enable APIs: Gmail API, Calendar API, People API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI
6. Copy client ID and secret

---

## 🎯 Integration 3: SendGrid (Premium Email + SMS)

### Purpose
Professional email campaigns with deliverability tracking + optional SMS.

### Features
- ✅ Bulk email campaigns (newsletters, promotions)
- ✅ Email templates with drag-and-drop builder
- ✅ Deliverability analytics (open rates, clicks)
- ✅ A/B testing
- ✅ Unsubscribe management
- ✅ SMS campaigns (premium feature)

### SendGrid Capabilities
```javascript
// Send email
POST /v3/mail/send

// Send SMS (via SendGrid SMS)
POST /v3/sms/send

// Create campaign
POST /v3/campaigns

// Track events (webhooks)
webhooks: open, click, bounce, spam
```

### Pricing (Approximate)
- **Email:** Free tier (100 emails/day), then $19.95/month (50K emails)
- **SMS:** $0.05-0.10 per SMS (Australia)
- **Combined:** $49/month for email + SMS

### Implementation
- **Service:** `EmailMarketingService.ts` (already exists)
- **Provider:** SendGrid API v3
- **Tracking:** Webhook events for engagement

### Configuration Required
```bash
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=noreply@avatarimaging.com.au
SENDGRID_FROM_NAME=Avatar Imaging
SENDGRID_WEBHOOK_SECRET=your_webhook_secret
```

### SendGrid Setup Steps
1. Go to: https://sendgrid.com
2. Create account (free tier to start)
3. Verify sender email/domain
4. Create API key
5. Set up event webhooks
6. Configure unsubscribe groups

---

## 🎯 Integration 4: MobileMessage.com.au (Cost-Effective SMS)

### Purpose
Australian SMS provider with better pricing than international alternatives.

### Why MobileMessage?
- 💰 **Cheaper:** ~$0.04-0.06 per SMS (vs $0.10+ international)
- 🇦🇺 **Australian:** Local delivery, better routes
- 📱 **Reliable:** Direct carrier connections
- ⚡ **Fast:** Sub-second delivery

### Features
- ✅ Send SMS (single + bulk)
- ✅ Receive SMS (inbound webhooks)
- ✅ Delivery reports
- ✅ Two-way messaging
- ✅ Scheduled sending
- ✅ Contact lists

### MobileMessage API
```javascript
// Send SMS
POST /api/v1/sms/send
{
  "to": "+61400123456",
  "message": "Your appointment is confirmed for 10am tomorrow.",
  "from": "AvatarImg"
}

// Receive SMS (webhook)
POST /webhooks/mobilemessage/incoming
{
  "from": "+61400123456",
  "to": "+61412345678",
  "message": "YES confirm my booking",
  "timestamp": "2026-01-02T10:30:00Z"
}
```

### Pricing (Approximate)
- **Pay-as-you-go:** $0.045 per SMS
- **Bulk credits:** $0.04 per SMS (5,000+ credits)
- **Monthly plans:** From $50/month (1,200 SMS included)

### Implementation
- **Service:** `SMSService.ts` (update provider from ClickSend)
- **Provider:** MobileMessage API
- **Features:** Send, receive, delivery tracking
- **Queue:** Use existing `avatar-queue` for async sending

### Configuration Required
```bash
MOBILEMESSAGE_API_KEY=your_api_key_here
MOBILEMESSAGE_FROM_NUMBER=+61412345678
MOBILEMESSAGE_WEBHOOK_SECRET=your_webhook_secret
SMS_PROVIDER=mobilemessage  # Update from 'clicksend'
```

### MobileMessage Setup Steps
1. Go to: https://mobilemessage.com.au
2. Create account
3. Verify identity (Australian business)
4. Purchase credits or plan
5. Get dedicated number (optional, $10/month)
6. Create API key
7. Set up webhook URL: `https://avatarimaging_cms.mona-08d.workers.dev/webhooks/mobilemessage/incoming`

---

## 📊 Integration Comparison Matrix

| Feature | Wix | Gmail | SendGrid | MobileMessage |
|---------|-----|-------|----------|---------------|
| **Type** | Webhooks | OAuth/API | API | API |
| **Purpose** | Bookings | Email/Cal | Campaigns | SMS |
| **Cost** | Free | Free | $0-49/mo | $0.04/SMS |
| **Setup Time** | 15 min | 30 min | 20 min | 15 min |
| **Priority** | High | High | Medium | High |
| **Complexity** | Low | Medium | Low | Low |

---

## 🏗️ Implementation Plan

### Phase 1: Foundation (Day 1)
1. ✅ Set up environment variables
2. ✅ Create webhook handlers structure
3. ✅ Implement request verification (HMAC, signatures)
4. ✅ Set up error logging

### Phase 2: Wix Integration (Day 1-2)
1. ✅ Build `/webhooks/wix/bookings` endpoint
2. ✅ Parse booking data
3. ✅ Create/update contact
4. ✅ Create booking record
5. ✅ Test with Wix webhook simulator

### Phase 3: MobileMessage SMS (Day 2)
1. ✅ Update `SMSService.ts` for MobileMessage API
2. ✅ Build send SMS function
3. ✅ Build receive SMS webhook `/webhooks/mobilemessage/incoming`
4. ✅ Add AI intent detection for incoming SMS
5. ✅ Test send/receive

### Phase 4: Gmail Integration (Day 2-3)
1. ✅ Build OAuth flow (`/auth/google/*`)
2. ✅ Token storage and refresh
3. ✅ Send email via Gmail API
4. ✅ Create calendar events
5. ✅ Test authentication

### Phase 5: SendGrid (Optional, Day 3-4)
1. ⏳ Build email campaign service
2. ⏳ Create templates
3. ⏳ Set up tracking webhooks
4. ⏳ Build campaign management UI
5. ⏳ Test bulk sending

### Phase 6: Testing & Polish (Day 4-5)
1. ⏳ End-to-end integration tests
2. ⏳ Error handling and retry logic
3. ⏳ Rate limiting
4. ⏳ Monitoring and alerts
5. ⏳ Documentation

---

## 🔐 Security Checklist

### Webhook Security
- ✅ Verify HMAC signatures (Wix)
- ✅ Validate request origins
- ✅ Rate limiting per IP
- ✅ Log all webhook events
- ✅ Secrets stored in Workers Secrets (not env vars)

### API Security
- ✅ Store tokens encrypted in D1
- ✅ Refresh tokens automatically
- ✅ Use least-privilege scopes
- ✅ HTTPS only
- ✅ API key rotation schedule

### Data Protection
- ✅ PII encryption at rest
- ✅ Audit logs (HIPAA compliance ready)
- ✅ Access control (RBAC)
- ✅ Secure credential storage

---

## 📝 Configuration File Template

Create `.env.local` (do NOT commit):

```bash
# Wix Integration
WIX_WEBHOOK_SECRET=your_wix_webhook_secret
WIX_SITE_ID=your_wix_site_id
WIX_BOOKING_CALENDAR_ID=your_wix_calendar_id

# Google OAuth & APIs
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_OAUTH_REDIRECT_URI=https://avatarimaging_cms.mona-08d.workers.dev/auth/google/callback

# MobileMessage SMS
MOBILEMESSAGE_API_KEY=your_mobilemessage_api_key
MOBILEMESSAGE_FROM_NUMBER=+61412345678
MOBILEMESSAGE_WEBHOOK_SECRET=your_webhook_secret
SMS_PROVIDER=mobilemessage

# SendGrid (Optional)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@avatarimaging.com.au
SENDGRID_FROM_NAME=Avatar Imaging
SENDGRID_WEBHOOK_SECRET=your_sendgrid_webhook_secret

# General
SESSION_SECRET=your_random_session_secret_here_min_32_chars
```

### Setting Secrets in Production
```bash
export CLOUDFLARE_API_TOKEN=your_token

# Set each secret
npx wrangler secret put WIX_WEBHOOK_SECRET
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put MOBILEMESSAGE_API_KEY
npx wrangler secret put SENDGRID_API_KEY
npx wrangler secret put SESSION_SECRET
```

---

## 🧪 Testing Plan

### Local Testing
```bash
# Start local dev server
npm run dev:worker

# Test webhook locally
curl -X POST http://localhost:8787/webhooks/wix/bookings \
  -H "Content-Type: application/json" \
  -H "X-Wix-Webhook-Signature: test" \
  -d '{"event":"bookings/created","data":{...}}'
```

### Production Testing
1. **Wix:** Use Wix webhook simulator
2. **Gmail:** Test OAuth flow with real account
3. **MobileMessage:** Send test SMS to your number
4. **SendGrid:** Send test email to yourself

### Integration Testing
1. Book appointment on Wix → Check CRM creates contact
2. CRM sends SMS → Verify received on phone
3. Customer replies → Check AI detects intent
4. Send email → Check Gmail deliverability

---

## 💰 Cost Summary

### Monthly Costs (Estimated)
```
Wix Integration:         $0 (using existing Wix account)
Gmail/Google:            $0 (using Google Workspace account)
MobileMessage:          ~$50-100/month (1,000-2,000 SMS)
SendGrid (optional):    ~$20-50/month (email campaigns)
────────────────────────────────────────────────────────
Total:                  ~$70-150/month
```

### Per-Transaction Costs
- **SMS (MobileMessage):** $0.04-0.06 per message
- **Email (SendGrid):** $0.0004 per email (after free tier)
- **Wix Webhook:** Free
- **Gmail API:** Free (within quotas)

---

## 🎯 Success Metrics

### KPIs to Track
- **Booking Sync Rate:** 100% of Wix bookings in CRM
- **SMS Delivery Rate:** >98%
- **Email Deliverability:** >95%
- **Webhook Latency:** <2 seconds
- **API Uptime:** >99.9%

### Monitoring
- Cloudflare Analytics (requests, errors)
- Custom event logging (D1 database)
- Alert thresholds (error rates >1%)
- Daily reports (bookings synced, SMS sent)

---

## 🚀 Next Steps

1. **Get API Credentials** (Priority: High)
   - [ ] Wix webhook secret
   - [ ] Google OAuth credentials
   - [ ] MobileMessage API key
   - [ ] SendGrid API key (optional)

2. **Build Core Integrations** (This week)
   - [ ] Wix webhook handler
   - [ ] MobileMessage SMS service
   - [ ] Gmail OAuth + email sending

3. **Test Everything** (Next week)
   - [ ] End-to-end booking flow
   - [ ] SMS send/receive
   - [ ] Email campaigns

4. **Go Live** (Week 3)
   - [ ] Configure production secrets
   - [ ] Enable webhooks
   - [ ] Monitor for 24 hours
   - [ ] Train staff

---

**Ready to build?** Let's start with Wix + MobileMessage integration! 🚀
