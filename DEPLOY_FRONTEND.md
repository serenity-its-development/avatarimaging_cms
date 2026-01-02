# 🚀 Deploy Frontend to Cloudflare Pages

**Status:** Frontend is built and ready in `dist/` folder
**Issue:** API token lacks Pages deployment permissions

---

## ✅ Option 1: Cloudflare Dashboard (EASIEST - 2 minutes!)

### Step-by-Step:

1. **Go to Cloudflare Dashboard**
   - Open: https://dash.cloudflare.com
   - Login with your account

2. **Create Pages Project**
   - Click **"Pages"** in left sidebar
   - Click **"Create a project"** button
   - Click **"Connect to Git"**

3. **Connect Repository**
   - Authorize GitHub if needed
   - Select repository: `serenity-its-development/avatarimaging_cms`
   - Click **"Begin setup"**

4. **Configure Build Settings**
   ```
   Project name: avatarimaging-crm
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Root directory: / (leave empty)
   ```

5. **Add Environment Variable**
   - Click **"Environment variables (advanced)"**
   - Add: `NODE_VERSION` = `18`

6. **Deploy!**
   - Click **"Save and Deploy"**
   - Wait 2-3 minutes for build
   - Your app will be live at: `https://avatarimaging-crm.pages.dev`

---

## ⚡ Option 2: Wrangler CLI (If you have a Pages API token)

### Create API Token with Pages Permissions:

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use template: **"Edit Cloudflare Workers"**
4. Add permission: **"Cloudflare Pages - Edit"**
5. Copy the token

### Deploy:

```bash
cd /root/git/avatarimaging_crm

# Set token
export CLOUDFLARE_API_TOKEN=your_new_token_with_pages_permissions

# Build
npm run build

# Deploy
npx wrangler pages deploy dist --project-name=avatarimaging-crm
```

---

## 🔧 Option 3: Update Existing Token

If you want to use wrangler CLI, update your existing token:

1. Go to: https://dash.cloudflare.com/profile/api-tokens
2. Find token: Starting with `zAZCDUd...`
3. Click **"Edit"**
4. Add permissions:
   - **Cloudflare Pages - Edit**
   - **Account Settings - Read**
5. Save and re-deploy

---

## ✅ After Deployment

### 1. Update API Base URL (if needed)

Edit `src/frontend/lib/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.PROD
  ? 'https://avatarimaging_cms.mona-08d.workers.dev'  // Already correct!
  : '/api'
```

**This is already set correctly!** No changes needed.

### 2. Configure CORS in Worker (if needed)

If you get CORS errors, update worker to allow your Pages domain.

Edit worker response headers:
```typescript
headers: {
  'Access-Control-Allow-Origin': 'https://avatarimaging-crm.pages.dev',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type',
}
```

### 3. Test the Deployment

```bash
# Check frontend loads
curl https://avatarimaging-crm.pages.dev

# Check API connection (from browser console)
fetch('https://avatarimaging_cms.mona-08d.workers.dev/health')
  .then(r => r.json())
  .then(console.log)
```

### 4. Verify Features

- ✅ Dashboard loads with stats
- ✅ Contacts page shows table
- ✅ Tasks page works
- ✅ Pipeline drag-and-drop
- ✅ AI Command (Cmd+K)
- ✅ Voice input

---

## 🎯 Expected Result

Once deployed, you'll have:

**Frontend URL:** `https://avatarimaging-crm.pages.dev`
**Backend URL:** `https://avatarimaging_cms.mona-08d.workers.dev`

Full-stack CRM live! 🎉

---

## 🐛 Troubleshooting

### Build fails on Pages
- Check Node version is set to 18
- Check build command is `npm run build`
- Check output directory is `dist`

### CORS errors in browser
- Update worker CORS headers (see above)
- Redeploy worker: `npx wrangler deploy`

### API not responding
- Test backend: `curl https://avatarimaging_cms.mona-08d.workers.dev/health`
- Check worker logs: `npx wrangler tail`

### Frontend shows blank page
- Check browser console for errors
- Verify dist/ folder has files
- Check API base URL in api.ts

---

## 📝 Why Manual Deployment?

The current API token (`zAZCDUd...`) has permissions for:
- ✅ Workers Scripts - Edit
- ✅ D1 - Edit
- ✅ Queues - Edit

But missing:
- ❌ Cloudflare Pages - Edit

**Solution:** Use Cloudflare Dashboard (Option 1) - takes 2 minutes!

---

## 🎊 Next Steps After Deployment

1. ✅ Test all features
2. ✅ Create first contact via UI
3. ✅ Test drag-and-drop pipeline
4. Configure secrets (ClickSend, Google OAuth)
5. Enable cron triggers
6. Add custom domain (optional)

---

**Ready to deploy?** Go to Option 1 above! 🚀
