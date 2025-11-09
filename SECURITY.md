# Security Policy

## Critical Security Update

**As of the latest version**, the Literary Explorer application has implemented comprehensive security improvements to protect API keys and prevent unauthorized access.

## 🔒 Security Features

### 1. Server-Side API Key Storage

**Previous Implementation (INSECURE)**:
- API keys were embedded directly in client-side code
- Keys were exposed via browser DevTools and network inspection
- Risk of unauthorized usage and cost abuse

**Current Implementation (SECURE)**:
- API keys are stored server-side in `.env` files
- `.env` files are automatically gitignored
- Keys are NEVER sent to or accessible from the client
- All AI API calls are proxied through a secure backend server

### 2. Backend Proxy Architecture

The application uses an Express.js backend server that:
- Handles all communication with external AI APIs
- Validates and sanitizes all incoming requests
- Implements rate limiting to prevent abuse
- Provides secure endpoints for the frontend to call

**Endpoints**:
- `POST /api/gemini/generate` - General text generation
- `POST /api/gemini/generate-json` - JSON schema generation
- `GET /api/health` - Health check endpoint

### 3. Rate Limiting

Automatic rate limiting protects against API abuse:
- **General API**: 100 requests per 15 minutes per IP
- **AI Endpoints**: 15 requests per minute per IP
- Configurable limits for different deployment scenarios

### 4. CORS Protection

CORS (Cross-Origin Resource Sharing) policies:
- Development: Allows localhost on multiple ports
- Production: Configurable via `CLIENT_URL` environment variable
- Prevents unauthorized domains from accessing the API

### 5. Security Headers

Implemented via Helmet.js:
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- And more...

### 6. Input Validation

All incoming requests are validated:
- Model names are validated against an allowlist
- Prompts and schemas are checked for required fields
- Malformed requests are rejected with appropriate error messages

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, please follow responsible disclosure:

1. **DO NOT** open a public GitHub issue
2. Email the maintainer directly with details
3. Allow reasonable time for the issue to be addressed
4. We will acknowledge receipt within 48 hours

## ✅ Best Practices for Deployment

### Environment Variables

1. **Never commit `.env` files**
   ```bash
   # .gitignore automatically includes:
   .env
   .env.local
   .env.*.local
   ```

2. **Use environment-specific files**
   - Development: `.env` (gitignored)
   - Production: Use platform-specific secrets management
     - Vercel: Environment Variables in dashboard
     - AWS: Secrets Manager or Parameter Store
     - Docker: Secrets or environment files
     - Heroku: Config Vars

3. **Required environment variables**
   ```env
   GEMINI_API_KEY=your_api_key_here  # REQUIRED
   PORT=3001                          # Optional
   NODE_ENV=production                # Recommended for production
   CLIENT_URL=https://your-domain.com # Required for production CORS
   ```

### Production Deployment

1. **Set `NODE_ENV=production`**
   - Enables production optimizations
   - Disables development error messages
   - Tightens security policies

2. **Configure CORS properly**
   ```env
   CLIENT_URL=https://your-production-domain.com
   ```

3. **Use HTTPS**
   - Always serve your application over HTTPS in production
   - API keys are transmitted securely
   - Prevents man-in-the-middle attacks

4. **Monitor API usage**
   - Check your Gemini API usage dashboard regularly
   - Set up billing alerts
   - Review server logs for unusual patterns

5. **Keep dependencies updated**
   ```bash
   npm audit
   npm audit fix
   npm update
   ```

## 🔍 Security Checklist

Before deploying to production, ensure:

- [ ] `.env` file is NOT committed to version control
- [ ] `GEMINI_API_KEY` is set in server environment only
- [ ] `NODE_ENV=production` is set
- [ ] `CLIENT_URL` is configured for CORS
- [ ] Application is served over HTTPS
- [ ] Rate limiting is appropriate for your use case
- [ ] Dependencies are up to date (`npm audit`)
- [ ] Server logs are being monitored
- [ ] Billing alerts are configured for API usage

## 📋 Changelog

### Version 1.1.0 (2025-01-09)
- **BREAKING**: Migrated API calls to backend proxy
- Added Express.js server for API proxying
- Implemented rate limiting (15 req/min for AI calls)
- Added Helmet.js for security headers
- Configured CORS protection
- Updated `.gitignore` to prevent `.env` commits
- Created comprehensive security documentation

### Previous Versions
- ⚠️ **Security Issue**: API keys were exposed client-side

## 🆘 Support

For security-related questions or concerns:
- Review this document thoroughly
- Check the [README.md](README.md) for setup instructions
- Open a GitHub issue for non-security questions
- Contact maintainers directly for security vulnerabilities

---

**Remember**: Security is everyone's responsibility. If you see something, say something.
