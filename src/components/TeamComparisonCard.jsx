import React from 'react';
import { Trophy, TrendingUp, Users, Target, Award, BarChart3 } from 'lucide-react';

const TeamComparisonCard = ({ team, isWinner }) => {
  if (!team) return null;

  const cardClass = isWinner ? 'winner-card' : 'loser-card';
  const textColor = isWinner ? 'text-white' : 'text-gray-300';
  const accentColor = isWinner ? 'text-green-300' : 'text-gray-400';

  return (
    <div className={`card ${cardClass} animate-slide-up`}>
      {/* Header with Team Name and Winner Indicator */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-bold ${textColor}`}>
          {team.team}
        </h3>
        {isWinner && (
          <div className="flex items-center space-x-1 text-green-300">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-semibold">WINNER</span>
          </div>
        )}
      </div>

      {/* Win Probability - Large Display */}
      <div className="text-center mb-6">
        <div className={`text-4xl font-bold ${isWinner ? 'text-green-300' : 'text-gray-300'} mb-1`}>
          {team.winProbability}%
        </div>
        <p className={`text-sm ${accentColor}`}>
          Win Probability
        </p>
      </div>

      {/* Team Statistics Grid */}
      <div className="space-y-4">
        {/* National Rank */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className={`w-4 h-4 ${accentColor}`} />
            <span className={`text-sm ${textColor}`}>National Rank</span>
          </div>
          <span className={`font-semibold ${textColor}`}>
            #{team.rank}
          </span>
        </div>

        {/* Points Per Game */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className={`w-4 h-4 ${accentColor}`} />
            <span className={`text-sm ${textColor}`}>Points Per Game</span>
          </div>
          <span className={`font-semibold ${textColor}`}>
            {team.pointsPerGame}
          </span>
        </div>

        {/* Season Record */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className={`w-4 h-4 ${accentColor}`} />
            <span className={`text-sm ${textColor}`}>Season Record</span>
          </div>
          <span className={`font-semibold ${textColor}`}>
            {team.wins}-{team.losses}
          </span>
        </div>

        {/* Win Rate */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className={`w-4 h-4 ${accentColor}`} />
            <span className={`text-sm ${textColor}`}>Win Rate</span>
          </div>
          <span className={`font-semibold ${textColor}`}>
            {Math.round(team.winRate * 100)}%
          </span>
        </div>

        {/* Conference */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className={`w-4 h-4 ${accentColor}`} />
            <span className={`text-sm ${textColor}`}>Conference</span>
          </div>
          <span className={`font-semibold ${textColor} text-right`}>
            {team.conference || 'N/A'}
          </span>
        </div>
      </div>

      {/* Predicted Score - Highlighted */}
      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="bg-ncaa-yellow text-black rounded-lg p-3 text-center">
          <div className="flex items-center justify-center space-x-2 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-sm font-semibold">Predicted Score</span>
          </div>
          <div className="text-2xl font-bold">
            {team.predictedScore}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className={`text-center p-2 bg-ncaa-gray-light rounded ${textColor}`}>
          <div className="font-semibold">{team.gamesPlayed}</div>
          <div className={accentColor}>Games Played</div>
        </div>
        <div className={`text-center p-2 bg-ncaa-gray-light rounded ${textColor}`}>
          <div className="font-semibold">{team.totalPoints}</div>
          <div className={accentColor}>Total Points</div>
        </div>
      </div>

      {/* Team Tier/Performance Level */}
      <div className="mt-3">
        <div className={`text-center text-xs ${accentColor}`}>
          {getTeamTier(team.rank)} • {getPerformanceDescription(team.winRate)}
        </div>
      </div>
    </div>
  );
};

// Helper function to get team tier based on rank
const getTeamTier = (rank) => {
  if (rank <= 25) return 'Elite Team';
  if (rank <= 68) return 'Tournament Team';
  if (rank <= 150) return 'Competitive Team';
  if (rank <= 250) return 'Developing Team';
  return 'Rebuilding Team';
};

// Helper function to get performance description
const getPerformanceDescription = (winRate) => {
  if (winRate >= 0.8) return 'Dominant Season';
  if (winRate >= 0.7) return 'Strong Season';
  if (winRate >= 0.6) return 'Good Season';
  if (winRate >= 0.5) return 'Average Season';
  return 'Struggling Season';
};

export default TeamComparisonCard;