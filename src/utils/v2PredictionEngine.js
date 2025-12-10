/**
 * NCAA Basketball Prediction Model v2.2
 * Complete implementation of the v2.2 specification
 * Includes v2.1 base model + v2.2 enhancements: Reclassified defensive tiers, Revised "Two Good Defenses" rule, Enhanced home/away, Scaled pace adjustments, Close Game Bonus
 * Key v2.2 Changes:
 * - Reclassified defensive tiers (Elite 1-30, Very Good 31-70, Good 71-110, Average 111-180)
 * - Revised "Two Good Defenses" rule thresholds
 * - Enhanced home/away adjustments
 * - Scaled down pace adjustments (30-40% reduction)
 * - Added Close Game Bonus for margins <5 points
 * DO NOT MODIFY - Use exactly as specified
 */

/**
 * Calculate prediction using v2.2 model
 * @param {Object} team1 - First team data
 * @param {Object} team2 - Second team data
 * @param {Object} gameContext - Game context (home/away, conference, etc.)
 * @returns {Object} Prediction results with full game and first half
 */
export const calculateV2Prediction = (team1, team2, gameContext = {}) => {
  try {
    // VALIDATION: Check required fields before proceeding
    if (!team1 || !team2) {
      throw new Error('Both teams are required for v2.2 prediction');
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

    // STEP 11: Check for Extreme Mismatch (before cruise control and caps)
    const extremeMismatch = calculateExtremeMismatch(team1, team2, team1Score, team2Score);
    const isBottom10Opponent = (team1.netRank >= 356 || team2.netRank >= 356);
    const skipCruiseControl = extremeMismatch.skipCruiseControl;
    const skipEliteCaps = extremeMismatch.skipEliteCaps;

    // STEP 7: Blowout Cruise Control Factor (skip if bottom 10 opponent)
    const preliminaryMargin = Math.abs(team1Score - team2Score);
    let cruiseControl = 0;
    if (!skipCruiseControl) {
      cruiseControl = calculateCruiseControl(preliminaryMargin, team1Score > team2Score ? 1 : 2);
      if (cruiseControl !== 0) {
        if (team1Score > team2Score) {
          team1Score += cruiseControl;
        } else {
          team2Score += cruiseControl;
        }
      }
    }

    // STEP 8: Elite Offense/Defense Caps (skip if bottom 10 opponent)
    if (!skipEliteCaps) {
      team1Score = applyEliteCaps(team1Score, team1, team2);
      team2Score = applyEliteCaps(team2Score, team2, team1);
    }

    // STEP 9: Additional Contextual Adjustments
    const contextual1 = calculateContextualAdjustments(team1, gameContext);
    const contextual2 = calculateContextualAdjustments(team2, gameContext);
    team1Score += contextual1;
    team2Score += contextual2;

    // STEP 11: Apply Extreme Mismatch Adjustments
    const extremeAdjustments = extremeMismatch.adjustments;
    team1Score += extremeAdjustments.team1;
    team2Score += extremeAdjustments.team2;

    // Apply floors for bottom 10 teams
    if (extremeMismatch.applyFloor) {
      if (team1.netRank >= 356) {
        team1Score = Math.max(team1Score, extremeMismatch.floorValue);
      }
      if (team2.netRank >= 356) {
        team2Score = Math.max(team2Score, extremeMismatch.floorValue);
      }
    }

    // Cap winning team at realistic max (110) for extreme mismatches
    if (extremeMismatch.applyMaxCap) {
      if (team1Score > team2Score) {
        team1Score = Math.min(team1Score, 110);
      } else {
        team2Score = Math.min(team2Score, 110);
      }
    }

    // STEP 13: Close Game Bonus (v2.2 NEW)
    // If preliminary margin <5 points (very close game), add +6 to +8 to total
    // Check margin after all other adjustments but before close game bonus
    const marginBeforeCloseBonus = Math.abs(team1Score - team2Score);
    if (marginBeforeCloseBonus < 5) {
      const closeGameBonus = 7; // Midpoint of +6 to +8
      // Split evenly or favor home team slightly
      if (gameContext.team1Location === 'home') {
        team1Score += closeGameBonus * 0.55;
        team2Score += closeGameBonus * 0.45;
      } else if (gameContext.team1Location === 'away') {
        team1Score += closeGameBonus * 0.45;
        team2Score += closeGameBonus * 0.55;
      } else {
        // Neutral - split evenly
        team1Score += closeGameBonus / 2;
        team2Score += closeGameBonus / 2;
      }
    }

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
        contextual: { team1: contextual1, team2: contextual2 },
        extremeMismatch: extremeMismatch.adjustments
      }
    };
  } catch (error) {
    console.error('Error in v2.2 prediction:', error);
    throw new Error(`v2.2 Prediction failed: ${error.message}`);
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

  // v2.2: Determine defensive quality with new classification
  const getDefCategory = (defRank) => {
    if (defRank <= 30) return 'Elite';
    if (defRank <= 70) return 'VeryGood';
    if (defRank <= 110) return 'Good';
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

  // v2.2: Updated category logic for new defensive tiers
  let category;
  if ((def1 === 'Elite' || def1 === 'VeryGood' || def1 === 'Good') && 
      (def2 === 'Elite' || def2 === 'VeryGood' || def2 === 'Good')) {
    category = 'Both Elite/Good';
  } else if (def1 === 'Elite' || def1 === 'VeryGood' || def1 === 'Good' || 
             def2 === 'Elite' || def2 === 'VeryGood' || def2 === 'Good') {
    category = 'One Good';
  } else {
    category = 'Both Average/Poor';
  }

  const range = matrix[diffCategory][category];
  const adjustment = (range.min + range.max) / 2;
  
  // v2.2: Scale down pace adjustments by 35% (0.65 multiplier)
  const scaledAdjustment = adjustment * 0.65;

  // Split adjustment (faster team gets more)
  if (pace1.poss > pace2.poss) {
    return { team1: scaledAdjustment * 0.6, team2: scaledAdjustment * 0.4 };
  } else {
    return { team1: scaledAdjustment * 0.4, team2: scaledAdjustment * 0.6 };
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
 * STEP 4: Defense Quality Adjustment (CRITICAL) - v2.2 UPDATED
 */
const calculateDefenseQualityAdjustment = (team1, team2) => {
  // Classify offense (unchanged)
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

  // v2.2: NEW Defense quality classification
  const getDefRank = (rank) => {
    if (rank <= 30) return 'Elite';
    if (rank <= 70) return 'VeryGood';
    if (rank <= 110) return 'Good';
    if (rank <= 180) return 'Average';
    if (rank <= 250) return 'BelowAvg';
    if (rank <= 320) return 'Poor';
    return 'Terrible';
  };

  const def1Rank = getDefRank(team1.defenseRank);
  const def2Rank = getDefRank(team2.defenseRank);

  // v2.2: Updated Defense Impact Matrix
  const matrix = {
    'Elite': { 
      'Elite': -13.5,      // -12 to -15
      'VeryGood': -9,      // -8 to -10
      'Good': -5,          // -4 to -6
      'Average': 1,        // 0 to +2
      'BelowAvg': 4,       // +4 to +6
      'Poor': 5,           // +4 to +6
      'Terrible': 5        // +4 to +6
    },
    'Good': { 
      'Elite': -16.5,      // -15 to -18
      'VeryGood': -11,     // -10 to -12
      'Good': -7,          // -6 to -8
      'Average': -1,       // -2 to 0
      'BelowAvg': 3,       // +2 to +4
      'Poor': 3,           // +2 to +4
      'Terrible': 3        // +2 to +4
    },
    'Average': { 
      'Elite': -19,        // -18 to -20
      'VeryGood': -13.5,   // -12 to -15
      'Good': -9,          // -8 to -10
      'Average': -1.5,     // -3 to -1
      'BelowAvg': 1,       // 0 to +2
      'Poor': 1,           // 0 to +2
      'Terrible': 1        // 0 to +2
    },
    'Poor': { 
      'Elite': -22.5,      // -20 to -25
      'VeryGood': -16.5,   // -15 to -18
      'Good': -11,         // -10 to -12
      'Average': -7,       // -6 to -8
      'BelowAvg': -1,      // -2 to 0
      'Poor': -1,          // -2 to 0
      'Terrible': -1       // -2 to 0
    }
  };

  let adj1 = matrix[off1][def2Rank] || 0;
  let adj2 = matrix[off2][def1Rank] || 0;

  // v2.2: REVISED "Two Good Defenses" Rule
  const def1RankNum = team1.defenseRank;
  const def2RankNum = team2.defenseRank;
  
  if (def1RankNum <= 70 && def2RankNum <= 70) {
    // Both teams Top 70 (Very Good or Elite): -10 to -12
    const additionalPenalty = -11; // Midpoint of -10 to -12
    adj1 += additionalPenalty / 2;
    adj2 += additionalPenalty / 2;
  } else if (def1RankNum >= 71 && def1RankNum <= 110 && def2RankNum >= 71 && def2RankNum <= 110) {
    // Both teams 71-110 (Good): -5 to -7
    const additionalPenalty = -6; // Midpoint of -5 to -7
    adj1 += additionalPenalty / 2;
    adj2 += additionalPenalty / 2;
  } else if (def1RankNum >= 111 && def1RankNum <= 180 && def2RankNum >= 111 && def2RankNum <= 180) {
    // Both teams 111-180 (Average): NO PENALTY (0)
    // No adjustment needed
  } else if ((def1RankNum <= 70 && def2RankNum >= 71 && def2RankNum <= 150) ||
             (def2RankNum <= 70 && def1RankNum >= 71 && def1RankNum <= 150)) {
    // One Top 70, one 71-150: -3 to -5
    const additionalPenalty = -4; // Midpoint of -3 to -5
    adj1 += additionalPenalty / 2;
    adj2 += additionalPenalty / 2;
  }

  return { team1: adj1, team2: adj2 };
};

/**
 * STEP 5: Home/Away/Neutral Factor - v2.2 ENHANCED
 * MANDATORY: Game location must be identified first
 */
const calculateLocationAdjustment = (team1, team2, context) => {
  let adj1 = 0;
  let adj2 = 0;

  // v2.2: Enhanced Home team advantage
  if (context.team1Location === 'home') {
    const homeWinRate = team1.homeRecord ? team1.homeRecord.wins / (team1.homeRecord.wins + team1.homeRecord.losses) : 0.5;
    
    // v2.2: Enhanced home bonuses
    if (homeWinRate >= 0.75) adj1 += 3.5;      // Strong home record (75%+): +3 to +4
    else if (homeWinRate >= 0.50) adj1 += 2.5; // Average home record (50-74%): +2 to +3
    else adj1 += 1.5;                          // Weak home record (<50%): +1 to +2

    // v2.2: Enhanced Away team penalty
    const awayWinRate = team2.awayRecord ? team2.awayRecord.wins / (team2.awayRecord.wins + team2.awayRecord.losses) : 0.5;
    const opponentNet = team1.netRank || 100;
    
    // v2.2: Enhanced road penalties based on record
    if (awayWinRate < 0.25 || (team2.awayRecord && team2.awayRecord.wins === 0 && team2.awayRecord.losses >= 3)) {
      // Weak road record (0-3 or <25%): -4 to -6
      if (opponentNet <= 50) adj2 -= 6;
      else if (opponentNet <= 150) adj2 -= 5;
      else adj2 -= 4;
    } else if (awayWinRate < 0.60) {
      // Average road record (25-60%): -2 to -4
      if (opponentNet <= 50) adj2 -= 4;
      else if (opponentNet <= 150) adj2 -= 3;
      else adj2 -= 2.5;
    } else {
      // Strong road record (60%+): -1 to -2
      if (opponentNet <= 50) adj2 -= 2;
      else if (opponentNet <= 150) adj2 -= 1.5;
      else adj2 -= 1;
    }
  } else if (context.team1Location === 'away') {
    // v2.2: Enhanced Away team penalty (Team 1 is away)
    const awayWinRate = team1.awayRecord ? team1.awayRecord.wins / (team1.awayRecord.wins + team1.awayRecord.losses) : 0.5;
    const opponentNet = team2.netRank || 100;
    
    // v2.2: Enhanced road penalties based on record
    if (awayWinRate < 0.25 || (team1.awayRecord && team1.awayRecord.wins === 0 && team1.awayRecord.losses >= 3)) {
      // Weak road record (0-3 or <25%): -4 to -6
      if (opponentNet <= 50) adj1 -= 6;
      else if (opponentNet <= 150) adj1 -= 5;
      else adj1 -= 4;
    } else if (awayWinRate < 0.60) {
      // Average road record (25-60%): -2 to -4
      if (opponentNet <= 50) adj1 -= 4;
      else if (opponentNet <= 150) adj1 -= 3;
      else adj1 -= 2.5;
    } else {
      // Strong road record (60%+): -1 to -2
      if (opponentNet <= 50) adj1 -= 2;
      else if (opponentNet <= 150) adj1 -= 1.5;
      else adj1 -= 1;
    }

    // v2.2: Enhanced Home team advantage (Team 2 is home)
    const homeWinRate = team2.homeRecord ? team2.homeRecord.wins / (team2.homeRecord.wins + team2.homeRecord.losses) : 0.5;
    if (homeWinRate >= 0.75) adj2 += 3.5;      // Strong home record (75%+): +3 to +4
    else if (homeWinRate >= 0.50) adj2 += 2.5; // Average home record (50-74%): +2 to +3
    else adj2 += 1.5;                          // Weak home record (<50%): +1 to +2
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
 * STEP 11: Extreme Mismatch Adjustments (v2.1, retained in v2.2)
 * Handles bottom 10 teams, extreme NET gaps, and post-losing streak statement games
 */
const calculateExtremeMismatch = (team1, team2, team1Score, team2Score) => {
  const net1 = team1.netRank || 150;
  const net2 = team2.netRank || 150;
  const netGap = Math.abs(net1 - net2);
  
  let adjustments = { team1: 0, team2: 0 };
  let skipCruiseControl = false;
  let skipEliteCaps = false;
  let applyFloor = false;
  let applyMaxCap = false;
  let floorValue = 48; // Default floor for bottom 10 teams (48-52 range, use 48)

  // 11A: Check for Bottom 10 Opponent (NET >= 356)
  const isTeam1Bottom10 = net1 >= 356;
  const isTeam2Bottom10 = net2 >= 356;
  
  if (isTeam1Bottom10 || isTeam2Bottom10) {
    skipCruiseControl = true; // No cruise control for bottom 10 games
    skipEliteCaps = true; // Remove elite caps for bottom 10 games
    applyFloor = true; // Apply floor to bottom 10 team
    applyMaxCap = true; // Cap winning team at 110
    
    // Determine which team is the better team (lower NET = better)
    const team1IsBetter = net1 < net2;
    
    if (isTeam1Bottom10 && !isTeam2Bottom10) {
      // Team 1 is bottom 10, Team 2 is the better team
      adjustments.team2 += 12.5; // Winning team (better team): +10 to +15, use midpoint
      adjustments.team1 -= 12.5; // Losing team (bottom 10): -10 to -15, use midpoint
      floorValue = 48; // Floor at 45-55, use 48
    } else if (isTeam2Bottom10 && !isTeam1Bottom10) {
      // Team 2 is bottom 10, Team 1 is the better team
      adjustments.team1 += 12.5; // Winning team (better team): +10 to +15, use midpoint
      adjustments.team2 -= 12.5; // Losing team (bottom 10): -10 to -15, use midpoint
      floorValue = 48; // Floor at 45-55, use 48
    }
  }

  // 11B: Check for Extreme NET Gap (>= 200)
  if (netGap >= 200 && !isTeam1Bottom10 && !isTeam2Bottom10) {
    // Only apply if not already handled by bottom 10 rule
    skipCruiseControl = true; // Remove cruise control for extreme gaps
    const marginAdjustment = 17.5; // +15 to +20, use midpoint
    
    // Add to margin (favor the better team)
    if (net1 < net2) {
      // Team 1 is better
      adjustments.team1 += marginAdjustment / 2;
      adjustments.team2 -= marginAdjustment / 2;
    } else {
      // Team 2 is better
      adjustments.team2 += marginAdjustment / 2;
      adjustments.team1 -= marginAdjustment / 2;
    }
  }

  // 11C: Post-Losing Streak Statement Game
  // If favored team on 3+ loss streak AND vs Bottom 50 opponent (NET >= 314, exact bottom 50 of 363 teams)
  const team1LossStreak = team1.lossStreak || 0;
  const team2LossStreak = team2.lossStreak || 0;
  
  if (team1LossStreak >= 3 && net2 >= 314) {
    // Team 1 on losing streak, playing bottom 50 team
    // Check if Team 1 is favored (lower NET rank = better)
    if (net1 < net2) {
      adjustments.team1 += 10; // +8 to +12, use midpoint
    }
  }
  
  if (team2LossStreak >= 3 && net1 >= 314) {
    // Team 2 on losing streak, playing bottom 50 team
    // Check if Team 2 is favored (lower NET rank = better)
    if (net2 < net1) {
      adjustments.team2 += 10; // +8 to +12, use midpoint
    }
  }

  return {
    adjustments,
    skipCruiseControl,
    skipEliteCaps,
    applyFloor,
    applyMaxCap,
    floorValue
  };
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
