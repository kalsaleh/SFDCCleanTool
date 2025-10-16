import React, { useState, useMemo } from 'react';
import { 
  Filter, 
  Download, 
  Eye, 
  Trash2, 
  Merge, 
  Check, 
  X, 
  ChevronDown,
  Building,
  Globe,
  MapPin,
  Users
} from 'lucide-react';
import { MatchResult } from '../types';

interface MatchResultsProps {
  matches: MatchResult[];
  onActionChange: (matchId: string, action: MatchResult['action']) => void;
  onBulkAction: (matchIds: string[], action: MatchResult['action']) => void;
  onExport: () => void;
}

export const MatchResults: React.FC<MatchResultsProps> = ({
  matches,
  onActionChange,
  onBulkAction,
  onExport
}) => {
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [hierarchyFilter, setHierarchyFilter] = useState<string>('all');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);

  const filteredMatches = useMemo(() => {
    return matches.filter(match => {
      if (match.confidence < confidenceFilter) return false;
      if (actionFilter !== 'all' && match.action !== actionFilter) return false;
      if (hierarchyFilter !== 'all' && match.hierarchyType !== hierarchyFilter) return false;
      return true;
    });
  }, [matches, confidenceFilter, actionFilter, hierarchyFilter]);

  const getHierarchyIcon = (type?: string) => {
    switch (type) {
      case 'global_parent': return <Globe className="h-4 w-4 text-blue-500" />;
      case 'regional_parent': return <MapPin className="h-4 w-4 text-green-500" />;
      case 'subsidiary': return <Building className="h-4 w-4 text-orange-500" />;
      default: return <Users className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHierarchyLabel = (type?: string) => {
    switch (type) {
      case 'global_parent': return 'Global Parent';
      case 'regional_parent': return 'Regional Parent';
      case 'subsidiary': return 'Subsidiary';
      default: return 'Unknown';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getActionColor = (action: MatchResult['action']) => {
    switch (action) {
      case 'keep': return 'text-green-600 bg-green-100';
      case 'merge': return 'text-blue-600 bg-blue-100';
      case 'delete': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleSelectAll = () => {
    if (selectedMatches.size === filteredMatches.length) {
      setSelectedMatches(new Set());
    } else {
      setSelectedMatches(new Set(filteredMatches.map(m => m.id)));
    }
  };

  const handleBulkAction = (action: MatchResult['action']) => {
    onBulkAction(Array.from(selectedMatches), action);
    setSelectedMatches(new Set());
  };

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Matches Found</h3>
        <p className="text-gray-600">
          No duplicate records were detected with the current configuration. 
          Try adjusting the similarity threshold or selected columns.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header and Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Match Results ({filteredMatches.length} of {matches.length})
          </h3>
          <button
            onClick={onExport}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export Marked Data</span>
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Confidence: {(confidenceFilter * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Actions</option>
              <option value="pending">Pending</option>
              <option value="keep">Keep</option>
              <option value="merge">Merge</option>
              <option value="delete">Delete</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hierarchy</label>
            <select
              value={hierarchyFilter}
              onChange={(e) => setHierarchyFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="global_parent">Global Parent</option>
              <option value="regional_parent">Regional Parent</option>
              <option value="subsidiary">Subsidiary</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {selectedMatches.size === filteredMatches.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedMatches.size > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-700">
                {selectedMatches.size} matches selected
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBulkAction('keep')}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  Keep All
                </button>
                <button
                  onClick={() => handleBulkAction('merge')}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Merge All
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {filteredMatches.map((match) => (
          <div key={match.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center space-x-4">
              <input
                type="checkbox"
                checked={selectedMatches.has(match.id)}
                onChange={(e) => {
                  const newSelected = new Set(selectedMatches);
                  if (e.target.checked) {
                    newSelected.add(match.id);
                  } else {
                    newSelected.delete(match.id);
                  }
                  setSelectedMatches(newSelected);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(match.confidence)}`}>
                      {(match.confidence * 100).toFixed(1)}% match
                    </span>
                    <span className="text-xs text-gray-500 uppercase tracking-wide">
                      {match.matchType}
                    </span>
                    {match.hierarchyType && (
                      <div className="flex items-center space-x-1">
                        {getHierarchyIcon(match.hierarchyType)}
                        <span className="text-xs text-gray-600">
                          {getHierarchyLabel(match.hierarchyType)}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown className={`h-4 w-4 transition-transform ${expandedMatch === match.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Original Record</div>
                    <div className="text-gray-600 space-y-1">
                      {match.matchedFields.slice(0, 2).map(field => (
                        <div key={field}>
                          <span className="font-medium">{field}:</span> {match.originalRow[field]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 mb-1">Duplicate Record</div>
                    <div className="text-gray-600 space-y-1">
                      {match.matchedFields.slice(0, 2).map(field => (
                        <div key={field}>
                          <span className="font-medium">{field}:</span> {match.duplicateRow[field]}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {expandedMatch === match.id && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900 mb-2">All Matched Fields:</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {match.matchedFields.map(field => (
                          <div key={field} className="space-y-1">
                            <div className="font-medium text-gray-700">{field}</div>
                            <div className="text-gray-600">
                              Original: {match.originalRow[field] || 'N/A'}
                            </div>
                            <div className="text-gray-600">
                              Duplicate: {match.duplicateRow[field] || 'N/A'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(match.action)}`}>
                  {match.action}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onActionChange(match.id, 'keep')}
                    className={`p-1 rounded ${match.action === 'keep' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'}`}
                    title="Keep both records"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onActionChange(match.id, 'merge')}
                    className={`p-1 rounded ${match.action === 'merge' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                    title="Merge records"
                  >
                    <Merge className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onActionChange(match.id, 'delete')}
                    className={`p-1 rounded ${match.action === 'delete' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'}`}
                    title="Delete duplicate"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};