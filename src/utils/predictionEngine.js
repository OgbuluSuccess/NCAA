/**
 * NCAA Basketball Match Prediction Engine
 * 
 * ENHANCED CALCULATION LOGIC:
 * 
 * Base Formula: Team1 Win Probability = 50% + Scoring Factor + Win Rate Factor + Ranking Factor + Advanced Adjustment
 * 
 * BASE FACTORS (100% total weight):
 * - Scoring Power: 40% (based on PPG difference)
 * - Win History: 40% (based on win rate difference)
 * - National Ranking: 20% (based on rank difference)
 * 
 * ADVANCED ADJUSTMENT:
 * - Uses all available statistics from Data folder files
 * - Each metric contributes a calculated adjustment
 * - Total adjustment is bounded based on data quality (number of metrics available)
 * - More metrics = higher allowed adjustment (max 10-15%)
 * 
 * See PREDICTION_LOGIC.md for detailed calculation examples and formulas
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
    
    if (!team1.team || !team2.team) {
      throw new Error('Both teams must have a team name');
    }
    
    if (!team1.pointsPerGame || !team2.pointsPerGame) {
      throw new Error('Both teams need points per game (PPG). Please upload a Scoring Offense file or ensure PPG data is available.');
    }
    
    // Warn if teams have very limited data
    const team1DataPoints = countAvailableMetrics(team1);
    const team2DataPoints = countAvailableMetrics(team2);
    
    if (team1DataPoints < 3 || team2DataPoints < 3) {
      console.warn(`Limited data available: Team1 has ${team1DataPoints} metrics, Team2 has ${team2DataPoints} metrics. Prediction may be less accurate.`);
    }
    
    // Neutral fallbacks when rank/winRate are missing (supports metric-only datasets)
    const enrichedTeam1 = {
      ...team1,
      rank: team1.rank ?? 178,
      winRate: team1.winRate ?? 0.5
    };
    const enrichedTeam2 = {
      ...team2,
      rank: team2.rank ?? 178,
      winRate: team2.winRate ?? 0.5
    };
    
    // Calculate individual factors
    // Each factor returns a percentage adjustment (can be positive or negative)
    const scoringFactor = calculateScoringFactor(enrichedTeam1, enrichedTeam2);      // 40% weight
    const winRateFactor = calculateWinRateFactor(enrichedTeam1, enrichedTeam2);        // 40% weight
    const rankingFactor = calculateRankingFactor(enrichedTeam1, enrichedTeam2);      // 20% weight
    const advancedAdjustment = calculateAdvancedAdjustment(enrichedTeam1, enrichedTeam2); // Bounded adjustment
    
    // Calculate total probability (base 50% + weighted factors)
    // Formula: 50% (neutral) + scoring + winRate + ranking + advanced metrics
    // Bounded between 5% and 95% to prevent unrealistic predictions
    const team1Probability = Math.max(5, Math.min(95, 
      50 + scoringFactor + winRateFactor + rankingFactor + advancedAdjustment
    ));
    const team2Probability = 100 - team1Probability;
    
    // Calculate predicted scores
    const team1PredictedScore = calculatePredictedScore(enrichedTeam1, team2Probability);
    const team2PredictedScore = calculatePredictedScore(enrichedTeam2, team1Probability);
    
    // Calculate first half scores (typically 45-48% of total score in college basketball)
    const firstHalfPercentage = 0.47; // Average percentage of points scored in first half
    const team1FirstHalfScore = Math.round(team1PredictedScore * firstHalfPercentage);
    const team2FirstHalfScore = Math.round(team2PredictedScore * firstHalfPercentage);
    
    // Determine winner
    const winner = team1Probability > team2Probability ? enrichedTeam1 : enrichedTeam2;
    const winnerProbability = Math.max(team1Probability, team2Probability);
    
    // Calculate confidence level
    const confidence = calculateConfidence(Math.abs(team1Probability - team2Probability));
    
    return {
      team1: {
        ...enrichedTeam1,
        winProbability: Math.round(team1Probability * 10) / 10,
        predictedScore: team1PredictedScore,
        firstHalfScore: team1FirstHalfScore,
        isWinner: team1Probability > team2Probability
      },
      team2: {
        ...enrichedTeam2,
        winProbability: Math.round(team2Probability * 10) / 10,
        predictedScore: team2PredictedScore,
        firstHalfScore: team2FirstHalfScore,
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
        ranking: Math.round(rankingFactor * 10) / 10,
        advanced: Math.round(advancedAdjustment * 10) / 10
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
  const winRate1 = team1.winRate ?? 0.5;
  const winRate2 = team2.winRate ?? 0.5;
  const winRateDiff = winRate1 - winRate2;
  
  // Apply 40% weight directly to win rate difference
  return winRateDiff * 40;
};

/**
 * Calculate ranking factor (20% weight)
 * Lower rank number is better (rank 1 is best)
 */
const calculateRankingFactor = (team1, team2) => {
  const rank1 = team1.rank ?? 178;
  const rank2 = team2.rank ?? 178;
  const rankDiff = rank2 - rank1; // Positive if team1 has better rank
  
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
    { name: 'national ranking', value: factors.ranking },
    { name: 'advanced metrics', value: factors.advanced }
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

/**
 * ADVANCED METRICS ADJUSTMENT
 * 
 * This function calculates adjustments based on detailed statistics from your Data folder.
 * Each metric contributes to the final adjustment, which is then bounded to prevent
 * overpowering the base model.
 * 
 * Calculation Process:
 * 1. For each available metric, calculate the difference between teams
 * 2. Multiply by a weight factor (determined by metric importance)
 * 3. Sum all contributions
 * 4. Apply dynamic bounds based on number of metrics used
 * 
 * @param {Object} team1 - First team with all available metrics
 * @param {Object} team2 - Second team with all available metrics
 * @returns {number} Adjustment percentage (-15 to +15, depending on data quality)
 */
const calculateAdvancedAdjustment = (team1, team2) => {
  let adj = 0;           // Cumulative adjustment
  let metricsUsed = 0;   // Track how many metrics are available

  // eFG% advantage (decimal 0-1) - Shooting efficiency
  if (team1.effectiveFgPct != null && team2.effectiveFgPct != null) {
    const diff = (team1.effectiveFgPct - team2.effectiveFgPct);
    adj += diff * 60; // ~3 pts shift per 5% eFG advantage
    metricsUsed++;
  }

  // Turnover margin (higher is better) - Ball control
  if (team1.turnoverMargin != null && team2.turnoverMargin != null) {
    adj += (team1.turnoverMargin - team2.turnoverMargin) * 1.2; // ±~6 typical
    metricsUsed++;
  }

  // Turnovers per game (lower is better) - Ball security
  if (team1.turnoversPerGame != null && team2.turnoversPerGame != null) {
    adj += (team2.turnoversPerGame - team1.turnoversPerGame) * 0.6; // Increased weight
    metricsUsed++;
  }

  // Assist/Turnover ratio - Offensive efficiency
  if (team1.assistTurnoverRatio != null && team2.assistTurnoverRatio != null) {
    adj += (team1.assistTurnoverRatio - team2.assistTurnoverRatio) * 4; // ±~4
    metricsUsed++;
  }

  // Offensive boards advantage - Second chance points
  if (team1.offensiveReboundsPerGame != null && team2.offensiveReboundsPerGame != null) {
    adj += (team1.offensiveReboundsPerGame - team2.offensiveReboundsPerGame) * 0.9; // Slightly increased
    metricsUsed++;
  }

  // Free throws made per game advantage
  if (team1.freeThrowsMadePerGame != null && team2.freeThrowsMadePerGame != null) {
    adj += (team1.freeThrowsMadePerGame - team2.freeThrowsMadePerGame) * 0.5; // ±~5
    metricsUsed++;
  }

  // Expected FT points from FTA and FT% - Free throw efficiency
  if (
    team1.freeThrowAttemptsPerGame != null && team2.freeThrowAttemptsPerGame != null &&
    team1.freeThrowPercentage != null && team2.freeThrowPercentage != null
  ) {
    const ftPct1 = team1.freeThrowPercentage <= 1 ? team1.freeThrowPercentage : team1.freeThrowPercentage / 100;
    const ftPct2 = team2.freeThrowPercentage <= 1 ? team2.freeThrowPercentage : team2.freeThrowPercentage / 100;
    const ftPts1 = team1.freeThrowAttemptsPerGame * ftPct1 * 2;
    const ftPts2 = team2.freeThrowAttemptsPerGame * ftPct2 * 2;
    adj += (ftPts1 - ftPts2) * 0.2; // Increased weight for FT efficiency
    metricsUsed++;
  }

  // 3P volume + efficiency synergy - Three-point shooting impact
  if (
    team1.threePointAttemptsPerGame != null && team2.threePointAttemptsPerGame != null &&
    team1.threePointPercentage != null && team2.threePointPercentage != null
  ) {
    const tpct1 = team1.threePointPercentage <= 1 ? team1.threePointPercentage : team1.threePointPercentage / 100;
    const tpct2 = team2.threePointPercentage <= 1 ? team2.threePointPercentage : team2.threePointPercentage / 100;
    const made1 = team1.threePointAttemptsPerGame * tpct1;
    const made2 = team2.threePointAttemptsPerGame * tpct2;
    const pointsDiff = (made1 - made2) * 3;
    adj += pointsDiff * 0.1; // Increased weight for 3P impact
    metricsUsed++;
  }

  // 3P% advantage - Three-point accuracy
  if (team1.threePointPercentage != null && team2.threePointPercentage != null) {
    const tpct1 = team1.threePointPercentage <= 1 ? team1.threePointPercentage : team1.threePointPercentage / 100;
    const tpct2 = team2.threePointPercentage <= 1 ? team2.threePointPercentage : team2.threePointPercentage / 100;
    adj += (tpct1 - tpct2) * 65; // Slightly increased
    metricsUsed++;
  }

  // 3P% defense (lower is better) - Defensive three-point coverage
  if (team1.threePointPercentageDefense != null && team2.threePointPercentageDefense != null) {
    const d1 = team1.threePointPercentageDefense <= 1 ? team1.threePointPercentageDefense : team1.threePointPercentageDefense / 100;
    const d2 = team2.threePointPercentageDefense <= 1 ? team2.threePointPercentageDefense : team2.threePointPercentageDefense / 100;
    adj += (d2 - d1) * 45; // Increased weight for 3P defense
    metricsUsed++;
  }

  // Scoring defense (lower is better) - Overall defensive strength
  if (team1.scoringDefense != null && team2.scoringDefense != null) {
    adj += (team2.scoringDefense - team1.scoringDefense) * 0.5; // Increased weight
    metricsUsed++;
  }

  // Scoring margin - Overall team strength indicator
  if (team1.scoringMargin != null && team2.scoringMargin != null) {
    adj += (team1.scoringMargin - team2.scoringMargin) * 0.35; // Slightly increased
    metricsUsed++;
  }

  // Bench points - Depth advantage
  if (team1.benchPointsPerGame != null && team2.benchPointsPerGame != null) {
    adj += (team1.benchPointsPerGame - team2.benchPointsPerGame) * 0.2; // Increased weight
    metricsUsed++;
  }

  // Defensive disruption - Blocks and steals
  if (team1.blocksPerGame != null && team2.blocksPerGame != null) {
    adj += (team1.blocksPerGame - team2.blocksPerGame) * 0.7; // Increased
    metricsUsed++;
  }
  if (team1.stealsPerGame != null && team2.stealsPerGame != null) {
    adj += (team1.stealsPerGame - team2.stealsPerGame) * 0.7; // Increased
    metricsUsed++;
  }

  // DYNAMIC BOUNDING: Adjust max allowed adjustment based on data quality
  // More metrics = more reliable prediction = allow larger adjustments
  // - 8+ metrics: max ±15% adjustment (high confidence)
  // - 5-7 metrics: max ±12% adjustment (medium confidence)
  // - <5 metrics: max ±10% adjustment (lower confidence)
  const maxAdjustment = metricsUsed > 8 ? 15 : metricsUsed > 5 ? 12 : 10;
  
  // Bound the adjustment to avoid overpowering the base model
  // This ensures advanced metrics enhance but don't replace the base factors
  if (adj > maxAdjustment) adj = maxAdjustment;
  if (adj < -maxAdjustment) adj = -maxAdjustment;
  
  return adj;
};

/**
 * Count available metrics for a team (for data quality assessment)
 */
const countAvailableMetrics = (team) => {
  const metrics = [
    'effectiveFgPct', 'turnoverMargin', 'turnoversPerGame', 'assistTurnoverRatio',
    'offensiveReboundsPerGame', 'freeThrowAttemptsPerGame', 'freeThrowPercentage',
    'threePointAttemptsPerGame', 'threePointPercentage', 'threePointPercentageDefense',
    'scoringDefense', 'scoringMargin', 'benchPointsPerGame', 'blocksPerGame', 'stealsPerGame'
  ];
  
  return metrics.filter(m => team[m] != null && team[m] !== undefined).length;
};