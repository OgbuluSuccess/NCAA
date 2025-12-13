/**
 * Vercel Serverless Function
 * Handles OpenAI API calls server-side to protect API key
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    // Get API key from server-side environment variable (not VITE_)
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    const prompt = `You are analyzing a screenshot of NCAA basketball team statistics. The image shows statistical tables for TWO teams. Extract data for BOTH teams and return ONLY valid JSON.

This data will be used with the NCAA Basketball Prediction Model v2.2. Do NOT invent new modeling rules. Your job is extraction + validation only.

CRITICAL INSTRUCTIONS:
1. Look for TWO separate team tables/sections in the image
2. Each table has columns: Statistic, National Rank, Conference Rank, Value, National Leader, Conference Leader
3. Extract the "Value" column for each statistic (NOT the rank)
4. Extract the "National Rank" for ranking-based fields

DATA EXTRACTION GUIDE:
- "Scoring Offense" row → Extract the "Value" column → This is "ppg" (points per game)
- "Scoring Defense" row → Extract the "Value" column → This is "pointsAllowed" 
- "Scoring Defense" row → Extract the "National Rank" column → This is "defenseRank"
- "Scoring Offense" row → Extract the "National Rank" column → This is "ppgRank"
- "Field Goal Percentage" row → Extract "Value" → Convert to decimal (divide by 100) → "fieldGoalPct"
- "Three Point Percentage" row → Extract "Value" → Convert to decimal → "threePointPct"
- "Free Throw Percentage" row → Extract "Value" → Convert to decimal → "freeThrowPct"
- "Winning Percentage" row → Extract "Value" → Convert to decimal → Use to calculate win/loss record
- Look for team name in headers or table titles
- Look for NET Ranking or KenPom ranking if visible
- Look for records (W-L format) if visible in the image
- Look for recent game results or streaks if visible

IMPORTANT:
- If you see percentage values like "76.7", convert to decimal: 0.767
- If you see "41.3" for Field Goal %, that's already a percentage, convert to 0.413
- Extract ACTUAL VALUES, not ranks (except for defenseRank and ppgRank which ARE ranks)
- If the table shows multiple teams, identify which two teams are being compared
- If only one team table is visible, you may need to look for opponent data elsewhere in the image

MODEL v2.2 CONTEXT (CRITICAL SPECIFICATIONS):
- Defensive tiers: Elite 1-30, Very Good 31-70, Good 71-110, Average 111-180 (minimal impact), Below Avg 181-250, Poor 251-320, Terrible 321-363
- Two Good Defenses rule only applies if BOTH teams are 1-70 (NOT 1-100)
- Location (home/away/neutral) is MANDATORY in v2.2: identify from arena, @ symbol, schedule context if present
- Pace adjustments are scaled down ~35% (0.65-0.70 of v2.0)
- Close Game Bonus exists in v2.2 (margin <5 adds +6 to +8 to total) — you do not compute it, just ensure required inputs exist
- Conference game penalty exists — try to extract conference if visible
- Bottom 10 extreme mismatch rules exist — ensure NET rank is extracted if visible

Return JSON in this exact format:
{
  "validated": true,
  "warnings": [],
  "corrections": [],
  "team1": {
    "team": "Exact Team Name from Image",
    "ppg": 84.3,
    "pointsAllowed": 80.3,
    "defenseRank": 316,
    "fieldGoalPct": 0.48,
    "threePointPct": 0.383,
    "freeThrowPct": 0.689,
    "ppgRank": 78,
    "netRank": 150,
    "homeRecord": {"wins": 0, "losses": 0},
    "awayRecord": {"wins": 0, "losses": 0},
    "neutralRecord": {"wins": 0, "losses": 0},
    "winStreak": 0,
    "lossStreak": 0,
    "last5PPG": 84.3,
    "firstHalfPPG": 40.5
  },
  "team2": {
    "team": "Exact Team Name from Image",
    "ppg": 69.1,
    "pointsAllowed": 88.4,
    "defenseRank": 355,
    "fieldGoalPct": 0.413,
    "threePointPct": 0.299,
    "freeThrowPct": 0.767,
    "ppgRank": 322,
    "netRank": 350,
    "homeRecord": {"wins": 0, "losses": 0},
    "awayRecord": {"wins": 0, "losses": 0},
    "neutralRecord": {"wins": 0, "losses": 0},
    "winStreak": 0,
    "lossStreak": 0,
    "last5PPG": 69.1,
    "firstHalfPPG": 33.2
  },
  "gameContext": {
    "isConferenceGame": false,
    "team1Location": "home",
    "daysRest": 2,
    "travelDistance": 0
  }
}

DEFAULTS (only use if data truly not visible):
- team name: If team name cannot be identified, use "Team 1" for team1 and "Team 2" for team2 (NEVER use "Unknown Team")
- team1Location: MUST be one of "home" | "away" | "neutral". If not visible, set "neutral" and add a warning starting with "ERROR:"
- defenseRank: Use "Scoring Defense" National Rank if available, else 150
- fieldGoalPct: Extract from "Field Goal Percentage" Value, convert % to decimal
- threePointPct: Extract from "Three Point Percentage" Value, convert % to decimal  
- freeThrowPct: Extract from "Free Throw Percentage" Value, convert % to decimal
- ppgRank: Use "Scoring Offense" National Rank
- netRank: Look for NET ranking, else estimate from other ranks, else 150
- Records: Look for W-L records in image, else {"wins": 0, "losses": 0}
- winStreak/lossStreak: Look for recent results, else 0
- last5PPG: Use ppg if not visible
- firstHalfPPG: ppg * 0.48 if not visible

VALIDATION NOTES:
- If any REQUIRED field is missing (PPG, pointsAllowed, defenseRank, FG%, 3PT%, NET rank, overall record, location): add a warning entry starting with "ERROR:"
- If you convert any percentage (e.g., 47.5 -> 0.475), add an entry to corrections describing what you changed

Return ONLY the JSON object, no markdown, no explanations, no other text.`;

    const openaiModel = process.env.OPENAI_MODEL || 'gpt-5.2';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_completion_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Failed to process image with AI' 
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.startsWith('```')) {
      jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const extracted = JSON.parse(jsonStr);

    return res.status(200).json({ success: true, data: extracted });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

