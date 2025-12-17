import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader, FolderOpen } from 'lucide-react';
import { parseExcelFile, parseMultipleExcelFiles, validateExcelFile } from '../utils/excelParser';

const FileUploadSection = ({ onTeamsLoaded, onError, onReset, hasTeams }) => {
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [teamsCount, setTeamsCount] = useState(0);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadStatus('uploading');
    setError('');
    setFileName(files.length === 1 ? files[0].name : `${files.length} files selected`);

    try {
      // Validate each file format
      files.forEach((f) => validateExcelFile(f));

      // Parse single or multiple files
      const teamData = files.length === 1
        ? await parseExcelFile(files[0])
        : await parseMultipleExcelFiles(files);

      if (!teamData || teamData.length === 0) {
        throw new Error('No valid team data found across selected files');
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

  const handleSelectFolderClick = async () => {
    if (uploadStatus === 'uploading') return;
    setError('');
    try {
      if (window.showDirectoryPicker) {
        setUploadStatus('uploading');
        const dirHandle = await window.showDirectoryPicker();
        const files = [];
        for await (const [name, entry] of dirHandle.entries()) {
          const lower = String(name).toLowerCase();
          if (entry.kind === 'file' && (lower.endsWith('.xlsx') || lower.endsWith('.xls'))) {
            const file = await entry.getFile();
            files.push(file);
          }
        }
        if (files.length === 0) {
          throw new Error('No .xlsx/.xls files found in selected folder');
        }
        files.forEach((f) => validateExcelFile(f));
        const teamData = await parseMultipleExcelFiles(files);
        if (!teamData || teamData.length === 0) {
          throw new Error('No valid team data found in folder');
        }
        setUploadStatus('success');
        setFileName(`${files.length} files from folder`);
        setTeamsCount(teamData.length);
        onTeamsLoaded(teamData);
      } else {
        // Fallback: use hidden input with webkitdirectory
        folderInputRef.current?.click();
      }
    } catch (err) {
      setUploadStatus('error');
      setError(err.message);
      setFileName('');
      if (onError) {
        onError(err.message);
      }
    }
  };

  const handleFolderInputChange = async (event) => {
    const files = Array.from(event.target.files || [])
      .filter(f => f.name.toLowerCase().endsWith('.xlsx') || f.name.toLowerCase().endsWith('.xls'));
    if (files.length === 0) return;

    setUploadStatus('uploading');
    setError('');
    setFileName(`${files.length} files from folder`);

    try {
      files.forEach((f) => validateExcelFile(f));
      const teamData = await parseMultipleExcelFiles(files);
      if (!teamData || teamData.length === 0) {
        throw new Error('No valid team data found in folder');
      }
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

  const handleReset = () => {
    setUploadStatus('idle');
    setFileName('');
    setError('');
    setTeamsCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
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
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploadStatus === 'uploading'}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleFolderInputChange}
            className="hidden"
            // @ts-ignore - non-standard attribute supported by Chromium browsers
            webkitdirectory="true"
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
                  Supports .xlsx and .xls files (max 10MB). Or select a folder to auto-import all Excel files.
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
            <p className="text-green-300 text-sm font-semibold mb-2">
              ✓ Data loaded successfully! {teamsCount} teams ready for prediction.
            </p>
            <p className="text-green-200 text-xs">
              You can now select teams from the dropdown menus below to generate predictions.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
          {uploadStatus === 'idle' && (
            <>
              <button
                onClick={handleUploadClick}
                disabled={uploadStatus === 'uploading'}
                className="btn-primary flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Choose File</span>
              </button>
              <button
                onClick={handleSelectFolderClick}
                disabled={uploadStatus === 'uploading'}
                className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
                title="Select a folder containing Excel files"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Folder</span>
              </button>
            </>
          )}
          
          {(uploadStatus === 'success' || uploadStatus === 'error') && (
            <>
              <button
                onClick={handleUploadClick}
                className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Different File</span>
              </button>
              <button
                onClick={handleSelectFolderClick}
                className="btn-secondary flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Select Folder</span>
              </button>
              {uploadStatus === 'success' && (
                <button
                  onClick={handleReset}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Reset
                </button>
              )}
            </>
          )}
        </div>

        {/* File Format Info */}
        {uploadStatus === 'idle' && (
          <div className="mt-6 space-y-4">
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                Quick Start:
              </h3>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• <strong>Recommended:</strong> Select the "Data" folder to load all statistics files at once</p>
                <p>• Or upload individual Excel files (.xlsx or .xls)</p>
                <p>• Base file needed: Scoring Offense.xlsx (contains team names and PPG)</p>
                <p>• Additional files enhance accuracy: Defense, Free Throws, Three-Point stats, etc.</p>
              </div>
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-300 mb-2">
                Expected File Format:
              </h3>
              <div className="text-xs text-gray-400 space-y-1">
                <p>• Columns: Rank, Team (or School), PPG (or Scoring Offense), W-L, Conference</p>
                <p>• First row should contain headers</p>
                <p>• W-L format: "28-9" (wins-losses)</p>
                <p>• Team names should be consistent across files for proper merging</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploadSection;