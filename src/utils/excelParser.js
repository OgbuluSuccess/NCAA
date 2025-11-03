import * as XLSX from 'xlsx';

/**
 * Parse Excel file containing NCAA team statistics
 * Expected columns: Rank, Team, GM, W-L, PTS, PPG, Conference
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
    
    // Get headers from first row
    const headers = jsonData[0];
    const dataRows = jsonData.slice(1);
    
    // Map the data to team objects
    const teams = dataRows.map((row, index) => {
      try {
        // Handle missing or incomplete rows
        if (!row || row.length < 6) {
          console.warn(`Row ${index + 2} is incomplete, skipping...`);
          return null;
        }
        
        const [rank, team, gm, wl, pts, ppg, conference] = row;
        
        // Parse win-loss record
        const { wins, losses } = parseWinLossRecord(wl);
        
        // Validate required fields
        if (!team || !rank || wins === null || losses === null || !ppg) {
          console.warn(`Row ${index + 2} has invalid data, skipping...`);
          return null;
        }
        
        return {
          rank: parseInt(rank) || 0,
          team: String(team).trim(),
          gamesPlayed: parseInt(gm) || 0,
          wins: wins,
          losses: losses,
          totalPoints: parseInt(pts) || 0,
          pointsPerGame: parseFloat(ppg) || 0,
          conference: String(conference || '').trim(),
          winRate: wins / (wins + losses),
          // Create a searchable display name
          displayName: `${team} (#${rank}) - ${conference || 'Unknown'}`
        };
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