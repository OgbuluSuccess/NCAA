import React, { useState, useCallback } from 'react';
import { Trophy, BarChart3, Sparkles } from 'lucide-react';
import FileUploadSection from './components/FileUploadSection';
import TeamSelectionSection from './components/TeamSelectionSection';
import PredictionResults from './components/PredictionResults';
import AIPredictionPage from './components/AIPredictionPage';
import { calculateMatchPrediction } from './utils/predictionEngine';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'ai'
  // Application state
  const [teams, setTeams] = useState([]);
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle successful file upload and team data loading
  const handleTeamsLoaded = useCallback((loadedTeams) => {
    setTeams(loadedTeams);
    setError(null);
    // Reset selections and predictions when new data is loaded
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setPrediction(null);
  }, []);

  // Handle file upload errors
  const handleFileError = useCallback((errorMessage) => {
    setError(errorMessage);
    setTeams([]);
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setPrediction(null);
  }, []);

  // Handle team selection
  const handleTeamSelection = useCallback((team1, team2) => {
    setSelectedTeam1(team1);
    setSelectedTeam2(team2);
    setError(null);
    setPrediction(null);
  }, []);

  // Handle prediction calculation
  const handlePrediction = useCallback(async () => {
    if (!selectedTeam1 || !selectedTeam2) {
      setError('Please select both teams before making a prediction.');
      return;
    }

    if (selectedTeam1.value === selectedTeam2.value) {
      setError('Please select two different teams.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Simulate some processing time for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const predictionResult = calculateMatchPrediction(selectedTeam1.team, selectedTeam2.team);
      setPrediction(predictionResult);
    } catch (err) {
      console.error('Prediction calculation error:', err);
      setError('Failed to calculate prediction. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedTeam1, selectedTeam2]);

  // Handle reset/new prediction
  const handleReset = useCallback(() => {
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setPrediction(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Handle complete reset (including file data)
  const handleCompleteReset = useCallback(() => {
    setTeams([]);
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setPrediction(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Show AI page if selected
  if (currentPage === 'ai') {
    return <AIPredictionPage onBack={() => setCurrentPage('main')} />;
  }

  return (
    <div className="min-h-screen bg-ncaa-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-10 h-10 text-ncaa-yellow" />
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              NCAA Basketball Predictor
            </h1>
            <BarChart3 className="w-10 h-10 text-ncaa-blue" />
          </div>
          <p className="text-xl text-gray-300 font-medium">
            2024-25 Season Analytics Engine
          </p>
          <p className="text-gray-400 mt-2">
            Advanced statistical analysis for NCAA Division I men's basketball matchups
          </p>
          
          {/* Navigation to AI Page */}
          <div className="mt-6">
            <button
              onClick={() => setCurrentPage('ai')}
              className="btn-primary flex items-center space-x-2 mx-auto"
            >
              <Sparkles className="w-5 h-5" />
              <span>Try AI-Powered Prediction (Screenshot Upload)</span>
            </button>
          </div>
        </header>

        {/* Global Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-600/50 rounded-lg">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-6xl mx-auto space-y-8">
          {/* File Upload Section */}
          <FileUploadSection
            onTeamsLoaded={handleTeamsLoaded}
            onError={handleFileError}
            onReset={handleCompleteReset}
            hasTeams={teams.length > 0}
          />

          {/* Team Selection Section - Only show if teams are loaded */}
          {teams.length > 0 && (
            <TeamSelectionSection
              teams={teams}
              selectedTeam1={selectedTeam1}
              selectedTeam2={selectedTeam2}
              onTeamSelection={handleTeamSelection}
              onPrediction={handlePrediction}
              onReset={handleReset}
              isLoading={isLoading}
              hasPrediction={!!prediction}
            />
          )}

          {/* Prediction Results - Only show if prediction exists or loading */}
          {(prediction || isLoading) && (
            <PredictionResults
              prediction={prediction}
              onReset={handleReset}
              isLoading={isLoading}
            />
          )}

          {/* Instructions - Show when no teams are loaded */}
          {teams.length === 0 && !error && (
            <div className="card text-center">
              <div className="py-12">
                <Trophy className="w-16 h-16 text-ncaa-yellow mx-auto mb-6" />
                <h2 className="text-2xl font-bold text-white mb-4">
                  Welcome to NCAA Basketball Predictor
                </h2>
                <div className="max-w-2xl mx-auto space-y-4 text-gray-300">
                  <p className="text-lg">
                    Get started by uploading your NCAA team statistics Excel file to begin making predictions.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <div className="bg-ncaa-gray-light rounded-lg p-4">
                      <BarChart3 className="w-8 h-8 text-ncaa-blue mx-auto mb-2" />
                      <h3 className="font-semibold text-white mb-2">Upload Data</h3>
                      <p className="text-sm">Upload Excel file with team statistics</p>
                    </div>
                    <div className="bg-ncaa-gray-light rounded-lg p-4">
                      <Trophy className="w-8 h-8 text-ncaa-green mx-auto mb-2" />
                      <h3 className="font-semibold text-white mb-2">Select Teams</h3>
                      <p className="text-sm">Choose two teams to compare</p>
                    </div>
                    <div className="bg-ncaa-gray-light rounded-lg p-4">
                      <BarChart3 className="w-8 h-8 text-ncaa-yellow mx-auto mb-2" />
                      <h3 className="font-semibold text-white mb-2">Get Prediction</h3>
                      <p className="text-sm">View detailed match analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-gray-500 text-sm">
          <p>
            NCAA Basketball Predictor • Statistical Analysis Tool • 
            <span className="text-ncaa-blue ml-1">2024-25 Season Data</span>
          </p>
          <p className="mt-1">
            Predictions are for entertainment purposes only and based on historical statistics.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
