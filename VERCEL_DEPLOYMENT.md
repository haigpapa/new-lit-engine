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

### API Routes

Vercel automatically detects functions in the `/api` directory:

- `/api/health` → Health check
- `/api/gemini/generate` → Text generation
- `/api/gemini/generate-json` → JSON generation

### Environment Detection

The client automatically detects the environment:
- **Production** (Vercel): Uses relative paths (`/api/*`)
- **Development** (local): Uses `http://localhost:3001/api/*`

### File Structure

```
/api
├── health.js                 # Health check endpoint
└── gemini/
    ├── generate.js          # Text generation
    └── generate-json.js     # JSON generation
```

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

### Common Errors

**Error: "Server configuration error"**
- Cause: `GEMINI_API_KEY` not set in Vercel
- Fix: Add environment variable in Vercel dashboard
- Redeploy after adding

**Error: "Failed to fetch"**
- Cause: API routes not deploying correctly
- Fix: Ensure `/api` directory exists in your repo
- Redeploy

**Error: "CORS error"**
- Shouldn't happen on Vercel (same domain)
- If it does, check browser console for details

---

## Testing Locally Before Deploy

```bash
# 1. Build the frontend
npm run build

# 2. Install Vercel CLI
npm i -g vercel

# 3. Test locally with Vercel dev server
vercel dev

# This runs:
# - Frontend on http://localhost:3000
# - API functions from /api directory
# - Uses .env for environment variables
```

---

## Deployment Checklist

- [x] `/api` directory with serverless functions
- [x] `vercel.json` configured
- [x] Client uses relative paths in production
- [ ] `GEMINI_API_KEY` set in Vercel dashboard
- [ ] Redeploy triggered after env var added
- [ ] Test at your-app.vercel.app

---

## Environment Variables Reference

| Variable | Required | Where to Set | Description |
|----------|----------|--------------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Vercel Dashboard | Your Google Gemini API key |

---

## Monitoring

### Check Logs

1. Go to your project in Vercel
2. Click **Deployments**
3. Click on a deployment
4. Click **View Function Logs** for API errors

### Usage Monitoring

Monitor your Gemini API usage:
- Go to [Google AI Studio](https://ai.google.dev/)
- Check API usage dashboard
- Set up billing alerts

---

## Performance

### Serverless Function Limits

- **Execution Time**: 10 seconds (Hobby), 60 seconds (Pro)
- **Memory**: 1024 MB
- **Cold Starts**: ~1-2 seconds

If you hit timeout issues:
- Upgrade to Vercel Pro
- Or use a different platform (Railway, Render) for longer-running requests

### Optimization

The build already includes:
- ✅ Code splitting
- ✅ Minification
- ✅ Gzip compression
- ✅ CDN distribution

---

## Next Steps

1. ✅ Add `GEMINI_API_KEY` to Vercel
2. ✅ Redeploy
3. ✅ Test your app
4. 🎉 Share with the world!

---

## Support

- **Vercel Docs**: https://vercel.com/docs
- **Gemini API**: https://ai.google.dev/docs
- **Project Issues**: https://github.com/your-repo/issues
