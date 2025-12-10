/**
 * Vercel Serverless Function
 * Handles OpenAI API calls for analyzing manual input data
 * Sends data + model info to AI for analysis, then returns validated/enhanced data
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { teamData, modelVersion } = req.body;

    if (!teamData || !teamData.team1 || !teamData.team2) {
      return res.status(400).json({ error: 'Team data is required' });
    }

    // Get API key from server-side environment variable
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured on server' });
    }

    const modelInfo = modelVersion || 'v2.2';
    
    const prompt = `You are analyzing NCAA basketball team statistics data that will be used with the ${modelInfo} prediction model.

YOUR TASK:
1. Validate the provided team data for completeness and accuracy
2. Identify any missing or potentially incorrect values
3. Suggest improvements or corrections if needed
4. Ensure data is in the correct format for the ${modelInfo} model
5. Return validated and enhanced data in the exact same JSON format

MODEL CONTEXT (${modelInfo}):
- Uses defensive classification: Elite (1-30), Very Good (31-70), Good (71-110), Average (111-180)
- "Two Good Defenses" rule applies when both teams are Top 70 (not Top 100)
- Home/Away location is critical - must be identified correctly
- Close game bonus applies when margin <5 points
- Pace adjustments are scaled down by 35%

DATA VALIDATION RULES:
- PPG should be between 40-120
- Defense Rank should be between 1-363
- Field Goal %, Three Point %, Free Throw % should be decimals (0.0-1.0)
- NET Rank should be between 1-363
- Records should have wins and losses as numbers
- Win/Loss streaks should be non-negative integers

IMPORTANT:
- If data looks incorrect, suggest corrections but keep original structure
- Fill in missing fields with reasonable defaults based on available data
- Validate that percentages are in decimal format (not percentage format)
- Ensure team names are clear and identifiable
- Check that game context (home/away/neutral) is correctly specified

Input Data:
${JSON.stringify(teamData, null, 2)}

Return ONLY valid JSON in this exact format (same structure as input):
{
  "team1": {
    "team": "Validated Team Name",
    "ppg": 84.3,
    "pointsAllowed": 80.3,
    "defenseRank": 316,
    "fieldGoalPct": 0.48,
    "threePointPct": 0.383,
    "freeThrowPct": 0.689,
    "ppgRank": 78,
    "netRank": 150,
    "homeRecord": {"wins": 5, "losses": 2},
    "awayRecord": {"wins": 3, "losses": 4},
    "neutralRecord": {"wins": 1, "losses": 0},
    "winStreak": 2,
    "lossStreak": 0,
    "last5PPG": 84.3,
    "firstHalfPPG": 40.5
  },
  "team2": {
    "team": "Validated Team Name",
    "ppg": 69.1,
    "pointsAllowed": 88.4,
    "defenseRank": 355,
    "fieldGoalPct": 0.413,
    "threePointPct": 0.299,
    "freeThrowPct": 0.767,
    "ppgRank": 322,
    "netRank": 350,
    "homeRecord": {"wins": 2, "losses": 5},
    "awayRecord": {"wins": 1, "losses": 6},
    "neutralRecord": {"wins": 0, "losses": 1},
    "winStreak": 0,
    "lossStreak": 3,
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

Return ONLY the JSON object, no markdown, no explanations, no other text.`;

    console.log(`🤖 Calling AI to analyze manual input data for ${modelInfo} model...`);

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
            role: 'system',
            content: `You are an expert NCAA basketball data analyst. You validate and enhance team statistics data for use with prediction models. You always return valid JSON in the exact format requested.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Failed to analyze data with AI' 
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    if (content.startsWith('```')) {
      jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const analyzed = JSON.parse(jsonStr);

    console.log('✅ AI analysis complete');

    return res.status(200).json({ success: true, data: analyzed });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error' 
    });
  }
}

