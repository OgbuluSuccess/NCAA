# AI-Powered Prediction Setup Guide

## ⚠️ SECURITY UPDATE

**The API key is now handled server-side only for security!**

- ✅ **Vercel**: Use `OPENAI_API_KEY` (NOT `VITE_OPENAI_API_KEY`) in Vercel environment variables
- ✅ **Local Dev**: Create `.env.local` with `OPENAI_API_KEY=your_key`
- ✅ **Never exposed** to browser - completely secure

See `SECURE_SETUP.md` for detailed instructions.

## Overview

The AI-Powered Prediction feature allows you to upload a screenshot of team statistics, and the AI will:
1. Read and extract data from the image using ChatGPT's vision API (via secure serverless function)
2. Use the v2.0 prediction model (exact specification) to generate predictions
3. Also run the local enhanced prediction model on the same data
4. Display both predictions side-by-side for comparison

## Setup Instructions

### For Vercel Deployment (Recommended)

1. **Get OpenAI API Key**
   - Go to [OpenAI Platform](https://platform.openai.com/api-keys)
   - Create a new secret key

2. **Add to Vercel Environment Variables**
   - Go to your Vercel project → Settings → Environment Variables
   - Add: `OPENAI_API_KEY` (NOT `VITE_OPENAI_API_KEY`)
   - Value: Your API key
   - Environment: All (Production, Preview, Development)
   - Click Save

3. **Redeploy**
   - The serverless function at `/api/analyze-image.js` will handle all API calls securely

### For Local Development

1. **Create `.env.local` file** (not `.env`):
   ```bash
   OPENAI_API_KEY=your_api_key_here
   ```

2. **Install Vercel CLI** (for local serverless functions):
   ```bash
   npm install -g vercel
   ```

3. **Run with Vercel Dev**:
   ```bash
   vercel dev
   ```

   Or use your regular dev server if you have a proxy setup.

## Usage

1. **Navigate to AI Prediction Page**:
   - Click the "Try AI-Powered Prediction" button on the main page

2. **Upload Screenshot**:
   - Take a screenshot of team statistics from any source
   - Click the upload area
   - Select your image file (PNG, JPG, etc.)

3. **Analyze**:
   - Click "Analyze with AI" button
   - Wait for processing (AI reads the image and extracts data)

4. **View Results**:
   - **AI Prediction (v2.0 Model)**: Uses the exact v2.0 specification
   - **Local Prediction**: Uses the enhanced local model
   - **Comparison**: See how both models compare

## What the AI Extracts

The AI extracts the following data for both teams:

- Team name
- Points per game (PPG)
- Points allowed per game
- Defense ranking
- Field goal percentage
- Three-point percentage
- Free throw percentage
- Home/Away/Neutral records
- Win/Loss streaks
- Recent form (last 5 games)
- NET ranking
- Game context (conference game, location, etc.)

## Model Specifications

### v2.0 Model (AI Prediction)

Uses the exact v2.0 specification with:
- 10-step calculation process
- Defense quality adjustments (most critical)
- Conference game penalties
- Blowout cruise control
- Elite offense/defense caps
- First half projections

### Local Enhanced Model

Uses the enhanced local prediction engine with:
- Scoring power (40%)
- Win history (40%)
- National ranking (20%)
- Advanced metrics adjustment

## Troubleshooting

### "OpenAI API key not found" Error

- Make sure you created a `.env` file in the project root
- Verify the key is named exactly: `VITE_OPENAI_API_KEY`
- Restart the development server after adding the key

### "Failed to process image" Error

- Check your API key is valid
- Verify you have credits in your OpenAI account
- Ensure the image is clear and contains readable statistics
- Try a different image format

### API Rate Limits

- Free tier has rate limits
- If you hit limits, wait a few minutes and try again
- Consider upgrading your OpenAI plan for higher limits

## Cost Considerations

- OpenAI API charges per image processed
- Model pricing: Check [OpenAI Pricing](https://openai.com/pricing) (default configured model: `gpt-5.2`, override with `OPENAI_MODEL`)
- Each prediction uses 1 API call
- Monitor your usage in OpenAI dashboard

## Notes

- The AI feature is optional - the main predictor works without it
- Both models use the same extracted data for fair comparison
- The v2.0 model follows the exact specification provided
- Results may vary based on image quality and data clarity

