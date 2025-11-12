# Quick Start: Deploy to Firebase (v2 API)

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login and Initialize

```bash
cd /Users/jessesmith/Desktop/Projects/NeverLost/NeverLost_Server
firebase login
firebase init functions
```

When prompted:
- Select "Use an existing project" or create new
- Choose JavaScript
- Say yes to installing dependencies

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Set Secrets (Sensitive Values)

Using the new Firebase Functions v2 secrets API:

```bash
# Set Sanity token (sensitive)
firebase functions:secrets:set SANITY_TOKEN
# When prompted, paste your Sanity token

# Set JWT secret (sensitive)
firebase functions:secrets:set JWT_SECRET
# When prompted, enter your JWT secret
```

## Step 5: Set Environment Variables (Non-Sensitive)

**Option A: Via Firebase Console**
1. Go to Firebase Console → Functions → Configuration
2. Add:
   - `SANITY_PROJECT_ID` = `492nxyas`
   - `SANITY_DATASET` = `production`

**Option B: Via .env file (for local dev)**
Create `.env` file:
```
SANITY_PROJECT_ID=492nxyas
SANITY_DATASET=production
```

## Step 6: Deploy

```bash
npm run deploy
```

After deployment, you'll get a URL like:
```
https://us-central1-neverlost-server.cloudfunctions.net/api
```

## Step 7: Update Frontend

In your frontend `.env.production` file:
```
VITE_APP_API_URL=https://us-central1-neverlost-server.cloudfunctions.net/api
```

## Step 8: Update CORS

After you deploy your frontend, update the CORS origins in `index.js` to include your frontend domain, then redeploy the function.

## Important Notes

- ✅ Uses **Firebase Functions v2** with `defineSecret` and `defineString` (new method)
- ❌ **No longer uses** deprecated `functions.config()`
- 🔒 Secrets are stored securely and automatically available to functions
- 📝 Non-sensitive values can be set via Console or .env file

For detailed instructions, see `FIREBASE_V2_SETUP.md`.

