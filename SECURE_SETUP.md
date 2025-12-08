# Secure API Key Setup for Vercel

## Important Security Fix

The API key is now handled **server-side only** to prevent exposure in the browser. This is the secure way to handle sensitive API keys.

## Vercel Deployment Setup

### 1. Add Environment Variable in Vercel Dashboard

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `OPENAI_API_KEY` (NOT `VITE_OPENAI_API_KEY`)
   - **Value**: Your OpenAI API key (starts with `sk-`)
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**

### 2. Important Notes

- ✅ **Use `OPENAI_API_KEY`** (without `VITE_` prefix)
- ✅ This keeps the key **server-side only** - never exposed to browser
- ✅ The serverless function at `/api/analyze-image.js` handles all OpenAI calls
- ✅ Frontend code never sees or sends the API key

### 3. Local Development

For local development, create a `.env.local` file (not `.env`):

```env
OPENAI_API_KEY=your_api_key_here
```

**Note**: `.env.local` is already in `.gitignore` and won't be committed.

### 4. How It Works

```
Frontend (Browser)
    ↓
    Calls: /api/analyze-image
    ↓
Serverless Function (Vercel)
    ↓
    Uses: OPENAI_API_KEY (server-side only)
    ↓
OpenAI API
    ↓
    Returns: Extracted data
    ↓
Serverless Function
    ↓
    Returns: JSON data
    ↓
Frontend
    ↓
    Displays predictions
```

## Security Benefits

1. **API key never exposed** to browser/client code
2. **Server-side only** - key stays on Vercel servers
3. **No client-side risk** - even if someone inspects the code, they can't see the key
4. **Vercel handles security** - environment variables are encrypted

## Troubleshooting

### "OpenAI API key not configured on server"

- Make sure you added `OPENAI_API_KEY` (not `VITE_OPENAI_API_KEY`) in Vercel
- Redeploy your application after adding the environment variable
- Check that the environment variable is set for the correct environment (Production/Preview/Development)

### Local Development Not Working

- Create `.env.local` file in project root
- Add `OPENAI_API_KEY=your_key_here`
- Restart your dev server
- The serverless function will work locally with Vercel CLI or similar

## Migration from Old Setup

If you previously used `VITE_OPENAI_API_KEY`:

1. ✅ **Remove** `VITE_OPENAI_API_KEY` from Vercel environment variables
2. ✅ **Add** `OPENAI_API_KEY` instead
3. ✅ **Delete** any `.env` file with `VITE_OPENAI_API_KEY`
4. ✅ **Redeploy** your application

The code has been updated to use the secure serverless function approach.

