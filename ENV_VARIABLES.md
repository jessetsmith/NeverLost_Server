# Environment Variables Guide

## Important: Reserved Variables

Firebase Functions v2 reserves certain environment variable names. **Do NOT** set these in your `.env` file or as environment variables:

- `PORT` - Reserved for internal use by Firebase Functions
- `FUNCTION_TARGET` - Reserved
- `FUNCTION_SIGNATURE_TYPE` - Reserved
- `K_SERVICE` - Reserved
- `K_REVISION` - Reserved

## Local Development (.env file)

For local development, create a `.env` file in the project root:

```bash
# Server Configuration
# NOTE: Do NOT include PORT - it's reserved by Firebase Functions

# Sanity.io Configuration
SANITY_PROJECT_ID=492nxyas
SANITY_DATASET=production
SANITY_TOKEN=your-sanity-token-here

# JWT Secret (for authentication)
JWT_SECRET=your-jwt-secret-here
```

## Firebase Deployment

For Firebase Functions deployment, use:

### Secrets (Sensitive Values)
```bash
firebase functions:secrets:set SANITY_TOKEN
firebase functions:secrets:set JWT_SECRET
```

### Environment Variables (Non-Sensitive)
Set via Firebase Console → Functions → Configuration, or use `defineString` in code.

## Local Server (src/server.js)

The local development server (`src/server.js`) uses:
- `PORT` from `process.env.PORT || 3000` - This is fine for local dev
- Other variables from `.env` file

This is separate from Firebase Functions deployment and won't conflict.

## Troubleshooting

**Error: "Key PORT is reserved for internal use"**
- Remove `PORT=` from your `.env` file
- Firebase Functions manages the port automatically

**Environment variables not working in Firebase**
- Make sure you've set them as secrets or environment variables
- Check Firebase Console → Functions → Configuration
- Verify secrets are included in the function's `secrets` array in `index.js`

