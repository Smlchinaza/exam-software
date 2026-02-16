# Neon Database Setup Guide

## Quick Setup with Neon (2 minutes)

### Step 1: Get Your Neon Connection String
1. Go to https://console.neon.tech/
2. Sign in or create a free account
3. Go to your project (or create a new one)
4. Click on **Connection details**
5. Copy the **Connection string** (it looks like):
   ```
   postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/dbname?sslmode=require
   ```

### Step 2: Update Your .env File
1. Open the `.env` file in your project
2. Replace the DATABASE_URL line with your actual Neon connection string
3. Save the file

### Step 3: Run the Migration
```bash
node setup-database.js
```

## Example .env Configuration

Your DATABASE_URL should look like this (with your actual credentials):
```
DATABASE_URL=postgresql://your_username:your_password@ep-abc123.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Neon Connection String Format

Neon connection strings typically follow this format:
```
postgresql://[username]:[password]@[host]/[dbname]?sslmode=require
```

Where:
- **username**: Your Neon username
- **password**: Your Neon password
- **host**: Something like `ep-xxx.us-east-2.aws.neon.tech`
- **dbname**: Usually `neondb` or your custom database name
- **sslmode=require**: Required for Neon connections

## Testing Your Connection

After updating your .env file, test the connection:

```bash
node database-setup-helper.js
```

This will show you your current configuration and confirm if the connection works.

## Troubleshooting

### If you get "password must be a string" error:
- Make sure your DATABASE_URL has no spaces or line breaks
- Check that your password doesn't contain special characters that need URL encoding
- Ensure the connection string is on a single line

### If you get "connection refused" error:
- Double-check your Neon project is active
- Verify the connection string is copied correctly
- Make sure you're using the correct username and password

### If you get "database does not exist" error:
- The database name in the connection string should match your Neon database
- You can use the default `neondb` or create a new one in Neon console

---

## Ready to Go!

Once you've updated your DATABASE_URL with your actual Neon connection string, run:

```bash
node setup-database.js
```

This will create all the student results tables and complete Phase 1 of the implementation!
