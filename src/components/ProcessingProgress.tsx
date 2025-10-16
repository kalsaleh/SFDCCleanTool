import React from 'react';
import { Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { ProcessingStats } from '../types';

interface ProcessingProgressProps {
  isProcessing: boolean;
  progress: number;
  stats: ProcessingStats;
  currentStep: string;
  operationMode?: 'enrich-only' | 'duplicates-only' | 'both';
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  isProcessing,
  progress,
  stats,
  currentStep,
  operationMode = 'both'
}) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const estimatedTimeRemaining = stats.processingTime > 0 && progress > 0 
    ? (stats.processingTime / progress) * (1 - progress)
    : 0;

  const isEnrichmentMode = operationMode === 'enrich-only';
  const isDuplicateMode = operationMode === 'duplicates-only';
  const isBothMode = operationMode === 'both';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          ) : progress === 1 ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <Clock className="h-5 w-5 text-gray-400" />
          )}
          <span>Processing Status</span>
        </h3>
        
        {isProcessing && (
          <span className="text-sm text-gray-600">
            {(progress * 100).toFixed(1)}% Complete
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{currentStep}</span>
          {estimatedTimeRemaining > 0 && (
            <span>~{formatTime(estimatedTimeRemaining)} remaining</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isProcessing ? 'bg-blue-500' : progress === 1 ? 'bg-green-500' : 'bg-gray-300'
            }`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {stats.totalRows.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Total Rows</div>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {stats.processedRows.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Processed</div>
        </div>

        {isEnrichmentMode ? (
          <>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.enrichedRows?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-gray-600">Enriched</div>
            </div>

            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats.enrichedRows ? ((stats.enrichedRows / stats.totalRows) * 100).toFixed(1) : '0'}%
              </div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {stats.duplicatesFound.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Duplicates Found</div>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats.hierarchiesIdentified.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Hierarchies</div>
            </div>
          </>
        )}
      </div>

      {/* Processing Time */}
      {stats.processingTime > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Processing time: {formatTime(stats.processingTime)}
        </div>
      )}

      {/* Status Messages */}
      {!isProcessing && progress === 1 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm text-green-700">
            Processing completed successfully! Review the matches below.
          </span>
        </div>
      )}

      {!isProcessing && progress === 0 && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-gray-500" />
          <span className="text-sm text-gray-600">
            Ready to process. Configure your settings and click "Find Duplicates" to begin.
          </span>
        </div>
      )}
    </div>
  );
};