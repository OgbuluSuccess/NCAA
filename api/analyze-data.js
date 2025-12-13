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

    const prompt = `You are analyzing NCAA basketball team statistics data that will be used with the ${modelInfo} prediction model (v2.2).

YOUR TASK:
1. Validate the provided team data for completeness and accuracy
2. Identify any missing or potentially incorrect values
3. Suggest improvements or corrections if needed
4. Ensure data is in the correct format for the ${modelInfo} v2.2 model
5. Return validated and enhanced data in the exact same JSON format

MODEL v2.2 CONTEXT (CRITICAL SPECIFICATIONS):

DEFENSIVE CLASSIFICATION (v2.2 - CHANGED FROM v2.0):
- Elite: 1-30 (Top 8%)
- Very Good: 31-70 (Top 19%)
- Good: 71-110 (Top 30%)
- Average: 111-180 (Middle 50%) - MINIMAL impact on scoring
- Below Average: 181-250
- Poor: 251-320
- Terrible: 321-363

TWO GOOD DEFENSES RULE (v2.2 - CRITICAL CHANGE):
- Applies ONLY when BOTH teams ranked 1-70 (NOT 1-100 as in v2.0)
- Penalty: -10 to -12 total points
- If both ranked 71-110: Only -5 to -7 penalty
- If both ranked 111-180 (Average): NO PENALTY

STEP 0 - MANDATORY LOCATION IDENTIFICATION:
- Home/away/neutral MUST be identified BEFORE any calculations
- This is non-negotiable in v2.2
- Check arena name, schedule, @ symbols
- Location impacts are enhanced: Home +2 to +4, Away -2 to -7

PACE ADJUSTMENTS (v2.2 - SCALED DOWN):
- All pace adjustments reduced by ~35% from v2.0
- Use 0.65-0.70 multiplier on base pace values
- Pace creates possessions but doesn't guarantee points

CLOSE GAME BONUS (v2.2 - NEW):
- If preliminary margin <5 points: Add +6 to +8 to TOTAL
- Accounts for late-game fouling and increased possessions
- Split evenly between teams or favor home team slightly

CONFERENCE GAME PENALTY:
- If same conference: Apply -10 to -12 to total
- Teams know each other, tighter defense

CRUISE CONTROL (BLOWOUT):
- If margin 20-24: Reduce winner by -7 to -10
- If margin 25-29: Reduce winner by -10 to -12
- If margin 30-34: Reduce winner by -12 to -15
- If margin 35+: Reduce winner by -15 to -18
- EXCEPTION: No cruise vs Bottom 10 teams (#356-365)

BOTTOM 10 EXTREME MISMATCH (v2.1):
- Opponents ranked #356-365 have special rules
- Winner: No cruise control, allow 100-115 points, remove caps
- Bottom 10 team: Floor at 45-55 points, apply -10 to -15 collapse penalty

AVERAGE DEFENSE IMPACT (v2.2 KEY INSIGHT):
- Average defenses (#111-180) have MINIMAL scoring impact
- Elite offense vs average defense: 0 to +2 adjustment (not -5)
- Average offense vs average defense: -3 to -1 adjustment
- Do NOT suppress scoring heavily for #111-180 ranked defenses

DATA VALIDATION RULES:
- PPG: 40-120 (typical range)
- Defense Rank: 1-363
- Field Goal %, 3PT %, FT %: Must be decimals 0.0-1.0 (not percentage 0-100)
- NET Rank: 1-363
- Records: W and L as non-negative integers
- Win/Loss Streak: Non-negative integer (0 = no streak)
- Home/Away/Neutral: Must be one of these three (REQUIRED)
- Arena/Venue: String (helps identify home team)
- Conference: String (for conference game check)
- Last 5 Games: Array of W/L (to calculate recent form)

REQUIRED FIELDS (MUST HAVE):
- PPG (Points Per Game)
- Points Allowed Per Game
- Defense Rank (1-363)
- Field Goal %
- 3-Point %
- NET Rank
- Overall Record (W-L)
- Home Record (W-L) OR Away Record (W-L)
- Game Location (home/away/neutral)

OPTIONAL BUT RECOMMENDED:
- Last 5 Games results
- Current win/loss streak
- Free Throw %
- Pace/Possessions per game
- Conference affiliation
- Days of rest

VALIDATION CHECKS:
1. Ensure team names are identifiable (not "Unknown" or blank). If missing/unknown, use "Team 1" and "Team 2".
2. Verify percentages are in decimal format (0.450 not 45.0). If wrong, convert and record in corrections.
3. Check defense rank is reasonable for points allowed
4. Confirm NET rank aligns with record (good record = low NET)
5. Validate home/away/neutral location is specified (MANDATORY in v2.2)
6. Check for consistency: Strong defense (#1-70) should have low PPG allowed
7. Verify FG% is realistic (0.35-0.55 typical range)

ERROR HANDLING:
- If critical data missing (PPG, Defense Rank, Location): add a warning entry that starts with "ERROR:"
- If optional data missing: use reasonable defaults or mark as "estimated" and add warnings
- If data looks incorrect: suggest correction with reasoning (and record in corrections)

OUTPUT FORMAT (STRICT):
- Return the same JSON structure as input (team1/team2/gameContext)
- Add top-level fields: "validated": true/false, "warnings": [], "corrections": []
- Maintain all original fields even if not used by model
- DO NOT add any new modeling rules outside of v2.2 (do not invent extra steps)

Input Data:
${JSON.stringify(teamData, null, 2)}

Return ONLY valid JSON. No markdown. No explanations. No extra text.`;

    console.log(`🤖 Calling AI to analyze manual input data for ${modelInfo} model...`);

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
            role: 'system',
            content: `You are an expert NCAA basketball data analyst. You validate and enhance team statistics data for use with prediction models. You always return valid JSON in the exact format requested.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_completion_tokens: 2000,
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


