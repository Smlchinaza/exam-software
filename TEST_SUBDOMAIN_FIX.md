# Testing the Subdomain Fix

## Steps to Test the Subdomain Generation Fix

### 1. Restart the Server
**IMPORTANT**: The server must be restarted after the code changes for them to take effect.

```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart it
npm run dev
# or
node server/server.js
```

### 2. Create a Test Registration
Use the frontend or API to create a new school registration request:

```javascript
// Via API (using Postman/curl)
POST http://localhost:5000/api/schools/request-registration
{
  "schoolName": "Test School for Subdomain " + Date.now(),
  "stateId": "your-state-id",
  "requesterName": "Test Requester",
  "requesterEmail": "test@example.com",
  "requesterPhone": "+1234567890",
  "proposedAdminEmail": "admin@test.com",
  "proposedAdminFirstName": "Test",
  "proposedAdminLastName": "Admin"
}
```

### 3. Approve the Registration
Login as Super Admin and approve the registration:

```javascript
POST http://localhost:5000/api/super-admin/registrations/{request-id}/approve
{
  "adminPassword": "TestPassword123",
  "approvalNotes": "Testing subdomain generation"
}
```

### 4. Check the Server Logs
Look for the debug messages in the server console:

```
🔍 [DEBUG] Checking domain for school: school-id school-name
🔍 [DEBUG] Current domain from database: NULL
🔍 [DEBUG] Domain query rows: 1
🔍 [DEBUG] Generated new domain: test-school-for-subdomain-1234567890.schoolshubs.com
🔍 [DEBUG] Domain update result: 1 rows affected
🔍 [DEBUG] Final domain to be used: test-school-for-subdomain-1234567890.schoolshubs.com
🔍 [DEBUG] Response data: {
  "message": "School registration approved successfully",
  "school": {
    "id": "school-id",
    "name": "Test School for Subdomain",
    "domain": "test-school-for-subdomain-1234567890.schoolshubs.com",
    "subdomain": "test-school-for-subdomain-1234567890",
    "status": "active"
  },
  ...
}
```

### 5. Verify the API Response
The approval response should include:
- `domain`: The full domain (e.g., `test-school.schoolshubs.com`)
- `subdomain`: The subdomain part (e.g., `test-school`)

### 6. Check the Database
Verify the domain was saved in the database:

```sql
SELECT id, name, domain, status FROM schools 
WHERE name LIKE 'Test School for Subdomain%' 
ORDER BY created_at DESC;
```

### 7. Test Existing Schools
For schools that already have a domain, the system should:
- Keep the existing domain
- Not generate a new one
- Still update the status to 'active'

## Expected Results

### ✅ Success Indicators
- Debug messages appear in server logs
- Domain is generated in format: `{school-name}.schoolshubs.com`
- API response includes domain and subdomain
- Database shows the domain value
- No errors in server logs

### ❌ Failure Indicators
- No debug messages (server not restarted)
- Domain is NULL in response
- Database shows NULL for domain
- Error messages in server logs
- `Domain update result: 0 rows affected`

## Troubleshooting

### If domain is still NULL after approval:

1. **Check server restart**: Did you restart the server after the changes?
2. **Check logs**: Are there any error messages in the server console?
3. **Check database**: Can you manually update a school's domain?
   ```sql
   UPDATE schools SET domain = 'test.schoolshubs.com' WHERE id = 'your-school-id';
   ```
4. **Check transaction**: Is the database transaction being committed?
5. **Check permissions**: Does the database user have UPDATE permissions?

### Common Issues:

- **Server not restarted**: Changes won't take effect until restart
- **Database connection issues**: Check database is running and accessible
- **Transaction rollback**: Errors in admin creation might rollback the domain update
- **Missing domain column**: Verify the domain column exists in schools table

## Next Steps

Once verified working:
1. Remove the debug console.log statements
2. Test with multiple school names
3. Test special characters in school names
4. Deploy to production
