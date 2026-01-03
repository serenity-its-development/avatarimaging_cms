# Avatar Imaging CRM - Complete Setup Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Quick Start](#quick-start)
3. [Stripe Payment Setup](#stripe-payment-setup)
4. [Email & SMS Configuration](#email--sms-configuration)
5. [Public Booking Widget](#public-booking-widget)
6. [Management Interfaces](#management-interfaces)
7. [Testing the System](#testing-the-system)
8. [Troubleshooting](#troubleshooting)

## System Overview

Avatar Imaging CRM is a complete medical imaging appointment management system built on Cloudflare Workers with:

### Core Features
- ✅ Contact & Lead Management
- ✅ AI-Powered Task Assignment
- ✅ Multi-Pipeline System
- ✅ Smart Tagging with AI
- ✅ Calendar & Booking Management
- ✅ SMS & Email Marketing
- ✅ Staff & Role Management
- ✅ Templates System
- ✅ Booking Drafts with AI Assistant

### New Payment & Marketing Features
- ✅ **Procedures Management** - Medical services with pricing
- ✅ **Discount Codes** - Promotional codes with rules
- ✅ **Influencer Tracking** - Referral partnerships with commission tracking
- ✅ **Stripe Payments** - Secure online payment processing
- ✅ **5-Step Public Booking** - Customer-facing booking widget
- ✅ **Real-time Availability** - CRM calendar integration
- ✅ **Automated Confirmations** - Email & SMS notifications

## Quick Start

### Access the System

**CRM Dashboard**
```
https://crm.avatarimaging.com.au
```

**Public Booking Widget**
```
https://book.avatarimaging.com.au/book
```

### Initial Login
```
Email: admin@avatarimaging.com.au
Password: [Contact admin for credentials]
```

## Stripe Payment Setup

### 1. Get Your Stripe Keys

1. Sign up or log in at https://stripe.com
2. Navigate to **Developers** → **API keys**
3. Copy your keys:
   - **Publishable key** (starts with `pk_`)
   - **Secret key** (starts with `sk_`)
   - **Webhook secret** (starts with `whsec_`)

### 2. Set Environment Variables

**For Frontend (Local Development)**

Create `.env` file in project root:
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
```

**For Production (Cloudflare Worker)**

Set the publishable key as an environment variable in `wrangler.toml`:
```toml
[env]
STRIPE_PUBLISHABLE_KEY = "pk_live_YOUR_KEY_HERE"
```

### 3. Set Cloudflare Secrets

```bash
# Set API token
export CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Set Stripe secret key
npx wrangler secret put STRIPE_SECRET_KEY --env=""
# Paste: sk_test_YOUR_SECRET_KEY or sk_live_YOUR_SECRET_KEY

# Set webhook secret
npx wrangler secret put STRIPE_WEBHOOK_SECRET --env=""
# Paste: whsec_YOUR_WEBHOOK_SECRET
```

### 4. Configure Stripe Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Set endpoint URL:
   ```
   https://crm.avatarimaging.com.au/api/payments/webhook
   ```
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET` (see step 3 above)

### 5. Test Payment Integration

1. Visit: https://book.avatarimaging.com.au/book
2. Select a procedure
3. Choose date/time
4. Enter contact details
5. Use Stripe test card: `4242 4242 4242 4242`
6. Any future expiry date
7. Any 3-digit CVC
8. Complete payment

Check CRM to see:
- Contact created
- Booking created
- Payment recorded
- Email/SMS sent (if configured)

## Email & SMS Configuration

### Email Setup (Resend)

1. **Sign up at https://resend.com**
2. **Verify your domain** (bookings@avatarimaging.com.au)
3. **Get API key** from dashboard
4. **Set the secret:**
   ```bash
   npx wrangler secret put RESEND_API_KEY --env=""
   # Paste your Resend API key
   ```
5. **Redeploy:**
   ```bash
   npm run build
   npx wrangler deploy --env=""
   ```

### SMS Setup (MobileMessage)

1. **Login to MobileMessage** account
2. **Get API key** from dashboard
3. **Set the secret:**
   ```bash
   npx wrangler secret put MOBILEMESSAGE_API_KEY --env=""
   # Paste your MobileMessage API key
   ```
4. **Update phone number** in `wrangler.toml`:
   ```toml
   SMS_FROM_NUMBER = "+61412345678"
   MOBILEMESSAGE_FROM_NUMBER = "+61412345678"
   ```
5. **Redeploy:**
   ```bash
   npm run build
   npx wrangler deploy --env=""
   ```

## Public Booking Widget

### Embedding in Wix

**Option 1: iframe Embed** (Recommended)

1. In Wix Editor, add **HTML iframe** element
2. Paste this code:
```html
<iframe
  src="https://book.avatarimaging.com.au/book"
  width="100%"
  height="900px"
  frameborder="0"
  style="border: none; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
  title="Avatar Imaging - Book an Appointment"
></iframe>
```
3. Adjust height if needed (900px-1100px)

**Option 2: Full Page Link**

Simply link to:
```
https://book.avatarimaging.com.au/book
```

### Booking Flow

1. **Select Procedure** - Customer chooses from active procedures
2. **Pick Date & Time** - Calendar shows real-time availability from CRM
3. **Contact Details** - Creates contact in CRM automatically
4. **Apply Discount** - Optional discount code entry
5. **Payment** - Secure Stripe card payment
6. **Confirmation** - Email & SMS sent automatically

## Management Interfaces

### Procedures Management

**Location:** CRM → Procedures

**Features:**
- Create/edit medical procedures
- Set pricing and duration
- Organize by category
- Enable/disable procedures
- Set deposit requirements

**Example Procedure:**
```
Name: Skin Cancer Screening
Description: Full body skin cancer screening with AI-assisted detection
Duration: 45 minutes
Price: $150.00
Category: Screening
```

### Discount Codes Management

**Location:** CRM → Discount Codes

**Features:**
- Create percentage or fixed amount discounts
- Link to influencers for tracking
- Set usage limits (total and per customer)
- Set expiry dates
- Minimum purchase requirements
- Maximum discount caps

**Example Code:**
```
Code: SUMMER25
Type: Percentage
Value: 25%
Usage Limit: 100
Valid Until: 2026-03-31
Influencer: None
```

**Example Influencer Code:**
```
Code: INFLUENCER_JOHN
Type: Percentage
Value: 10%
Influencer: John Smith (@johnsmith)
Usage Limit: Unlimited
Valid Until: Never expires
```

### Influencers Management

**Location:** CRM → Influencers

**Features:**
- Track influencer partnerships
- Set commission rates
- View performance stats
- Monitor referrals and revenue
- Manage contact information

**Metrics Tracked:**
- Total referrals
- Total revenue generated
- Commission earned
- Active discount codes
- Recent referral list

## Testing the System

### 1. Create Test Procedure

1. Go to **CRM** → **Procedures**
2. Click **Add Procedure**
3. Fill in details:
   - Name: "Test Service"
   - Duration: 30 minutes
   - Price: $50.00
   - Category: "Testing"
4. Save

### 2. Create Test Discount Code

1. Go to **CRM** → **Discount Codes**
2. Click **Create Code**
3. Fill in:
   - Code: "TEST10"
   - Type: Percentage
   - Value: 10
   - No usage limits
4. Save

### 3. Test Public Booking

1. Visit: https://book.avatarimaging.com.au/book
2. Select "Test Service"
3. Choose tomorrow's date
4. Select any available time
5. Enter test contact details
6. Apply code "TEST10"
7. Use Stripe test card: `4242 4242 4242 4242`
8. Complete booking

### 4. Verify in CRM

Check these pages:
- **Contacts** - New contact should appear with tag "online_booking"
- **Calendar** - Booking should appear on selected date/time
- **Bookings** - New booking with payment status "paid"
- **Reports** - Revenue should reflect the discounted amount

## Troubleshooting

### Payment Not Processing

**Symptoms:** Payment fails at checkout

**Solutions:**
1. Check Stripe secret key is set:
   ```bash
   npx wrangler secret list --env=""
   ```
2. Verify webhook is configured and active
3. Check worker logs:
   ```bash
   npx wrangler tail --env=""
   ```
4. Ensure VITE_STRIPE_PUBLISHABLE_KEY matches your Stripe account

### Email Not Sending

**Symptoms:** No confirmation emails

**Solutions:**
1. Verify RESEND_API_KEY is set
2. Check domain is verified in Resend dashboard
3. Look for email errors in logs:
   ```bash
   npx wrangler tail --env="" | grep -i email
   ```
4. Check spam folder

### SMS Not Sending

**Symptoms:** No SMS confirmations

**Solutions:**
1. Verify MOBILEMESSAGE_API_KEY is set
2. Check phone number format (+61 prefix)
3. Ensure SMS credits are available
4. Check logs for errors:
   ```bash
   npx wrangler tail --env="" | grep -i sms
   ```

### Booking Not Appearing in Calendar

**Symptoms:** Booking confirmed but not visible

**Solutions:**
1. Refresh calendar page
2. Check booking status in Bookings page
3. Verify scheduled_at timestamp is correct
4. Check database migration was applied:
   ```bash
   npx wrangler d1 migrations list avatarimaging-crm-db --remote --env=""
   ```

### Discount Code Not Working

**Symptoms:** Code validation fails

**Solutions:**
1. Check code is active in CRM → Discount Codes
2. Verify expiry date hasn't passed
3. Check usage limit hasn't been reached
4. Ensure minimum purchase requirement is met
5. Try the code in uppercase (codes are case-sensitive)

## Database Management

### View Migrations

```bash
npx wrangler d1 migrations list avatarimaging-crm-db --remote --env=""
```

### Apply New Migrations

```bash
npx wrangler d1 migrations apply avatarimaging-crm-db --remote --env=""
```

### Query Database

```bash
npx wrangler d1 execute avatarimaging-crm-db --remote --env="" --command="SELECT * FROM procedures LIMIT 10"
```

## Deployment Commands

### Build Frontend
```bash
npm run build
```

### Deploy Worker
```bash
export CLOUDFLARE_API_TOKEN=your_token
npx wrangler deploy --env=""
```

### View Logs
```bash
npx wrangler tail --env=""
```

### Set Secret
```bash
npx wrangler secret put SECRET_NAME --env=""
```

## Support & Resources

### Documentation
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Stripe API](https://stripe.com/docs/api)
- [Resend Email](https://resend.com/docs)
- [React Query](https://tanstack.com/query/latest)

### Important URLs
- CRM: https://crm.avatarimaging.com.au
- Booking: https://book.avatarimaging.com.au/book
- Stripe Dashboard: https://dashboard.stripe.com
- Resend Dashboard: https://resend.com/emails
- Cloudflare Dashboard: https://dash.cloudflare.com

### Quick Reference

**Stripe Test Cards:**
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0027 6000 3184
```

**Default Time Slots:**
```
9:00 AM - 5:00 PM
30-minute intervals
Availability checked against CRM calendar in real-time
```

**System Status:**
- ✅ Backend deployed and running
- ✅ Database migrated
- ✅ Public booking live
- ⏳ Pending: Stripe keys configuration
- ⏳ Pending: Email/SMS API keys
```

---

**Last Updated:** 2026-01-03
**Version:** 1.0.0
**Contact:** admin@avatarimaging.com.au
