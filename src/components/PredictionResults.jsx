import React from 'react';
import WinnerBanner from './WinnerBanner';
import TeamComparisonCard from './TeamComparisonCard';
import MethodologyInfo from './MethodologyInfo';
import { RefreshCw } from 'lucide-react';

const PredictionResults = ({ prediction, onReset, isLoading }) => {
  // Don't render if no prediction data
  if (!prediction) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="card">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-ncaa-blue animate-spin mx-auto mb-4" />
              <p className="text-white text-lg">Calculating prediction...</p>
              <p className="text-gray-400 text-sm mt-2">
                Analyzing team statistics and performance data
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Winner Banner */}
      <WinnerBanner prediction={prediction} />

      {/* Team Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamComparisonCard 
          team={prediction.team1} 
          isWinner={prediction.team1.isWinner} 
        />
        <TeamComparisonCard 
          team={prediction.team2} 
          isWinner={prediction.team2.isWinner} 
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={onReset}
          className="btn-secondary flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>New Prediction</span>
        </button>
      </div>

      {/* Methodology Information */}
      <MethodologyInfo />

      {/* Additional Statistics Summary */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">
          Prediction Summary
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Score Prediction */}
          <div className="bg-ncaa-gray-light rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-ncaa-yellow mb-1">
              {prediction.team1.predictedScore} - {prediction.team2.predictedScore}
            </div>
            <p className="text-gray-300 text-sm">Predicted Final Score</p>
          </div>

          {/* First Half Score Prediction */}
          <div className="bg-ncaa-gray-light rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-ncaa-yellow mb-1">
              {prediction.team1.firstHalfScore} - {prediction.team2.firstHalfScore}
            </div>
            <p className="text-gray-300 text-sm">Predicted First Half</p>
          </div>

          {/* Confidence */}
          <div className="bg-ncaa-gray-light rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-ncaa-green mb-1">
              {prediction.winner.confidence}
            </div>
            <p className="text-gray-300 text-sm">Confidence Level</p>
          </div>
        </div>

        {/* Point Spread - Moved to its own row */}
        <div className="mt-4">
          <div className="bg-ncaa-gray-light rounded-lg p-4 text-center max-w-xs mx-auto">
            <div className="text-2xl font-bold text-ncaa-blue mb-1">
              {Math.abs(Math.round(prediction.predictedScoreDifference))}
            </div>
            <p className="text-gray-300 text-sm">Point Margin</p>
          </div>
        </div>

        {/* Key Factors */}
        <div className="mt-6 pt-4 border-t border-gray-600">
          <h4 className="text-white font-semibold mb-3">Key Factors in This Prediction</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Scoring Advantage:</span>
                <span className="text-white font-medium">
                  {prediction.team1.pointsPerGame > prediction.team2.pointsPerGame 
                    ? `${prediction.team1.team} (+${(prediction.team1.pointsPerGame - prediction.team2.pointsPerGame).toFixed(1)} PPG)`
                    : `${prediction.team2.team} (+${(prediction.team2.pointsPerGame - prediction.team1.pointsPerGame).toFixed(1)} PPG)`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Win Rate Advantage:</span>
                <span className="text-white font-medium">
                  {prediction.team1.winRate > prediction.team2.winRate 
                    ? `${prediction.team1.team} (${Math.round(prediction.team1.winRate * 100)}% vs ${Math.round(prediction.team2.winRate * 100)}%)`
                    : `${prediction.team2.team} (${Math.round(prediction.team2.winRate * 100)}% vs ${Math.round(prediction.team1.winRate * 100)}%)`
                  }
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Ranking Advantage:</span>
                <span className="text-white font-medium">
                  {prediction.team1.rank < prediction.team2.rank 
                    ? `${prediction.team1.team} (#${prediction.team1.rank} vs #${prediction.team2.rank})`
                    : `${prediction.team2.team} (#${prediction.team2.rank} vs #${prediction.team1.rank})`
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Conference Matchup:</span>
                <span className="text-white font-medium">
                  {prediction.team1.conference} vs {prediction.team2.conference}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionResults;