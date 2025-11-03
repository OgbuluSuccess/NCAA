import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp, BarChart3, TrendingUp, Award, Database } from 'lucide-react';

const MethodologyInfo = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card animate-slide-up">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Info className="w-5 h-5 text-ncaa-blue" />
          <h3 className="text-lg font-semibold text-white">
            Prediction Methodology
          </h3>
        </div>
        <div className="text-ncaa-blue">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4 animate-fade-in">
          {/* Algorithm Overview */}
          <div className="bg-ncaa-gray-light rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-ncaa-blue" />
              <span>Algorithm Overview</span>
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">
              Our prediction engine uses a weighted scoring system that analyzes three key performance indicators 
              to calculate win probabilities and predicted scores for NCAA basketball matchups.
            </p>
          </div>

          {/* Weighting System */}
          <div className="space-y-3">
            <h4 className="text-white font-semibold">Weighting System</h4>
            
            {/* Scoring Power */}
            <div className="flex items-start space-x-3 p-3 bg-ncaa-gray-light rounded-lg">
              <BarChart3 className="w-5 h-5 text-ncaa-yellow mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">Scoring Power</span>
                  <span className="text-ncaa-yellow font-bold">40%</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Based on points per game (PPG) differential between teams. 
                  Higher scoring teams have an advantage in offensive capability.
                </p>
              </div>
            </div>

            {/* Win History */}
            <div className="flex items-start space-x-3 p-3 bg-ncaa-gray-light rounded-lg">
              <TrendingUp className="w-5 h-5 text-ncaa-green mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">Win History</span>
                  <span className="text-ncaa-green font-bold">40%</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Calculated from season win rate (wins ÷ total games). 
                  Teams with better records demonstrate consistent performance.
                </p>
              </div>
            </div>

            {/* National Ranking */}
            <div className="flex items-start space-x-3 p-3 bg-ncaa-gray-light rounded-lg">
              <Award className="w-5 h-5 text-ncaa-blue mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium">National Ranking</span>
                  <span className="text-ncaa-blue font-bold">20%</span>
                </div>
                <p className="text-gray-300 text-sm">
                  Based on current national ranking (1-355). 
                  Lower rank numbers indicate stronger overall team performance.
                </p>
              </div>
            </div>
          </div>

          {/* Calculation Formula */}
          <div className="bg-ncaa-gray-light rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Calculation Process</h4>
            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-ncaa-yellow rounded-full"></span>
                <span>Calculate PPG difference and normalize (40% weight)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-ncaa-green rounded-full"></span>
                <span>Calculate win rate difference (40% weight)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-ncaa-blue rounded-full"></span>
                <span>Calculate ranking advantage (20% weight)</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                <span>Combine factors to determine win probability</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-ncaa-yellow rounded-full"></span>
                <span>Generate predicted scores based on team averages</span>
              </div>
            </div>
          </div>

          {/* Confidence Levels */}
          <div className="bg-ncaa-gray-light rounded-lg p-4">
            <h4 className="text-white font-semibold mb-3">Confidence Levels</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Very High:</span>
                <span className="text-green-400 font-medium">75%+ probability</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">High:</span>
                <span className="text-green-400 font-medium">65-74% probability</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Medium:</span>
                <span className="text-yellow-400 font-medium">55-64% probability</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Low:</span>
                <span className="text-orange-400 font-medium">50-54% probability</span>
              </div>
            </div>
          </div>

          {/* Data Source */}
          <div className="bg-ncaa-gray-light rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
              <Database className="w-4 h-4 text-ncaa-blue" />
              <span>Data Source</span>
            </h4>
            <div className="space-y-1 text-sm text-gray-300">
              <p>• NCAA Division I Men's Basketball Statistics (2024-25 Season)</p>
              <p>• All 355 Division I teams included</p>
              <p>• Data includes: Rankings, Win-Loss Records, Scoring Averages, Conference Information</p>
              <p>• Calculations performed client-side for real-time predictions</p>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
            <p className="text-yellow-200 text-xs">
              <strong>Disclaimer:</strong> Predictions are based on statistical analysis and should be used for 
              entertainment purposes only. Actual game outcomes may vary due to factors not captured in 
              historical statistics, such as injuries, team chemistry, and game-day performance.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MethodologyInfo;