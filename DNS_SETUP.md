# 🌐 DNS Setup Guide - Final Step

Your Workers are deployed! Now add the custom domain via Cloudflare Dashboard.

---

## ✅ Current Status

- ✅ **Backend Worker:** Deployed to production
  - URL: https://avatarimaging_cms.mona-08d.workers.dev
  - CORS: Configured for `https://crm.avatarimaging.com.au`

- ✅ **Frontend Worker:** Deployed to production
  - Worker Name: `avatarimaging-crm`
  - Temporary URL: https://avatarimaging-crm.mona-08d.workers.dev
  - **Needs:** Custom domain setup

---

## 🚀 Add Custom Domain (2 Minutes)

### Step 1: Add Custom Domain to Worker

1. **Go to Cloudflare Dashboard:**
   👉 https://dash.cloudflare.com

2. **Navigate to Workers & Pages:**
   - Click "Workers & Pages" in left sidebar

3. **Select your Worker:**
   - Click on: `avatarimaging-crm`

4. **Go to Settings → Domains & Routes:**
   - Click "Settings" tab
   - Scroll to "Domains & Routes" section

5. **Add Custom Domain:**
   - Click "Add Custom Domain" button
   - Enter: `crm.avatarimaging.com.au`
   - Click "Add Domain"

6. **Wait for SSL:**
   - Cloudflare will automatically:
     - Create DNS record
     - Provision SSL certificate
     - Activate the route
   - Takes ~30-60 seconds

### Step 2: Verify DNS (Automatic)

Cloudflare should automatically create the DNS record. To verify:

1. **Go to DNS settings:**
   - Cloudflare Dashboard → Select domain `avatarimaging.com.au`
   - Click "DNS" → "Records"

2. **Check for CNAME record:**
   ```
   Type: CNAME
   Name: crm
   Target: avatarimaging-crm.mona-08d.workers.dev
   Proxy: ✅ Proxied (orange cloud)
   ```

3. **If missing, add manually:**
   - Click "Add record"
   - Fill in details above
   - Click "Save"

### Step 3: Test Your Deployment

**Wait 1-2 minutes**, then test:

```bash
# Test DNS resolution
dig crm.avatarimaging.com.au

# Test HTTPS
curl -I https://crm.avatarimaging.com.au

# Should return: HTTP/2 200
```

**Open in browser:**
👉 https://crm.avatarimaging.com.au

---

## ✅ Verification Checklist

After adding the custom domain:

- [ ] Custom domain added in Workers dashboard
- [ ] DNS record exists (CNAME → Worker)
- [ ] SSL certificate shows 🔒 in browser
- [ ] Frontend loads at https://crm.avatarimaging.com.au
- [ ] Dashboard displays without errors
- [ ] API calls work (check browser console)
- [ ] Can navigate between pages
- [ ] AI features work (Cmd+K)

---

## 🎯 Current Deployment URLs

| Component | Environment | URL |
|-----------|-------------|-----|
| Frontend | Development | https://avatarimaging-crm-frontend.mona-08d.workers.dev |
| Frontend | Production | https://crm.avatarimaging.com.au ⬅️ **USE THIS** |
| Backend API | Both | https://avatarimaging_cms.mona-08d.workers.dev |

---

## 🔐 SSL/TLS Status

- **SSL Certificate:** Auto-provisioned by Cloudflare
- **Certificate Type:** Universal SSL
- **Encryption Mode:** Full (strict)
- **Min TLS Version:** 1.2
- **HTTPS Redirect:** Automatic

---

## 🚨 Troubleshooting

### Issue: Can't find "Add Custom Domain" button

**Solution:**
1. Make sure you're viewing the correct Worker: `avatarimaging-crm`
2. Click "Settings" tab (not "Deployments")
3. Scroll down to "Domains & Routes" section
4. Button should be visible as blue "Add Custom Domain"

### Issue: "Zone not found" error

**Solution:**
1. Ensure domain `avatarimaging.com.au` is added to your Cloudflare account
2. Verify you're logged into the correct Cloudflare account
3. Try adding DNS record manually first (Step 2)

### Issue: SSL certificate error after adding domain

**Solution:**
- Wait 2-5 minutes for SSL provisioning
- Check SSL/TLS settings:
  - Go to SSL/TLS → Overview
  - Set mode to "Full (strict)"
- Clear browser cache and retry

### Issue: Still seeing "workers.dev" URL

**Solution:**
1. Clear browser cache (Cmd+Shift+R / Ctrl+Shift+R)
2. Try incognito/private window
3. Wait 2-3 minutes for DNS propagation
4. Verify DNS record is proxied (orange cloud)

---

## 📊 Production Environment Details

### Backend Worker Configuration

- **Name:** `avatarimaging_cms`
- **Environment:** `production`
- **FRONTEND_URL:** `https://crm.avatarimaging.com.au`
- **Database:** `avatarimaging-crm-db`
- **Queue:** `avatar-queue`
- **AI:** Workers AI enabled

### Frontend Worker Configuration

- **Name:** `avatarimaging-crm`
- **Environment:** `production`
- **BACKEND_URL:** `https://avatarimaging_cms.mona-08d.workers.dev`
- **Assets:** 4 files (85.79 KB / 20.72 KB gzipped)
- **Route:** `crm.avatarimaging.com.au/*`

---

## 🔄 Alternative: Manual Route Setup

If the "Add Custom Domain" method doesn't work, you can add routes manually:

1. **Go to:** Workers & Pages → avatarimaging-crm → Settings

2. **Find:** "Routes" section

3. **Click:** "Add route"

4. **Enter:**
   ```
   Route: crm.avatarimaging.com.au/*
   Zone: avatarimaging.com.au
   ```

5. **Click:** "Add route"

6. **Add DNS record** (see Step 2 above)

---

## 📞 Support & Resources

- **Cloudflare Workers Docs:** https://developers.cloudflare.com/workers/
- **Custom Domains Guide:** https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- **DNS Management:** https://developers.cloudflare.com/dns/

---

## 🎉 After Setup Complete

Once you see your CRM at https://crm.avatarimaging.com.au:

1. **Update bookmarks/links** to use custom domain
2. **Test all features** thoroughly
3. **Monitor Workers logs:**
   ```bash
   npx wrangler tail --env=production
   ```
4. **Set up monitoring/alerts** in Cloudflare dashboard
5. **Plan for scaling** as it evolves into full ERP

---

**Ready?** Go to https://dash.cloudflare.com and add your custom domain! ⚡

**Need help?** All Workers are deployed - just need the domain connection!
