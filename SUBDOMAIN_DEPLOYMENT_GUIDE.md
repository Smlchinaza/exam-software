# Subdomain Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the exam-software with subdomain support on Vercel.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Vercel Configuration](#vercel-configuration)
3. [Environment Variables](#environment-variables)
4. [Domain Configuration](#domain-configuration)
5. [Deployment Steps](#deployment-steps)
6. [DNS Configuration](#dns-configuration)
7. [Testing & Validation](#testing--validation)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- **Vercel Account** - https://vercel.com
- **Domain Access** - Ability to modify DNS records
- **Database** - PostgreSQL database (Neon, Railway, etc.)

### Required Files
✅ `vercel.json` - Updated with environment variables  
✅ Backend implementation - Complete  
✅ Frontend implementation - Complete  
✅ Subdomain middleware - Implemented  

---

## Vercel Configuration

### Updated vercel.json

The `vercel.json` file has been updated to include all necessary environment variables:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "client/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "DB_HOST": "@db_host",
    "DB_PORT": "@db_port",
    "DB_USER": "@db_user",
    "DB_PASSWORD": "@db_password",
    "DB_NAME": "@db_name"
  }
}
```

---

## Environment Variables

### Database Configuration

In Vercel Dashboard → Settings → Environment Variables, set the following:

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | PostgreSQL host | `ep-cool-darkness-123456.us-east-2.aws.neon.tech` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_USER` | Database username | `your_username` |
| `DB_PASSWORD` | Database password | `your_password` |
| `DB_NAME` | Database name | `exam_software` |
| `JWT_SECRET` | JWT secret key | `your-super-secret-jwt-key-here` |

### Additional Variables

| Variable | Description | Recommended Value |
|----------|-------------|-------------------|
| `NODE_ENV` | Environment | `production` |
| `CLIENT_URL` | Frontend URL | `https://schoolshubs.com` |

---

## Domain Configuration

### Step 1: Add Main Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your main domain: `schoolshubs.com`
3. Vercel will provide DNS records to add

### Step 2: Add Wildcard Domain

1. In the same Domains section, add: `*.schoolshubs.com`
2. This enables subdomain routing for all schools
3. Vercel will automatically handle wildcard routing

### Step 3: Verify DNS Records

Vercel will provide records like:
```
Type: CNAME
Name: @
Value: cname.vercel.app
TTL: 300

Type: CNAME
Name: *
Value: cname.vercel.app
TTL: 300
```

---

## Deployment Steps

### Step 1: Connect to Vercel

```bash
# Install Vercel CLI (if not already installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
```

### Step 2: Deploy to Vercel

```bash
# Deploy from project root
vercel --prod

# Or use GitHub integration for automatic deployment
git add .
git commit -m "feat: implement subdomain support for deployment"
git push origin main
```

### Step 3: Verify Deployment

1. Check Vercel dashboard for deployment status
2. Visit the main domain: `https://schoolshubs.com`
3. Test API endpoints: `https://schoolshubs.com/api/health`

---

## DNS Configuration

### Step 1: Configure Domain Registrar

Log into your domain registrar (GoDaddy, Namecheap, CloudFlare, etc.) and add:

#### Main Domain Record
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `@` | `cname.vercel.app` | 300 |

#### Wildcard Record
| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `*` | `cname.vercel.app` | 300 |

### Example Configurations

#### GoDaddy
```
Host: @
Points to: cname.vercel.app
TTL: 1 Hour

Host: *
Points to: cname.vercel.app
TTL: 1 Hour
```

#### Namecheap
```
Host: @
Value: cname.vercel.app
TTL: Automatic

Host: *
Value: cname.vercel.app
TTL: Automatic
```

#### CloudFlare
```
Type: CNAME
Name: @
Target: cname.vercel.app
Proxy: Enabled

Type: CNAME
Name: *
Target: cname.vercel.app
Proxy: Enabled
```

### Step 2: Verify DNS Propagation

Use these tools to verify DNS records:
- **nslookup**: `nslookup schoolshubs.com`
- **dig**: `dig schoolshubs.com`
- **Online tools**: https://dnschecker.org

Wait for propagation (usually 5-30 minutes).

---

## Testing & Validation

### Test 1: Main Domain Access

```bash
# Test main domain
curl https://schoolshubs.com/api/health

# Expected response
{
  "status": "ok",
  "database": "postgres",
  "timestamp": "2026-04-26T..."
}
```

### Test 2: School Registration

```bash
# Register a new school
curl -X POST https://schoolshubs.com/api/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School Academy",
    "adminEmail": "admin@testschool.edu",
    "adminPassword": "SecurePass123",
    "adminFirstName": "John",
    "adminLastName": "Doe",
    "stateId": "your-state-id"
  }'

# Should return auto-generated domain:
# "domain": "test-school-academy.schoolshubs.com"
```

### Test 3: Subdomain Access

```bash
# Test subdomain (after DNS propagation)
curl https://test-school-academy.schoolshubs.com/api/health

# Should work and include school context
```

### Test 4: Frontend Subdomain Detection

1. Visit: `https://test-school-academy.schoolshubs.com`
2. Open browser console
3. Check for subdomain detection logs
4. Verify school branding components appear

---

## Troubleshooting

### Issue 1: DNS Propagation Delay

**Problem**: Subdomains not working after deployment

**Solution**:
1. Wait 15-30 minutes for DNS propagation
2. Use `nslookup` to verify records
3. Check Vercel dashboard for domain status

```bash
# Check DNS records
nslookup schoolshubs.com
nslookup test-school-academy.schoolshubs.com
```

### Issue 2: CORS Errors

**Problem**: "Access blocked by CORS policy"

**Solution**:
1. Verify CORS configuration in `server.js`
2. Check that subdomain is in allowed origins
3. Ensure `credentials: true` in API calls

### Issue 3: Subdomain Not Detected

**Problem**: Frontend not detecting subdomain

**Solution**:
1. Check browser console for errors
2. Verify `useSchoolSubdomain` hook is working
3. Test at `/subdomain-test` route

### Issue 4: Database Connection

**Problem**: Database connection errors

**Solution**:
1. Verify environment variables in Vercel
2. Check database accessibility
3. Test connection string manually

### Issue 5: Build Failures

**Problem**: Vercel build fails

**Solution**:
1. Check build logs in Vercel dashboard
2. Verify `package.json` scripts
3. Ensure all dependencies are installed

---

## Performance Optimization

### Vercel Edge Functions

The subdomain middleware is optimized for Vercel's Edge Network:

```javascript
// Middleware runs at edge locations
app.use(extractSchoolFromSubdomain);
```

### Caching Strategy

- **Static assets**: Cached by Vercel automatically
- **API responses**: Consider adding Redis for database caching
- **School context**: Extracted once per request

---

## Security Considerations

### Domain Validation

- ✅ Only `*.schoolshubs.com` subdomains accepted
- ✅ System subdomains filtered (`www`, `api`, `admin`)
- ✅ Input validation in subdomain generation

### HTTPS Enforcement

- ✅ Vercel provides automatic HTTPS
- ✅ All subdomains get SSL certificates
- ✅ Secure cookies and CORS settings

### Rate Limiting

- ✅ Existing rate limiting middleware
- ✅ Per-subdomain rate limiting possible
- ✅ DDoS protection by Vercel

---

## Monitoring & Analytics

### Vercel Analytics

1. Enable Vercel Analytics in dashboard
2. Monitor subdomain usage patterns
3. Track performance metrics

### Custom Monitoring

```javascript
// Add to subdomain middleware
console.log(`[SUBDOMAIN] ${subdomain} accessed from ${req.ip}`);
```

---

## Rollback Plan

If issues occur:

### Quick Rollback
```bash
# Revert to previous commit
git revert <commit-hash>
git push origin main
```

### DNS Rollback
1. Remove wildcard CNAME record
2. Keep main domain pointing to Vercel
3. Gradually add subdomains back

---

## Next Steps

### Post-Deployment

1. **Monitor logs** for subdomain access patterns
2. **Test with real schools** to validate user experience
3. **Set up analytics** for subdomain usage
4. **Document for schools** how to use their branded URLs

### Future Enhancements

1. **School-specific themes** and branding
2. **Custom domains** for premium schools
3. **Advanced analytics** per school
4. **CDN optimization** for school assets

---

## Summary Checklist

### Pre-Deployment
- [ ] Backend implementation complete
- [ ] Frontend implementation complete
- [ ] Environment variables configured
- [ ] Database connected and tested

### Deployment
- [ ] Code pushed to GitHub
- [ ] Vercel project configured
- [ ] Domains added to Vercel
- [ ] DNS records configured

### Post-Deployment
- [ ] Main domain accessible
- [ ] Subdomain routing working
- [ ] School registration functional
- [ ] Frontend subdomain detection working
- [ ] CORS configuration verified
- [ ] Performance monitoring enabled

---

**Status**: Ready for deployment  
**Estimated Time**: 30-45 minutes  
**Complexity**: Medium  

The subdomain implementation is now ready for production deployment on Vercel with full DNS configuration and testing procedures.
