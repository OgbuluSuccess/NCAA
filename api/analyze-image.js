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

    const prompt = `You are analyzing a screenshot of NCAA basketball team statistics. Extract the following data for TWO teams (Team 1 and Team 2) and return ONLY a valid JSON object with this exact structure. Use the v2.0 prediction model specification I provided.

Return JSON in this format:
{
  "team1": {
    "team": "Team Name",
    "ppg": 82.5,
    "pointsAllowed": 70.2,
    "defenseRank": 60,
    "fieldGoalPct": 0.47,
    "threePointPct": 0.38,
    "freeThrowPct": 0.75,
    "ppgRank": 120,
    "netRank": 45,
    "homeRecord": {"wins": 5, "losses": 1},
    "awayRecord": {"wins": 2, "losses": 3},
    "neutralRecord": {"wins": 1, "losses": 0},
    "winStreak": 3,
    "lossStreak": 0,
    "last5PPG": 85.0,
    "firstHalfPPG": 39.5
  },
  "team2": {
    "team": "Team Name",
    "ppg": 75.0,
    "pointsAllowed": 74.0,
    "defenseRank": 180,
    "fieldGoalPct": 0.44,
    "threePointPct": 0.34,
    "freeThrowPct": 0.70,
    "ppgRank": 220,
    "netRank": 120,
    "homeRecord": {"wins": 4, "losses": 1},
    "awayRecord": {"wins": 2, "losses": 3},
    "neutralRecord": {"wins": 0, "losses": 1},
    "winStreak": 0,
    "lossStreak": 2,
    "last5PPG": 72.0,
    "firstHalfPPG": 36.0
  },
  "gameContext": {
    "isConferenceGame": false,
    "team1Location": "home",
    "daysRest": 2,
    "travelDistance": 0
  }
}

If any data is missing, use reasonable defaults:
- defenseRank: 150 (average)
- fieldGoalPct: 0.45
- threePointPct: 0.35
- freeThrowPct: 0.70
- ppgRank: 200
- netRank: 150
- homeRecord/awayRecord/neutralRecord: {"wins": 0, "losses": 0} if missing
- winStreak/lossStreak: 0 if missing
- last5PPG: use ppg if missing
- firstHalfPPG: ppg * 0.48 if missing

Return ONLY the JSON, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
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
        max_tokens: 2000,
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

