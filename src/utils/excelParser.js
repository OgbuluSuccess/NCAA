import * as XLSX from 'xlsx';

// Helper: normalize header names for matching
const normalizeHeader = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Helper: find header index by synonyms (case-insensitive, punctuation-insensitive)
const findHeaderIndex = (headers, synonyms) => {
  const normalizedHeaders = headers.map(normalizeHeader);
  const normalizedSynonyms = synonyms.map(normalizeHeader);
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const h = normalizedHeaders[i];
    if (normalizedSynonyms.some(sym => h === sym || h.includes(sym))) {
      return i;
    }
  }
  return -1;
};

// Helper: parse numeric values (handles strings with commas/percent symbols)
const parseNumber = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  if (typeof v === 'string') {
    const s = v.replace(/[, ]/g, '').replace('%', '');
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  }
  const num = Number(v);
  return isNaN(num) ? 0 : num;
};

// Helper: parse percentage to decimal (0-1)
const parsePercentToDecimal = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v === 'string' && v.includes('%')) {
    const num = parseFloat(v.replace('%', ''));
    return isNaN(num) ? null : num / 100;
  }
  const num = parseFloat(v);
  if (isNaN(num)) return null;
  return num > 1.5 ? num / 100 : num; // if given as 45, treat as 0.45
};

// Helper: locate header row index within first 10 rows
const findHeaderRowIndex = (rows) => {
  const limit = Math.min(rows.length, 10);
  for (let r = 0; r < limit; r++) {
    const hdr = (rows[r] || []).map(normalizeHeader);
    if (hdr.some(h => h.includes('team') || h.includes('school'))) return r;
    if (hdr.some(h => h.includes('ppg') || h.includes('points per game') || h.includes('scoring offense'))) return r;
    if (hdr.some(h => h.includes('rank'))) return r;
  }
  return 0;
};

// Aliases for common NCAA team name variations across data sources
const TEAM_ALIASES = {
  'boston u': 'boston university',
  'miami fl': 'miami (fl)',
  'miami fla': 'miami (fl)',
  'uc santa barbara': 'california santa barbara',
  'utsa': 'texas san antonio',
  'umass lowell': 'massachusetts lowell',
  'st josephs': "saint joseph's",
  'st johns': "st john's",
  'southern cal': 'southern california',
};

// Helper: canonical team key for merging across files
const normalizeTeamKey = (name) => {
  const nk = normalizeHeader(String(name || ''));
  return TEAM_ALIASES[nk] || nk;
};

/**
 * Parse Excel file containing NCAA team statistics
 * Expected columns: Rank, Team, GM, W-L, PTS, PPG, Conference (plus optional advanced stats)
 */
export const parseExcelFile = async (file) => {
  try {
    // Read the file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Parse the workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length < 2) {
      throw new Error('Excel file appears to be empty or invalid');
    }
    
    // Locate header row among first few rows and extract headers/data accordingly
    const headerRowIdx = findHeaderRowIndex(jsonData);
    const headers = jsonData[headerRowIdx];
    const dataRows = jsonData.slice(headerRowIdx + 1);

    // Base indices (fallback to column position if not found by name)
    const idx = {
      rank: findHeaderIndex(headers, ['rank'])
    };
    idx.team = findHeaderIndex(headers, ['team', 'school']);
    idx.gm = findHeaderIndex(headers, ['gm', 'games', 'games played']);
    idx.wl = findHeaderIndex(headers, ['w-l', 'record', 'wins-losses', 'w / l', 'w/l']);
    idx.pts = findHeaderIndex(headers, ['pts', 'points', 'total points']);
    idx.ppg = findHeaderIndex(headers, ['ppg', 'points per game', 'scoring offense']);
    idx.conference = findHeaderIndex(headers, ['conference', 'conf']);

    // Advanced metrics indices
    const advIdx = {
      efg: findHeaderIndex(headers, ['effective fg pct', 'effective fg%', 'efg%']),
      turnoverMargin: findHeaderIndex(headers, ['turnover margin']),
      assistTurnoverRatio: findHeaderIndex(headers, ['assist/turnover ratio', 'assists/turnover ratio', 'a/t ratio']),
      offensiveReboundsPerGame: findHeaderIndex(headers, ['rebounds (offensive) per game', 'offensive rebounds per game', 'off reb/g']),
      defensiveReboundsPerGame: findHeaderIndex(headers, ['rebounds (defensive) per game', 'defensive rebounds per game', 'def reb/g']),
      reboundsPerGame: findHeaderIndex(headers, ['rebounds per game', 'reb/g']),
      freeThrowAttemptsPerGame: findHeaderIndex(headers, ['free throw attempts per game', 'fta/g']),
      freeThrowsMadePerGame: findHeaderIndex(headers, ['free throws made per game', 'ftm/g']),
      freeThrowPercentage: findHeaderIndex(headers, ['free throw percentage', 'ft%']),
      threePointAttemptsPerGame: findHeaderIndex(headers, ['three point attempts per game', '3pa/g']),
      threePointersPerGame: findHeaderIndex(headers, ['three pointers per game', '3pm/g']),
      threePointPercentage: findHeaderIndex(headers, ['three point percentage', '3p%']),
      threePointPercentageDefense: findHeaderIndex(headers, ['three point percentage defense', '3p% defense']),
      blocksPerGame: findHeaderIndex(headers, ['blocks per game', 'blk/g']),
      stealsPerGame: findHeaderIndex(headers, ['steals per game', 'stl/g']),
      scoringDefense: findHeaderIndex(headers, ['scoring defense', 'points allowed per game']),
      scoringOffense: findHeaderIndex(headers, ['scoring offense']),
      scoringMargin: findHeaderIndex(headers, ['scoring margin', 'point margin', 'margin of victory']),
      benchPointsPerGame: findHeaderIndex(headers, ['bench points per game', 'bench points']),
      foulsPerGame: findHeaderIndex(headers, ['fouls per game', 'personal fouls per game']),
      turnoversPerGame: findHeaderIndex(headers, ['turnovers per game', 'to/g']),
      turnoversForcedPerGame: findHeaderIndex(headers, ['turnovers forced per game']),
      fieldGoalPercentage: findHeaderIndex(headers, ['field goal percentage', 'fg%']),
      fieldGoalPercentageDefense: findHeaderIndex(headers, ['field goal percentage defense', 'opponent fg%']),
      fastbreakPoints: findHeaderIndex(headers, ['fastbreak points']),
      winningPercentage: findHeaderIndex(headers, ['winning percentage', 'win %'])
    };
    
    // Map the data to team objects
    const teams = dataRows.map((row, index) => {
      try {
        if (!row || row.length < 6) {
          console.warn(`Row ${index + 2} is incomplete, skipping...`);
          return null;
        }
        
        // Fallback to column order if headers are missing
        const rank = idx.rank !== -1 ? row[idx.rank] : row[0];
        const team = idx.team !== -1 ? row[idx.team] : row[1];
        const gm = idx.gm !== -1 ? row[idx.gm] : row[2];
        const wl = idx.wl !== -1 ? row[idx.wl] : row[3];
        const pts = idx.pts !== -1 ? row[idx.pts] : row[4];
        const ppg = idx.ppg !== -1 ? row[idx.ppg] : row[5];
        const conference = idx.conference !== -1 ? row[idx.conference] : row[6];
        
        // Parse win-loss
        const { wins, losses } = parseWinLossRecord(String(wl || ''));        
        
        // Validate required fields
        if (!team || !rank || wins === null || losses === null || (!ppg && !advIdx.scoringOffense)) {
          console.warn(`Row ${index + 2} has invalid data, skipping...`);
          return null;
        }
        
        const base = {
          rank: parseInt(rank) || 0,
          team: String(team).trim(),
          gamesPlayed: parseInt(gm) || 0,
          wins: wins,
          losses: losses,
          totalPoints: parseNumber(pts),
          pointsPerGame: parseNumber(ppg),
          conference: String(conference || '').trim(),
          winRate: wins + losses > 0 ? wins / (wins + losses) : 0,
          displayName: `${team} (#${rank}) - ${conference || 'Unknown'}`
        };

        // Attach advanced metrics when available
        const teamObj = { ...base };
        if (advIdx.efg !== -1) teamObj.effectiveFgPct = parsePercentToDecimal(row[advIdx.efg]);
        if (advIdx.turnoverMargin !== -1) teamObj.turnoverMargin = parseNumber(row[advIdx.turnoverMargin]);
        if (advIdx.assistTurnoverRatio !== -1) teamObj.assistTurnoverRatio = parseNumber(row[advIdx.assistTurnoverRatio]);
        if (advIdx.offensiveReboundsPerGame !== -1) teamObj.offensiveReboundsPerGame = parseNumber(row[advIdx.offensiveReboundsPerGame]);
        if (advIdx.defensiveReboundsPerGame !== -1) teamObj.defensiveReboundsPerGame = parseNumber(row[advIdx.defensiveReboundsPerGame]);
        if (advIdx.reboundsPerGame !== -1) teamObj.reboundsPerGame = parseNumber(row[advIdx.reboundsPerGame]);
        if (advIdx.freeThrowAttemptsPerGame !== -1) teamObj.freeThrowAttemptsPerGame = parseNumber(row[advIdx.freeThrowAttemptsPerGame]);
        if (advIdx.freeThrowsMadePerGame !== -1) teamObj.freeThrowsMadePerGame = parseNumber(row[advIdx.freeThrowsMadePerGame]);
        if (advIdx.freeThrowPercentage !== -1) teamObj.freeThrowPercentage = parsePercentToDecimal(row[advIdx.freeThrowPercentage]);
        if (advIdx.threePointAttemptsPerGame !== -1) teamObj.threePointAttemptsPerGame = parseNumber(row[advIdx.threePointAttemptsPerGame]);
        if (advIdx.threePointersPerGame !== -1) teamObj.threePointersPerGame = parseNumber(row[advIdx.threePointersPerGame]);
        if (advIdx.threePointPercentage !== -1) teamObj.threePointPercentage = parsePercentToDecimal(row[advIdx.threePointPercentage]);
        if (advIdx.threePointPercentageDefense !== -1) teamObj.threePointPercentageDefense = parsePercentToDecimal(row[advIdx.threePointPercentageDefense]);
        if (advIdx.blocksPerGame !== -1) teamObj.blocksPerGame = parseNumber(row[advIdx.blocksPerGame]);
        if (advIdx.stealsPerGame !== -1) teamObj.stealsPerGame = parseNumber(row[advIdx.stealsPerGame]);
        if (advIdx.scoringDefense !== -1) teamObj.scoringDefense = parseNumber(row[advIdx.scoringDefense]);
        if (advIdx.scoringOffense !== -1 && !teamObj.pointsPerGame) teamObj.pointsPerGame = parseNumber(row[advIdx.scoringOffense]);
        if (advIdx.scoringMargin !== -1) teamObj.scoringMargin = parseNumber(row[advIdx.scoringMargin]);
        if (advIdx.benchPointsPerGame !== -1) teamObj.benchPointsPerGame = parseNumber(row[advIdx.benchPointsPerGame]);
        if (advIdx.foulsPerGame !== -1) teamObj.foulsPerGame = parseNumber(row[advIdx.foulsPerGame]);
        if (advIdx.turnoversPerGame !== -1) teamObj.turnoversPerGame = parseNumber(row[advIdx.turnoversPerGame]);
        if (advIdx.turnoversForcedPerGame !== -1) teamObj.turnoversForcedPerGame = parseNumber(row[advIdx.turnoversForcedPerGame]);
        if (advIdx.fieldGoalPercentage !== -1) teamObj.fieldGoalPercentage = parsePercentToDecimal(row[advIdx.fieldGoalPercentage]);
        if (advIdx.fieldGoalPercentageDefense !== -1) teamObj.fieldGoalPercentageDefense = parsePercentToDecimal(row[advIdx.fieldGoalPercentageDefense]);
        if (advIdx.fastbreakPoints !== -1) teamObj.fastbreakPoints = parseNumber(row[advIdx.fastbreakPoints]);
        if (advIdx.winningPercentage !== -1 && !Number.isFinite(teamObj.winRate)) {
          const wp = parsePercentToDecimal(row[advIdx.winningPercentage]);
          if (wp !== null) teamObj.winRate = wp;
        }
        
        return teamObj;
      } catch (error) {
        console.warn(`Error parsing row ${index + 2}:`, error);
        return null;
      }
    }).filter(team => team !== null); // Remove null entries
    
    console.log(`Successfully parsed ${teams.length} teams from Excel file`);
    return teams;
    
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

/**
 * Parse win-loss record string (e.g., "28-9" -> {wins: 28, losses: 9})
 */
const parseWinLossRecord = (wlString) => {
  try {
    if (!wlString || typeof wlString !== 'string') {
      return { wins: 0, losses: 0 };
    }
    
    const parts = wlString.trim().split('-');
    if (parts.length !== 2) {
      return { wins: 0, losses: 0 };
    }
    
    const wins = parseInt(parts[0]) || 0;
    const losses = parseInt(parts[1]) || 0;
    
    return { wins, losses };
  } catch (error) {
    console.warn('Error parsing win-loss record:', wlString, error);
    return { wins: 0, losses: 0 };
  }
};

/**
 * Validate Excel file format
 */
export const validateExcelFile = (file) => {
  // Check file type
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ];
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Please upload a valid Excel file (.xlsx or .xls)');
  }
  
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size too large. Please upload a file smaller than 10MB');
  }
  
  return true;
};

/**
 * Get sample data structure for testing
 */
export const getSampleTeamData = () => {
  return [
    {
      rank: 1,
      team: "Alabama",
      gamesPlayed: 37,
      wins: 28,
      losses: 9,
      totalPoints: 3355,
      pointsPerGame: 90.7,
      conference: "SEC",
      winRate: 0.757,
      displayName: "Alabama (#1) - SEC"
    },
    {
      rank: 2,
      team: "Gonzaga",
      gamesPlayed: 35,
      wins: 26,
      losses: 9,
      totalPoints: 3024,
      pointsPerGame: 86.4,
      conference: "WCC",
      winRate: 0.743,
      displayName: "Gonzaga (#2) - WCC"
    }
  ];
};

// Merge multiple Excel files by Team, enriching the base dataset with advanced metrics
export const parseMultipleExcelFiles = async (files) => {
  // Find a base file (has Rank/Team/W-L/PPG or Scoring Offense)
  const isBaseHeaders = (headers) => {
    const hasTeam = findHeaderIndex(headers, ['team', 'school']) !== -1;
    const hasRank = findHeaderIndex(headers, ['rank']) !== -1;
    const hasWL = findHeaderIndex(headers, ['w-l', 'record', 'w / l', 'w/l', 'wins-losses']) !== -1;
    const hasPPG = findHeaderIndex(headers, ['ppg', 'points per game', 'scoring offense']) !== -1;
    return hasTeam && hasRank && (hasWL || hasPPG);
  };

  // Read all files to memory
  const readSheet = async (file) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    return rows;
  };

  // Build a map of team -> data from the base file
  const teamMap = new Map();
  let baseLoaded = false;

  // First pass: collect candidate base files (has Rank/Team/W-L/PPG or Scoring Offense)
  const candidateBase = [];
  for (const f of files) {
    const rows = await readSheet(f);
    if (!rows || rows.length < 2) continue;
    const headerRowIdx = findHeaderRowIndex(rows);
    const headers = rows[headerRowIdx];
    if (isBaseHeaders(headers)) {
      candidateBase.push(f);
    }
  }

  if (candidateBase.length > 0) {
    const baseTeams = await parseExcelFile(candidateBase[0]);
    baseTeams.forEach(t => teamMap.set(normalizeTeamKey(t.team), t));
    baseLoaded = true;
  }

  // If no base file, attempt to build base from a Scoring Offense/PPG file
  if (!baseLoaded) {
    for (const f of files) {
      const rows = await readSheet(f);
      if (!rows || rows.length < 2) continue;
      const headerRowIdx = findHeaderRowIndex(rows);
      const headers = rows[headerRowIdx];
      const teamIdx = findHeaderIndex(headers, ['team', 'school']);
      const ppgIdx = findHeaderIndex(headers, ['ppg', 'points per game', 'scoring offense']);
      if (teamIdx !== -1) {
        const dataRows = rows.slice(headerRowIdx + 1);
        for (const row of dataRows) {
          const name = String(row[teamIdx] || '').trim();
          if (!name) continue;
          const ppgVal = ppgIdx !== -1 ? parseNumber(row[ppgIdx]) : null;
          // Initialize minimal base with neutral defaults
          teamMap.set(normalizeTeamKey(name), {
            rank: 178,
            team: name,
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            totalPoints: 0,
            pointsPerGame: ppgVal || 0,
            conference: '',
            winRate: 0.5,
            displayName: `${name}`
          });
        }
        baseLoaded = true;
        break;
      }
    }
  }
  
  if (!baseLoaded) {
    throw new Error('No base file found. Please include a file with Team names and either Rank/W-L/PPG or Scoring Offense data. The "Scoring Offense.xlsx" file is recommended as a base file.');
  }
  
  // Log summary of loaded data
  const loadedMetrics = new Set();
  Array.from(teamMap.values()).forEach(team => {
    Object.keys(team).forEach(key => {
      if (team[key] != null && !['team', 'rank', 'gamesPlayed', 'wins', 'losses', 'totalPoints', 'pointsPerGame', 'conference', 'winRate', 'displayName'].includes(key)) {
        loadedMetrics.add(key);
      }
    });
  });
  
  console.log(`Successfully merged ${teamMap.size} teams with ${loadedMetrics.size} additional metrics:`, Array.from(loadedMetrics).sort());
  
  // Metric definitions (synonyms + type)
  const metrics = [
    { key: 'blocksPerGame', type: 'number', synonyms: ['blocks per game', 'blk/g'] },
    { key: 'stealsPerGame', type: 'number', synonyms: ['steals per game', 'stl/g'] },
    { key: 'assistTurnoverRatio', type: 'number', synonyms: ['assist/turnover ratio', 'assists/turnover ratio', 'a/t ratio'] },
    { key: 'turnoverMargin', type: 'number', synonyms: ['turnover margin'] },
    { key: 'turnoversPerGame', type: 'number', synonyms: ['turnovers per game', 'to/g', 'turnovers/g', 'to', 'turnovers'] },
    { key: 'offensiveReboundsPerGame', type: 'number', synonyms: ['rebounds (offensive) per game', 'offensive rebounds per game', 'off reb/g'] },
    { key: 'benchPointsPerGame', type: 'number', synonyms: ['bench points per game', 'bench points', 'bench scoring per game', 'bench/g'] },
    { key: 'freeThrowsMadePerGame', type: 'number', synonyms: ['free throws made per game', 'ftm/g', 'ftm'] },
    { key: 'freeThrowAttemptsPerGame', type: 'number', synonyms: ['free throw attempts per game', 'fta/g', 'fta', 'free throws attempted'] },
    { key: 'freeThrowPercentage', type: 'percent', synonyms: ['free throw percentage', 'ft%', 'free throws %'] },
    { key: 'threePointAttemptsPerGame', type: 'number', synonyms: ['three point attempts per game', '3pa/g', '3pa', 'three-point attempts', '3pt attempts', '3-pointers attempted'] },
    { key: 'threePointPercentage', type: 'percent', synonyms: ['three point percentage', '3p%', 'three-point percentage'] },
    { key: 'threePointPercentageDefense', type: 'percent', synonyms: ['three point percentage defense', '3p% defense', 'opponent 3p%', '3 point defense'] },
    { key: 'effectiveFgPct', type: 'percent', synonyms: ['effective fg pct', 'effective fg%', 'efg%'] },
    { key: 'fieldGoalPercentage', type: 'percent', synonyms: ['field goal percentage', 'fg%'] },
    { key: 'fieldGoalPercentageDefense', type: 'percent', synonyms: ['field goal percentage defense', 'opponent fg%'] },
    { key: 'scoringDefense', type: 'number', synonyms: ['scoring defense', 'points allowed per game', 'opp ppg', 'points allowed'] },
    { key: 'scoringMargin', type: 'number', synonyms: ['scoring margin', 'point margin', 'margin of victory'] },
    { key: 'fastbreakPoints', type: 'number', synonyms: ['fastbreak points'] },
    { key: 'assistsPerGame', type: 'number', synonyms: ['assists per game'] },
    { key: 'foulsPerGame', type: 'number', synonyms: ['fouls per game', 'personal fouls per game'] },
    // Points per game from scoring offense files (maps to base field)
    { key: 'pointsPerGame', type: 'number', synonyms: ['ppg', 'points per game', 'scoring offense'] },
  ];

  // Second pass: merge metric-only files by Team
  for (const f of files) {
    const rows = await readSheet(f);
    if (!rows || rows.length < 2) continue;
    const headerRowIdx = findHeaderRowIndex(rows);
    const headers = rows[headerRowIdx];
    if (isBaseHeaders(headers)) continue; // already loaded base

    const teamIdx = findHeaderIndex(headers, ['team', 'school']);
    if (teamIdx === -1) continue;

    // Build indices for all known metrics present in this file
    const present = metrics
      .map(m => ({ ...m, idx: findHeaderIndex(headers, m.synonyms) }))
      .filter(m => m.idx !== -1);

    if (present.length === 0) continue; // nothing parsable

    const dataRows = rows.slice(headerRowIdx + 1);
    for (const row of dataRows) {
      const name = String(row[teamIdx] || '').trim();
      if (!name) continue;
      const team = teamMap.get(normalizeTeamKey(name));
      if (!team) continue; // skip if not in base

      for (const m of present) {
        const raw = row[m.idx];
        if (raw === undefined || raw === null || raw === '') continue;
        const value = m.type === 'percent' ? parsePercentToDecimal(raw) : parseNumber(raw);
        if (value !== null && !Number.isNaN(value)) {
          team[m.key] = value;
        }
      }
    }
  }

  return Array.from(teamMap.values());
};