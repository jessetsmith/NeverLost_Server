# Firebase Functions Deployment Troubleshooting

## Common Error: Secret overlaps non-secret environment variable

```
Secret environment variable overlaps non secret environment variable: SANITY_TOKEN
```

This happens when `SANITY_TOKEN` (or `JWT_SECRET`) is defined **twice**:

1. As a Firebase **secret** (`defineSecret` in `index.js` + `firebase functions:secrets:set`)
2. As a plain **environment variable** (usually from `.env` during deploy, or Firebase Console)

### Fix

1. **Remove secrets from `.env`** — keep only non-sensitive values there:
   ```
   SANITY_PROJECT_ID=492nxyas
   SANITY_DATASET=production
   SKETCHFAB_API_TOKEN=...
   ```
2. **Put secrets in `.env.local`** (local dev only — not deployed):
   ```
   SANITY_TOKEN=your-token
   JWT_SECRET=your-jwt-secret
   ```
3. **Ensure Firebase secrets are set** (production):
   ```bash
   firebase functions:secrets:set SANITY_TOKEN
   firebase functions:secrets:set JWT_SECRET
   ```
4. **Remove duplicates in Google Cloud Console** (if deploy still fails):
   - [Cloud Run → api → Edit → Variables & Secrets](https://console.cloud.google.com/run)
   - Delete `SANITY_TOKEN` / `JWT_SECRET` from **Environment variables** (keep under **Secrets** only)
5. Redeploy: `npm run deploy`

---

## Common Error: Container Failed to Start on PORT=8080

This error occurs when Cloud Run (which powers Firebase Functions v2) cannot start the container within the timeout period.

## Solutions

### 1. Verify Secrets Are Set

Before deploying, ensure secrets are configured:

```bash
# Check if secrets exist
firebase functions:secrets:access SANITY_TOKEN
firebase functions:secrets:access JWT_SECRET

# If not set, create them:
firebase functions:secrets:set SANITY_TOKEN
firebase functions:secrets:set JWT_SECRET
```

### 2. Check Function Configuration

The function is configured in `index.js` with:
- `timeoutSeconds: 60` - Gives more time for startup
- `memory: "256MiB"` - Ensures sufficient memory
- `cors: true` - Handles CORS automatically

### 3. Verify No Startup Errors

Check the Cloud Run logs for initialization errors:

```bash
firebase functions:log
```

Or view in Firebase Console:
- Go to Functions → api → Logs

### 4. Common Issues

#### Missing Secrets
If secrets aren't set, the function may fail during initialization. Make sure both secrets are set:
```bash
firebase functions:secrets:set SANITY_TOKEN
firebase functions:secrets:set JWT_SECRET
```

#### Environment Variables
The function uses `defineString` for non-sensitive values. These have defaults, but you can override them in Firebase Console if needed.

#### Node.js Version
Ensure `package.json` specifies Node.js 20:
```json
"engines": {
  "node": "20"
}
```

### 5. Redeploy After Fixes

After fixing issues, redeploy:

```bash
npm run deploy
```

### 6. Check Deployment Status

Monitor the deployment:
```bash
firebase functions:log --only api
```

## Debugging Steps

1. **Check logs immediately after deployment:**
   ```bash
   firebase functions:log --only api --limit 50
   ```

2. **Verify the function is exported correctly:**
   - Check `index.js` exports `exports.api`
   - Ensure no syntax errors: `node -e "require('./index.js')"`

3. **Test locally with emulator:**
   ```bash
   npm run serve
   ```

4. **Check Cloud Run directly:**
   - Go to Google Cloud Console
   - Navigate to Cloud Run
   - Find service `neverlost-server-fb`
   - Check logs and metrics

## Expected Behavior

When the function starts successfully, you should see in logs:
- "🚀 Initializing NeverLost Backend API..."
- "✅ Firebase Function 'api' exported successfully"
- "✅ Sanity token loaded (write operations enabled)"

If you don't see these, the function is failing during initialization.

## Still Having Issues?

1. Check Firebase Functions logs in the console
2. Verify all dependencies are installed: `npm install`
3. Ensure Node.js version matches (20)
4. Check that secrets are accessible: `firebase functions:secrets:access <SECRET_NAME>`
5. Try deploying with verbose logging: `firebase deploy --only functions --debug`

