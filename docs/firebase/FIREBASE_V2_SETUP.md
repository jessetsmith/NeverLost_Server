# Firebase Functions v2 Setup Guide

This guide uses the **new Firebase Functions v2 API** with `defineSecret` and `defineString` instead of the deprecated `functions.config()`.

## Prerequisites

1. **Firebase CLI**: Install globally with `npm install -g firebase-tools`
2. **Firebase Account**: Sign up at https://firebase.google.com
3. **Node.js 22**: Required for Firebase Functions v2

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

## Step 3: Initialize Firebase Project (if not already done)

```bash
cd /Users/jessesmith/Desktop/Projects/NeverLost/NeverLost_Server
firebase init functions
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Set Environment Variables (New Method)

### For Non-Sensitive Values (using defineString)

These are set during deployment. You can set them via:

**Option A: During deployment (interactive)**
```bash
firebase deploy --only functions
# When prompted, enter values for:
# - SANITY_PROJECT_ID: 492nxyas
# - SANITY_DATASET: production
```

**Option B: Set via Firebase Console**
1. Go to Firebase Console → Functions → Configuration
2. Add environment variables:
   - `SANITY_PROJECT_ID` = `492nxyas`
   - `SANITY_DATASET` = `production`

**Option C: Use .env file for local development**
Create a `.env` file in the project root:
```
SANITY_PROJECT_ID=492nxyas
SANITY_DATASET=production
```

### For Sensitive Values (using defineSecret)

**Set secrets using Firebase CLI:**

```bash
# Set Sanity token
firebase functions:secrets:set SANITY_TOKEN
# When prompted, paste your Sanity token

# Set JWT secret
firebase functions:secrets:set JWT_SECRET
# When prompted, enter your JWT secret
```

**Or create secrets via Firebase Console:**
1. Go to Firebase Console → Functions → Secrets
2. Click "Add secret"
3. Name: `SANITY_TOKEN`, Value: (paste your token)
4. Repeat for `JWT_SECRET`

## Step 6: Grant Secret Access

After creating secrets, you need to grant your function access to them. This is done automatically when you deploy, but you can verify:

```bash
firebase functions:secrets:access SANITY_TOKEN
```

## Step 7: Deploy

```bash
npm run deploy
# OR
firebase deploy --only functions
```

The function will automatically have access to the secrets defined in `index.js`.

## Step 8: Update Frontend

After deployment, you'll get a URL like:
```
https://us-central1-neverlost-server.cloudfunctions.net/api
```

Update your frontend `.env.production`:
```
VITE_APP_API_URL=https://us-central1-neverlost-server.cloudfunctions.net/api
```

## Local Development

For local development, create a `.env` file:

```bash
SANITY_PROJECT_ID=492nxyas
SANITY_DATASET=production
SANITY_TOKEN=your-sanity-token
JWT_SECRET=your-jwt-secret
```

Then run:
```bash
npm run serve
```

## Key Differences from Old Method

### Old Method (Deprecated)
```javascript
// ❌ Deprecated
const config = functions.config();
const projectId = config.sanity.project_id;
```

### New Method (v2)
```javascript
// ✅ New way
const {defineString, defineSecret} = require("firebase-functions/params");
const projectId = defineString("SANITY_PROJECT_ID");
// Access value: projectId.value()
```

## Managing Secrets

**List all secrets:**
```bash
firebase functions:secrets:list
```

**Update a secret:**
```bash
firebase functions:secrets:set SANITY_TOKEN
# Enter new value when prompted
firebase deploy --only functions
```

**Delete a secret:**
```bash
firebase functions:secrets:destroy SANITY_TOKEN
```

## Troubleshooting

### Secret Not Found
- Make sure you've created the secret: `firebase functions:secrets:list`
- Verify the secret name matches exactly (case-sensitive)
- Redeploy after creating/updating secrets

### Environment Variable Not Set
- Check Firebase Console → Functions → Configuration
- Or set via CLI during deployment

### CORS Errors
- Update CORS origins in `index.js` to include your frontend domain
- Redeploy: `firebase deploy --only functions`

## Migration from functions.config()

If you were using the old method:

**Before:**
```bash
firebase functions:config:set sanity.project_id="492nxyas"
```

**After:**
```bash
# For non-sensitive: Set in Firebase Console or .env
# For sensitive: Use secrets
firebase functions:secrets:set SANITY_TOKEN
```

The code automatically uses `defineString` and `defineSecret` which are the new recommended methods.

## Cost Considerations

Firebase Functions v2 pricing:
- **Invocations**: First 2M/month free
- **Compute Time**: 400K GB-seconds/month free
- **Outbound Data**: 5 GB/month free

Secrets are stored securely and don't incur additional costs.

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use secrets for sensitive data** (tokens, API keys)
3. **Use defineString for non-sensitive config** (project IDs, dataset names)
4. **Rotate secrets regularly**
5. **Use different secrets for dev/staging/prod**

## Additional Resources

- [Firebase Functions v2 Documentation](https://firebase.google.com/docs/functions)
- [Environment Variables Guide](https://firebase.google.com/docs/functions/config-env)
- [Secrets Management](https://firebase.google.com/docs/functions/secrets)

