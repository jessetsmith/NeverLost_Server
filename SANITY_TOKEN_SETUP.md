# Sanity Token Setup Guide

## Problem
If you're seeing "Insufficient permissions; permission 'create' required" errors, your Sanity token is read-only and needs to be replaced with a write-enabled token.

## Solution: Create a Write-Enabled Token

### Step 1: Go to Sanity Management
1. Visit: https://sanity.io/manage
2. Log in to your account
3. Select your project: **492nxyas** (NeverLost)

### Step 2: Create a New Token
1. Click on **API** in the left sidebar
2. Click on **Tokens** tab
3. Click **Add API token** button

### Step 3: Configure the Token
1. **Name**: Give it a descriptive name like "NeverLost Server Token" or "Backend Write Token"
2. **Role**: **IMPORTANT** - Select one of:
   - **Editor** (recommended) - Can read and write all documents
   - **Admin** - Full access including project settings
   - **DO NOT** select "Viewer" - This is read-only and will cause the error

### Step 4: Copy and Save the Token
1. After creating, **copy the token immediately** (you won't be able to see it again)
2. It will look like: `sk...` (starts with "sk")

### Step 5: Update Your .env File
1. Open: `/Users/jessesmith/Desktop/Projects/NeverLost/NeverLost_Server/.env`
2. Find the line: `SANITY_TOKEN=`
3. Replace it with: `SANITY_TOKEN=your-new-token-here`
4. Save the file

### Step 6: Restart the Server
```bash
cd /Users/jessesmith/Desktop/Projects/NeverLost/NeverLost_Server
npm run dev
```

You should now see:
```
✅ Sanity token verified: Write permissions confirmed
```

## Verification
After restarting, try registering a new user. If it works, you're all set!

## Troubleshooting
- **Still getting 403 errors?** Make sure you selected "Editor" or "Admin" role, not "Viewer"
- **Token not working?** Double-check there are no extra spaces in your .env file
- **Can't find the token?** You'll need to create a new one - tokens are only shown once

