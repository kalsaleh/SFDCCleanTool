import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Database, Zap } from 'lucide-react';
import * as XLSX from 'xlsx';

interface EnrichedResultsTableProps {
  rows: any[];
  enrichmentData: Map<number, any>;
  headers: string[];
  onExportCSV: () => void;
  onExportExcel: () => void;
}

export const EnrichedResultsTable: React.FC<EnrichedResultsTableProps> = ({
  rows,
  enrichmentData,
  headers,
  onExportCSV,
  onExportExcel,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Get all enriched rows (both successful and failed)
  const allEnrichedRows = rows
    .map((row, index) => ({ ...row, originalIndex: index }))
    .filter((row) => enrichmentData.has(row.originalIndex));

  // Filter to only show successful enrichments
  const enrichedRows = allEnrichedRows.filter((row) => {
    const enrichment = enrichmentData.get(row.originalIndex);
    return enrichment && enrichment.success;
  });

  // Count failures and cache hits
  const failedCount = allEnrichedRows.length - enrichedRows.length;
  const cachedCount = enrichedRows.filter((row) => {
    const enrichment = enrichmentData.get(row.originalIndex);
    return enrichment?.fromCache === true;
  }).length;
  const freshCount = enrichedRows.length - cachedCount;

  const totalPages = Math.ceil(enrichedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = enrichedRows.slice(startIndex, endIndex);

  // Get all enriched column names
  const enrichedColumns = [
    { key: 'companyName', label: 'Company' },
    { key: 'tickerSymbol', label: 'Ticker' },
    { key: 'normalizedDomain', label: 'Domain' },
    { key: 'industry', label: 'Industry' },
    { key: 'vertical', label: 'Vertical' },
    { key: 'shortDescription', label: 'Description' },
    { key: 'headquarters', label: 'HQ' },
    { key: 'hqCountry', label: 'HQ Country' },
    { key: 'employeeCount', label: 'Employees' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'founded', label: 'Founded' },
    { key: 'foundedCountry', label: 'Founded Country' },
    { key: 'funding', label: 'Funding' },
    { key: 'fundingType', label: 'Funding Type' },
    { key: 'fundingStage', label: 'Funding Stage' },
    { key: 'businessType', label: 'Business Type' },
    { key: 'revenueModel', label: 'Revenue Model' },
    { key: 'companyStage', label: 'Stage' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Cache performance banner */}
      {enrichedRows.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    {cachedCount} from cache
                  </p>
                  <p className="text-xs text-blue-700">Instant retrieval</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    {freshCount} fresh enrichments
                  </p>
                  <p className="text-xs text-green-700">New API calls</p>
                </div>
              </div>
              {failedCount > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 flex items-center justify-center text-yellow-600 font-bold">!</div>
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      {failedCount} failed
                    </p>
                    <p className="text-xs text-yellow-700">Check console</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Enriched Results</h3>
          <p className="text-sm text-gray-600">
            {enrichedRows.length} accounts enriched successfully
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onExportCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onExportExcel}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {enrichedRows.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No enriched data to display. Process your CSV to see results here.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Original Data
                  </th>
                  {enrichedColumns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentRows.map((row, idx) => {
                  const enrichment = enrichmentData.get(row.originalIndex);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">
                        {enrichment?.fromCache ? (
                          <div className="flex items-center space-x-1">
                            <Database className="h-4 w-4 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">Cache</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Zap className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-700">Fresh</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="space-y-1">
                          {headers.slice(0, 2).map((header) => (
                            <div key={header}>
                              <span className="font-medium text-gray-700">{header}:</span>{' '}
                              {row[header] || '-'}
                            </div>
                          ))}
                        </div>
                      </td>
                      {enrichedColumns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                          {enrichment?.[col.key as keyof typeof enrichment] || '-'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIndex + 1} to {Math.min(endIndex, enrichedRows.length)} of{' '}
                {enrichedRows.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
