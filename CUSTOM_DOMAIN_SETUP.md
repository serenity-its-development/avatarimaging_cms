# 🌐 Custom Domain Setup - crm.avatarimaging.com.au

Complete guide to deploying your Avatar Imaging CRM to your custom domain.

---

## 📋 Prerequisites

- ✅ Cloudflare account with API token
- ✅ Domain `avatarimaging.com.au` managed in Cloudflare
- ✅ Frontend and backend already built and tested

---

## 🚀 Quick Deploy (5 Minutes)

### Step 1: Add DNS Records in Cloudflare

1. **Go to Cloudflare Dashboard**
   👉 https://dash.cloudflare.com

2. **Select your domain:** `avatarimaging.com.au`

3. **Navigate to:** DNS → Records

4. **Add CNAME record for CRM:**
   ```
   Type:    CNAME
   Name:    crm
   Target:  avatarimaging-crm-frontend.mona-08d.workers.dev
   Proxy:   ✅ Proxied (orange cloud)
   TTL:     Auto
   ```

5. **Click "Save"**

### Step 2: Configure Custom Domain in Workers

You have two options:

#### Option A: Via Cloudflare Dashboard (Recommended)

1. **Go to Workers & Pages**
   👉 https://dash.cloudflare.com/workers

2. **Select:** `avatarimaging-crm-frontend`

3. **Go to:** Settings → Domains & Routes

4. **Click:** "Add Custom Domain"

5. **Enter:** `crm.avatarimaging.com.au`

6. **Click:** "Add Domain"

7. **Wait:** ~30 seconds for SSL certificate provisioning

#### Option B: Via Wrangler CLI (Automated)

```bash
# Set your API token
export CLOUDFLARE_API_TOKEN=your_token_here

# Deploy frontend to production with custom domain
npx wrangler deploy --config wrangler-frontend.toml --env=production

# Deploy backend to production
npx wrangler deploy --env=production
```

### Step 3: Update Backend CORS Settings

The backend needs to allow requests from your custom domain:

```bash
# Deploy backend with production CORS settings
export CLOUDFLARE_API_TOKEN=your_token_here
npx wrangler deploy --env=production
```

This will automatically set `FRONTEND_URL=https://crm.avatarimaging.com.au` from the wrangler.toml configuration.

### Step 4: Verify Deployment

1. **Wait 1-2 minutes** for DNS propagation

2. **Test your custom domain:**
   ```bash
   curl -I https://crm.avatarimaging.com.au
   ```

   Should return: `HTTP/2 200`

3. **Open in browser:**
   👉 https://crm.avatarimaging.com.au

4. **Check SSL certificate:**
   Look for 🔒 in address bar (should show valid Cloudflare SSL)

---

## 🔧 Configuration Files

### Frontend Production Config

The [wrangler-frontend.toml](wrangler-frontend.toml) is already configured:

```toml
[env.production]
name = "avatarimaging-crm"
workers_dev = false
routes = [
  { pattern = "crm.avatarimaging.com.au/*", zone_name = "avatarimaging.com.au" }
]

[env.production.vars]
BACKEND_URL = "https://avatarimaging_cms.mona-08d.workers.dev"
```

### Backend Production Config

The [wrangler.toml](wrangler.toml) is already configured:

```toml
[env.production]
name = "avatarimaging_cms"
workers_dev = false
routes = [
  { pattern = "crm.avatarimaging.com.au/*", zone_name = "avatarimaging.com.au" }
]

[env.production.vars]
ENVIRONMENT = "production"
FRONTEND_URL = "https://crm.avatarimaging.com.au"
```

---

## 📝 DNS Configuration

### Required DNS Records

| Type | Name | Target | Proxy | Purpose |
|------|------|--------|-------|---------|
| CNAME | crm | avatarimaging-crm-frontend.mona-08d.workers.dev | ✅ Yes | Frontend app |

### Optional: API Subdomain

If you want a separate API domain (e.g., `api.avatarimaging.com.au`):

```
Type:    CNAME
Name:    api
Target:  avatarimaging_cms.mona-08d.workers.dev
Proxy:   ✅ Proxied
```

Then update configs to use:
- Frontend: `https://crm.avatarimaging.com.au`
- Backend: `https://api.avatarimaging.com.au`

---

## 🔐 SSL/TLS Configuration

### Automatic SSL (Default)

Cloudflare automatically provisions SSL certificates for custom domains on Workers.

**Settings:**
- **SSL/TLS encryption mode:** Full (strict)
- **Edge Certificates:** Universal SSL (auto-provisioned)
- **Minimum TLS Version:** 1.2
- **Automatic HTTPS Rewrites:** ✅ Enabled

### Verify SSL Certificate

```bash
# Check SSL certificate
openssl s_client -connect crm.avatarimaging.com.au:443 -servername crm.avatarimaging.com.au < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject:"

# Should show:
# Subject: CN=crm.avatarimaging.com.au
# Issuer: Cloudflare
```

---

## 🎯 Deployment Commands

### Deploy Frontend to Production

```bash
export CLOUDFLARE_API_TOKEN=your_token_here

# Deploy frontend with custom domain
npx wrangler deploy --config wrangler-frontend.toml --env=production
```

### Deploy Backend to Production

```bash
export CLOUDFLARE_API_TOKEN=your_token_here

# Deploy backend with production settings
npx wrangler deploy --env=production
```

### Deploy Both (Full Deployment)

```bash
export CLOUDFLARE_API_TOKEN=your_token_here

# Build frontend
npm run build

# Deploy backend first
npx wrangler deploy --env=production

# Deploy frontend
npx wrangler deploy --config wrangler-frontend.toml --env=production
```

---

## ✅ Post-Deployment Checklist

After deploying to your custom domain:

- [ ] DNS record added for `crm.avatarimaging.com.au`
- [ ] Custom domain added to Workers frontend
- [ ] SSL certificate provisioned (🔒 in browser)
- [ ] Frontend loads at https://crm.avatarimaging.com.au
- [ ] Backend API accessible from frontend
- [ ] CORS headers allow custom domain
- [ ] Dashboard loads without errors
- [ ] Test creating a contact
- [ ] Test creating a task
- [ ] Test AI features (Cmd+K)

---

## 🔍 Testing Your Deployment

### 1. Test DNS Resolution

```bash
# Should resolve to Cloudflare IP
dig crm.avatarimaging.com.au

# Should show CNAME record
dig crm.avatarimaging.com.au CNAME
```

### 2. Test Frontend

```bash
# Should return 200 OK
curl -I https://crm.avatarimaging.com.au

# Should load HTML
curl -s https://crm.avatarimaging.com.au | head -20
```

### 3. Test Backend API

```bash
# Test health endpoint
curl -s https://avatarimaging_cms.mona-08d.workers.dev/health

# Test dashboard endpoint
curl -s https://avatarimaging_cms.mona-08d.workers.dev/api/reports/dashboard
```

### 4. Test CORS

```bash
# Should include CORS headers
curl -I -H "Origin: https://crm.avatarimaging.com.au" \
  https://avatarimaging_cms.mona-08d.workers.dev/api/contacts

# Look for:
# Access-Control-Allow-Origin: *
```

### 5. Browser Testing

1. **Open:** https://crm.avatarimaging.com.au
2. **Check Console:** No CORS or 404 errors
3. **Test Navigation:** Dashboard → Contacts → Tasks → Pipeline
4. **Test AI:** Press Cmd+K, try voice input
5. **Check Performance:** Lighthouse score should be 90+

---

## 🚨 Troubleshooting

### Issue: DNS Not Resolving

**Symptoms:** `crm.avatarimaging.com.au` doesn't resolve

**Solution:**
```bash
# Check if CNAME exists
dig crm.avatarimaging.com.au CNAME

# If missing, add in Cloudflare DNS dashboard
# Wait 5 minutes and try again
```

### Issue: SSL Certificate Error

**Symptoms:** Browser shows "Not Secure" or certificate warning

**Solution:**
1. Wait 5-10 minutes for SSL provisioning
2. Check Cloudflare SSL/TLS settings → Full (strict)
3. Clear browser cache and retry
4. Check certificate:
   ```bash
   curl -vI https://crm.avatarimaging.com.au 2>&1 | grep -i ssl
   ```

### Issue: 404 Not Found

**Symptoms:** Custom domain returns 404

**Solution:**
1. Verify route in Workers dashboard
2. Check `wrangler-frontend.toml` has correct zone_name
3. Redeploy with production flag:
   ```bash
   npx wrangler deploy --config wrangler-frontend.toml --env=production
   ```

### Issue: CORS Errors

**Symptoms:** Browser console shows CORS errors

**Solution:**
1. Check backend FRONTEND_URL matches your domain
2. Verify CORS headers in backend response:
   ```bash
   curl -I -H "Origin: https://crm.avatarimaging.com.au" \
     https://avatarimaging_cms.mona-08d.workers.dev/api/contacts
   ```
3. If missing, redeploy backend with production env:
   ```bash
   npx wrangler deploy --env=production
   ```

### Issue: Old Content Showing

**Symptoms:** Changes not visible on custom domain

**Solution:**
1. Clear Cloudflare cache:
   - Cloudflare dashboard → Caching → Configuration
   - Purge Everything
2. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
3. Check deployed version:
   ```bash
   curl -s https://crm.avatarimaging.com.au/assets/index-*.js | head -1
   ```

---

## 📊 Deployment URLs

| Environment | Frontend | Backend |
|-------------|----------|---------|
| **Development** | http://localhost:5173 | http://localhost:8787 |
| **Staging** | https://avatarimaging-crm-frontend.mona-08d.workers.dev | https://avatarimaging_cms.mona-08d.workers.dev |
| **Production** | https://crm.avatarimaging.com.au | https://avatarimaging_cms.mona-08d.workers.dev |

---

## 🎓 Additional Resources

- **Cloudflare Workers Custom Domains:** https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- **DNS Management:** https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/
- **SSL/TLS:** https://developers.cloudflare.com/ssl/
- **Wrangler CLI:** https://developers.cloudflare.com/workers/wrangler/

---

## 🔄 Rollback Process

If something goes wrong, you can quickly rollback:

### Option 1: Via Dashboard

1. Go to Workers & Pages → avatarimaging-crm-frontend
2. Click "Deployments" tab
3. Find previous working deployment
4. Click "⋯" → "Rollback to this deployment"

### Option 2: Via CLI

```bash
# List recent deployments
npx wrangler deployments list --config wrangler-frontend.toml --env=production

# View specific deployment
npx wrangler deployments view <VERSION_ID>

# Rollback (redeploy from previous commit)
git checkout <previous-commit>
npm run build
npx wrangler deploy --config wrangler-frontend.toml --env=production
git checkout main
```

---

**Ready to deploy?** Follow the Quick Deploy steps above! ⚡

**Need help?** Check the Troubleshooting section or contact support.
