# Local Development Setup for AI Prediction

## The Issue

The `/api/analyze-image` endpoint is a Vercel serverless function. In local development with `npm run dev` (Vite), this endpoint doesn't exist, causing a 404 error.

## Solutions

### Option 1: Use Vercel CLI (Recommended)

1. **Install Vercel CLI globally:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project (optional, for first time):**
   ```bash
   vercel link
   ```

4. **Set environment variable locally:**
   Create `.env.local` file:
   ```env
   OPENAI_API_KEY=your_api_key_here
   ```

5. **Run with Vercel Dev:**
   ```bash
   vercel dev
   ```
   
   This will:
   - Start Vite dev server on port 3000 (or next available)
   - Enable serverless functions at `/api/*`
   - Use your local `.env.local` for environment variables

6. **Access the app:**
   Open `http://localhost:3000` (or the port Vercel shows)

### Option 2: Deploy to Vercel (Production)

1. **Deploy your project:**
   ```bash
   vercel
   ```

2. **Add environment variable in Vercel Dashboard:**
   - Go to your project → Settings → Environment Variables
   - Add `OPENAI_API_KEY` with your key
   - Redeploy

3. **Use the deployed URL:**
   The AI feature will work on your deployed Vercel URL.

### Option 3: Development Proxy (Alternative)

If you want to use regular `npm run dev`, you can set up a proxy, but this requires running a separate server for the API endpoint.

## Quick Fix for Testing

If you just want to test locally without Vercel CLI:

1. The code now tries `http://localhost:3000/api/analyze-image` in development mode
2. You can run `vercel dev` in a separate terminal
3. Or deploy to Vercel and test there

## Troubleshooting

### "API endpoint not found" Error

- **Solution**: Use `vercel dev` instead of `npm run dev`
- Or deploy to Vercel and test on the deployed URL

### "OpenAI API key not configured" Error

- Make sure you have `.env.local` with `OPENAI_API_KEY`
- Or set it in Vercel Dashboard if deployed

### Port Conflicts

- Vercel CLI uses port 3000 by default
- If port 3000 is busy, Vercel will use the next available port
- Update the `apiUrl` in `AIPredictionPage.jsx` if needed

## Recommended Workflow

1. **Development**: Use `vercel dev` for full functionality
2. **Production**: Deploy to Vercel with environment variables set
3. **Testing**: The main predictor (Excel upload) works with `npm run dev` without any API

