# Avatar Imaging CRM - Deployment Guide

## Current Status

✅ **Database Created:** `avatarimaging-crm-db` (ID: `4b4ac289-5da1-4712-bdd8-b1dcff041bab`)
✅ **Code Ready:** Worker entry point, services, AI layer all complete
⏳ **Migrations Pending:** Need to apply to remote database
⏳ **Worker Deployment:** Need to deploy to Cloudflare

---

## Manual Deployment Steps

### 1. Apply Database Migrations

**Option A: Via Cloudflare Dashboard**
1. Go to https://dash.cloudflare.com
2. Navigate to Workers & Pages → D1
3. Click on `avatarimaging-crm-db`
4. Click "Console" tab
5. Copy and paste contents of `migrations/001_initial_schema.sql`
6. Click "Execute"
7. Repeat for `migrations/002_enterprise_features.sql`

**Option B: Via Wrangler (if token issue resolved)**
```bash
export CLOUDFLARE_API_TOKEN=your_token_here
cd /root/git/avatarimaging_crm
wrangler d1 migrations apply avatarimaging-crm-db --remote
```

### 2. Create Queue

```bash
wrangler queues create avatar-queue
```

### 3. Set Secrets

```bash
wrangler secret put CLICKSEND_API_KEY
# Enter: username:api_key

wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

### 4. Deploy Worker

```bash
cd /root/git/avatarimaging_crm
wrangler deploy
```

This will deploy to: `https://avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev`

### 5. Test Deployment

```bash
# Health check
curl https://avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev/health

# Create contact with AI
curl -X POST https://avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev/api/contacts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phone": "+61412345678",
    "email": "john@example.com",
    "source": "website",
    "current_pipeline": "new_lead",
    "current_stage": "inquiry",
    "data": {
      "notes": "Interested in MRI scan. Urgent."
    }
  }'
```

---

## Alternative: Deploy via Dashboard

### 1. Navigate to Workers & Pages
https://dash.cloudflare.com → Workers & Pages → Create

### 2. Upload Code
- Select "Create Worker"
- Name: `avatarimaging-crm`
- Click "Deploy"

### 3. Edit Worker Code
- Click "Quick Edit"
- Delete template code
- Build bundle: `npm run build` (if configured) or upload files manually

### 4. Configure Bindings
- Go to Settings → Variables
- Add D1 binding:
  - Variable name: `DB`
  - D1 Database: `avatarimaging-crm-db`
- Add Queue binding:
  - Variable name: `QUEUE`
  - Queue: `avatar-queue`
- Add AI binding:
  - Variable name: `AI`
  - Select: Workers AI

### 5. Add Environment Variables
In Settings → Variables → Environment Variables:
```
APP_NAME=Avatar Imaging CRM
ENVIRONMENT=production
FRONTEND_URL=https://your-frontend-url.com
SMS_PROVIDER=clicksend
AI_MODEL_WARMNESS=@cf/meta/llama-3.1-8b-instruct
AI_MODEL_INTENT=@cf/meta/llama-3.2-1b-instruct
```

---

## Post-Deployment Setup

### 1. Test AI Integration

```bash
# Test warmness scoring
curl -X POST https://avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev/api/contacts/CONTACT_ID/recalculate-warmness
```

**Expected:** AI processes the contact and returns warmness score 0-100

### 2. Test SMS Intent Detection

```bash
# Simulate incoming SMS (ClickSend webhook)
curl -X POST https://avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev/webhooks/sms/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "from": "+61412345678",
    "to": "+61400000000",
    "message": "I need to cancel my appointment tomorrow",
    "message_id": "test123"
  }'
```

**Expected:** AI detects "cancel" intent and creates task for staff

### 3. Test Reporting with AI

```bash
# Generate performance report with AI insights
curl https://avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev/api/reports/performance
```

**Expected:** Report with AI-generated insights, recommendations, trends

---

## Troubleshooting

### Issue: "Unable to authenticate request"
**Solution:** Check that:
1. API token has correct permissions (Workers, D1, Queues)
2. Token scope includes your account
3. Token is set correctly: `export CLOUDFLARE_API_TOKEN=...`

### Issue: "D1_ERROR: no such table"
**Solution:** Migrations not applied. Run:
```bash
wrangler d1 migrations apply avatarimaging-crm-db --remote
```

### Issue: "AI binding not found"
**Solution:**
1. Check wrangler.toml has `[ai]` binding
2. Ensure Workers AI is enabled in your account (Paid plan required: $5/month)

### Issue: Queue errors
**Solution:** Create queue:
```bash
wrangler queues create avatar-queue
```

---

## Monitoring

### View Logs
```bash
# Real-time logs
wrangler tail

# Production logs
wrangler tail --env=production
```

### Check AI Usage
Query the database:
```sql
SELECT
  DATE(timestamp/1000, 'unixepoch') as date,
  use_case,
  COUNT(*) as calls,
  SUM(cost_usd) as total_cost
FROM ai_usage_log
GROUP BY date, use_case
ORDER BY date DESC;
```

### Monitor Performance
- Dashboard: https://dash.cloudflare.com → Workers & Pages → avatarimaging-crm → Analytics
- Metrics: Requests, Errors, CPU time, AI calls

---

## Custom Domain (Optional)

### 1. Add Route
In wrangler.toml:
```toml
routes = [
  { pattern = "crm.avatarimaging.com.au/*", zone_name = "avatarimaging.com.au" }
]
```

### 2. Deploy
```bash
wrangler deploy --env=production
```

### 3. DNS Setup
Add CNAME record:
```
crm  →  avatarimaging-crm.YOUR_SUBDOMAIN.workers.dev
```

---

## Cost Estimate

**Monthly Costs:**
- Cloudflare Workers Paid: $5/month
- D1 Database: Free (5GB included)
- Workers AI: ~$6/month (estimated based on usage)
- Queues: Free (1M operations)
- **Total: ~$11/month**

**Per-Operation Costs:**
- Warmness scoring: $0.0055
- SMS intent detection: $0.0011
- Email campaign generation: $0.0088
- Report insights: $0.0066

---

## Next Steps

1. ✅ Apply database migrations (via dashboard or wrangler)
2. ✅ Create queue: `wrangler queues create avatar-queue`
3. ✅ Set secrets (CLICKSEND_API_KEY, etc.)
4. ✅ Deploy worker: `wrangler deploy`
5. ✅ Test endpoints (health, contacts, SMS)
6. ✅ Monitor AI usage in dashboard
7. ⏳ Build frontend (React + Tailwind)
8. ⏳ Add authentication (Google OAuth)

---

## Support

- **Cloudflare Docs:** https://developers.cloudflare.com/workers/
- **Workers AI Docs:** https://developers.cloudflare.com/workers-ai/
- **D1 Docs:** https://developers.cloudflare.com/d1/
- **Issue Tracker:** Create issue in Git repository

---

*Last Updated: 2026-01-02*
*Worker Name: avatarimaging-crm*
*Database: avatarimaging-crm-db (4b4ac289-5da1-4712-bdd8-b1dcff041bab)*
