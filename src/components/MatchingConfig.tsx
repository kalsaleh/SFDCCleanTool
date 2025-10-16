import React from 'react';
import { Settings, Zap, Brain, Layers } from 'lucide-react';
import { MatchingConfig as Config } from '../types';

interface MatchingConfigProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

export const MatchingConfig: React.FC<MatchingConfigProps> = ({ config, onConfigChange }) => {
  const updateConfig = (updates: Partial<Config>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2 mb-6">
        <Settings className="h-5 w-5" />
        <span>Matching Configuration</span>
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fuzzy Matching Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-orange-500" />
            <h4 className="font-medium text-gray-900">Fuzzy Matching</h4>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Similarity Threshold: {(config.fuzzyThreshold * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={config.fuzzyThreshold}
              onChange={(e) => updateConfig({ fuzzyThreshold: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Loose (50%)</span>
              <span>Strict (100%)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Processing Chunk Size
            </label>
            <select
              value={config.chunkSize}
              onChange={(e) => updateConfig({ chunkSize: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={100}>100 rows (Fast)</option>
              <option value={500}>500 rows (Balanced)</option>
              <option value={1000}>1000 rows (Thorough)</option>
              <option value={2000}>2000 rows (Large datasets)</option>
            </select>
          </div>
        </div>

        {/* AI Enhancement Settings */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <h4 className="font-medium text-gray-900">AI Enhancement</h4>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useAI"
              checked={config.useAI}
              onChange={(e) => updateConfig({ useAI: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="useAI" className="text-sm font-medium text-gray-700">
              Enable AI-powered matching
            </label>
          </div>

          {config.useAI && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Provider
              </label>
              <select
                value={config.aiProvider}
                onChange={(e) => updateConfig({ aiProvider: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="local">Local Processing</option>
                <option value="openai">OpenAI GPT</option>
                <option value="anthropic">Anthropic Claude</option>
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="hierarchyDetection"
              checked={config.hierarchyDetection}
              onChange={(e) => updateConfig({ hierarchyDetection: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="hierarchyDetection" className="text-sm font-medium text-gray-700">
              Detect corporate hierarchies
            </label>
          </div>
        </div>
      </div>

      {/* Performance Warning */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Layers className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Performance Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Lower similarity thresholds will find more matches but may include false positives</li>
              <li>• Larger chunk sizes process faster but use more memory</li>
              <li>• AI enhancement provides better accuracy but requires API access and is slower</li>
              <li>• Hierarchy detection works best with DUP Designation or company description fields</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};