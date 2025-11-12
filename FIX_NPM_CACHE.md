# Fix npm Cache Permission Error

## Problem
You're getting `EACCES: permission denied` errors when running `npm install`. This is caused by root-owned files in your npm cache directory.

## Solution

### Option 1: Fix Permissions (Recommended)

Run this command in your terminal:

```bash
sudo chown -R $(whoami):staff ~/.npm
```

You'll be prompted for your password. After running this, try `npm install` again.

### Option 2: Clear and Recreate Cache

If Option 1 doesn't work, try:

```bash
# Remove the cache directory
rm -rf ~/.npm/_cacache

# Then try installing again
npm install
```

### Option 3: Use Temporary Cache (Workaround)

If you can't fix permissions right now, you can use a temporary cache:

```bash
npm install --cache /tmp/npm-cache-$(whoami)
```

### Option 4: Use npm ci Instead

If you have a `package-lock.json` file:

```bash
npm ci
```

This bypasses some cache operations.

## After Fixing

Once permissions are fixed, you can verify:

```bash
npm cache verify
```

This should complete without errors.

## Prevention

This issue typically happens when npm was run with `sudo` at some point. To prevent it:

- **Never run `npm install` with `sudo`**
- If you need global packages, use a Node version manager like `nvm` or `n`
- Always run npm commands as your regular user

