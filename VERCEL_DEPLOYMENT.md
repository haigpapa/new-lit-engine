# Vercel Deployment Guide

## Quick Setup (2 minutes)

### Step 1: Set Environment Variable

In your Vercel dashboard:

1. Go to your project → **Settings** → **Environment Variables**
2. Add the following variable:

```
Name: GEMINI_API_KEY
Value: your_actual_gemini_api_key_here
```

3. Apply to: **Production**, **Preview**, and **Development**
4. Click **Save**

### Step 2: Redeploy

After adding the environment variable:

1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger automatic redeployment

### Step 3: Verify

Visit your deployed URL and check:
- ✅ 3D graph should load
- ✅ Search should work
- ✅ No console errors about API

---

## How It Works

### Architecture

The application uses a **hybrid architecture** optimized for Vercel:

- **Static frontend** is served directly by Vercel's CDN from the `dist` directory
- **API requests** (`/api/*`) are routed to the Express server running as a serverless function
- **Client-side routing** falls back to `/index.html` for React SPA functionality

**On Vercel specifically:**
- The Express server (`server/index.js`) runs as a **serverless function** (not a persistent server)
- Static files (HTML, CSS, JS) are served by Vercel's global CDN (not by Express)
- The `rewrites` configuration in `vercel.json` routes API traffic to the serverless function

This architecture ensures that **all security features** (rate limiting, Helmet headers, proper CORS) are active on Vercel deployments while leveraging Vercel's CDN for optimal frontend performance.

### API Routes

All API endpoints are handled by the Express server (`server/index.js`):

- `/api/health` → Health check
- `/api/gemini/generate` → Text generation with rate limiting
- `/api/gemini/generate-json` → JSON generation with schema validation

### Security Features (Active on Vercel)

✅ **Rate Limiting**
- General API: 100 requests per 15 minutes per IP
- Gemini endpoints: 15 requests per minute per IP

✅ **Helmet Security Headers**
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- And more...

✅ **Environment-Based CORS**
- Development: Allows localhost
- Production: Configurable via `CLIENT_URL` environment variable

### Environment Detection

The client automatically detects the environment:
- **Production** (Vercel): Uses relative paths (`/api/*`)
- **Development** (local): Uses `http://localhost:3001/api/*`

### Deployment Configuration

The `vercel.json` file configures Vercel to:
1. Build the frontend using `npm run build` (outputs to `dist` folder)
2. Deploy the Express server from `server/index.js` as a serverless function using `@vercel/node`
3. Rewrite API requests (`/api/*`) to the server
4. Serve all other requests from the static frontend (`/index.html`)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "buildCommand": "npm run build",
        "distDir": "dist"
      }
    },
    {
      "src": "server/index.js",
      "use": "@vercel/node"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Key Points:**
- `rewrites` (not `routes`) ensures the frontend loads correctly
- First rewrite: API calls (`/api/*`) → Express serverless function
- Second rewrite: Everything else (`/*`) → React SPA (`/index.html`)
- This allows client-side routing to work properly

---

## Troubleshooting

### Graph not showing?

**Check 1: Environment Variable**
```bash
# In Vercel dashboard → Settings → Environment Variables
# Verify GEMINI_API_KEY is set
```

**Check 2: API Calls**
```bash
# Open browser DevTools → Network tab
# Look for calls to /api/gemini/generate
# Check for 500 errors (missing API key)
# Check for 401 errors (invalid API key)
```

**Check 3: Console Errors**
```bash
# Open browser DevTools → Console
# Look for errors about fetch() or API calls
```

**Check 4: Function Logs**
```bash
# In Vercel dashboard → Deployments
# Click on latest deployment → View Function Logs
# Look for server-side errors
```

### Common Errors

**Error: "Server configuration error: API key not set"**
- Cause: `GEMINI_API_KEY` not set in Vercel
- Fix: Add environment variable in Vercel dashboard
- Important: Redeploy after adding

**Error: "Failed to fetch"**
- Cause: Server deployment issue or timeout
- Fix: Check Function Logs in Vercel dashboard
- Check: Verify `server/index.js` deployed correctly

**Error: "Too many requests"**
- Cause: Rate limiting triggered (15 requests/minute for Gemini)
- Fix: Wait 1 minute or adjust limits in `server/index.js`
- This is a security feature, not a bug

**Error: "CORS error"**
- Shouldn't happen on Vercel (same domain)
- If it does, check browser console for details
- Verify `CLIENT_URL` environment variable if set

---

## Testing Locally Before Deploy

### Option 1: Test Production Build
```bash
# 1. Build the frontend
npm run build

# 2. Start server in production mode
NODE_ENV=production npm start

# 3. Test at http://localhost:3001
# This simulates the production environment
```

### Option 2: Test with Vercel CLI
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Create .env file with your API key
echo "GEMINI_API_KEY=your_key_here" > .env

# 3. Run Vercel dev server
vercel dev

# This runs:
# - Frontend on http://localhost:3000
# - Backend via Vercel's local runtime
# - Uses .env for environment variables
```

---

## Deployment Checklist

Before deploying to Vercel:

- [x] `server/index.js` contains secure Express server
- [x] `vercel.json` configured to route all traffic to server
- [x] Client uses relative paths in production
- [x] Rate limiting implemented (15 req/min for AI)
- [x] Helmet security headers configured
- [x] CORS properly configured
- [ ] `GEMINI_API_KEY` set in Vercel dashboard
- [ ] `NODE_ENV=production` set in Vercel (recommended)
- [ ] Redeploy triggered after env vars added
- [ ] Test at your-app.vercel.app

---

## Environment Variables Reference

| Variable | Required | Where to Set | Description |
|----------|----------|--------------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Vercel Dashboard | Your Google Gemini API key |
| `NODE_ENV` | ⚠️ Recommended | Vercel Dashboard | Set to `production` for optimizations |
| `CLIENT_URL` | ⚠️ Optional | Vercel Dashboard | Your domain for CORS (if restricting) |

---

## Monitoring

### Check Deployment Logs

1. Go to your project in Vercel
2. Click **Deployments**
3. Click on a deployment
4. Click **View Function Logs** for server errors

### Function Performance

Monitor in Vercel dashboard:
- **Execution Time**: Check if hitting timeout limits
- **Invocations**: Track request volume
- **Errors**: Monitor error rates

### API Usage Monitoring

Monitor your Gemini API usage:
- Go to [Google AI Studio](https://ai.google.dev/)
- Check API usage dashboard
- Set up billing alerts to avoid surprises

---

## Performance

### Vercel Function Limits

- **Execution Time**: 10 seconds (Hobby), 60 seconds (Pro)
- **Memory**: 1024 MB default
- **Cold Starts**: ~1-2 seconds first request

If you hit timeout issues:
- The Express server should respond within limits
- Consider upgrading to Vercel Pro for longer timeouts
- Or use a different platform (Railway, Render) for persistent server

### Build Optimization

The build already includes:
- ✅ Code splitting via Vite
- ✅ Minification
- ✅ Gzip compression
- ✅ CDN distribution via Vercel Edge Network

---

## Differences from Standalone Serverless Functions

**Previous Architecture** (deleted in recent update):
- Separate serverless functions in `/api` directory
- ❌ No rate limiting
- ❌ No security headers
- ❌ Wide-open CORS (`*`)

**Current Architecture**:
- Unified Express server in `server/index.js`
- ✅ Rate limiting (100 req/15min, 15 req/min for AI)
- ✅ Helmet security headers
- ✅ Environment-based CORS configuration
- ✅ Consistent with all other deployment platforms

This ensures your Vercel deployment has the same security features documented in `SECURITY.md` and `ARCHITECTURE.md`.

---

## Next Steps

1. ✅ Add `GEMINI_API_KEY` to Vercel
2. ✅ Optionally set `NODE_ENV=production`
3. ✅ Redeploy
4. ✅ Test your app at your-app.vercel.app
5. 🎉 Share with the world!

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Gemini API**: https://ai.google.dev/docs
- **Project Docs**: See [README.md](README.md) and [DEPLOYMENT.md](DEPLOYMENT.md)
- **Security**: See [SECURITY.md](SECURITY.md)
