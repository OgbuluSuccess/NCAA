/**
 * NCAA Basketball Prediction Model v2.0
 * Complete implementation of the v2.0 specification
 * DO NOT MODIFY - Use exactly as specified
 */

/**
 * Calculate prediction using v2.0 model
 * @param {Object} team1 - First team data
 * @param {Object} team2 - Second team data
 * @param {Object} gameContext - Game context (home/away, conference, etc.)
 * @returns {Object} Prediction results with full game and first half
 */
export const calculateV2Prediction = (team1, team2, gameContext = {}) => {
  try {
    // VALIDATION: Check required fields before proceeding
    if (!team1 || !team2) {
      throw new Error('Both teams are required for v2.0 prediction');
    }

    if (!team1.team || !team2.team) {
      throw new Error('Both teams must have a team name');
    }

    if (typeof team1.ppg !== 'number' || typeof team2.ppg !== 'number') {
      throw new Error('Both teams must have valid PPG (points per game) values');
    }

    if (typeof team1.pointsAllowed !== 'number' || typeof team2.pointsAllowed !== 'number') {
      throw new Error('Both teams must have valid pointsAllowed values');
    }

    if (typeof team1.defenseRank !== 'number' || typeof team2.defenseRank !== 'number') {
      throw new Error('Both teams must have valid defenseRank values');
    }

    // Validate numeric ranges
    if (team1.ppg < 0 || team1.ppg > 150 || team2.ppg < 0 || team2.ppg > 150) {
      throw new Error('PPG values must be between 0 and 150');
    }

    if (team1.defenseRank < 1 || team1.defenseRank > 363 || team2.defenseRank < 1 || team2.defenseRank > 363) {
      throw new Error('Defense rank must be between 1 and 363');
    }

    // STEP 1: Calculate Base Expected Points
    const team1Base = (team1.ppg + team2.pointsAllowed) / 2;
    const team2Base = (team2.ppg + team1.pointsAllowed) / 2;
    const baseTotal = team1Base + team2Base;

    // STEP 2: Calculate Pace Adjustment
    const paceAdjustment = calculatePaceAdjustment(team1, team2);

    // STEP 3: Recent Form Adjustment
    const team1Form = calculateFormAdjustment(team1);
    const team2Form = calculateFormAdjustment(team2);

    // STEP 4: Defense Quality Adjustment (CRITICAL)
    const defenseAdjustments = calculateDefenseQualityAdjustment(team1, team2);

    // STEP 5: Home/Away/Neutral Factor
    const locationAdjustments = calculateLocationAdjustment(team1, team2, gameContext);

    // STEP 6: Conference Game Adjustment
    const conferenceAdjustment = calculateConferenceAdjustment(gameContext);

    // Calculate preliminary scores
    let team1Score = team1Base + paceAdjustment.team1 + team1Form + defenseAdjustments.team1 + locationAdjustments.team1;
    let team2Score = team2Base + paceAdjustment.team2 + team2Form + defenseAdjustments.team2 + locationAdjustments.team2;

    // Apply conference adjustment
    if (conferenceAdjustment !== 0) {
      team1Score += conferenceAdjustment / 2;
      team2Score += conferenceAdjustment / 2;
    }

    // STEP 7: Blowout Cruise Control Factor
    const preliminaryMargin = Math.abs(team1Score - team2Score);
    const cruiseControl = calculateCruiseControl(preliminaryMargin, team1Score > team2Score ? 1 : 2);
    
    if (cruiseControl !== 0) {
      if (team1Score > team2Score) {
        team1Score += cruiseControl;
      } else {
        team2Score += cruiseControl;
      }
    }

    // STEP 8: Elite Offense/Defense Caps
    team1Score = applyEliteCaps(team1Score, team1, team2);
    team2Score = applyEliteCaps(team2Score, team2, team1);

    // STEP 9: Additional Contextual Adjustments
    const contextual1 = calculateContextualAdjustments(team1, gameContext);
    const contextual2 = calculateContextualAdjustments(team2, gameContext);
    team1Score += contextual1;
    team2Score += contextual2;

    // Round final scores
    team1Score = Math.round(team1Score);
    team2Score = Math.round(team2Score);

    // STEP 10: Calculate First Half Projections
    const firstHalf = calculateFirstHalf(team1Score, team2Score, team1, team2);

    // Determine winner
    const winner = team1Score > team2Score ? team1.team : team2.team;
    const margin = Math.abs(team1Score - team2Score);

    return {
      team1: {
        name: team1.team,
        fullGame: team1Score,
        firstHalf: firstHalf.team1,
        isWinner: team1Score > team2Score
      },
      team2: {
        name: team2.team,
        fullGame: team2Score,
        firstHalf: firstHalf.team2,
        isWinner: team2Score > team1Score
      },
      total: team1Score + team2Score,
      firstHalfTotal: firstHalf.total,
      margin: margin,
      winner: winner,
      calculations: {
        base: { team1: team1Base, team2: team2Base },
        pace: paceAdjustment,
        form: { team1: team1Form, team2: team2Form },
        defense: defenseAdjustments,
        location: locationAdjustments,
        conference: conferenceAdjustment,
        cruiseControl: cruiseControl,
        contextual: { team1: contextual1, team2: contextual2 }
      }
    };
  } catch (error) {
    console.error('Error in v2.0 prediction:', error);
    throw new Error(`v2.0 Prediction failed: ${error.message}`);
  }
};

/**
 * STEP 2: Calculate Pace Adjustment
 */
const calculatePaceAdjustment = (team1, team2) => {
  // Determine pace category
  const getPaceCategory = (ppg) => {
    if (ppg >= 85) return { poss: 78, category: 'Very Fast' };
    if (ppg >= 78) return { poss: 73.5, category: 'Fast' };
    if (ppg >= 70) return { poss: 69.5, category: 'Moderate' };
    if (ppg >= 65) return { poss: 66, category: 'Slow' };
    return { poss: 63, category: 'Very Slow' };
  };

  const pace1 = getPaceCategory(team1.ppg);
  const pace2 = getPaceCategory(team2.ppg);
  const paceDiff = Math.abs(pace1.poss - pace2.poss);

  // Determine pace differential category
  let diffCategory;
  if (paceDiff >= 16) diffCategory = 'Extreme';
  else if (paceDiff >= 11) diffCategory = 'Major';
  else if (paceDiff >= 6) diffCategory = 'Moderate';
  else diffCategory = 'Neutral';

  // Determine defensive quality
  const getDefCategory = (defRank) => {
    if (defRank <= 50) return 'Elite';
    if (defRank <= 100) return 'Good';
    return 'Average/Poor';
  };

  const def1 = getDefCategory(team1.defenseRank);
  const def2 = getDefCategory(team2.defenseRank);

  // Apply matrix
  const matrix = {
    'Extreme': {
      'Both Elite/Good': { min: 2, max: 4 },
      'One Good': { min: 6, max: 8 },
      'Both Average/Poor': { min: 10, max: 12 }
    },
    'Major': {
      'Both Elite/Good': { min: 2, max: 4 },
      'One Good': { min: 5, max: 7 },
      'Both Average/Poor': { min: 8, max: 10 }
    },
    'Moderate': {
      'Both Elite/Good': { min: 1, max: 3 },
      'One Good': { min: 4, max: 6 },
      'Both Average/Poor': { min: 6, max: 8 }
    },
    'Neutral': {
      'Both Elite/Good': { min: 1, max: 1 },
      'One Good': { min: 2, max: 3 },
      'Both Average/Poor': { min: 3, max: 5 }
    }
  };

  let category;
  if ((def1 === 'Elite' || def1 === 'Good') && (def2 === 'Elite' || def2 === 'Good')) {
    category = 'Both Elite/Good';
  } else if (def1 === 'Elite' || def1 === 'Good' || def2 === 'Elite' || def2 === 'Good') {
    category = 'One Good';
  } else {
    category = 'Both Average/Poor';
  }

  const range = matrix[diffCategory][category];
  const adjustment = (range.min + range.max) / 2;

  // Split adjustment (faster team gets more)
  if (pace1.poss > pace2.poss) {
    return { team1: adjustment * 0.6, team2: adjustment * 0.4 };
  } else {
    return { team1: adjustment * 0.4, team2: adjustment * 0.6 };
  }
};

/**
 * STEP 3: Recent Form Adjustment
 */
const calculateFormAdjustment = (team) => {
  let adjustment = 0;

  // Win/Loss streak impact
  if (team.winStreak >= 5) adjustment += 3.5;
  else if (team.winStreak >= 3) adjustment += 2.5;
  else if (team.winStreak >= 1) adjustment += 1;
  else if (team.lossStreak >= 5) adjustment -= 9;
  else if (team.lossStreak >= 3) adjustment -= 6;
  else if (team.lossStreak >= 1) adjustment -= 1.5;

  // Recent scoring trend
  if (team.last5PPG && team.ppg) {
    const trend = team.last5PPG - team.ppg;
    if (trend >= 5) adjustment += 2.5;
    else if (trend <= -5) adjustment -= 2.5;
  }

  return adjustment;
};

/**
 * STEP 4: Defense Quality Adjustment (CRITICAL)
 */
const calculateDefenseQualityAdjustment = (team1, team2) => {
  // Classify offense
  const classifyOffense = (team) => {
    const ppgRank = team.ppgRank || 200; // Default if not provided
    const fgPct = team.fieldGoalPct || 0.45;
    
    if (ppgRank <= 100 && fgPct >= 0.48) return 'Elite';
    if (ppgRank <= 200 && fgPct >= 0.45) return 'Good';
    if (ppgRank <= 300) return 'Average';
    return 'Poor';
  };

  const off1 = classifyOffense(team1);
  const off2 = classifyOffense(team2);

  // Defense quality
  const getDefRank = (rank) => {
    if (rank <= 50) return 'Elite';
    if (rank <= 100) return 'Good';
    if (rank <= 200) return 'Average';
    return 'Poor';
  };

  const def1Rank = getDefRank(team1.defenseRank);
  const def2Rank = getDefRank(team2.defenseRank);

  // Matrix
  const matrix = {
    'Elite': { 'Elite': -9, 'Good': -5, 'Average': 2.5, 'Poor': 6 },
    'Good': { 'Elite': -11, 'Good': -7, 'Average': 1, 'Poor': 4 },
    'Average': { 'Elite': -13.5, 'Good': -9, 'Average': -1, 'Poor': 3 },
    'Poor': { 'Elite': -16.5, 'Good': -11, 'Average': -6, 'Poor': 1 }
  };

  let adj1 = matrix[off1][def2Rank];
  let adj2 = matrix[off2][def1Rank];

  // SPECIAL RULE: Two good defenses meet
  if (team1.defenseRank <= 100 && team2.defenseRank <= 100) {
    const additionalPenalty = -13.5; // Midpoint of -12 to -15
    adj1 += additionalPenalty / 2;
    adj2 += additionalPenalty / 2;
  }

  return { team1: adj1, team2: adj2 };
};

/**
 * STEP 5: Home/Away/Neutral Factor
 */
const calculateLocationAdjustment = (team1, team2, context) => {
  let adj1 = 0;
  let adj2 = 0;

  // Home team advantage
  if (context.team1Location === 'home') {
    const homeWinRate = team1.homeRecord ? team1.homeRecord.wins / (team1.homeRecord.wins + team1.homeRecord.losses) : 0.5;
    
    if (homeWinRate >= 0.95) adj1 += 3.5;
    else if (homeWinRate >= 0.80) adj1 += 2.5;
    else if (homeWinRate >= 0.50) adj1 += 1.5;
    else adj1 += 0.5;

    // Away team penalty
    const awayWinRate = team2.awayRecord ? team2.awayRecord.wins / (team2.awayRecord.wins + team2.awayRecord.losses) : 0.5;
    const opponentNet = team1.netRank || 100;
    
    if (opponentNet <= 50) {
      if (awayWinRate <= 0.20) adj2 -= 6.5;
      else if (awayWinRate <= 0.40) adj2 -= 5.5;
      else if (awayWinRate <= 0.60) adj2 -= 3.5;
      else adj2 -= 1.5;
    } else if (opponentNet <= 150) {
      if (awayWinRate <= 0.20) adj2 -= 5;
      else if (awayWinRate <= 0.40) adj2 -= 4;
      else if (awayWinRate <= 0.60) adj2 -= 2.5;
      else adj2 -= 1;
    } else {
      if (awayWinRate <= 0.20) adj2 -= 3.5;
      else if (awayWinRate <= 0.40) adj2 -= 2.5;
      else adj2 -= 1.5;
    }
  } else if (context.team1Location === 'away') {
    // Reverse the above
    const awayWinRate = team1.awayRecord ? team1.awayRecord.wins / (team1.awayRecord.wins + team1.awayRecord.losses) : 0.5;
    const opponentNet = team2.netRank || 100;
    
    if (opponentNet <= 50) {
      if (awayWinRate <= 0.20) adj1 -= 6.5;
      else if (awayWinRate <= 0.40) adj1 -= 5.5;
      else if (awayWinRate <= 0.60) adj1 -= 3.5;
      else adj1 -= 1.5;
    } else if (opponentNet <= 150) {
      if (awayWinRate <= 0.20) adj1 -= 5;
      else if (awayWinRate <= 0.40) adj1 -= 4;
      else if (awayWinRate <= 0.60) adj1 -= 2.5;
      else adj1 -= 1;
    } else {
      if (awayWinRate <= 0.20) adj1 -= 3.5;
      else if (awayWinRate <= 0.40) adj1 -= 2.5;
      else adj1 -= 1.5;
    }

    const homeWinRate = team2.homeRecord ? team2.homeRecord.wins / (team2.homeRecord.wins + team2.homeRecord.losses) : 0.5;
    if (homeWinRate >= 0.95) adj2 += 3.5;
    else if (homeWinRate >= 0.80) adj2 += 2.5;
    else if (homeWinRate >= 0.50) adj2 += 1.5;
    else adj2 += 0.5;
  } else {
    // Neutral site
    const neutral1 = team1.neutralRecord ? team1.neutralRecord.wins / (team1.neutralRecord.wins + team1.neutralRecord.losses) : 0.5;
    const neutral2 = team2.neutralRecord ? team2.neutralRecord.wins / (team2.neutralRecord.wins + team2.neutralRecord.losses) : 0.5;
    
    // Check for winless (0) BEFORE checking < 0.50, since 0 < 0.50
    if (neutral1 >= 0.95) adj1 += 1.5;
    else if (neutral1 >= 0.60) adj1 += 0.5;
    else if (neutral1 === 0) adj1 -= 2.5; // Winless at neutral site - check first
    else if (neutral1 < 0.50) adj1 -= 1.5; // Losing record at neutral site
    // else: 0.50 to 0.60 (no adjustment)

    if (neutral2 >= 0.95) adj2 += 1.5;
    else if (neutral2 >= 0.60) adj2 += 0.5;
    else if (neutral2 === 0) adj2 -= 2.5; // Winless at neutral site - check first
    else if (neutral2 < 0.50) adj2 -= 1.5; // Losing record at neutral site
    // else: 0.50 to 0.60 (no adjustment)
  }

  return { team1: adj1, team2: adj2 };
};

/**
 * STEP 6: Conference Game Adjustment
 */
const calculateConferenceAdjustment = (context) => {
  if (context.isConferenceGame) {
    return -11; // Midpoint of -10 to -12
  }
  return 0;
};

/**
 * STEP 7: Blowout Cruise Control Factor
 */
const calculateCruiseControl = (margin, winningTeam) => {
  if (margin >= 30) return -13.5; // Midpoint of -12 to -15
  if (margin >= 25) return -11; // Midpoint of -10 to -12
  if (margin >= 20) return -8.5; // Midpoint of -7 to -10
  if (margin >= 15) return -5.5; // Midpoint of -4 to -7
  return 0;
};

/**
 * STEP 8: Elite Offense/Defense Caps
 */
const applyEliteCaps = (score, team, opponent) => {
  // Elite offense cap
  if (team.ppg >= 85) {
    if (opponent.defenseRank > 100) {
      return Math.min(score, 82.5); // Cap at 80-85, use midpoint
    } else if (opponent.defenseRank <= 50) {
      return Math.min(score, 74); // Cap at 70-78, use midpoint
    } else if (opponent.defenseRank >= 300) {
      return Math.min(score, 90); // Exception for terrible defense
    }
  }

  // Poor offense floor
  if (team.ppg <= 65 && (team.fieldGoalPct || 0.45) < 0.40) {
    if (opponent.defenseRank <= 30) {
      return Math.max(score, 47.5); // Floor at 45-50
    }
    return Math.max(score, 52.5); // Floor at 50-55
  }

  return score;
};

/**
 * STEP 9: Additional Contextual Adjustments
 */
const calculateContextualAdjustments = (team, context) => {
  let adjustment = 0;

  // Rest/Fatigue factor
  const daysRest = context.daysRest || 2;
  if (daysRest === 0) adjustment -= 4; // Back-to-back
  else if (daysRest === 1) adjustment -= 1.5;
  else if (daysRest >= 4 && daysRest <= 7) adjustment += 1.5;
  else if (daysRest >= 8) adjustment += 2.5;

  // Travel distance (if available)
  if (context.travelDistance && context.travelDistance >= 1000) {
    adjustment -= 1.5;
  }

  // Injuries (if known)
  if (context.missingTopScorer) adjustment -= 6.5;
  if (context.missingPointGuard) adjustment -= 4;
  if (context.missingRolePlayer) adjustment -= 2.5;

  return adjustment;
};

/**
 * STEP 10: Calculate First Half Projections
 */
const calculateFirstHalf = (team1Full, team2Full, team1, team2) => {
  // Determine first half percentage
  let team1Pct = 0.48; // Default
  let team2Pct = 0.48;

  // Adjust for fast/slow starters (if data available)
  if (team1.firstHalfPPG && team1.ppg) {
    const ratio = team1.firstHalfPPG / team1.ppg;
    if (ratio >= 0.52) team1Pct = 0.50; // Fast starter
    else if (ratio < 0.46) team1Pct = 0.46; // Slow starter
  }

  if (team2.firstHalfPPG && team2.ppg) {
    const ratio = team2.firstHalfPPG / team2.ppg;
    if (ratio >= 0.52) team2Pct = 0.50;
    else if (ratio < 0.46) team2Pct = 0.46;
  }

  const team1FirstHalf = Math.round(team1Full * team1Pct);
  const team2FirstHalf = Math.round(team2Full * team2Pct);

  return {
    team1: team1FirstHalf,
    team2: team2FirstHalf,
    total: team1FirstHalf + team2FirstHalf
  };
};
