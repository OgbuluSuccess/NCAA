import React from 'react';
import { Trophy, TrendingUp, Target } from 'lucide-react';

const WinnerBanner = ({ prediction }) => {
  if (!prediction || !prediction.winner) {
    return null;
  }

  const { winner } = prediction;
  const confidenceColor = getConfidenceColor(winner.confidence);
  const confidenceIcon = getConfidenceIcon(winner.confidence);

  return (
    <div className="prediction-banner animate-slide-up mb-6">
      <div className="flex items-center justify-center space-x-4">
        {/* Trophy Icon */}
        <div className="flex-shrink-0">
          <Trophy className="w-8 h-8 text-yellow-800" />
        </div>

        {/* Winner Info */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-1">
            {winner.team}
          </h2>
          <div className="flex items-center justify-center space-x-2 text-black/80">
            <span className="text-lg font-semibold">
              {winner.probability}% Win Probability
            </span>
            <div className="flex items-center space-x-1">
              {confidenceIcon}
              <span className={`text-sm font-medium ${confidenceColor}`}>
                {winner.confidence} Confidence
              </span>
            </div>
          </div>
        </div>

        {/* Trophy Icon (Right) */}
        <div className="flex-shrink-0">
          <Trophy className="w-8 h-8 text-yellow-800" />
        </div>
      </div>

      {/* Additional Stats Bar */}
      <div className="mt-4 pt-4 border-t border-yellow-600/30">
        <div className="flex justify-center items-center space-x-6 text-sm text-black/70">
          <div className="flex items-center space-x-1">
            <Target className="w-4 h-4" />
            <span>Predicted Score: {prediction.team1.isWinner ? prediction.team1.predictedScore : prediction.team2.predictedScore}</span>
          </div>
          <div className="flex items-center space-x-1">
            <TrendingUp className="w-4 h-4" />
            <span>Margin: {Math.round(prediction.predictedScoreDifference)} pts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to get confidence color
const getConfidenceColor = (confidence) => {
  switch (confidence) {
    case 'Very High':
      return 'text-green-700';
    case 'High':
      return 'text-green-600';
    case 'Medium':
      return 'text-yellow-700';
    case 'Low':
      return 'text-orange-700';
    case 'Very Low':
      return 'text-red-700';
    default:
      return 'text-gray-700';
  }
};

// Helper function to get confidence icon
const getConfidenceIcon = (confidence) => {
  const iconClass = "w-4 h-4";
  
  switch (confidence) {
    case 'Very High':
    case 'High':
      return <TrendingUp className={`${iconClass} text-green-700`} />;
    case 'Medium':
      return <Target className={`${iconClass} text-yellow-700`} />;
    case 'Low':
    case 'Very Low':
      return <TrendingUp className={`${iconClass} text-red-700 transform rotate-180`} />;
    default:
      return <Target className={`${iconClass} text-gray-700`} />;
  }
};

export default WinnerBanner;