# 🏗️ Integration Build Order

## Real-World Connections - Prioritized Implementation Plan

**Goal:** Get Avatar Imaging CRM connected to real-world systems ASAP

---

## 📊 Integration Priority Matrix

| Integration | Priority | Complexity | Time | Business Impact |
|-------------|----------|------------|------|-----------------|
| **ManyChat** | 🔴 HIGH | Low | 4h | Instagram lead capture |
| **MobileMessage** | 🔴 HIGH | Low | 2h | SMS confirmations |
| **Wix Bookings** | 🔴 HIGH | Medium | 3h | Auto-sync appointments |
| **Gmail** | 🟡 MEDIUM | Medium | 4h | Email communication |
| **SendGrid** | 🟢 LOW | Low | 2h | Bulk email campaigns |

---

## 🎯 Recommended Build Order

### Sprint 1: Quick Wins (Day 1) - 6 hours
**Goal:** Get SMS and Instagram leads flowing immediately

#### 1. MobileMessage SMS (2 hours)
**Why first?** Cheapest SMS, immediate value, simple API
- ✅ Update `SMSService.ts` for MobileMessage API
- ✅ Build send SMS function
- ✅ Build receive webhook `/webhooks/mobilemessage/incoming`
- ✅ Test send/receive

**Deliverable:** Send SMS confirmations from CRM

#### 2. ManyChat Webhooks (4 hours)
**Why second?** Capture Instagram leads automatically
- ✅ Build webhook handler `/webhooks/manychat`
- ✅ Parse subscriber data → create contacts
- ✅ Log touchpoints from Instagram DMs
- ✅ AI intent detection on messages
- ✅ Test with real Instagram account

**Deliverable:** Instagram DMs create contacts in CRM

### Sprint 2: Appointment Flow (Day 2) - 7 hours
**Goal:** Complete booking automation

#### 3. Wix Bookings (3 hours)
**Why third?** Core business flow - appointments
- ✅ Build webhook handler `/webhooks/wix/bookings`
- ✅ Create/update contacts from booking data
- ✅ Create booking records
- ✅ Trigger SMS confirmation (via MobileMessage)
- ✅ Test with Wix simulator

**Deliverable:** Wix bookings auto-create CRM records + send SMS

#### 4. Gmail Integration (4 hours)
**Why fourth?** Professional email communication
- ✅ Build OAuth flow `/auth/google/*`
- ✅ Send emails via Gmail API
- ✅ Create calendar events
- ✅ Email templates
- ✅ Test authentication

**Deliverable:** Send professional emails from CRM

### Sprint 3: Polish & Scale (Day 3) - 4 hours
**Goal:** Professional campaigns and monitoring

#### 5. SendGrid (Optional) (2 hours)
**Why last?** Nice-to-have for bulk campaigns
- ✅ Build campaign service
- ✅ Email templates
- ✅ Tracking webhooks
- ✅ Test bulk send

**Deliverable:** Send email campaigns to contact lists

#### 6. Testing & Monitoring (2 hours)
- ✅ End-to-end integration tests
- ✅ Error handling
- ✅ Monitoring dashboards
- ✅ Documentation

**Deliverable:** Production-ready integrations

---

## 🚀 Day 1 Action Plan (Today!)

### Morning Session (3 hours)

#### 1. MobileMessage Setup (30 min)
```bash
# What you need:
- [ ] Create account at https://mobilemessage.com.au
- [ ] Verify business identity
- [ ] Purchase credits ($50 = ~1,250 SMS)
- [ ] Get API key
- [ ] Get dedicated number (optional, $10/month)

# Set in CRM:
npx wrangler secret put MOBILEMESSAGE_API_KEY
npx wrangler secret put MOBILEMESSAGE_WEBHOOK_SECRET
```

#### 2. Build MobileMessage Integration (2.5 hours)
```bash
# Files to create/update:
src/services/MobileMessageService.ts     # New SMS provider
src/webhooks/MobileMessageHandler.ts     # Incoming SMS webhook
src/router/Router.ts                     # Add webhook route

# Update config:
wrangler.toml → SMS_PROVIDER=mobilemessage
```

**Test:** Send SMS to your phone, reply, check CRM logs

### Afternoon Session (4 hours)

#### 3. ManyChat Setup (30 min)
```bash
# What you need:
- [ ] Create account at https://manychat.com
- [ ] Connect Instagram Business Account
- [ ] Connect Facebook Page
- [ ] Get API key
- [ ] Create basic greeting flow

# Set in CRM:
npx wrangler secret put MANYCHAT_API_KEY
npx wrangler secret put MANYCHAT_WEBHOOK_SECRET
```

#### 4. Build ManyChat Integration (3.5 hours)
```bash
# Files to create:
src/services/ManyChatService.ts          # ManyChat API client
src/webhooks/ManyChatHandler.ts          # Incoming webhooks
migrations/002_manychat_fields.sql       # Add manychat_subscriber_id

# Update:
src/router/Router.ts                     # Add webhook route
src/types/entities.ts                    # Add ManyChat fields
```

**Test:** Send Instagram DM, check contact created in CRM

---

## 📝 Prerequisites Checklist

### Accounts Needed
- [ ] **MobileMessage.com.au** - Australian SMS provider
- [ ] **ManyChat** - Instagram/Facebook automation
- [ ] **Wix Admin** - Access to webhook settings (Day 2)
- [ ] **Google Workspace/Gmail** - Business email (Day 2)
- [ ] **SendGrid** - Bulk email (optional, Day 3)

### API Credentials to Collect
```bash
# MobileMessage
MOBILEMESSAGE_API_KEY=
MOBILEMESSAGE_FROM_NUMBER=
MOBILEMESSAGE_WEBHOOK_SECRET=

# ManyChat
MANYCHAT_API_KEY=
MANYCHAT_PAGE_ID=
MANYCHAT_WEBHOOK_SECRET=

# Wix (Day 2)
WIX_WEBHOOK_SECRET=
WIX_SITE_ID=
WIX_BOOKING_CALENDAR_ID=

# Google (Day 2)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# SendGrid (Day 3, optional)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
```

---

## 💰 Cost Summary

### Setup Costs (One-time)
- **MobileMessage:** $50 (starter credits) = ~1,250 SMS
- **ManyChat:** $0 (free tier, upgrade to $15/mo later)
- **Wix:** $0 (using existing account)
- **Gmail:** $0 (using existing Google Workspace)
- **SendGrid:** $0 (free tier, upgrade later if needed)

**Total Day 1:** ~$50

### Ongoing Monthly
- **MobileMessage:** ~$50-100/month (1,000-2,000 SMS)
- **ManyChat:** $0-15/month (free tier → Pro)
- **Others:** $0 (within free tiers)

**Total Monthly:** ~$50-115

---

## 🎯 Success Criteria

### After Day 1 (MobileMessage + ManyChat)
- ✅ Can send SMS from CRM to contacts
- ✅ Can receive SMS replies (logged in CRM)
- ✅ Instagram DMs auto-create contacts
- ✅ AI detects intent from messages
- ✅ All webhooks verified and working

### After Day 2 (Wix + Gmail)
- ✅ Wix bookings auto-create contacts + bookings
- ✅ Booking confirmation SMS sent automatically
- ✅ Can send emails via Gmail from CRM
- ✅ Calendar events created for bookings
- ✅ Complete appointment flow automated

### After Day 3 (SendGrid + Polish)
- ✅ Can send email campaigns to lists
- ✅ Email open/click tracking working
- ✅ All error handling in place
- ✅ Monitoring dashboards active
- ✅ Documentation complete

---

## 🔧 Development Setup

### Environment Setup
```bash
# Clone/pull latest
cd /root/git/avatarimaging_crm
git pull

# Install dependencies (if needed)
npm install

# Set up secrets
export CLOUDFLARE_API_TOKEN=your_token

# Add each integration secret as we build
npx wrangler secret put MOBILEMESSAGE_API_KEY
# ... etc
```

### Testing Workflow
```bash
# Start local development
npm run dev:worker

# In another terminal, test webhooks
curl -X POST http://localhost:8787/webhooks/mobilemessage/incoming \
  -H "Content-Type: application/json" \
  -d '{"from":"+61400123456","message":"TEST"}'

# Check logs
npx wrangler tail
```

### Deployment
```bash
# After each integration is built and tested:
export CLOUDFLARE_API_TOKEN=jy_1Mz08hOoJAziZ5E0CsEehCeDHYNjeYTButWy8
npm run build
npx wrangler deploy

# Verify
curl https://avatarimaging_cms.mona-08d.workers.dev/health
```

---

## 📊 Progress Tracking

### Day 1 Checklist
- [ ] MobileMessage account created
- [ ] MobileMessage API key obtained
- [ ] MobileMessage service built
- [ ] SMS send tested
- [ ] SMS receive tested
- [ ] ManyChat account created
- [ ] Instagram connected to ManyChat
- [ ] ManyChat webhook built
- [ ] Instagram DM creates contact
- [ ] AI intent detection working

### Day 2 Checklist
- [ ] Wix webhook secret obtained
- [ ] Wix webhook handler built
- [ ] Test booking synced to CRM
- [ ] Booking SMS confirmation sent
- [ ] Google OAuth configured
- [ ] Gmail send email working
- [ ] Calendar event creation working

### Day 3 Checklist
- [ ] SendGrid account created
- [ ] SendGrid API key obtained
- [ ] Email campaign service built
- [ ] Test campaign sent
- [ ] All error handling added
- [ ] Monitoring configured
- [ ] Documentation updated

---

## 🚨 If You Get Stuck

### Common Issues

**Issue: API authentication fails**
```bash
# Check secret is set
npx wrangler secret list

# Re-set if needed
npx wrangler secret put MOBILEMESSAGE_API_KEY
```

**Issue: Webhook not receiving data**
```bash
# Check URL is correct
curl -I https://avatarimaging_cms.mona-08d.workers.dev/webhooks/mobilemessage/incoming

# Check webhook logs
npx wrangler tail
```

**Issue: SMS not sending**
```bash
# Check provider status
# Check API key is valid
# Check phone number format (+61...)
# Check credits/balance
```

---

## 🎉 Quick Start (Right Now!)

**Want to start building immediately?** Here's what to do:

1. **Create MobileMessage account** (15 min)
   - Go to: https://mobilemessage.com.au
   - Sign up and verify
   - Purchase $50 credits

2. **Get API credentials** (5 min)
   - Get API key from dashboard
   - Save securely

3. **Tell me you're ready!**
   - I'll build the MobileMessage integration
   - We'll test it together
   - Then move to ManyChat

**Ready to go?** Let me know and I'll start coding! 🚀

---

**Estimated Total Time:** 15-17 hours across 3 days
**Total Cost:** ~$50 setup + $50-115/month
**Business Value:** Automated lead capture + SMS + email + bookings
