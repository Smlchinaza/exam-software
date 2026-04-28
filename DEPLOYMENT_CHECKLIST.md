# Subdomain Deployment Checklist

## 🚀 Quick Deployment Checklist

### Pre-Deployment Setup ✅

- [ ] **Backend Implementation Complete**
  - [ ] Subdomain extraction middleware created
  - [ ] Dynamic CORS configuration updated
  - [ ] School registration endpoint enhanced
  - [ ] API responses include subdomain info

- [ ] **Frontend Implementation Complete**
  - [ ] `useSchoolSubdomain` hook created
  - [ ] App component updated for subdomain detection
  - [ ] School branding components created
  - [ ] Test components implemented

- [ ] **Configuration Files Updated**
  - [ ] `vercel.json` includes environment variables
  - [ ] Database connection strings ready
  - [ ] JWT secret key configured

### Vercel Configuration 🔧

- [ ] **Project Setup**
  - [ ] Project linked to Vercel
  - [ ] GitHub integration enabled
  - [ ] Build settings configured

- [ ] **Environment Variables**
  - [ ] `DB_HOST` - PostgreSQL host
  - [ ] `DB_PORT` - Database port (5432)
  - [ ] `DB_USER` - Database username
  - [ ] `DB_PASSWORD` - Database password
  - [ ] `DB_NAME` - Database name
  - [ ] `JWT_SECRET` - JWT secret key
  - [ ] `NODE_ENV` - Set to "production"

### Domain Configuration 🌐

- [ ] **Main Domain**
  - [ ] `schoolshubs.com` added to Vercel
  - [ ] DNS CNAME record: `@` → `cname.vercel.app`
  - [ ] HTTPS certificate issued

- [ ] **Wildcard Domain**
  - [ ] `*.schoolshubs.com` added to Vercel
  - [ ] DNS CNAME record: `*` → `cname.vercel.app`
  - [ ] Wildcard SSL certificate issued

### Deployment Steps 📦

- [ ] **Code Deployment**
  ```bash
  git add .
  git commit -m "feat: implement subdomain support"
  git push origin main
  ```

- [ ] **Vercel Deployment**
  - [ ] Automatic deployment triggered
  - [ ] Build process completes successfully
  - [ ] Application deployed to production

### Testing & Validation 🧪

- [ ] **Basic Functionality**
  - [ ] Main domain loads: `https://schoolshubs.com`
  - [ ] API health check: `/api/health`
  - [ ] Frontend loads without errors

- [ ] **Subdomain Features**
  - [ ] School registration works
  - [ ] Auto-generated subdomain created
  - [ ] Subdomain accessible: `schoolname.schoolshubs.com`
  - [ ] Frontend detects subdomain correctly
  - [ ] School branding displays properly

- [ ] **API Testing**
  ```bash
  # Test school registration
  curl -X POST https://schoolshubs.com/api/schools/register \
    -H "Content-Type: application/json" \
    -d '{"name": "Test School", "adminEmail": "test@school.com", "adminPassword": "password123", "adminFirstName": "Test", "adminLastName": "User", "stateId": "state-id"}'
  
  # Test subdomain access
  curl https://test-school.schoolshubs.com/api/health
  ```

### Post-Deployment 📊

- [ ] **Monitoring Setup**
  - [ ] Vercel Analytics enabled
  - [ ] Error monitoring configured
  - [ ] Performance tracking active

- [ ] **Documentation**
  - [ ] User guide updated for subdomain access
  - [ ] Admin documentation updated
  - [ ] Troubleshooting guide created

---

## 🚨 Critical Issues Checklist

### DNS Issues
- [ ] DNS records propagated (use nslookup to verify)
- [ ] SSL certificates issued for all domains
- [ ] Wildcard subdomain routing works

### CORS Issues
- [ ] Subdomain origins allowed in CORS config
- [ ] Credentials enabled in API calls
- [ ] No CORS errors in browser console

### Database Issues
- [ ] Database connection successful
- [ ] All tables and indexes created
- [ ] Domain column exists in schools table

### Frontend Issues
- [ ] Subdomain detection works in browser
- [ ] School branding components render
- [ ] No JavaScript errors in console

---

## 📱 Quick Test Commands

### Test Main Domain
```bash
curl https://schoolshubs.com/api/health
```

### Test School Registration
```bash
curl -X POST https://schoolshubs.com/api/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School",
    "adminEmail": "admin@testschool.com",
    "adminPassword": "SecurePass123",
    "adminFirstName": "Test",
    "adminLastName": "Admin",
    "stateId": "your-state-id"
  }'
```

### Test Subdomain Access
```bash
curl https://test-school.schoolshubs.com/api/health
```

### Test Frontend Subdomain Detection
1. Visit: `https://test-school.schoolshubs.com/subdomain-test`
2. Check browser console for detection logs
3. Verify school branding appears

---

## 🔄 Rollback Plan

If critical issues occur:

### Quick Rollback
```bash
# Revert last deployment
git revert HEAD --no-edit
git push origin main
```

### DNS Rollback
1. Remove wildcard CNAME record temporarily
2. Keep main domain pointing to Vercel
3. Fix issues, then restore wildcard record

---

## 📞 Support Contacts

### Vercel Support
- Dashboard: https://vercel.com/dashboard
- Documentation: https://vercel.com/docs

### DNS Provider
- GoDaddy: https://godaddy.com/help
- Namecheap: https://www.namecheap.com/support
- CloudFlare: https://developers.cloudflare.com

---

## ✅ Success Criteria

Deployment is successful when:

- [ ] Main domain loads without errors
- [ ] School registration creates subdomains
- [ ] Subdomains resolve and load the application
- [ ] Frontend correctly detects and displays school branding
- [ ] All API endpoints work on subdomains
- [ ] No CORS or SSL errors
- [ ] Performance is acceptable (<3s load time)

---

**Estimated Deployment Time**: 30-45 minutes  
**Critical Path**: DNS propagation (5-30 minutes)  
**Risk Level**: Medium (DNS configuration required)
