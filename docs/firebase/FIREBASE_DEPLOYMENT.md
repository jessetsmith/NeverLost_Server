# Firebase Deployment Guide for NeverLost Backend

This guide will walk you through deploying your NeverLost backend server to Firebase Cloud Functions.

## Prerequisites

1. **Firebase Account**: Sign up at https://firebase.google.com
2. **Firebase CLI**: Install globally with `npm install -g firebase-tools`
3. **Node.js 20**: Required for Firebase Functions

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for authentication.

## Step 3: Initialize Firebase Project

```bash
cd /Users/jessesmith/Desktop/Projects/NeverLost/NeverLost_Server
firebase init functions
```

When prompted:
- **Select**: Use an existing project (or create a new one)
- **Choose your Firebase project** (or create new)
- **Language**: JavaScript
- **ESLint**: Yes (optional)
- **Install dependencies**: Yes

## Step 4: Update .firebaserc

Edit `.firebaserc` and replace `your-firebase-project-id` with your actual Firebase project ID:

```json
{
  "projects": {
    "default": "your-actual-project-id"
  }
}
```

## Step 5: Install Dependencies

```bash
npm install
```

This will install `firebase-functions` and `firebase-admin`.

## Step 6: Set Environment Variables in Firebase

Set your environment variables in Firebase Functions:

```bash
firebase functions:config:set sanity.project_id="492nxyas"
firebase functions:config:set sanity.dataset="production"
firebase functions:config:set sanity.token="your-sanity-token-here"
firebase functions:config:set jwt.secret="your-jwt-secret-here"
```

**OR** use the newer method (recommended):

```bash
firebase functions:secrets:set SANITY_PROJECT_ID
# When prompted, enter: 492nxyas

firebase functions:secrets:set SANITY_DATASET
# When prompted, enter: production

firebase functions:secrets:set SANITY_TOKEN
# When prompted, enter your Sanity token

firebase functions:secrets:set JWT_SECRET
# When prompted, enter your JWT secret
```

Then update `index.js` to use secrets (see Step 7).

## Step 7: Update index.js to Use Firebase Config

The `index.js` file I created uses environment variables. For Firebase Functions, you need to access them via `functions.config()` or secrets.

Update the beginning of `index.js`:

```javascript
const functions = require("firebase-functions");

// For config (older method):
// const config = functions.config();
// const SANITY_PROJECT_ID = config.sanity.project_id;
// const SANITY_DATASET = config.sanity.dataset;
// const SANITY_TOKEN = config.sanity.token;
// const JWT_SECRET = config.jwt.secret;

// For secrets (newer method - recommended):
const SANITY_PROJECT_ID = process.env.SANITY_PROJECT_ID || functions.config().sanity?.project_id;
const SANITY_DATASET = process.env.SANITY_DATASET || functions.config().sanity?.dataset;
const SANITY_TOKEN = process.env.SANITY_TOKEN || functions.config().sanity?.token;
const JWT_SECRET = process.env.JWT_SECRET || functions.config().jwt?.secret;
```

## Step 8: Test Locally (Optional)

Test your function locally before deploying:

```bash
npm run serve
```

This starts the Firebase emulator. Your function will be available at:
`http://localhost:5001/your-project-id/us-central1/api`

## Step 9: Deploy to Firebase

```bash
npm run deploy
# OR
firebase deploy --only functions
```

The deployment will take a few minutes. Once complete, you'll see the function URL:
```
https://us-central1-your-project-id.cloudfunctions.net/api
```

## Step 10: Update Frontend API URL

Update your frontend to use the deployed API:

1. Create a `.env.production` file in the frontend:
```bash
cd /Users/jessesmith/Desktop/Projects/NeverLost/NeverLost
```

Create `.env.production`:
```
VITE_APP_API_URL=https://us-central1-your-project-id.cloudfunctions.net/api
```

2. Or update your build process to use the production API URL.

## Step 11: Update CORS in index.js

After deploying, update the CORS configuration in `index.js` to include your frontend domain:

```javascript
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://your-frontend-domain.web.app",
    "https://your-frontend-domain.firebaseapp.com",
    // Add your custom domain
  ],
  // ...
};
```

Then redeploy:
```bash
firebase deploy --only functions
```

## Troubleshooting

### Function Not Found
- Check that you deployed successfully: `firebase functions:list`
- Verify the function name matches in `index.js`: `exports.api`

### Environment Variables Not Working
- Use `firebase functions:config:get` to check config values
- Or use secrets: `firebase functions:secrets:access SECRET_NAME`

### CORS Errors
- Make sure your frontend domain is in the CORS origin list
- Check that credentials are enabled if needed

### Sanity Permission Errors
- Verify your Sanity token has write permissions
- Check that the token is correctly set in Firebase config/secrets

## Monitoring

View logs:
```bash
firebase functions:log
```

View specific function logs:
```bash
firebase functions:log --only api
```

## Updating Environment Variables

To update environment variables:

**Using config:**
```bash
firebase functions:config:set sanity.token="new-token"
firebase deploy --only functions
```

**Using secrets:**
```bash
firebase functions:secrets:set SANITY_TOKEN
# Enter new value when prompted
firebase deploy --only functions
```

## Cost Considerations

Firebase Functions free tier includes:
- 2 million invocations/month
- 400,000 GB-seconds compute time/month
- 5 GB outbound data/month

Monitor usage in Firebase Console → Functions → Usage

