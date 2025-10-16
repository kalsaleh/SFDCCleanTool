import React from 'react';
import { Layers, Search, Sparkles } from 'lucide-react';

interface OperationModeProps {
  mode: 'enrich-only' | 'duplicates-only' | 'both';
  onModeChange: (mode: 'enrich-only' | 'duplicates-only' | 'both') => void;
}

export const OperationMode: React.FC<OperationModeProps> = ({ mode, onModeChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Operation Mode</h3>
        <p className="text-sm text-gray-600">Choose what you want to do with your data</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => onModeChange('enrich-only')}
          className={`p-4 rounded-lg border-2 transition-all ${
            mode === 'enrich-only'
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Sparkles className={`h-8 w-8 ${mode === 'enrich-only' ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              <h4 className={`font-semibold ${mode === 'enrich-only' ? 'text-green-900' : 'text-gray-900'}`}>
                Enrich Only
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Add company data without duplicate checking
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onModeChange('duplicates-only')}
          className={`p-4 rounded-lg border-2 transition-all ${
            mode === 'duplicates-only'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Search className={`h-8 w-8 ${mode === 'duplicates-only' ? 'text-blue-600' : 'text-gray-400'}`} />
            <div>
              <h4 className={`font-semibold ${mode === 'duplicates-only' ? 'text-blue-900' : 'text-gray-900'}`}>
                Find Duplicates Only
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Check for duplicates without enrichment
              </p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onModeChange('both')}
          className={`p-4 rounded-lg border-2 transition-all ${
            mode === 'both'
              ? 'border-purple-500 bg-purple-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-2">
            <Layers className={`h-8 w-8 ${mode === 'both' ? 'text-purple-600' : 'text-gray-400'}`} />
            <div>
              <h4 className={`font-semibold ${mode === 'both' ? 'text-purple-900' : 'text-gray-900'}`}>
                Enrich + Find Duplicates
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                Enrich data then check for duplicates
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
