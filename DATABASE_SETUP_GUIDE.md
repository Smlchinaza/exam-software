# Quick Database Setup Guide

## Option 1: ElephantSQL (Recommended - 5 minutes setup)

### Step 1: Create ElephantSQL Account
1. Go to https://www.elephantsql.com/
2. Click "Sign Up" and create a free account
3. Verify your email if required

### Step 2: Create Database
1. Log in to ElephantSQL
2. Click "Create New Instance"
3. Choose a plan (Free Turtle is fine for development)
4. Give it a name (e.g., "exam-software")
5. Select a region closest to you
6. Click "Create"

### Step 3: Get Connection String
1. Click on your database instance
2. Go to "Details" tab
3. Copy the "Connection URL" (looks like: postgresql://user:password@host.db.elephantsql.com:5432/dbname)

### Step 4: Update .env File
1. Open the `.env` file in your project
2. Replace the DATABASE_URL line with your ElephantSQL connection string
3. Save the file

### Step 5: Run Migration
```bash
node setup-database.js
```

## Option 2: Supabase (Alternative)

### Step 1: Create Supabase Project
1. Go to https://supabase.com/
2. Click "Start your project"
3. Sign up with GitHub
4. Create new project

### Step 2: Get Connection String
1. Go to Project Settings > Database
2. Copy the "Connection string"
3. Replace `[YOUR-PASSWORD]` with your database password

### Step 3: Update .env and Run Migration
Same as steps 4-5 above

## Option 3: Local PostgreSQL (Advanced)

If you have PostgreSQL installed locally:

### Step 1: Start PostgreSQL
```bash
# Windows: Start PostgreSQL service
# Mac: brew services start postgresql
# Linux: sudo systemctl start postgresql
```

### Step 2: Create Database
```bash
createdb exam_db
```

### Step 3: Update .env with correct password
Update the DATABASE_URL in .env with your actual PostgreSQL password

### Step 4: Run Migration
```bash
node setup-database.js
```

---

## Quick Test

After setting up your DATABASE_URL, test the connection:

```bash
node database-setup-helper.js
```

This will show you your current configuration and help diagnose any issues.
