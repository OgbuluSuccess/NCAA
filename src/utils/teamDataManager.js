/**
 * Team Data Manager
 * Handles team data operations, searching, and formatting
 */

/**
 * Format teams for react-select dropdown
 * @param {Array} teams - Array of team objects
 * @returns {Array} Formatted options for react-select
 */
export const formatTeamsForSelect = (teams) => {
  if (!Array.isArray(teams)) {
    return [];
  }
  
  return teams
    .sort((a, b) => a.team.localeCompare(b.team)) // Sort alphabetically by team name
    .map(team => ({
      value: team.rank,
      label: `${team.team} (#${team.rank}) - ${team.conference}`,
      team: team,
      searchText: `${team.team} ${team.conference}`.toLowerCase()
    }));
};

/**
 * Search teams by name or conference
 * @param {Array} teams - Array of team objects
 * @param {string} searchTerm - Search term
 * @returns {Array} Filtered teams
 */
export const searchTeams = (teams, searchTerm) => {
  if (!searchTerm || searchTerm.length < 1) {
    return teams;
  }
  
  const term = searchTerm.toLowerCase().trim();
  
  return teams.filter(team => {
    const teamName = team.team.toLowerCase();
    const conference = (team.conference || '').toLowerCase();
    const rank = team.rank.toString();
    
    return teamName.includes(term) || 
           conference.includes(term) || 
           rank.includes(term);
  });
};

/**
 * Get team by rank
 * @param {Array} teams - Array of team objects
 * @param {number} rank - Team rank
 * @returns {Object|null} Team object or null if not found
 */
export const getTeamByRank = (teams, rank) => {
  return teams.find(team => team.rank === parseInt(rank)) || null;
};

/**
 * Get team statistics summary
 * @param {Object} team - Team object
 * @returns {Object} Statistics summary
 */
export const getTeamStatsSummary = (team) => {
  if (!team) return null;
  
  return {
    basicInfo: {
      name: team.team,
      rank: team.rank,
      conference: team.conference
    },
    performance: {
      record: `${team.wins}-${team.losses}`,
      winRate: Math.round(team.winRate * 100),
      pointsPerGame: team.pointsPerGame,
      totalPoints: team.totalPoints,
      gamesPlayed: team.gamesPlayed
    },
    rankings: {
      national: team.rank,
      percentile: Math.round((1 - (team.rank - 1) / 355) * 100)
    }
  };
};

/**
 * Compare two teams side by side
 * @param {Object} team1 - First team
 * @param {Object} team2 - Second team
 * @returns {Object} Comparison data
 */
export const compareTeams = (team1, team2) => {
  if (!team1 || !team2) return null;
  
  return {
    team1: getTeamStatsSummary(team1),
    team2: getTeamStatsSummary(team2),
    comparisons: {
      rankingAdvantage: team2.rank - team1.rank, // Positive means team1 has better rank
      scoringAdvantage: team1.pointsPerGame - team2.pointsPerGame,
      winRateAdvantage: team1.winRate - team2.winRate,
      experienceAdvantage: team1.gamesPlayed - team2.gamesPlayed
    }
  };
};

/**
 * Get top teams by various criteria
 * @param {Array} teams - Array of team objects
 * @param {string} criteria - Sorting criteria ('rank', 'ppg', 'winRate')
 * @param {number} limit - Number of teams to return
 * @returns {Array} Top teams
 */
export const getTopTeams = (teams, criteria = 'rank', limit = 10) => {
  let sortedTeams = [...teams];
  
  switch (criteria) {
    case 'rank':
      sortedTeams.sort((a, b) => a.rank - b.rank);
      break;
    case 'ppg':
      sortedTeams.sort((a, b) => b.pointsPerGame - a.pointsPerGame);
      break;
    case 'winRate':
      sortedTeams.sort((a, b) => b.winRate - a.winRate);
      break;
    default:
      sortedTeams.sort((a, b) => a.rank - b.rank);
  }
  
  return sortedTeams.slice(0, limit);
};

/**
 * Get teams by conference
 * @param {Array} teams - Array of team objects
 * @param {string} conference - Conference name
 * @returns {Array} Teams in the conference
 */
export const getTeamsByConference = (teams, conference) => {
  return teams.filter(team => 
    team.conference && 
    team.conference.toLowerCase() === conference.toLowerCase()
  );
};

/**
 * Get all unique conferences
 * @param {Array} teams - Array of team objects
 * @returns {Array} Unique conference names
 */
export const getAllConferences = (teams) => {
  const conferences = teams
    .map(team => team.conference)
    .filter(conf => conf && conf.trim() !== '')
    .map(conf => conf.trim());
  
  return [...new Set(conferences)].sort();
};

/**
 * Validate team selection for prediction
 * @param {Object} team1 - First team
 * @param {Object} team2 - Second team
 * @returns {Object} Validation result
 */
export const validateTeamSelection = (team1, team2) => {
  const errors = [];
  
  if (!team1) {
    errors.push('Please select the first team');
  }
  
  if (!team2) {
    errors.push('Please select the second team');
  }
  
  if (team1 && team2 && team1.rank === team2.rank) {
    errors.push('Please select two different teams');
  }
  
  return {
    isValid: errors.length === 0,
    errors: errors
  };
};

/**
 * Format team record for display
 * @param {Object} team - Team object
 * @returns {string} Formatted record string
 */
export const formatTeamRecord = (team) => {
  if (!team || team.wins === undefined || team.losses === undefined) {
    return 'N/A';
  }
  
  return `${team.wins}-${team.losses}`;
};

/**
 * Calculate team strength rating (0-100 scale)
 * @param {Object} team - Team object
 * @returns {number} Strength rating
 */
export const calculateTeamStrength = (team) => {
  if (!team) return 0;
  
  // Combine multiple factors for overall strength
  const rankScore = (356 - team.rank) / 355 * 40; // 40% weight for ranking
  const winRateScore = team.winRate * 35; // 35% weight for win rate
  const scoringScore = Math.min(team.pointsPerGame / 100, 1) * 25; // 25% weight for scoring
  
  return Math.round(rankScore + winRateScore + scoringScore);
};

/**
 * Get team performance tier
 * @param {Object} team - Team object
 * @returns {string} Performance tier
 */
export const getTeamTier = (team) => {
  if (!team) return 'Unknown';
  
  if (team.rank <= 25) return 'Elite';
  if (team.rank <= 68) return 'Tournament';
  if (team.rank <= 150) return 'Competitive';
  if (team.rank <= 250) return 'Developing';
  return 'Rebuilding';
};