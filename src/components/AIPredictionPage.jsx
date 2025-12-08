import React, { useState, useRef, useEffect } from 'react';
import { Image, Upload, Sparkles, Brain, Loader, AlertCircle, CheckCircle, ArrowLeft, Clipboard } from 'lucide-react';
import { calculateV2Prediction } from '../utils/v2PredictionEngine';
import { calculateMatchPrediction } from '../utils/predictionEngine';

const AIPredictionPage = ({ onBack }) => {
  const [imageFiles, setImageFiles] = useState([]); // Array of images
  const [imagePreviews, setImagePreviews] = useState([]); // Array of preview URLs
  const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Currently selected image
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
      setExtractedData(extracted);

      // Calculate AI prediction using v2.0 model
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

      const v2Result = calculateV2Prediction(team1ForV2, team2ForV2, gameContext);
      setAiPrediction(v2Result);

      // Calculate local prediction using existing model
      // Convert extracted data to format expected by local model
      const team1ForLocal = {
        team: extracted.team1?.team || 'Team 1',
        rank: extracted.team1?.netRank || 150,
        pointsPerGame: extracted.team1?.ppg || 70,
        wins: (extracted.team1?.homeRecord?.wins || 0) + (extracted.team1?.awayRecord?.wins || 0),
        losses: (extracted.team1?.homeRecord?.losses || 0) + (extracted.team1?.awayRecord?.losses || 0),
        winRate: calculateWinRate(extracted.team1 || {}),
        conference: '',
        scoringDefense: extracted.team1?.pointsAllowed || 70,
        threePointPercentage: extracted.team1?.threePointPct || 0.35,
        freeThrowPercentage: extracted.team1?.freeThrowPct || 0.70,
        turnoversPerGame: null,
        offensiveReboundsPerGame: null
      };

      const team2ForLocal = {
        team: extracted.team2?.team || 'Team 2',
        rank: extracted.team2?.netRank || 150,
        pointsPerGame: extracted.team2?.ppg || 70,
        wins: (extracted.team2?.homeRecord?.wins || 0) + (extracted.team2?.awayRecord?.wins || 0),
        losses: (extracted.team2?.homeRecord?.losses || 0) + (extracted.team2?.awayRecord?.losses || 0),
        winRate: calculateWinRate(extracted.team2 || {}),
        conference: '',
        scoringDefense: extracted.team2?.pointsAllowed || 70,
        threePointPercentage: extracted.team2?.threePointPct || 0.35,
        freeThrowPercentage: extracted.team2?.freeThrowPct || 0.70,
        turnoversPerGame: null,
        offensiveReboundsPerGame: null
      };

      const localResult = calculateMatchPrediction(team1ForLocal, team2ForLocal);
      setLocalPrediction(localResult);

    } catch (err) {
      console.error('AI processing error:', err);
      setError(err.message || 'Failed to process image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const calculateWinRate = (team) => {
    const wins = (team.homeRecord?.wins || 0) + (team.awayRecord?.wins || 0);
    const losses = (team.homeRecord?.losses || 0) + (team.awayRecord?.losses || 0);
    const total = wins + losses;
    return total > 0 ? wins / total : 0.5;
  };

  const handleReset = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setSelectedImageIndex(0);
    setAiPrediction(null);
    setLocalPrediction(null);
    setExtractedData(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Sparkles className="w-10 h-10 text-ncaa-yellow" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              AI-Powered Prediction
            </h1>
            <Brain className="w-10 h-10 text-ncaa-blue" />
          </div>
          <p className="text-xl text-gray-300 font-medium">
            Upload Screenshot • AI Analysis • Dual Model Comparison
          </p>
          <p className="text-gray-400 mt-2">
            Using ChatGPT Vision API + v2.0 Model + Local Prediction Engine
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

        <div className="max-w-6xl mx-auto space-y-8">
          {/* Image Upload Section */}
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
              <div className="flex justify-center space-x-3 flex-wrap">
                <button
                  onClick={() => processImageWithAI()}
                  disabled={imageFiles.length === 0 || isProcessing}
                  className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Processing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Analyze Selected Image</span>
                    </>
                  )}
                </button>
                
                {imageFiles.length > 0 && (
                  <>
                    <button
                      onClick={handleReset}
                      className="btn-secondary"
                    >
                      Clear All
                    </button>
                    <div className="text-sm text-gray-400 flex items-center">
                      {imageFiles.length} image(s) • Select one to analyze
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Predictions Display */}
          {(aiPrediction || localPrediction) && (
            <div className="space-y-6">
              {/* AI Prediction (v2.0 Model) */}
              {aiPrediction && (
                <div className="card border-2 border-ncaa-yellow">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="w-6 h-6 text-ncaa-yellow" />
                    <h2 className="text-2xl font-bold text-white">
                      AI Prediction (v2.0 Model)
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
                      Local Prediction (Enhanced Model)
                    </h2>
                  </div>
                  
                  <PredictionDisplay prediction={localPrediction} modelType="local" />
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
    return (
      <div className="space-y-4">
        {/* Full Game */}
        <div className="bg-ncaa-gray-light rounded-lg p-4">
          <h4 className="text-lg font-semibold text-white mb-3">Full Game Prediction</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className={`text-center p-4 rounded-lg ${prediction.team1.isWinner ? 'bg-ncaa-green/30' : 'bg-ncaa-gray'}`}>
              <div className="text-2xl font-bold text-white">{prediction.team1.name}</div>
              <div className="text-3xl font-bold text-ncaa-yellow mt-2">{prediction.team1.fullGame}</div>
              {prediction.team1.isWinner && (
                <div className="text-sm text-green-300 mt-1">Winner</div>
              )}
            </div>
            <div className={`text-center p-4 rounded-lg ${prediction.team2.isWinner ? 'bg-ncaa-green/30' : 'bg-ncaa-gray'}`}>
              <div className="text-2xl font-bold text-white">{prediction.team2.name}</div>
              <div className="text-3xl font-bold text-ncaa-yellow mt-2">{prediction.team2.fullGame}</div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 rounded-lg bg-ncaa-gray">
              <div className="text-xl font-bold text-white">{prediction.team1.name}</div>
              <div className="text-2xl font-bold text-ncaa-blue mt-2">{prediction.team1.firstHalf}</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-ncaa-gray">
              <div className="text-xl font-bold text-white">{prediction.team2.name}</div>
              <div className="text-2xl font-bold text-ncaa-blue mt-2">{prediction.team2.firstHalf}</div>
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-ncaa-gray rounded-lg p-4">
          <h4 className="font-semibold text-white mb-2">AI (v2.0) Winner</h4>
          <div className="text-xl font-bold text-ncaa-yellow">{aiWinner.name}</div>
          <div className="text-lg text-gray-300 mt-1">Score: {aiWinner.fullGame}</div>
        </div>
        <div className="bg-ncaa-gray rounded-lg p-4">
          <h4 className="font-semibold text-white mb-2">Local Model Winner</h4>
          <div className="text-xl font-bold text-ncaa-blue">{localWinner.name}</div>
          <div className="text-lg text-gray-300 mt-1">Score: {localWinner.predictedScore}</div>
        </div>
      </div>
      
      <div className={`p-3 rounded-lg ${sameWinner ? 'bg-green-900/30 border border-green-600' : 'bg-yellow-900/30 border border-yellow-600'}`}>
        <div className="flex items-center space-x-2">
          {sameWinner ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          )}
          <span className={sameWinner ? 'text-green-300' : 'text-yellow-300'}>
            {sameWinner 
              ? 'Both models agree on the winner!' 
              : 'Models differ on the predicted winner'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AIPredictionPage;

