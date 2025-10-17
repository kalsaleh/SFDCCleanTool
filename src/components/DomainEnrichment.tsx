import React from 'react';
import { Globe, Zap, AlertCircle, Key, Sparkles, CheckSquare } from 'lucide-react';

interface DomainEnrichmentProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  columns: string[];
  selectedColumn: string;
  onColumnSelect: (column: string) => void;
  provider: 'clearbit' | 'openai' | 'perplexica' | 'claude' | 'cloudflare';
  onProviderChange: (provider: 'clearbit' | 'openai' | 'perplexica' | 'claude' | 'cloudflare') => void;
  apiKey: string;
  onApiKeyChange: (apiKey: string) => void;
  perplexicaUrl?: string;
  onPerplexicaUrlChange?: (url: string) => void;
  extendedEnrichment: boolean;
  onExtendedToggle: (extended: boolean) => void;
  enrichmentFields: string[];
  onFieldsChange: (fields: string[]) => void;
  useEmergentKey: boolean;
  onUseEmergentKeyChange: (use: boolean) => void;
}

export const DomainEnrichment: React.FC<DomainEnrichmentProps> = ({
  enabled,
  onToggle,
  columns,
  selectedColumn,
  onColumnSelect,
  provider,
  onProviderChange,
  apiKey,
  onApiKeyChange,
  perplexicaUrl,
  onPerplexicaUrlChange,
  extendedEnrichment,
  onExtendedToggle,
  enrichmentFields,
  onFieldsChange,
  useEmergentKey,
  onUseEmergentKeyChange
}) => {
  const availableFields = [
    { id: 'industry', label: 'Industry', description: 'Company industry sector' },
    { id: 'vertical', label: 'Vertical', description: 'Specific market vertical' },
    { id: 'employees', label: 'Number of Employees', description: 'Employee count range' },
    { id: 'hq', label: 'Headquarters (Full)', description: 'Full HQ address' },
    { id: 'hq_country', label: 'HQ Country', description: 'Country where HQ is located' },
    { id: 'description', label: 'Description', description: 'Full company description (2-3 sentences)' },
    { id: 'short_description', label: 'Short Description', description: 'Brief 1-sentence description' },
    { id: 'founded', label: 'Founded Year', description: 'Year company was founded' },
    { id: 'founded_country', label: 'Founded Country', description: 'Country where founded' },
    { id: 'revenue', label: 'Revenue', description: 'Annual revenue range' },
    { id: 'funding', label: 'Total Funding', description: 'Total funding raised' },
    { id: 'funding_type', label: 'Latest Funding Type', description: 'Latest funding round type' },
    { id: 'funding_stage', label: 'Funding Stage', description: 'Pre-seed, Series A-G, etc.' },
    { id: 'business_type', label: 'Business Type', description: 'DNB / Mature DNB / Digitally Transformed / Traditional' },
    { id: 'revenue_model', label: 'Revenue Model', description: 'Subscription, B2B, Commission, etc.' },
    { id: 'company_stage', label: 'Company Stage', description: 'Startup / Growth / Established' },
    { id: 'ticker_symbol', label: 'Ticker Symbol', description: 'Stock ticker for public companies' }
  ];

  const toggleField = (fieldId: string) => {
    if (enrichmentFields.includes(fieldId)) {
      onFieldsChange(enrichmentFields.filter(f => f !== fieldId));
    } else {
      onFieldsChange([...enrichmentFields, fieldId]);
    }
  };

  const selectAllFields = () => {
    onFieldsChange(availableFields.map(f => f.id));
  };

  const clearAllFields = () => {
    onFieldsChange([]);
  };
  const emailDomainColumns = columns.filter(col => {
    const lower = col.toLowerCase();
    return lower.includes('email') || lower.includes('domain') || lower.includes('website') || lower.includes('url');
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Globe className="h-6 w-6 text-green-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Domain Enrichment</h3>
            <p className="text-sm text-gray-600">Enhance matching with company information</p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Column with Email/Domain
            </label>
            {emailDomainColumns.length > 0 ? (
              <select
                value={selectedColumn}
                onChange={(e) => onColumnSelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select column...</option>
                {emailDomainColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 italic">No email/domain columns detected</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enrichment Provider
            </label>
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="clearbit">Clearbit (Free - Basic Info)</option>
              <option value="cloudflare">Cloudflare AI (Free - Extended Info)</option>
              <option value="openai">OpenAI GPT-4o</option>
              <option value="claude">Claude 3.5 Sonnet</option>
              <option value="perplexica">Perplexica (Self-hosted)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">Cloudflare AI is free with generous limits</p>
          </div>

          {(provider === 'openai' || provider === 'claude' || provider === 'cloudflare' || provider === 'perplexica') && (
            <>
              {provider === 'perplexica' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                    <Globe className="h-4 w-4" />
                    <span>Perplexica URL</span>
                  </label>
                  <input
                    type="text"
                    value={perplexicaUrl || ''}
                    onChange={(e) => onPerplexicaUrlChange?.(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter your self-hosted Perplexica instance URL</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <input
                      type="checkbox"
                      id="useEmergentKey"
                      checked={useEmergentKey}
                      onChange={(e) => onUseEmergentKeyChange(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="useEmergentKey" className="flex-1 text-sm">
                      <span className="font-medium text-blue-900">Use Emergent LLM Key</span>
                      <p className="text-xs text-blue-700">Universal key for OpenAI & Claude (No setup needed)</p>
                    </label>
                  </div>
                  
                  {!useEmergentKey && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center space-x-2">
                        <Key className="h-4 w-4" />
                        <span>Custom API Key</span>
                      </label>
                      <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => onApiKeyChange(e.target.value)}
                        placeholder={`Enter your ${provider === 'openai' ? 'OpenAI' : provider === 'claude' ? 'Anthropic' : 'Cloudflare (accountId:token)'} API key`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Fields to Enrich
                  </label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={selectAllFields}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearAllFields}
                      className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {availableFields.map(field => (
                    <div
                      key={field.id}
                      className={`flex items-start space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        enrichmentFields.includes(field.id)
                          ? 'bg-green-50 border-green-300'
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => toggleField(field.id)}
                    >
                      <input
                        type="checkbox"
                        checked={enrichmentFields.includes(field.id)}
                        onChange={() => {}}
                        className="mt-0.5 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{field.label}</p>
                        <p className="text-xs text-gray-500">{field.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {enrichmentFields.length} field{enrichmentFields.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <Zap className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Extracts domains from emails or URLs</li>
                  {provider === 'clearbit' && (
                    <li>• Looks up company names using Clearbit API (free tier)</li>
                  )}
                  {provider === 'openai' && (
                    <li>• Uses GPT-4o to research companies with real-time web data</li>
                  )}
                  {provider === 'claude' && (
                    <li>• Uses Claude 3.5 Sonnet to research companies with comprehensive analysis</li>
                  )}
                  {provider === 'cloudflare' && (
                    <li>• Uses Llama 3.1 8B on Cloudflare AI Workers (free with generous limits)</li>
                  )}
                  {provider === 'perplexica' && (
                    <li>• Uses self-hosted Perplexica with web search for current company data</li>
                  )}
                  <li>• Fetches only the fields you selected for efficient processing</li>
                  <li>• Matches records with the same domain</li>
                  <li>• Adds enriched data to your CSV export</li>
                </ul>
              </div>
            </div>
          </div>

          {useEmergentKey && provider !== 'perplexica' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium mb-1">Using Emergent LLM Key</p>
                  <p>No API key setup needed! The universal key works with both OpenAI and Claude.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
