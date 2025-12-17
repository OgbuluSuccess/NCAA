import React, { useState, useRef, useEffect } from 'react';
import { Image, Upload, Sparkles, Brain, Loader, AlertCircle, CheckCircle, ArrowLeft, Clipboard, X } from 'lucide-react';
import { calculateV2Prediction } from '../utils/v2PredictionEngine';

const AIPredictionPage = ({ onBack }) => {
  const [inputMode, setInputMode] = useState('image'); // 'image' or 'manual'
  const [imageFiles, setImageFiles] = useState([]); // Array of images
  const [imagePreviews, setImagePreviews] = useState([]); // Array of preview URLs
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Currently selected image
  const [manualTeam1Data, setManualTeam1Data] = useState(''); // Manual JSON input for team 1
  const [manualTeam2Data, setManualTeam2Data] = useState(''); // Manual JSON input for team 2
  const [manualGameContext, setManualGameContext] = useState(''); // Manual JSON input for game context
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [aiPrediction, setAiPrediction] = useState(null);
  const [localPrediction, setLocalPrediction] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  const handleImageSelect = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Filter only image files
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      setError('Please upload image files (PNG, JPG, etc.)');
      return;
    }

    if (imageFiles.length !== files.length) {
      setError(`Some files were skipped. Only images are supported. Added ${imageFiles.length} image(s).`);
    } else {
      setError('');
    }

    processImageFiles(imageFiles);
  };

  const processImageFiles = (newFiles) => {
    // Add new files to existing ones
    const updatedFiles = [...imageFiles, ...newFiles];
    setImageFiles(updatedFiles);
    
    // Clear predictions when adding new images
    if (newFiles.length > 0) {
      setAiPrediction(null);
      setLocalPrediction(null);
      setExtractedData(null);
    }

    // Create previews for new files
    newFiles.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });

    // Set first new image as selected if no images were selected before
    if (imageFiles.length === 0 && newFiles.length > 0) {
      setSelectedImageIndex(0);
    }
  };

  const processImageFile = (file) => {
    // Single file processing (for paste)
    processImageFiles([file]);
  };

  // Handle paste events
  useEffect(() => {
    const handlePaste = async (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      const pastedFiles = [];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Check if the pasted item is an image
        if (item.type.indexOf('image') !== -1) {
          event.preventDefault();
          
          const blob = item.getAsFile();
          if (!blob) continue;

          // Create a File object from the blob
          const file = new File([blob], `pasted-image-${Date.now()}-${i}.png`, { type: blob.type });
          pastedFiles.push(file);
        }
      }

      if (pastedFiles.length > 0) {
        processImageFiles(pastedFiles);
      }
    };

    // Add paste event listener to the document
    document.addEventListener('paste', handlePaste);

    // Cleanup
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []); // Empty deps - processImageFiles uses setState which is stable

  const processImageWithAI = async (imageIndex = null) => {
    const indexToProcess = imageIndex !== null ? imageIndex : selectedImageIndex;
    
    if (imageFiles.length === 0) {
      setError('Please select or paste an image first');
      return;
    }

    if (indexToProcess < 0 || indexToProcess >= imageFiles.length) {
      setError('Invalid image selected');
      return;
    }

    const imageFile = imageFiles[indexToProcess];
    setSelectedImageIndex(indexToProcess);

    setIsProcessing(true);
    setError('');
    setAiPrediction(null);
    setLocalPrediction(null);

    try {
      // Convert image to base64
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      // Call our secure serverless API endpoint (API key is server-side only)
      // For local development, this will work with Vercel CLI or in production
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/analyze-image' // Vercel CLI default port
        : '/api/analyze-image'; // Production path
      
      console.log('🤖 Calling AI (OpenAI GPT-5.2 Vision) to extract data from image...');
      console.log('📡 API Endpoint:', apiUrl);
      console.log('🖼️ Image size:', (base64Image.length / 1024).toFixed(2), 'KB (base64)');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: base64Image
        })
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        
        if (response.status === 404) {
          errorMessage = 'API endpoint not found. For local development:\n\n1. Install Vercel CLI: npm install -g vercel\n2. Create .env.local with: OPENAI_API_KEY=your_key\n3. Run: vercel dev\n\nOr deploy to Vercel for production use.';
        }
        
        throw new Error(errorMessage);
      }

      // Parse JSON only if response is OK
      let result;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }

      const extracted = result.data;
      
      // Replace "Unknown Team" with "Team 1" or "Team 2" if needed
      if (!extracted.team1?.team || extracted.team1.team === 'Unknown Team' || extracted.team1.team.trim() === '') {
        extracted.team1.team = 'Team 1';
      }
      if (!extracted.team2?.team || extracted.team2.team === 'Unknown Team' || extracted.team2.team.trim() === '') {
        extracted.team2.team = 'Team 2';
      }
      
      setExtractedData(extracted);

      // Log extracted data for debugging
      console.log('✅ AI Extraction Complete!');
      console.log('📊 Extracted Data from AI (ChatGPT Vision):', JSON.stringify(extracted, null, 2));
      console.log('🔍 Team 1:', extracted.team1?.team, '| PPG:', extracted.team1?.ppg, '| Defense Rank:', extracted.team1?.defenseRank);
      console.log('🔍 Team 2:', extracted.team2?.team, '| PPG:', extracted.team2?.ppg, '| Defense Rank:', extracted.team2?.defenseRank);

      // Validate extracted data
      const validationErrors = [];
      
      // Check critical fields
      if (!extracted.team1?.team || !extracted.team2?.team) {
        validationErrors.push('Team names are missing');
      }
      
      if (!extracted.team1?.ppg || extracted.team1.ppg < 40 || extracted.team1.ppg > 120) {
        validationErrors.push(`Team 1 PPG seems invalid: ${extracted.team1?.ppg} (expected 40-120)`);
      }
      
      if (!extracted.team2?.ppg || extracted.team2.ppg < 40 || extracted.team2.ppg > 120) {
        validationErrors.push(`Team 2 PPG seems invalid: ${extracted.team2?.ppg} (expected 40-120)`);
      }
      
      if (!extracted.team1?.defenseRank || extracted.team1.defenseRank < 1 || extracted.team1.defenseRank > 363) {
        validationErrors.push(`Team 1 Defense Rank seems invalid: ${extracted.team1?.defenseRank} (expected 1-363)`);
      }
      
      if (!extracted.team2?.defenseRank || extracted.team2.defenseRank < 1 || extracted.team2.defenseRank > 363) {
        validationErrors.push(`Team 2 Defense Rank seems invalid: ${extracted.team2?.defenseRank} (expected 1-363)`);
      }

      if (validationErrors.length > 0) {
        console.warn('Data validation warnings:', validationErrors);
        // Show warnings but continue with prediction
      }

      // Calculate AI prediction using v2.2 model
      // Ensure all required fields are present with defaults
      const team1ForV2 = {
        team: extracted.team1?.team || 'Team 1',
        ppg: extracted.team1?.ppg || 70,
        pointsAllowed: extracted.team1?.pointsAllowed || 70,
        defenseRank: extracted.team1?.defenseRank || 150,
        fieldGoalPct: extracted.team1?.fieldGoalPct || 0.45,
        threePointPct: extracted.team1?.threePointPct || 0.35,
        freeThrowPct: extracted.team1?.freeThrowPct || 0.70,
        ppgRank: extracted.team1?.ppgRank || 200,
        netRank: extracted.team1?.netRank || 150,
        homeRecord: extracted.team1?.homeRecord || { wins: 0, losses: 0 },
        awayRecord: extracted.team1?.awayRecord || { wins: 0, losses: 0 },
        neutralRecord: extracted.team1?.neutralRecord || { wins: 0, losses: 0 },
        winStreak: extracted.team1?.winStreak || 0,
        lossStreak: extracted.team1?.lossStreak || 0,
        last5PPG: extracted.team1?.last5PPG || extracted.team1?.ppg || 70,
        firstHalfPPG: extracted.team1?.firstHalfPPG || ((extracted.team1?.ppg || 70) * 0.48)
      };

      const team2ForV2 = {
        team: extracted.team2?.team || 'Team 2',
        ppg: extracted.team2?.ppg || 70,
        pointsAllowed: extracted.team2?.pointsAllowed || 70,
        defenseRank: extracted.team2?.defenseRank || 150,
        fieldGoalPct: extracted.team2?.fieldGoalPct || 0.45,
        threePointPct: extracted.team2?.threePointPct || 0.35,
        freeThrowPct: extracted.team2?.freeThrowPct || 0.70,
        ppgRank: extracted.team2?.ppgRank || 200,
        netRank: extracted.team2?.netRank || 150,
        homeRecord: extracted.team2?.homeRecord || { wins: 0, losses: 0 },
        awayRecord: extracted.team2?.awayRecord || { wins: 0, losses: 0 },
        neutralRecord: extracted.team2?.neutralRecord || { wins: 0, losses: 0 },
        winStreak: extracted.team2?.winStreak || 0,
        lossStreak: extracted.team2?.lossStreak || 0,
        last5PPG: extracted.team2?.last5PPG || extracted.team2?.ppg || 70,
        firstHalfPPG: extracted.team2?.firstHalfPPG || ((extracted.team2?.ppg || 70) * 0.48)
      };

      const gameContext = extracted.gameContext || {
        isConferenceGame: false,
        team1Location: 'home',
        daysRest: 2,
        travelDistance: 0
      };

      // Calculate AI prediction using v2.2 model with AI-extracted data
      console.log('🧮 Calculating prediction using v2.2 model with AI-extracted data...');
      console.log('📥 Input Data - Team 1:', team1ForV2.team, 'PPG:', team1ForV2.ppg, 'Def Rank:', team1ForV2.defenseRank);
      console.log('📥 Input Data - Team 2:', team2ForV2.team, 'PPG:', team2ForV2.ppg, 'Def Rank:', team2ForV2.defenseRank);
      console.log('📥 Game Context:', gameContext);
      
      const v2Result = calculateV2Prediction(team1ForV2, team2ForV2, gameContext);
      const v2ResultEnriched = {
        ...v2Result,
        inputs: { team1: team1ForV2, team2: team2ForV2, gameContext },
        recommendation: {
          focus: 'halftime_team_scoring',
          label: 'Halftime (team scoring)',
          reason:
            "Generally fewer random factors than individual player props; more stable inputs like pace, efficiency, defense quality, and matchup. It's effectively a shorter window of the same team-scoring model."
        }
      };
      console.log('✅ AI Prediction (v2.2 Model) Result:', v2ResultEnriched);
      setAiPrediction(v2ResultEnriched);

      // Calculate local prediction using THE SAME v2.2 model with THE SAME data
      // Both predictions use identical v2.2 calculation - only difference is data source
      // NOTE: Since both use same data and same model, results will be identical
      console.log('🧮 Calculating Local Prediction using SAME v2.2 model with SAME data...');
      const localV2Result = calculateV2Prediction(team1ForV2, team2ForV2, gameContext);
      const localV2ResultEnriched = { ...localV2Result, recommendation: v2ResultEnriched.recommendation };
      console.log('✅ Local Prediction (v2.2 Model) Result:', localV2ResultEnriched);
      console.log('📊 Both predictions use: Same v2.2 model + Same AI-extracted data = Identical results');
      setLocalPrediction(localV2ResultEnriched);

    } catch (err) {
      console.error('AI processing error:', err);
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  const clearManualInputs = () => {
    setManualTeam1Data('');
    setManualTeam2Data('');
    setManualGameContext('');
    setError('');
    setAiPrediction(null);
    setLocalPrediction(null);
    setExtractedData(null);
  };

  const handleReset = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedImageIndex(0);
    setManualTeam1Data('');
    setManualTeam2Data('');
    setManualGameContext('');
    setAiPrediction(null);
    setLocalPrediction(null);
    setExtractedData(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Parse text format stats (e.g., "Team1, Team Stats - Through games 12/07/2025\nStat\tRank\tValue\n...")
  const parseTextStats = (text, teamNumber = 1) => {
    const lines = text.trim().split(/\r?\n/).map(line => line.trim()).filter(line => line);
    if (lines.length < 3) {
      throw new Error('Text format must have at least a header line, column headers, and one data row');
    }

    // Extract team name from first line (format: "TeamName, Team Stats - Through games ...")
    const firstLine = lines[0];
    const teamNameMatch = firstLine.match(/^([^,]+),/);
    const teamName = teamNameMatch ? teamNameMatch[1].trim() : `Team ${teamNumber}`;

    // Find header row (should contain "Stat", "Rank", "Value")
    let headerRowIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('stat') && (line.includes('rank') || line.includes('value'))) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find header row with "Stat", "Rank", "Value" columns');
    }

    // Check if it's tab-separated (most common format)
    const headerLine = lines[headerRowIndex];
    const isTabSeparated = headerLine.includes('\t');
    
    let statIdx, rankIdx, valueIdx;
    
    if (isTabSeparated) {
      // Tab-separated format
      const headerTabs = headerLine.split('\t').map(h => h.trim().toLowerCase());
      statIdx = headerTabs.findIndex(h => h.includes('stat'));
      rankIdx = headerTabs.findIndex(h => h.includes('rank'));
      valueIdx = headerTabs.findIndex(h => h.includes('value'));
      
      if (statIdx === -1 || rankIdx === -1 || valueIdx === -1) {
        throw new Error('Could not identify Stat, Rank, and Value columns in tab-separated format');
      }
    } else {
      // Space-separated format
      const headerParts = headerLine.toLowerCase().split(/\s+/);
      statIdx = headerParts.findIndex(p => p.includes('stat'));
      rankIdx = headerParts.findIndex(p => p.includes('rank'));
      valueIdx = headerParts.findIndex(p => p.includes('value'));
      
      if (statIdx === -1 || rankIdx === -1 || valueIdx === -1) {
        throw new Error('Could not identify Stat, Rank, and Value columns');
      }
    }
    
    // Parse data rows
    const stats = {};
    for (let i = headerRowIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.trim() === '') continue;
      
      let parts;
      if (isTabSeparated) {
        parts = line.split('\t').map(p => p.trim());
      } else {
        parts = line.split(/\s+/);
      }
      
      if (parts.length < Math.max(statIdx, rankIdx, valueIdx) + 1) continue;
      
      const stat = parts[statIdx]?.trim();
      const rank = parts[rankIdx]?.trim();
      const value = parts[valueIdx]?.trim();
      
      if (stat && value) {
        // Clean rank (remove "T-" prefix, commas, etc.)
        const cleanRank = rank ? parseInt(rank.replace(/[^0-9]/g, '')) || null : null;
        const cleanValue = parseFloat(value.replace(/[^0-9.]/g, '')) || null;
        
        if (cleanValue !== null) {
          stats[stat.toLowerCase()] = { 
            rank: cleanRank, 
            value: cleanValue 
          };
        }
      }
    }

    return { teamName, stats };
  };

  // Convert parsed stats to v2.2 format
  const convertStatsToV2Format = (parsedData) => {
    const { teamName, stats } = parsedData;
    
    // Helper to get stat value (fuzzy matching)
    const getValue = (keys) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      for (const key of keyArray) {
        for (const [statKey, data] of Object.entries(stats)) {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
          const normalizedStat = statKey.toLowerCase().replace(/\s+/g, '');
          if (normalizedStat.includes(normalizedKey) || normalizedKey.includes(normalizedStat)) {
            return data.value;
          }
        }
      }
      return null;
    };

    // Helper to get stat rank (fuzzy matching)
    const getRank = (keys) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      for (const key of keyArray) {
        for (const [statKey, data] of Object.entries(stats)) {
          const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
          const normalizedStat = statKey.toLowerCase().replace(/\s+/g, '');
          if (normalizedStat.includes(normalizedKey) || normalizedKey.includes(normalizedStat)) {
            return data.rank;
          }
        }
      }
      return null;
    };

    // Extract values with multiple possible key variations
    const ppg = getValue(['scoring offense', 'scoringoffense', 'points per game', 'ppg']);
    const pointsAllowed = getValue(['scoring defense', 'scoringdefense', 'points allowed', 'pointsallowed']);
    const defenseRank = getRank(['scoring defense', 'scoringdefense', 'defense rank']);
    const ppgRank = getRank(['scoring offense', 'scoringoffense', 'offense rank', 'ppg rank']);
    
    // Percentages (convert to decimal if > 1, otherwise assume already decimal)
    const fgPctRaw = getValue(['field goal percentage', 'fieldgoal', 'fg%', 'fg pct']);
    const fgPct = fgPctRaw ? (fgPctRaw > 1 ? fgPctRaw / 100 : fgPctRaw) : null;
    
    const threePctRaw = getValue(['three point percentage', 'threepoint', '3pt%', '3pt pct', 'three point pct']);
    const threePct = threePctRaw ? (threePctRaw > 1 ? threePctRaw / 100 : threePctRaw) : null;
    
    const ftPctRaw = getValue(['free throw percentage', 'freethrow', 'ft%', 'ft pct', 'free throw pct']);
    const ftPct = ftPctRaw ? (ftPctRaw > 1 ? ftPctRaw / 100 : ftPctRaw) : null;
    
    // Winning percentage
    const winPctRaw = getValue(['winning percentage', 'winning', 'win%', 'win pct']);
    const winPct = winPctRaw ? (winPctRaw > 1 ? winPctRaw / 100 : winPctRaw) : null;
    
    // NET ranking
    const netRank = getRank(['net', 'net ranking', 'net rank']);
    
    // Default records (we don't have home/away/neutral breakdown from this format)
    let homeRecord = { wins: 0, losses: 0 };
    let awayRecord = { wins: 0, losses: 0 };
    let neutralRecord = { wins: 0, losses: 0 };
    
    return {
      team: teamName,
      ppg: ppg || 70,
      pointsAllowed: pointsAllowed || 70,
      defenseRank: defenseRank || 150,
      fieldGoalPct: fgPct || 0.45,
      threePointPct: threePct || 0.35,
      freeThrowPct: ftPct || 0.70,
      ppgRank: ppgRank || 200,
      netRank: netRank || ppgRank || 150,
      homeRecord,
      awayRecord,
      neutralRecord,
      winStreak: 0,
      lossStreak: 0,
      last5PPG: ppg || 70,
      firstHalfPPG: ppg ? (ppg * 0.48) : 33.6
    };
  };

  const processManualData = async () => {
    if (!manualTeam1Data.trim() || !manualTeam2Data.trim()) {
      setError('Please provide data for both Team 1 and Team 2');
      return;
    }

    setIsProcessing(true);
    setError('');
    setAiPrediction(null);
    setLocalPrediction(null);

    try {
      // Try to parse as JSON first, then as text format
      let team1Data, team2Data, gameContextData;

      // Parse Team 1
      try {
        team1Data = JSON.parse(manualTeam1Data);
      } catch (e) {
        // Not JSON, try text format
        try {
          const parsed = parseTextStats(manualTeam1Data, 1);
          team1Data = convertStatsToV2Format(parsed);
        } catch (textError) {
          throw new Error(`Team 1 data is not valid JSON or text format: ${e.message}`);
        }
      }

      // Parse Team 2
      try {
        team2Data = JSON.parse(manualTeam2Data);
      } catch (e) {
        // Not JSON, try text format
        try {
          const parsed = parseTextStats(manualTeam2Data, 2);
          team2Data = convertStatsToV2Format(parsed);
        } catch (textError) {
          throw new Error(`Team 2 data is not valid JSON or text format: ${e.message}`);
        }
      }

      if (manualGameContext.trim()) {
        try {
          gameContextData = JSON.parse(manualGameContext);
        } catch (e) {
          throw new Error(`Game context is not valid JSON: ${e.message}`);
        }
      } else {
        gameContextData = {
          isConferenceGame: false,
          team1Location: 'home',
          daysRest: 2,
          travelDistance: 0
        };
      }

      // Combine into extracted format
      const rawData = {
        team1: team1Data,
        team2: team2Data,
        gameContext: gameContextData
      };

      console.log('📝 Manual Text Input Parsed');
      console.log('📊 Raw Parsed Data:', JSON.stringify(rawData, null, 2));

      // Send to AI for analysis with model information
      console.log('🤖 Sending data to AI for analysis with v2.2 model...');
      const apiUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/api/analyze-data' // Vercel CLI default port
        : '/api/analyze-data'; // Production path
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          teamData: rawData,
          modelVersion: 'v2.2'
        })
      });

      // Check if response is OK before parsing JSON
      if (!response.ok) {
        let errorMessage = `Server error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        
        if (response.status === 404) {
          errorMessage = 'API endpoint not found. For local development:\n\n1. Install Vercel CLI: npm install -g vercel\n2. Create .env.local with: OPENAI_API_KEY=your_key\n3. Run: vercel dev\n\nOr deploy to Vercel for production use.';
        }
        
        throw new Error(errorMessage);
      }

      // Parse JSON only if response is OK
      let result;
      try {
        const text = await response.text();
        if (!text) {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(text);
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${parseError.message}`);
      }
      
      if (!result.success || !result.data) {
        throw new Error('Invalid response from server');
      }

      const extracted = result.data;
      
      // Replace "Unknown Team" with "Team 1" or "Team 2" if needed
      if (!extracted.team1?.team || extracted.team1.team === 'Unknown Team' || extracted.team1.team.trim() === '') {
        extracted.team1.team = 'Team 1';
      }
      if (!extracted.team2?.team || extracted.team2.team === 'Unknown Team' || extracted.team2.team.trim() === '') {
        extracted.team2.team = 'Team 2';
      }
      
      setExtractedData(extracted);

      console.log('✅ AI Analysis Complete!');
      console.log('📊 AI-Validated Data:', JSON.stringify(extracted, null, 2));
      console.log('🔍 Team 1:', extracted.team1?.team, '| PPG:', extracted.team1?.ppg, '| Defense Rank:', extracted.team1?.defenseRank);
      console.log('🔍 Team 2:', extracted.team2?.team, '| PPG:', extracted.team2?.ppg, '| Defense Rank:', extracted.team2?.defenseRank);

      // Validate and prepare data for v2.2 model (same as AI extraction)
      console.log('🔧 Preparing data for v2.2 model calculation...');
      const team1ForV2 = {
        team: extracted.team1?.team || 'Team 1',
        ppg: extracted.team1?.ppg || 70,
        pointsAllowed: extracted.team1?.pointsAllowed || 70,
        defenseRank: extracted.team1?.defenseRank || 150,
        fieldGoalPct: extracted.team1?.fieldGoalPct || 0.45,
        threePointPct: extracted.team1?.threePointPct || 0.35,
        freeThrowPct: extracted.team1?.freeThrowPct || 0.70,
        ppgRank: extracted.team1?.ppgRank || 200,
        netRank: extracted.team1?.netRank || 150,
        homeRecord: extracted.team1?.homeRecord || { wins: 0, losses: 0 },
        awayRecord: extracted.team1?.awayRecord || { wins: 0, losses: 0 },
        neutralRecord: extracted.team1?.neutralRecord || { wins: 0, losses: 0 },
        winStreak: extracted.team1?.winStreak || 0,
        lossStreak: extracted.team1?.lossStreak || 0,
        last5PPG: extracted.team1?.last5PPG || extracted.team1?.ppg || 70,
        firstHalfPPG: extracted.team1?.firstHalfPPG || ((extracted.team1?.ppg || 70) * 0.48)
      };

      const team2ForV2 = {
        team: extracted.team2?.team || 'Team 2',
        ppg: extracted.team2?.ppg || 70,
        pointsAllowed: extracted.team2?.pointsAllowed || 70,
        defenseRank: extracted.team2?.defenseRank || 150,
        fieldGoalPct: extracted.team2?.fieldGoalPct || 0.45,
        threePointPct: extracted.team2?.threePointPct || 0.35,
        freeThrowPct: extracted.team2?.freeThrowPct || 0.70,
        ppgRank: extracted.team2?.ppgRank || 200,
        netRank: extracted.team2?.netRank || 150,
        homeRecord: extracted.team2?.homeRecord || { wins: 0, losses: 0 },
        awayRecord: extracted.team2?.awayRecord || { wins: 0, losses: 0 },
        neutralRecord: extracted.team2?.neutralRecord || { wins: 0, losses: 0 },
        winStreak: extracted.team2?.winStreak || 0,
        lossStreak: extracted.team2?.lossStreak || 0,
        last5PPG: extracted.team2?.last5PPG || extracted.team2?.ppg || 70,
        firstHalfPPG: extracted.team2?.firstHalfPPG || ((extracted.team2?.ppg || 70) * 0.48)
      };

      const gameContext = extracted.gameContext || {
        isConferenceGame: false,
        team1Location: 'home',
        daysRest: 2,
        travelDistance: 0
      };

      // Calculate predictions using v2.2 model with AI-analyzed data
      console.log('🧮 Calculating prediction using v2.2 model with AI-analyzed data...');
      console.log('📥 Input Data - Team 1:', team1ForV2.team, 'PPG:', team1ForV2.ppg, 'Def Rank:', team1ForV2.defenseRank);
      console.log('📥 Input Data - Team 2:', team2ForV2.team, 'PPG:', team2ForV2.ppg, 'Def Rank:', team2ForV2.defenseRank);
      console.log('📥 Game Context:', gameContext);
      
      const v2Result = calculateV2Prediction(team1ForV2, team2ForV2, gameContext);
      const v2ResultEnriched = {
        ...v2Result,
        inputs: { team1: team1ForV2, team2: team2ForV2, gameContext },
        recommendation: {
          focus: 'halftime_team_scoring',
          label: 'Halftime (team scoring)',
          reason:
            "Generally fewer random factors than individual player props; more stable inputs like pace, efficiency, defense quality, and matchup. It's effectively a shorter window of the same team-scoring model."
        }
      };
      console.log('✅ AI Prediction (v2.2 Model) Result:', v2ResultEnriched);
      setAiPrediction(v2ResultEnriched);

      // Local prediction uses same AI-analyzed data and same model
      // NOTE: Since both use same AI-analyzed data and same model, results will be identical
      console.log('🧮 Calculating Local Prediction using SAME v2.2 model with SAME AI-analyzed data...');
      const localV2Result = calculateV2Prediction(team1ForV2, team2ForV2, gameContext);
      const localV2ResultEnriched = { ...localV2Result, recommendation: v2ResultEnriched.recommendation };
      console.log('✅ Local Prediction (v2.2 Model) Result:', localV2ResultEnriched);
      console.log('📊 Both predictions use: Same v2.2 model + Same AI-analyzed data = Identical results');
      setLocalPrediction(localV2ResultEnriched);

    } catch (err) {
      console.error('Manual data processing error:', err);
      setError(err.message || 'Failed to process manual data. Please check your JSON format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const removeImage = (index) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    
    setImageFiles(newFiles);
    setImagePreviews(newPreviews);
    
    // Adjust selected index if needed
    if (selectedImageIndex >= newFiles.length) {
      setSelectedImageIndex(Math.max(0, newFiles.length - 1));
    } else if (selectedImageIndex > index) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
    
    // Clear predictions if we removed the currently selected image
    if (index === selectedImageIndex) {
      setAiPrediction(null);
      setLocalPrediction(null);
      setExtractedData(null);
    }
  };

  return (
    <div className="min-h-screen bg-ncaa-dark">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="text-center mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-ncaa-yellow" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
              AI-Powered Prediction
            </h1>
            <Brain className="w-8 h-8 sm:w-10 sm:h-10 text-ncaa-blue" />
          </div>
          <p className="text-base sm:text-xl text-gray-300 font-medium">
            Upload Screenshot • AI Analysis • Dual Model Comparison
          </p>
          <p className="text-gray-400 mt-2">
            Using ChatGPT Vision API + v2.2 Model (Both Predictions Use Same Model)
          </p>
        </header>

        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="btn-secondary flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Main Predictor</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-200 font-semibold mb-1">Error</p>
                <p className="text-red-200 whitespace-pre-line">{error}</p>
                {error.includes('API endpoint not found') && (
                  <div className="mt-3 p-3 bg-red-800/50 rounded border border-red-700">
                    <p className="text-red-100 text-sm font-semibold mb-2">Quick Setup for Local Development:</p>
                    <ol className="text-red-200 text-sm list-decimal list-inside space-y-1">
                      <li>Install Vercel CLI: <code className="bg-red-900/50 px-1 rounded">npm install -g vercel</code></li>
                      <li>Create <code className="bg-red-900/50 px-1 rounded">.env.local</code> with your <code className="bg-red-900/50 px-1 rounded">OPENAI_API_KEY</code></li>
                      <li>Run <code className="bg-red-900/50 px-1 rounded">vercel dev</code> instead of <code className="bg-red-900/50 px-1 rounded">npm run dev</code></li>
                    </ol>
                    <p className="text-red-300 text-xs mt-2">See LOCAL_DEVELOPMENT.md for detailed instructions.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
          {/* Input Mode Toggle */}
          <div className="card bg-ncaa-gray-light">
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setInputMode('image')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  inputMode === 'image'
                    ? 'bg-ncaa-blue text-white'
                    : 'bg-ncaa-gray text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Image className="w-4 h-4 inline mr-2" />
                Image Upload
              </button>
              <button
                onClick={() => setInputMode('manual')}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  inputMode === 'manual'
                    ? 'bg-ncaa-blue text-white'
                    : 'bg-ncaa-gray text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Clipboard className="w-4 h-4 inline mr-2" />
                Manual Input
              </button>
            </div>
          </div>

          {/* Image Upload Section */}
          {inputMode === 'image' && (
            <div className="card" ref={containerRef}>
              <h2 className="text-xl font-bold text-white mb-4">
                Upload Screenshot
              </h2>
            
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer
                  ${imagePreviews.length > 0 
                    ? 'border-ncaa-green bg-green-900/20' 
                    : 'border-gray-600 hover:border-ncaa-blue hover:bg-ncaa-blue/10'
                  }
                `}
                onClick={() => fileInputRef.current?.click()}
                onFocus={() => {}}
                tabIndex={0}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
                
                {imagePreviews.length > 0 ? (
                  <div className="space-y-4">
                    {/* Image Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <div
                          key={index}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIndex === index
                              ? 'border-ncaa-yellow ring-2 ring-ncaa-yellow'
                              : 'border-gray-600 hover:border-ncaa-blue'
                          }`}
                        >
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-32 object-cover cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImageIndex(index);
                            }}
                          />
                          {selectedImageIndex === index && (
                            <div className="absolute top-1 left-1 bg-ncaa-yellow text-black text-xs font-bold px-2 py-1 rounded">
                              Selected
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(index);
                            }}
                            className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1"
                            title="Remove image"
                          >
                            <AlertCircle className="w-4 h-4" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                            Image {index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Selected Image Preview */}
                    {imagePreviews[selectedImageIndex] && (
                      <div className="mt-4">
                        <p className="text-center text-gray-300 mb-2">
                          Selected Image ({selectedImageIndex + 1} of {imagePreviews.length})
                        </p>
                        <img
                          src={imagePreviews[selectedImageIndex]}
                          alt="Selected preview"
                          className="max-w-full max-h-96 mx-auto rounded-lg border-2 border-ncaa-yellow"
                        />
                      </div>
                    )}
                    
                    <p className="text-center text-green-300 text-sm">
                      {imagePreviews.length} image(s) loaded. Click to add more or paste (Ctrl+V / Cmd+V)
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-3">
                    <Image className="w-12 h-12 text-gray-400" />
                    <p className="text-gray-300 font-semibold">
                      Click to upload screenshot(s)
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Clipboard className="w-4 h-4" />
                      <span>or press Ctrl+V (Cmd+V on Mac) to paste from clipboard</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      PNG, JPG, or other image formats • Multiple images supported
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-center gap-3 flex-wrap">
                <button
                  onClick={() => processImageWithAI()}
                  disabled={imageFiles.length === 0 || isProcessing}
                  className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Calling AI (GPT-5.2 Vision)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze with AI</span>
                    </>
                  )}
                </button>
                
                {imageFiles.length > 0 && (
                  <>
                    <button
                      onClick={handleReset}
                      className="btn-secondary w-full sm:w-auto"
                    >
                      Clear All
                    </button>
                    <div className="text-sm text-gray-400 flex items-center justify-center">
                      {imageFiles.length} image(s) • Select one to analyze
                    </div>
                  </>
                )}
              </div>
            </div>
            </div>
          )}

          {/* Manual Input Section */}
          {inputMode === 'manual' && (
            <div className="card">
              <div className="flex items-center space-x-2 mb-4">
                <Brain className="w-6 h-6 text-ncaa-blue" />
                <h2 className="text-xl font-bold text-white">
                  Manual Data Input (v2.2 Model)
                </h2>
              </div>
              <p className="text-sm text-gray-300 mb-4">
                Enter team statistics manually. Data will be sent to AI (ChatGPT) for analysis and validation with v2.2 model context, then used for prediction.
              </p>
              
              <div className="space-y-4">
                <p className="text-gray-300 text-sm mb-4">
                  Paste data for each team. You can use either:
                  <br />• <strong>JSON format</strong> (same as AI extraction output)
                  <br />• <strong>Text format</strong> (copy-paste from stats table with Stat, Rank, Value columns)
                </p>

                {/* Team 1 Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">
                    Team 1 Data (JSON or Text Format)
                  </label>
                  <textarea
                    value={manualTeam1Data}
                    onChange={(e) => setManualTeam1Data(e.target.value)}
                    placeholder={`Paste JSON or text format:\n\nJSON:\n{\n  "team": "Team Name",\n  "ppg": 84.3,\n  ...\n}\n\nOR Text Format:\nTeam1, Team Stats - Through games 12/07/2025\nStat\tRank\tValue\nScoring Offense\t78\t84.3\nScoring Defense\t316\t80.3\n...`}
                    className="w-full h-64 bg-ncaa-gray-light border border-gray-600 text-white rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ncaa-blue focus:border-transparent"
                  />
                </div>

                {/* Team 2 Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">
                    Team 2 Data (JSON or Text Format)
                  </label>
                  <textarea
                    value={manualTeam2Data}
                    onChange={(e) => setManualTeam2Data(e.target.value)}
                    placeholder={`Paste JSON or text format:\n\nJSON:\n{\n  "team": "Team Name",\n  "ppg": 69.1,\n  ...\n}\n\nOR Text Format:\nTeam2, Team Stats - Through games 12/07/2025\nStat\tRank\tValue\nScoring Offense\t322\t69.1\nScoring Defense\t355\t88.4\n...`}
                    className="w-full h-64 bg-ncaa-gray-light border border-gray-600 text-white rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ncaa-blue focus:border-transparent"
                  />
                </div>

                {/* Game Context Input (Optional) */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-300">
                    Game Context (JSON - Optional)
                  </label>
                  <textarea
                    value={manualGameContext}
                    onChange={(e) => setManualGameContext(e.target.value)}
                    placeholder={`{\n  "isConferenceGame": false,\n  "team1Location": "home",\n  "daysRest": 2,\n  "travelDistance": 0\n}`}
                    className="w-full h-32 bg-ncaa-gray-light border border-gray-600 text-white rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ncaa-blue focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400">
                    Optional. If left empty, defaults will be used.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                  <button
                    onClick={processManualData}
                    disabled={!manualTeam1Data.trim() || !manualTeam2Data.trim() || isProcessing}
                    className="btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span>AI Analyzing with v2.2 Model...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Send to AI for Analysis</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={clearManualInputs}
                    disabled={isProcessing || (!manualTeam1Data.trim() && !manualTeam2Data.trim() && !manualGameContext.trim())}
                    className="px-6 py-2 bg-ncaa-gray text-gray-300 rounded-lg font-semibold hover:bg-gray-600 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    <X className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Processing Status */}
          {isProcessing && (
            <div className="card bg-ncaa-gray-light border-2 border-ncaa-yellow">
              <div className="flex items-center space-x-3">
                <Loader className="w-5 h-5 animate-spin text-ncaa-yellow" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {inputMode === 'image' ? 'AI Analysis in Progress' : 'AI Analysis in Progress'}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {inputMode === 'image' 
                      ? '🤖 Calling OpenAI GPT-5.2 Vision API to extract team statistics from image...'
                      : '🤖 Calling OpenAI GPT-5.2 API to analyze manual input data with v2.2 model context...'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {inputMode === 'image' 
                      ? 'This may take 5-15 seconds depending on image complexity'
                      : 'AI is validating and enhancing your data for v2.2 model (3-8 seconds)'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extracted Data Debug View */}
          {extractedData && !isProcessing && (
            <div className="card bg-ncaa-gray-light border border-ncaa-blue">
              <div className="flex items-center space-x-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-bold text-white">
                  {inputMode === 'image' ? '✅ AI Extraction Complete' : '✅ AI Analysis Complete'}
                </h3>
              </div>
              <p className="text-sm text-gray-300 mb-3">
                {inputMode === 'image' 
                  ? 'Data extracted by ChatGPT Vision API (GPT-5.2) and used with v2.2 model'
                  : 'Data analyzed and validated by ChatGPT API (GPT-5.2) with v2.2 model context, then used for prediction'}
              </p>
              <details className="text-sm">
                <summary className="cursor-pointer text-ncaa-blue hover:text-ncaa-yellow mb-2 font-semibold">
                  Click to view {inputMode === 'image' ? 'raw extracted data from AI' : 'AI-analyzed data'}
                </summary>
                <pre className="bg-black/50 p-4 rounded overflow-auto text-xs text-gray-300 max-h-96">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              </details>
            </div>
          )}

          {/* Predictions Display */}
          {(aiPrediction || localPrediction) && (
            <div className="space-y-6">
              {/* AI Prediction (v2.2 Model) */}
              {aiPrediction && (
                <div className="card border-2 border-ncaa-yellow">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-6 h-6 text-ncaa-yellow" />
                    <h2 className="text-2xl font-bold text-white">
                      AI Prediction (v2.2 Model)
                    </h2>
                  </div>
                  
                  <PredictionDisplay prediction={aiPrediction} modelType="v2" />
                </div>
              )}

              {/* Local Prediction */}
              {localPrediction && (
                <div className="card border-2 border-ncaa-blue">
                  <div className="flex items-center space-x-2 mb-4">
                    <Brain className="w-6 h-6 text-ncaa-blue" />
                    <h2 className="text-2xl font-bold text-white">
                      Local Prediction (v2.2 Model)
                    </h2>
                  </div>
                  
                  <PredictionDisplay prediction={localPrediction} modelType="v2" />
                </div>
              )}

              {/* Comparison */}
              {aiPrediction && localPrediction && (
                <div className="card bg-ncaa-gray-light">
                  <h3 className="text-xl font-bold text-white mb-4">
                    Model Comparison
                  </h3>
                  <ComparisonDisplay aiPrediction={aiPrediction} localPrediction={localPrediction} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Prediction Display Component
const PredictionDisplay = ({ prediction, modelType }) => {
  if (modelType === 'v2') {
    const inputs = prediction?.inputs;
    const calcs = prediction?.calculations;

    const getWinPct = (record) => {
      if (!record || typeof record.wins !== 'number' || typeof record.losses !== 'number') return null;
      const games = record.wins + record.losses;
      if (games <= 0) return null;
      return record.wins / games;
    };

    const getDefenseTier = (rank) => {
      if (typeof rank !== 'number') return 'Unknown';
      if (rank <= 30) return 'Elite (1-30)';
      if (rank <= 70) return 'Very Good (31-70)';
      if (rank <= 110) return 'Good (71-110)';
      if (rank <= 180) return 'Average (111-180)';
      if (rank <= 250) return 'Below Avg (181-250)';
      if (rank <= 320) return 'Poor (251-320)';
      if (rank <= 363) return 'Terrible (321-363)';
      return 'Unknown';
    };

    const getPaceCategory = (ppg) => {
      if (typeof ppg !== 'number') return 'Unknown';
      if (ppg >= 85) return 'Very Fast';
      if (ppg >= 78) return 'Fast';
      if (ppg >= 70) return 'Moderate';
      if (ppg >= 65) return 'Slow';
      return 'Very Slow';
    };

    // Simple "might score higher/lower than predicted" indicator (UI-only; does NOT change v2.2 model)
    const getScoreLean = (teamIndex) => {
      const t = teamIndex === 1 ? inputs?.team1 : inputs?.team2;
      const o = teamIndex === 1 ? inputs?.team2 : inputs?.team1;
      const ctx = inputs?.gameContext || {};
      const isTeam1 = teamIndex === 1;
      const teamIsHome = isTeam1 ? ctx.team1Location === 'home' : ctx.team1Location === 'away';
      const teamIsAway = isTeam1 ? ctx.team1Location === 'away' : ctx.team1Location === 'home';

      let score = 0;
      const reasons = [];

      // Pace (more possessions → slight upside)
      const paceCat = getPaceCategory(t?.ppg);
      if (paceCat === 'Very Fast') { score += 0.75; reasons.push('Very fast pace'); }
      else if (paceCat === 'Fast') { score += 0.4; reasons.push('Fast pace'); }
      else if (paceCat === 'Very Slow') { score -= 0.4; reasons.push('Very slow pace'); }

      // Offense strength (PPG proxy)
      if (typeof t?.ppg === 'number') {
        if (t.ppg >= 85) { score += 0.75; reasons.push('High-scoring offense'); }
        else if (t.ppg >= 78) { score += 0.4; reasons.push('Above-average offense'); }
        else if (t.ppg <= 62) { score -= 0.4; reasons.push('Low-scoring offense'); }
      }

      // Opponent defense tier (weaker defense → upside)
      if (typeof o?.defenseRank === 'number') {
        if (o.defenseRank >= 321) { score += 0.75; reasons.push('Opponent terrible defense'); }
        else if (o.defenseRank >= 251) { score += 0.5; reasons.push('Opponent poor defense'); }
        else if (o.defenseRank <= 30) { score -= 0.75; reasons.push('Opponent elite defense'); }
        else if (o.defenseRank <= 70) { score -= 0.5; reasons.push('Opponent very good defense'); }
      }

      // Shooting efficiency (minor)
      if (typeof t?.threePointPct === 'number') {
        if (t.threePointPct >= 0.38) { score += 0.25; reasons.push('Strong 3PT%'); }
        else if (t.threePointPct <= 0.30) { score -= 0.25; reasons.push('Weak 3PT%'); }
      }
      if (typeof t?.freeThrowPct === 'number') {
        if (t.freeThrowPct >= 0.76) { score += 0.2; reasons.push('Strong FT%'); }
        else if (t.freeThrowPct <= 0.67) { score -= 0.2; reasons.push('Weak FT%'); }
      }

      // Location + record (minor)
      const homePct = getWinPct(t?.homeRecord);
      const awayPct = getWinPct(t?.awayRecord);
      if (teamIsHome && homePct != null) {
        if (homePct >= 0.75) { score += 0.25; reasons.push('Strong home record'); }
        else if (homePct <= 0.35) { score -= 0.2; reasons.push('Weak home record'); }
      }
      if (teamIsAway && awayPct != null) {
        if (awayPct <= 0.35) { score -= 0.35; reasons.push('Weak away record'); }
        else if (awayPct >= 0.65) { score += 0.15; reasons.push('Strong away record'); }
      }

      // Conference game tends to suppress scoring (both)
      if (ctx.isConferenceGame) { score -= 0.25; reasons.push('Conference game (tighter)'); }

      // "Two good defenses" heuristic (both teams strong defenses suppress points)
      if (typeof inputs?.team1?.defenseRank === 'number' && typeof inputs?.team2?.defenseRank === 'number') {
        const d1 = inputs.team1.defenseRank;
        const d2 = inputs.team2.defenseRank;
        if (d1 <= 70 && d2 <= 70) { score -= 0.5; reasons.push('Both teams strong defenses'); }
        else if (d1 <= 110 && d2 <= 110) { score -= 0.25; reasons.push('Both teams good defenses'); }
      }

      // Extreme mismatch adjustments (if model applied big ones, reflect direction a bit)
      const em = calcs?.extremeMismatch;
      if (em && typeof em.team1 === 'number' && typeof em.team2 === 'number') {
        const emVal = isTeam1 ? em.team1 : em.team2;
        if (emVal >= 8) { score += 0.35; reasons.push('Extreme mismatch advantage'); }
        else if (emVal <= -8) { score -= 0.35; reasons.push('Extreme mismatch disadvantage'); }
      }

      // Cruise control indicates blowout risk; winner may have upside if they *don’t* cruise as much (small)
      if (typeof calcs?.cruiseControl === 'number' && calcs.cruiseControl !== 0) {
        const isWinner = isTeam1 ? prediction?.team1?.isWinner : prediction?.team2?.isWinner;
        if (isWinner) { score += 0.2; reasons.push('Blowout risk (pace/bench variance)'); }
      }

      // Final label
      let label = 'Neutral';
      let direction = 'neutral';
      let color = 'bg-ncaa-gray border-gray-600 text-gray-200';
      if (score >= 0.9) {
        label = 'Likely Higher';
        direction = 'up';
        color = 'bg-green-500/15 border-green-500/40 text-green-200';
      } else if (score <= -0.9) {
        label = 'Likely Lower';
        direction = 'down';
        color = 'bg-red-500/15 border-red-500/40 text-red-200';
      }

      return { label, direction, color, score, reasons: reasons.slice(0, 3) };
    };

    return (
      <div className="space-y-4">
        {/* Recommendation */}
        {prediction?.recommendation && (
          <div className="bg-ncaa-blue/20 border border-ncaa-blue rounded-lg p-4">
            <div className="text-sm font-semibold text-white">
              Recommended focus: {prediction.recommendation.label}
            </div>
            <div className="text-xs text-gray-300 mt-1">
              {prediction.recommendation.reason}
            </div>
          </div>
        )}

        {/* Key Factors (pace / efficiency / defense / matchup) */}
        {(inputs || calcs) && (
          <div className="bg-ncaa-gray-light rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-white font-bold text-base">Key Factors Used (v2.2)</div>
                <div className="text-xs text-gray-300 mt-1">
                  These are the exact inputs + adjustments the v2.2 engine applied to build the final scores.
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pace */}
              <div className="bg-ncaa-gray rounded-lg border border-gray-700 p-4">
                <div className="text-white font-semibold">Pace</div>
                <div className="mt-2 text-sm text-gray-200">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-gray-300">Team 1:</span>
                    <span className="font-semibold text-white">{getPaceCategory(inputs?.team1?.ppg)}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-300">Team 2:</span>
                    <span className="font-semibold text-white">{getPaceCategory(inputs?.team2?.ppg)}</span>
                  </div>
                  {calcs?.pace && (
                    <div className="mt-2 text-xs text-gray-300">
                      Pace adj:{' '}
                      <span className="text-white font-semibold">T1 {Number(calcs.pace.team1).toFixed(2)}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-white font-semibold">T2 {Number(calcs.pace.team2).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Efficiency */}
              <div className="bg-ncaa-gray rounded-lg border border-gray-700 p-4">
                <div className="text-white font-semibold">Efficiency (base scoring)</div>
                <div className="mt-2 text-xs text-gray-300">
                  Base formula: \((team\ PPG + opponent\ pointsAllowed)/2\)
                </div>
                {calcs?.base && (
                  <div className="mt-2 text-sm text-gray-200">
                    Base:{' '}
                    <span className="text-white font-semibold">T1 {Number(calcs.base.team1).toFixed(2)}</span>
                    <span className="text-gray-500"> / </span>
                    <span className="text-white font-semibold">T2 {Number(calcs.base.team2).toFixed(2)}</span>
                  </div>
                )}
                {inputs?.team1 && inputs?.team2 && (
                  <div className="mt-2 text-xs text-gray-300">
                    T1 PPG <span className="text-white font-semibold">{inputs.team1.ppg}</span> vs T2 PA{' '}
                    <span className="text-white font-semibold">{inputs.team2.pointsAllowed}</span>
                    <span className="text-gray-500"> • </span>
                    T2 PPG <span className="text-white font-semibold">{inputs.team2.ppg}</span> vs T1 PA{' '}
                    <span className="text-white font-semibold">{inputs.team1.pointsAllowed}</span>
                  </div>
                )}
              </div>

              {/* Defense / matchup */}
              <div className="bg-ncaa-gray rounded-lg border border-gray-700 p-4">
                <div className="text-white font-semibold">Defense / matchup</div>
                <div className="mt-2 text-sm text-gray-200">
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-gray-300">
                      Team 1 defense rank:{' '}
                      <span className="text-white font-semibold">{inputs?.team1?.defenseRank ?? '—'}</span>{' '}
                      <span className="text-gray-400">({getDefenseTier(inputs?.team1?.defenseRank)})</span>
                    </div>
                    <div className="text-xs text-gray-300">
                      Team 2 defense rank:{' '}
                      <span className="text-white font-semibold">{inputs?.team2?.defenseRank ?? '—'}</span>{' '}
                      <span className="text-gray-400">({getDefenseTier(inputs?.team2?.defenseRank)})</span>
                    </div>
                  </div>
                  {calcs?.defense && (
                    <div className="mt-2 text-xs text-gray-300">
                      Defense adj:{' '}
                      <span className="text-white font-semibold">T1 {Number(calcs.defense.team1).toFixed(2)}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-white font-semibold">T2 {Number(calcs.defense.team2).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Other adjustments */}
              <div className="bg-ncaa-gray rounded-lg border border-gray-700 p-4">
                <div className="text-white font-semibold">Other v2.2 adjustments</div>
                <div className="mt-2 text-xs text-gray-300 space-y-2">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-gray-300">
                      Location:{' '}
                      <span className="text-white font-semibold">{inputs?.gameContext?.team1Location ?? '—'}</span>
                    </span>
                    {calcs?.location && (
                      <span className="text-gray-300">
                        Location adj:{' '}
                        <span className="text-white font-semibold">T1 {Number(calcs.location.team1).toFixed(2)}</span>
                        <span className="text-gray-500"> / </span>
                        <span className="text-white font-semibold">T2 {Number(calcs.location.team2).toFixed(2)}</span>
                      </span>
                    )}
                  </div>

                  {typeof calcs?.conference === 'number' && (
                    <div>
                      Conference adj (total): <span className="text-white font-semibold">{Number(calcs.conference).toFixed(2)}</span>
                    </div>
                  )}

                  {calcs?.form && (
                    <div>
                      Recent form adj:{' '}
                      <span className="text-white font-semibold">T1 {Number(calcs.form.team1).toFixed(2)}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-white font-semibold">T2 {Number(calcs.form.team2).toFixed(2)}</span>
                    </div>
                  )}

                  {calcs?.extremeMismatch && (
                    <div>
                      Extreme mismatch adj:{' '}
                      <span className="text-white font-semibold">T1 {Number(calcs.extremeMismatch.team1).toFixed(2)}</span>
                      <span className="text-gray-500"> / </span>
                      <span className="text-white font-semibold">T2 {Number(calcs.extremeMismatch.team2).toFixed(2)}</span>
                    </div>
                  )}

                  {typeof calcs?.cruiseControl === 'number' && calcs.cruiseControl !== 0 && (
                    <div>
                      Cruise control (winner reduction):{' '}
                      <span className="text-white font-semibold">{Number(calcs.cruiseControl).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Game */}
        <div className="bg-ncaa-gray-light rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Full Game Prediction</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`text-center p-4 rounded-lg ${prediction.team1.isWinner ? 'bg-ncaa-green/30' : 'bg-ncaa-gray'}`}>
              <div className="text-xl sm:text-2xl font-bold text-white">{prediction.team1.name}</div>
              <div className="text-3xl font-bold text-ncaa-yellow mt-2">{prediction.team1.fullGame}</div>
              {(() => {
                const lean = getScoreLean(1);
                return (
                  <div className={`mt-3 inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-full border text-xs text-center ${lean.color}`}>
                    <span className="font-semibold">Score vs predicted:</span>
                    <span className="font-bold">
                      {lean.direction === 'up' ? '↑' : lean.direction === 'down' ? '↓' : '→'} {lean.label}
                    </span>
                    {lean.reasons?.length ? (
                      <span className="text-[11px] text-gray-300 break-words">({lean.reasons.join(', ')})</span>
                    ) : null}
                  </div>
                );
              })()}
              {prediction.team1.isWinner && (
                <div className="text-sm text-green-300 mt-1">Winner</div>
              )}
            </div>
            <div className={`text-center p-4 rounded-lg ${prediction.team2.isWinner ? 'bg-ncaa-green/30' : 'bg-ncaa-gray'}`}>
              <div className="text-xl sm:text-2xl font-bold text-white">{prediction.team2.name}</div>
              <div className="text-3xl font-bold text-ncaa-yellow mt-2">{prediction.team2.fullGame}</div>
              {(() => {
                const lean = getScoreLean(2);
                return (
                  <div className={`mt-3 inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-full border text-xs text-center ${lean.color}`}>
                    <span className="font-semibold">Score vs predicted:</span>
                    <span className="font-bold">
                      {lean.direction === 'up' ? '↑' : lean.direction === 'down' ? '↓' : '→'} {lean.label}
                    </span>
                    {lean.reasons?.length ? (
                      <span className="text-[11px] text-gray-300 break-words">({lean.reasons.join(', ')})</span>
                    ) : null}
                  </div>
                );
              })()}
              {prediction.team2.isWinner && (
                <div className="text-sm text-green-300 mt-1">Winner</div>
              )}
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-lg text-gray-300">Total: <span className="text-white font-bold">{prediction.total}</span></div>
            <div className="text-lg text-gray-300">Margin: <span className="text-white font-bold">{prediction.margin}</span></div>
          </div>
        </div>

        {/* First Half */}
        <div className="bg-ncaa-gray-light rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">First Half Prediction</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-ncaa-gray">
              <div className="text-xl font-bold text-white">{prediction.team1.name}</div>
              <div className="text-2xl font-bold text-ncaa-blue mt-2">{prediction.team1.firstHalf}</div>
              {(() => {
                const lean = getScoreLean(1);
                return (
                  <div className={`mt-3 inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-full border text-xs text-center ${lean.color}`}>
                    <span className="font-semibold">1H vs predicted:</span>
                    <span className="font-bold">
                      {lean.direction === 'up' ? '↑' : lean.direction === 'down' ? '↓' : '→'} {lean.label}
                    </span>
                    {lean.reasons?.length ? (
                      <span className="text-[11px] text-gray-300 break-words">({lean.reasons.join(', ')})</span>
                    ) : null}
                  </div>
                );
              })()}
            </div>
            <div className="text-center p-4 rounded-lg bg-ncaa-gray">
              <div className="text-xl font-bold text-white">{prediction.team2.name}</div>
              <div className="text-2xl font-bold text-ncaa-blue mt-2">{prediction.team2.firstHalf}</div>
              {(() => {
                const lean = getScoreLean(2);
                return (
                  <div className={`mt-3 inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-full border text-xs text-center ${lean.color}`}>
                    <span className="font-semibold">1H vs predicted:</span>
                    <span className="font-bold">
                      {lean.direction === 'up' ? '↑' : lean.direction === 'down' ? '↓' : '→'} {lean.label}
                    </span>
                    {lean.reasons?.length ? (
                      <span className="text-[11px] text-gray-300 break-words">({lean.reasons.join(', ')})</span>
                    ) : null}
                  </div>
                );
              })()}
            </div>
          </div>
          <div className="mt-4 text-center text-lg text-gray-300">
            Total: <span className="text-white font-bold">{prediction.firstHalfTotal}</span>
          </div>
        </div>
      </div>
    );
  } else {
    // Local model display
    return (
      <div className="space-y-4">
        <div className="bg-ncaa-gray-light rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Prediction</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className={`text-center p-4 rounded-lg ${prediction.team1.isWinner ? 'bg-ncaa-green/30' : 'bg-ncaa-gray'}`}>
              <div className="text-2xl font-bold text-white">{prediction.team1.team}</div>
              <div className="text-3xl font-bold text-ncaa-yellow mt-2">{prediction.team1.predictedScore}</div>
              <div className="text-sm text-gray-300 mt-1">{prediction.team1.winProbability}% win probability</div>
              {prediction.team1.isWinner && (
                <div className="text-sm text-green-300 mt-1">Winner</div>
              )}
            </div>
            <div className={`text-center p-4 rounded-lg ${prediction.team2.isWinner ? 'bg-ncaa-green/30' : 'bg-ncaa-gray'}`}>
              <div className="text-2xl font-bold text-white">{prediction.team2.team}</div>
              <div className="text-3xl font-bold text-ncaa-yellow mt-2">{prediction.team2.predictedScore}</div>
              <div className="text-sm text-gray-300 mt-1">{prediction.team2.winProbability}% win probability</div>
              {prediction.team2.isWinner && (
                <div className="text-sm text-green-300 mt-1">Winner</div>
              )}
            </div>
          </div>
          <div className="mt-4 text-center">
            <div className="text-lg text-gray-300">Confidence: <span className="text-white font-bold">{prediction.winner.confidence}</span></div>
          </div>
        </div>
      </div>
    );
  }
};

// Comparison Display Component
const ComparisonDisplay = ({ aiPrediction, localPrediction }) => {
  const aiWinner = aiPrediction.team1.isWinner ? aiPrediction.team1 : aiPrediction.team2;
  const localWinner = localPrediction.team1.isWinner ? localPrediction.team1 : localPrediction.team2;
  
  const sameWinner = aiWinner.name === localWinner.name;
  const scoreDifference = Math.abs(aiPrediction.total - localPrediction.total);
  const marginDifference = Math.abs(aiPrediction.margin - localPrediction.margin);
  const areIdentical = sameWinner && scoreDifference === 0 && marginDifference === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-ncaa-gray rounded-lg p-4">
          <h4 className="font-semibold text-white mb-2">AI (v2.2) Winner</h4>
          <div className="text-xl font-bold text-ncaa-yellow">{aiWinner.name}</div>
          <div className="text-lg text-gray-300 mt-1">Score: {aiWinner.fullGame}</div>
          <div className="text-sm text-gray-400 mt-1">Total: {aiPrediction.total} • Margin: {aiPrediction.margin}</div>
        </div>
        <div className="bg-ncaa-gray rounded-lg p-4">
          <h4 className="font-semibold text-white mb-2">Local (v2.2) Winner</h4>
          <div className="text-xl font-bold text-ncaa-blue">{localWinner.name}</div>
          <div className="text-lg text-gray-300 mt-1">Score: {localWinner.fullGame}</div>
          <div className="text-sm text-gray-400 mt-1">Total: {localPrediction.total} • Margin: {localPrediction.margin}</div>
        </div>
      </div>
      
      <div className={`p-3 rounded-lg ${areIdentical ? 'bg-green-900/30 border border-green-600' : sameWinner ? 'bg-blue-900/30 border border-blue-600' : 'bg-yellow-900/30 border border-yellow-600'}`}>
        <div className="flex items-center space-x-2">
          {areIdentical ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-semibold">
                Both predictions are identical! Same model, same data, same results.
              </span>
            </>
          ) : sameWinner ? (
            <>
              <CheckCircle className="w-5 h-5 text-blue-400" />
              <span className="text-blue-300">
                Both models agree on the winner! Score difference: {scoreDifference} points
              </span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300">
                Models differ on the predicted winner (should not happen with same model/data)
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIPredictionPage;

