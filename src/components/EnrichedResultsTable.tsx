import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
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

  // Filter to only show enriched rows
  const enrichedRows = rows
    .map((row, index) => ({ ...row, originalIndex: index }))
    .filter((row) => {
      const enrichment = enrichmentData.get(row.originalIndex);
      return enrichment && enrichment.success;
    });

  const totalPages = Math.ceil(enrichedRows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = enrichedRows.slice(startIndex, endIndex);

  // Get all enriched column names
  const enrichedColumns = [
    { key: 'companyName', label: 'Company' },
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
                    Original Data
                  </th>
                  {enrichedColumns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.replace('Enriched_', '').replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentRows.map((row, idx) => {
                  const enrichment = enrichmentData.get(row.originalIndex);
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
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
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.companyName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.normalizedDomain || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.industry || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.vertical || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.headquarters || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.employeeCount || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.revenue || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.founded || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.funding || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {enrichment?.fundingType || '-'}
                      </td>
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
