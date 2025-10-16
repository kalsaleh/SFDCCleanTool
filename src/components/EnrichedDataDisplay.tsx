import React, { useState } from 'react';
import { Building2, Users, DollarSign, Calendar, MapPin, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { CSVRow } from '../types';
import { EnrichmentResult } from '../utils/domainEnrichment';

interface EnrichedDataDisplayProps {
  rows: CSVRow[];
  enrichmentData: Map<number, EnrichmentResult>;
  extendedEnrichment: boolean;
}

export const EnrichedDataDisplay: React.FC<EnrichedDataDisplayProps> = ({
  rows,
  enrichmentData,
  extendedEnrichment
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const enrichedRows = Array.from(enrichmentData.entries())
    .filter(([_, enrichment]) => enrichment.companyName)
    .map(([index, enrichment]) => ({ index, row: rows[index], enrichment }));

  const totalPages = Math.ceil(enrichedRows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = enrichedRows.slice(startIndex, startIndex + itemsPerPage);

  const toggleRow = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  if (enrichedRows.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Enriched Company Data</h3>
        <p className="text-sm text-gray-600">
          {enrichedRows.length} companies enriched with additional information
        </p>
      </div>

      <div className="space-y-3">
        {paginatedRows.map(({ index, row, enrichment }) => {
          const isExpanded = expandedRows.has(index);

          return (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleRow(index)}
              >
                <div className="flex items-center space-x-3 flex-1">
                  <Building2 className={`h-5 w-5 flex-shrink-0 ${enrichment.success ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{enrichment.companyName}</h4>
                      {!enrichment.success && (
                        <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded">Fallback</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{enrichment.normalizedDomain}</p>
                    {enrichment.error && (
                      <p className="text-xs text-red-600 mt-1">{enrichment.error}</p>
                    )}
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {isExpanded && (
                <div className="p-4 bg-white border-t border-gray-200">
                  {extendedEnrichment ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {enrichment.headquarters && (
                        <div className="flex items-start space-x-3">
                          <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Headquarters</p>
                            <p className="text-sm text-gray-900 mt-1">{enrichment.headquarters}</p>
                          </div>
                        </div>
                      )}

                      {enrichment.industry && (
                        <div className="flex items-start space-x-3">
                          <Briefcase className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Industry</p>
                            <p className="text-sm text-gray-900 mt-1">{enrichment.industry}</p>
                          </div>
                        </div>
                      )}

                      {enrichment.employeeCount && (
                        <div className="flex items-start space-x-3">
                          <Users className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Employee Count</p>
                            <p className="text-sm text-gray-900 mt-1">{enrichment.employeeCount}</p>
                          </div>
                        </div>
                      )}

                      {enrichment.revenue && (
                        <div className="flex items-start space-x-3">
                          <DollarSign className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Revenue</p>
                            <p className="text-sm text-gray-900 mt-1">{enrichment.revenue}</p>
                          </div>
                        </div>
                      )}

                      {enrichment.founded && (
                        <div className="flex items-start space-x-3">
                          <Calendar className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Founded</p>
                            <p className="text-sm text-gray-900 mt-1">{enrichment.founded}</p>
                          </div>
                        </div>
                      )}

                      {enrichment.description && (
                        <div className="col-span-2 flex items-start space-x-3">
                          <Briefcase className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-500 uppercase">Description</p>
                            <p className="text-sm text-gray-900 mt-1">{enrichment.description}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-700">Company:</span>
                        <span className="text-sm text-gray-900">{enrichment.companyName}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-gray-700">Domain:</span>
                        <span className="text-sm text-gray-900">{enrichment.normalizedDomain}</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-medium mb-2">Original Data:</p>
                    <div className="bg-gray-50 rounded p-3 max-h-32 overflow-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(row, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
