import React, { useState, useMemo } from 'react';
import Select from 'react-select';
import { Users, Zap, AlertTriangle } from 'lucide-react';
import { formatTeamsForSelect, validateTeamSelection } from '../utils/teamDataManager';

const TeamSelectionSection = ({ teams, onTeamsSelected, onPredictionRequested }) => {
  const [selectedTeam1, setSelectedTeam1] = useState(null);
  const [selectedTeam2, setSelectedTeam2] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Format teams for react-select
  const teamOptions = useMemo(() => formatTeamsForSelect(teams), [teams]);

  // Custom styles for react-select to match our dark theme
  const selectStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#374151',
      borderColor: state.isFocused ? '#3B82F6' : '#6B7280',
      borderWidth: '1px',
      borderRadius: '0.5rem',
      minHeight: '48px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
      '&:hover': {
        borderColor: '#3B82F6'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#1F2937',
      border: '1px solid #374151',
      borderRadius: '0.5rem',
      zIndex: 50
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? '#3B82F6' 
        : state.isFocused 
        ? '#374151' 
        : 'transparent',
      color: '#FFFFFF',
      padding: '12px 16px',
      '&:hover': {
        backgroundColor: '#374151'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#FFFFFF'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9CA3AF'
    }),
    input: (provided) => ({
      ...provided,
      color: '#FFFFFF'
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: '#6B7280'
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: '#9CA3AF',
      '&:hover': {
        color: '#FFFFFF'
      }
    })
  };

  const handleTeam1Change = (selectedOption) => {
    setSelectedTeam1(selectedOption);
    setValidationErrors([]);
    
    if (selectedOption && selectedTeam2) {
      onTeamsSelected(selectedOption.team, selectedTeam2.team);
    } else {
      onTeamsSelected(null, null);
    }
  };

  const handleTeam2Change = (selectedOption) => {
    setSelectedTeam2(selectedOption);
    setValidationErrors([]);
    
    if (selectedTeam1 && selectedOption) {
      onTeamsSelected(selectedTeam1.team, selectedOption.team);
    } else {
      onTeamsSelected(null, null);
    }
  };

  const handlePredictClick = () => {
    const validation = validateTeamSelection(
      selectedTeam1?.team, 
      selectedTeam2?.team
    );
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      return;
    }
    
    setValidationErrors([]);
    onPredictionRequested(selectedTeam1.team, selectedTeam2.team);
  };

  const handleReset = () => {
    setSelectedTeam1(null);
    setSelectedTeam2(null);
    setValidationErrors([]);
    onTeamsSelected(null, null);
  };

  // Filter out selected team from the other dropdown
  const getFilteredOptions = (excludeTeam) => {
    if (!excludeTeam) return teamOptions;
    return teamOptions.filter(option => option.value !== excludeTeam.value);
  };

  const canPredict = selectedTeam1 && selectedTeam2 && selectedTeam1.value !== selectedTeam2.value;

  if (teams.length === 0) {
    return (
      <div className="card opacity-50">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-400 mb-2">
            Team Selection
          </h2>
          <p className="text-gray-500">
            Please upload team data first to select teams for prediction.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-slide-up">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white mb-2">
          Select Teams to Compare
        </h2>
        <p className="text-gray-400">
          Choose two teams to predict the match outcome
        </p>
      </div>

      <div className="space-y-6">
        {/* Team Selection Dropdowns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team 1 Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Team 1
            </label>
            <Select
              value={selectedTeam1}
              onChange={handleTeam1Change}
              options={getFilteredOptions(selectedTeam2)}
              styles={selectStyles}
              placeholder="Search and select first team..."
              isSearchable
              isClearable
              className="text-sm"
              noOptionsMessage={() => "No teams found"}
              filterOption={(option, inputValue) => {
                return option.data.searchText.includes(inputValue.toLowerCase());
              }}
            />
            {selectedTeam1 && (
              <div className="text-xs text-gray-400 mt-1">
                Rank #{selectedTeam1.team.rank} • {selectedTeam1.team.pointsPerGame} PPG • {selectedTeam1.team.wins}-{selectedTeam1.team.losses}
              </div>
            )}
          </div>

          {/* VS Indicator */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="bg-ncaa-gray-light rounded-full p-3">
              <span className="text-ncaa-yellow font-bold text-lg">VS</span>
            </div>
          </div>

          {/* Team 2 Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300">
              Team 2
            </label>
            <Select
              value={selectedTeam2}
              onChange={handleTeam2Change}
              options={getFilteredOptions(selectedTeam1)}
              styles={selectStyles}
              placeholder="Search and select second team..."
              isSearchable
              isClearable
              className="text-sm"
              noOptionsMessage={() => "No teams found"}
              filterOption={(option, inputValue) => {
                return option.data.searchText.includes(inputValue.toLowerCase());
              }}
            />
            {selectedTeam2 && (
              <div className="text-xs text-gray-400 mt-1">
                Rank #{selectedTeam2.team.rank} • {selectedTeam2.team.pointsPerGame} PPG • {selectedTeam2.team.wins}-{selectedTeam2.team.losses}
              </div>
            )}
          </div>
        </div>

        {/* Mobile VS Indicator */}
        <div className="lg:hidden flex justify-center">
          <div className="bg-ncaa-gray-light rounded-full px-4 py-2">
            <span className="text-ncaa-yellow font-bold">VS</span>
          </div>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-red-300 text-sm">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={handlePredictClick}
            disabled={!canPredict}
            className={`
              flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200
              ${canPredict 
                ? 'bg-ncaa-blue hover:bg-blue-600 text-white shadow-lg hover:shadow-xl' 
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Zap className="w-5 h-5" />
            <span>Predict Match</span>
          </button>

          {(selectedTeam1 || selectedTeam2) && (
            <button
              onClick={handleReset}
              className="btn-secondary"
            >
              Reset Selection
            </button>
          )}
        </div>

        {/* Quick Stats Preview */}
        {selectedTeam1 && selectedTeam2 && (
          <div className="mt-6 grid grid-cols-2 gap-4 text-center">
            <div className="bg-ncaa-gray-light rounded-lg p-3">
              <h4 className="font-semibold text-white text-sm mb-1">
                {selectedTeam1.team.team}
              </h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Rank: #{selectedTeam1.team.rank}</div>
                <div>Record: {selectedTeam1.team.wins}-{selectedTeam1.team.losses}</div>
                <div>PPG: {selectedTeam1.team.pointsPerGame}</div>
              </div>
            </div>
            
            <div className="bg-ncaa-gray-light rounded-lg p-3">
              <h4 className="font-semibold text-white text-sm mb-1">
                {selectedTeam2.team.team}
              </h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Rank: #{selectedTeam2.team.rank}</div>
                <div>Record: {selectedTeam2.team.wins}-{selectedTeam2.team.losses}</div>
                <div>PPG: {selectedTeam2.team.pointsPerGame}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamSelectionSection;