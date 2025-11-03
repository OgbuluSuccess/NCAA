import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { parseExcelFile, validateExcelFile } from '../utils/excelParser';

const FileUploadSection = ({ onTeamsLoaded, onError, onReset, hasTeams }) => {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [teamsCount, setTeamsCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadStatus('uploading');
    setError('');
    setFileName(file.name);

    try {
      // Validate file format
      validateExcelFile(file);
      
      // Parse the Excel file
      const teamData = await parseExcelFile(file);
      
      if (teamData.length === 0) {
        throw new Error('No valid team data found in the Excel file');
      }

      // Success
      setUploadStatus('success');
      setTeamsCount(teamData.length);
      onTeamsLoaded(teamData);
      
    } catch (err) {
      setUploadStatus('error');
      setError(err.message);
      setFileName('');
      if (onError) {
        onError(err.message);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setUploadStatus('idle');
    setFileName('');
    setError('');
    setTeamsCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onReset) {
      onReset();
    }
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'uploading':
        return <Loader className="w-5 h-5 animate-spin text-ncaa-blue" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-ncaa-green" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-ncaa-red" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Processing file...';
      case 'success':
        return `Successfully loaded ${teamsCount} teams`;
      case 'error':
        return 'Upload failed';
      default:
        return 'Upload NCAA Statistics Excel File';
    }
  };

  const getStatusColor = () => {
    switch (uploadStatus) {
      case 'success':
        return 'text-ncaa-green';
      case 'error':
        return 'text-ncaa-red';
      case 'uploading':
        return 'text-ncaa-blue';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-4">
          Data Upload
        </h2>
        
        {/* Upload Area */}
        <div 
          className={`
            border-2 border-dashed rounded-lg p-8 transition-all duration-200 cursor-pointer
            ${uploadStatus === 'success' 
              ? 'border-ncaa-green bg-green-900/20' 
              : uploadStatus === 'error'
              ? 'border-ncaa-red bg-red-900/20'
              : 'border-gray-600 hover:border-ncaa-blue hover:bg-ncaa-blue/10'
            }
          `}
          onClick={uploadStatus !== 'uploading' ? handleUploadClick : undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadStatus === 'uploading'}
          />
          
          <div className="flex flex-col items-center space-y-3">
            {getStatusIcon()}
            
            <div>
              <p className={`font-semibold ${getStatusColor()}`}>
                {getStatusText()}
              </p>
              
              {fileName && (
                <p className="text-sm text-gray-400 mt-1 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 mr-1" />
                  {fileName}
                </p>
              )}
              
              {uploadStatus === 'idle' && (
                <p className="text-xs text-gray-500 mt-2">
                  Supports .xlsx and .xls files (max 10MB)
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Success Info */}
        {uploadStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-900/30 border border-green-700 rounded-lg">
            <p className="text-green-300 text-sm">
              Data loaded successfully! You can now select teams for prediction.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-3 mt-6">
          {uploadStatus === 'idle' && (
            <button
              onClick={handleUploadClick}
              disabled={uploadStatus === 'uploading'}
              className="btn-primary flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Choose File</span>
            </button>
          )}
          
          {(uploadStatus === 'success' || uploadStatus === 'error') && (
            <>
              <button
                onClick={handleUploadClick}
                className="btn-secondary flex items-center space-x-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Different File</span>
              </button>
              
              {uploadStatus === 'success' && (
                <button
                  onClick={handleReset}
                  className="btn-secondary"
                >
                  Reset
                </button>
              )}
            </>
          )}
        </div>

        {/* File Format Info */}
        {uploadStatus === 'idle' && (
          <div className="mt-6 text-left">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Expected File Format:
            </h3>
            <div className="text-xs text-gray-400 space-y-1">
              <p>• Columns: Rank, Team, GM, W-L, PTS, PPG, Conference</p>
              <p>• First row should contain headers</p>
              <p>• W-L format: "28-9" (wins-losses)</p>
              <p>• All 355 Division 1 NCAA teams</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadSection;