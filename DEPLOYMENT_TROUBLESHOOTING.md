# Firebase Functions Deployment Troubleshooting

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

