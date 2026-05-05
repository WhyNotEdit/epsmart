# EP Smart Ops — Production Deployment

Live cycle dashboard for EP Smart Home Services' Taco Bell pressure-wash route, hosted on Vercel with cloud sync via Vercel KV.

---

## What's inside

```
ep-route-ops/
├── index.html       ← The dashboard (Spanish UI, mobile-first)
├── api/state.js     ← Serverless function: GET/POST cycle state
├── package.json     ← Declares @vercel/kv dependency
├── vercel.json      ← Routing + cache headers
└── README.md        ← This file
```

---

## Deploy in 6 steps (~10 minutes)

### 1. Create a Vercel project
1. Go to https://vercel.com/new
2. Click **Import** under "Import Third-Party Git Repository"
3. **Or** drag-and-drop this folder into the upload area (the easiest way)
4. Project name: `ep-route-ops` (or whatever)
5. Framework Preset: **Other** (it's pure HTML + a serverless API)
6. Click **Deploy**

You'll get a URL like `https://ep-route-ops.vercel.app`

### 2. Create a KV database
1. In your Vercel dashboard, click your project
2. Go to the **Storage** tab
3. Click **Create Database** → **KV**
4. Name it `ep-state`
5. Choose region closest to Miami (e.g., **Washington DC iad1**)
6. Click **Create**
7. **Important:** click **Connect Project** and link it to `ep-route-ops`

This automatically sets the `KV_*` environment variables your API needs.

### 3. Redeploy
After connecting KV, trigger a redeploy so the new env vars take effect:
1. Go to **Deployments** tab
2. Click the three-dot menu on the latest deployment → **Redeploy**

### 4. Test
1. Open the Vercel URL on your phone
2. Mark a store complete
3. Open the same URL on a second phone
4. Pull-down to refresh — you should see the completion sync over

### 5. Add to phone home screen (optional but nice)
- **iPhone:** Open in Safari → Share → "Add to Home Screen"
- **Android:** Open in Chrome → ⋮ menu → "Add to Home screen"

The icon will use the EP shield, opens fullscreen, behaves like a native app.

### 6. Custom domain later (optional)
When you're ready:
1. Vercel project → Settings → Domains
2. Add `routes.bluecollarworkersllc.com` (or whatever)
3. Vercel gives you a CNAME record
4. In Cloudflare, add that CNAME, set SSL to "Full"
5. Done — no other config needed

---

## How the sync works

- **On page load:** GET `/api/state` → hydrates the dashboard from KV
- **Every state change:** POST `/api/state` with the action + payload (atomic — only changes the touched field)
- **Background:** every 30 seconds, the page silently re-pulls from KV (only when tab is visible)
- **Pull-to-refresh:** user can drag down at top of screen to force-sync
- **Tab focus:** if you switch away and come back, it auto-syncs

The "Hace 2 min" pill in the top-right shows when the data was last synced. Tap it to force-refresh.

---

## Costs

All free tier:
- **Vercel Hobby plan:** unlimited deploys, 100 GB bandwidth/month
- **Vercel KV free:** 30,000 commands/month, 256 MB storage

For 2 employees marking ~4 stores/night × 14 nights = ~56 commands per cycle. You'll use well under 1% of the free tier.

---

## Updating the store list

Edit the `STORES` array inside `index.html` (search for `const STORES = [`).

After editing:
1. Save and re-upload to Vercel (or `git push` if you set up Git)
2. Vercel auto-deploys in ~30 seconds
3. **Important:** existing cycles in KV will keep using the old route until you reset them in the Admin panel

---

## Resetting everything

To wipe all data and start fresh:
1. Open the dashboard → **Admin** tab → enter password
2. Tap **Reiniciar Ciclo** (Reset Cycle)
3. Confirm

Or directly in Vercel KV: Storage → ep-state → click `ep:state:v1` → delete.

---

## Troubleshooting

**"Sin conexión" pill won't go away**
- Check Vercel project → Storage → KV is connected
- Check the latest deployment has the KV env vars (Settings → Environment Variables → look for `KV_REST_API_URL` etc)
- Try redeploying

**Two phones show different data**
- One of them is offline. Look at the sync pill on each.
- Pull-to-refresh on both. Whichever was offline will sync up.

**Mark complete didn't save**
- If sync pill shows "Sin conexión", the change is only on that phone
- When connection returns, the next interaction will push it
- Worst case: re-mark it once you're back online

---

Built by Claude for Pablo Hernandez · EP Smart Home Services LLC · Blue-Collar Workers LLC
