/**
 * NCAA Basketball Match Prediction Engine
 * Uses a weighted algorithm: Scoring Power (40%) + Win History (40%) + National Ranking (20%)
 */

/**
 * Calculate match prediction between two teams
 * @param {Object} team1 - First team data
 * @param {Object} team2 - Second team data
 * @returns {Object} Prediction results
 */
export const calculateMatchPrediction = (team1, team2) => {
  try {
    // Validate input data
    if (!team1 || !team2) {
      throw new Error('Both teams are required for prediction');
    }
    
    if (!team1.pointsPerGame || !team2.pointsPerGame || 
        team1.winRate === undefined || team2.winRate === undefined ||
        !team1.rank || !team2.rank) {
      throw new Error('Incomplete team data for prediction');
    }
    
    // Calculate individual factors
    const scoringFactor = calculateScoringFactor(team1, team2);
    const winRateFactor = calculateWinRateFactor(team1, team2);
    const rankingFactor = calculateRankingFactor(team1, team2);
    
    // Calculate total probability (base 50% + weighted factors)
    const team1Probability = Math.max(5, Math.min(95, 
      50 + scoringFactor + winRateFactor + rankingFactor
    ));
    const team2Probability = 100 - team1Probability;
    
    // Calculate predicted scores
    const team1PredictedScore = calculatePredictedScore(team1, team2Probability);
    const team2PredictedScore = calculatePredictedScore(team2, team1Probability);
    
    // Determine winner
    const winner = team1Probability > team2Probability ? team1 : team2;
    const winnerProbability = Math.max(team1Probability, team2Probability);
    
    // Calculate confidence level
    const confidence = calculateConfidence(Math.abs(team1Probability - team2Probability));
    
    return {
      team1: {
        ...team1,
        winProbability: Math.round(team1Probability * 10) / 10,
        predictedScore: team1PredictedScore,
        isWinner: team1Probability > team2Probability
      },
      team2: {
        ...team2,
        winProbability: Math.round(team2Probability * 10) / 10,
        predictedScore: team2PredictedScore,
        isWinner: team2Probability > team1Probability
      },
      winner: {
        team: winner.team,
        probability: Math.round(winnerProbability * 10) / 10,
        confidence: confidence
      },
      factors: {
        scoring: Math.round(scoringFactor * 10) / 10,
        winRate: Math.round(winRateFactor * 10) / 10,
        ranking: Math.round(rankingFactor * 10) / 10
      },
      predictedScoreDifference: Math.abs(team1PredictedScore - team2PredictedScore)
    };
    
  } catch (error) {
    console.error('Error calculating prediction:', error);
    throw new Error(`Prediction calculation failed: ${error.message}`);
  }
};

/**
 * Calculate scoring power factor (40% weight)
 * Based on points per game difference
 */
const calculateScoringFactor = (team1, team2) => {
  const ppgDiff = team1.pointsPerGame - team2.pointsPerGame;
  const maxPpg = Math.max(team1.pointsPerGame, team2.pointsPerGame);
  
  // Normalize the difference and apply 40% weight
  return (ppgDiff / maxPpg) * 40;
};

/**
 * Calculate win rate factor (40% weight)
 * Based on win percentage difference
 */
const calculateWinRateFactor = (team1, team2) => {
  const winRateDiff = team1.winRate - team2.winRate;
  
  // Apply 40% weight directly to win rate difference
  return winRateDiff * 40;
};

/**
 * Calculate ranking factor (20% weight)
 * Lower rank number is better (rank 1 is best)
 */
const calculateRankingFactor = (team1, team2) => {
  const rankDiff = team2.rank - team1.rank; // Positive if team1 has better rank
  
  // Normalize by total teams (355) and apply 20% weight
  return (rankDiff / 355) * 20;
};

/**
 * Calculate predicted score for a team
 * Adjusts team's average PPG based on opponent's win probability
 */
const calculatePredictedScore = (team, opponentProbability) => {
  // Adjust score based on opponent strength
  // If opponent has high probability, reduce this team's expected score
  const adjustment = (opponentProbability - 50) * 0.15;
  const predictedScore = team.pointsPerGame - adjustment;
  
  // Ensure reasonable score bounds (40-120 points)
  return Math.max(40, Math.min(120, Math.round(predictedScore)));
};

/**
 * Calculate confidence level based on probability difference
 */
const calculateConfidence = (probabilityDiff) => {
  if (probabilityDiff >= 30) return 'Very High';
  if (probabilityDiff >= 20) return 'High';
  if (probabilityDiff >= 10) return 'Medium';
  if (probabilityDiff >= 5) return 'Low';
  return 'Very Low';
};

/**
 * Get prediction summary text
 */
export const getPredictionSummary = (prediction) => {
  const { winner, factors } = prediction;
  const dominantFactor = getDominantFactor(factors);
  
  return {
    headline: `${winner.team} predicted to win with ${winner.probability}% confidence`,
    summary: `This prediction is primarily driven by ${dominantFactor.name} (${dominantFactor.value > 0 ? '+' : ''}${dominantFactor.value}% advantage)`,
    confidence: winner.confidence
  };
};

/**
 * Determine which factor has the most influence
 */
const getDominantFactor = (factors) => {
  const factorList = [
    { name: 'scoring power', value: factors.scoring },
    { name: 'win history', value: factors.winRate },
    { name: 'national ranking', value: factors.ranking }
  ];
  
  return factorList.reduce((max, current) => 
    Math.abs(current.value) > Math.abs(max.value) ? current : max
  );
};

/**
 * Validate team data for prediction
 */
export const validateTeamData = (team) => {
  const requiredFields = ['team', 'rank', 'pointsPerGame', 'winRate', 'wins', 'losses'];
  
  for (const field of requiredFields) {
    if (team[field] === undefined || team[field] === null) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  // Validate data ranges
  if (team.rank < 1 || team.rank > 355) {
    throw new Error('Team rank must be between 1 and 355');
  }
  
  if (team.pointsPerGame < 0 || team.pointsPerGame > 200) {
    throw new Error('Points per game must be between 0 and 200');
  }
  
  if (team.winRate < 0 || team.winRate > 1) {
    throw new Error('Win rate must be between 0 and 1');
  }
  
  return true;
};