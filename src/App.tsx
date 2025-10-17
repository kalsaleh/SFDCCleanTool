import React, { useState, useCallback, useEffect } from 'react';
import { Database, Zap, Brain, Download } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { OperationMode } from './components/OperationMode';
import { ColumnSelector } from './components/ColumnSelector';
import { MatchingConfig } from './components/MatchingConfig';
import { DomainEnrichment } from './components/DomainEnrichment';
import { EnrichedDataDisplay } from './components/EnrichedDataDisplay';
import { EnrichedResultsTable } from './components/EnrichedResultsTable';
import { ProcessingProgress } from './components/ProcessingProgress';
import { MatchResults } from './components/MatchResults';
import { CSVParser } from './utils/csvParser';
import { FuzzyMatcher } from './utils/fuzzyMatcher';
import { AIMatcher } from './utils/aiMatcher';
import { EnrichmentService } from './services/enrichmentService';
import { BackendApi } from './services/backendApi';
import { ApiClient } from './utils/apiClient';
import { CSVRow, MatchResult, MatchingConfig as Config, ProcessingStats } from './types';
import * as XLSX from 'xlsx';

function App() {
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: CSVRow[] } | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Ready to process');
  const [stats, setStats] = useState<ProcessingStats>({
    totalRows: 0,
    processedRows: 0,
    duplicatesFound: 0,
    hierarchiesIdentified: 0,
    processingTime: 0
  });

  const [config, setConfig] = useState<Config>({
    selectedColumns: [],
    fuzzyThreshold: 0.8,
    useAI: false,
    aiProvider: 'local',
    chunkSize: 500,
    hierarchyDetection: true,
    domainEnrichment: false,
    domainColumn: '',
    enrichmentProvider: 'cloudflare',
    enrichmentApiKey: '',
    perplexicaUrl: '',
    extendedEnrichment: false,
    enrichmentFields: ['industry', 'vertical', 'employees', 'hq_country', 'short_description', 'revenue', 'business_type', 'revenue_model', 'company_stage'],
    useEmergentKey: true,
    operationMode: 'both'
  });
  const [enrichmentData, setEnrichmentData] = useState<Map<number, any>>(new Map());

  useEffect(() => {
    if (config.operationMode === 'enrich-only' || config.operationMode === 'both') {
      setConfig(prev => ({ ...prev, domainEnrichment: true }));
    }
  }, [config.operationMode]);

  const handleFileUpload = useCallback((content: string, uploadedFilename: string) => {
    try {
      const parsed = CSVParser.parseCSV(content);
      console.log('Parsed CSV - Headers:', parsed.headers);
      console.log('Parsed CSV - Row count:', parsed.rows.length);
      console.log('Parsed CSV - First row:', parsed.rows[0]);

      setCsvData(parsed);
      setAvailableColumns(parsed.headers);
      setFilename(uploadedFilename);
      setMatches([]);
      setProgress(0);
      setStats({
        totalRows: parsed.rows.length,
        processedRows: 0,
        duplicatesFound: 0,
        hierarchiesIdentified: 0,
        processingTime: 0,
        enrichedRows: 0
      });
      setEnrichmentData(new Map());

      // Auto-select common columns
      const commonColumns = parsed.headers.filter(header => {
        const lower = header.toLowerCase();
        return lower.includes('name') || lower.includes('company') ||
               lower.includes('address') || lower.includes('email');
      });
      console.log('Auto-selected columns:', commonColumns);

      const emailColumn = parsed.headers.find(h => {
        const lower = h.toLowerCase();
        return lower.includes('email') || lower.includes('domain');
      }) || '';

      setConfig(prev => ({
        ...prev,
        selectedColumns: commonColumns,
        domainColumn: emailColumn
      }));
    } catch (error) {
      console.error('Error parsing CSV:', error);
      alert('Error parsing CSV file: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, []);

  const handleColumnToggle = useCallback((column: string) => {
    setConfig(prev => ({
      ...prev,
      selectedColumns: prev.selectedColumns.includes(column)
        ? prev.selectedColumns.filter(c => c !== column)
        : [...prev.selectedColumns, column]
    }));
  }, []);

  const handleSelectAllColumns = useCallback(() => {
    if (!csvData) return;
    setConfig(prev => ({ ...prev, selectedColumns: csvData.headers }));
  }, [csvData]);

  const handleClearAllColumns = useCallback(() => {
    setConfig(prev => ({ ...prev, selectedColumns: [] }));
  }, []);

  const processData = useCallback(async () => {
    console.log('processData called');
    console.log('csvData:', csvData);
    console.log('operationMode:', config.operationMode);

    if (!csvData) {
      alert('Please upload a CSV file');
      return;
    }

    if (config.operationMode === 'enrich-only' && (!config.domainEnrichment || !config.domainColumn)) {
      alert('Please enable domain enrichment and select a column');
      return;
    }

    if ((config.operationMode === 'duplicates-only' || config.operationMode === 'both') && config.selectedColumns.length === 0) {
      alert('Please select at least one column for matching');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    const startTime = Date.now();

    try {
      let workingRows = csvData.rows;
      let enrichedCount = 0;

      const shouldEnrich = config.operationMode === 'enrich-only' || config.operationMode === 'both';
      const shouldFindDuplicates = config.operationMode === 'duplicates-only' || config.operationMode === 'both';

      if (shouldEnrich && config.domainEnrichment && config.domainColumn) {
        setCurrentStep('Enriching domains with company data...');
        const enrichments = await EnrichmentService.enrichRows(
          csvData.rows,
          config.domainColumn,
          config.enrichmentProvider,
          config.enrichmentFields,
          config.useEmergentKey,
          config.enrichmentApiKey,
          config.perplexicaUrl,
          (progress, currentEnrichedCount) => {
            const progressValue = shouldFindDuplicates ? progress * 0.2 : progress;
            setProgress(progressValue);
            setStats(prev => ({
              ...prev,
              processedRows: Math.floor(progress * csvData.rows.length),
              enrichedRows: currentEnrichedCount || 0,
              processingTime: (Date.now() - startTime) / 1000
            }));
          }
        );

        setEnrichmentData(enrichments);

        workingRows = csvData.rows.map((row, index) => {
          const enrichment = enrichments.get(index);
          if (enrichment && enrichment.success && enrichment.companyName) {
            enrichedCount++;
            const enrichedRow: any = {
              ...row,
              'Enriched_Company': enrichment.companyName,
              'Enriched_Domain': enrichment.normalizedDomain
            };

            // Add enriched fields based on what was selected
            if (enrichment.headquarters) enrichedRow['Enriched_Headquarters'] = enrichment.headquarters;
            if (enrichment.hqCountry) enrichedRow['Enriched_HQ_Country'] = enrichment.hqCountry;
            if (enrichment.description) enrichedRow['Enriched_Description'] = enrichment.description;
            if (enrichment.shortDescription) enrichedRow['Enriched_Short_Description'] = enrichment.shortDescription;
            if (enrichment.industry) enrichedRow['Enriched_Industry'] = enrichment.industry;
            if (enrichment.vertical) enrichedRow['Enriched_Vertical'] = enrichment.vertical;
            if (enrichment.employeeCount) enrichedRow['Enriched_Employee_Count'] = enrichment.employeeCount;
            if (enrichment.revenue) enrichedRow['Enriched_Revenue'] = enrichment.revenue;
            if (enrichment.founded) enrichedRow['Enriched_Founded'] = enrichment.founded;
            if (enrichment.foundedCountry) enrichedRow['Enriched_Founded_Country'] = enrichment.foundedCountry;
            if (enrichment.funding) enrichedRow['Enriched_Funding'] = enrichment.funding;
            if (enrichment.fundingType) enrichedRow['Enriched_Funding_Type'] = enrichment.fundingType;
            if (enrichment.fundingStage) enrichedRow['Enriched_Funding_Stage'] = enrichment.fundingStage;
            if (enrichment.businessType) enrichedRow['Enriched_Business_Type'] = enrichment.businessType;
            if (enrichment.revenueModel) enrichedRow['Enriched_Revenue_Model'] = enrichment.revenueModel;
            if (enrichment.companyStage) enrichedRow['Enriched_Company_Stage'] = enrichment.companyStage;
            if (enrichment.tickerSymbol) enrichedRow['Enriched_Ticker_Symbol'] = enrichment.tickerSymbol;

            return enrichedRow;
          }
          return row;
        });

        console.log('Enriched rows:', enrichedCount);

        // Update available columns to include enriched fields for duplicate matching
        if (config.operationMode === 'both') {
          const enrichedColumns = ['Enriched_Company', 'Enriched_Domain'];
          const possibleEnrichedFields = [
            'Enriched_Ticker_Symbol',
            'Enriched_Headquarters',
            'Enriched_HQ_Country',
            'Enriched_Description',
            'Enriched_Short_Description',
            'Enriched_Industry',
            'Enriched_Vertical',
            'Enriched_Employee_Count',
            'Enriched_Revenue',
            'Enriched_Founded',
            'Enriched_Founded_Country',
            'Enriched_Funding',
            'Enriched_Funding_Type',
            'Enriched_Funding_Stage',
            'Enriched_Business_Type',
            'Enriched_Revenue_Model',
            'Enriched_Company_Stage'
          ];
          enrichedColumns.push(...possibleEnrichedFields);
          const newColumns = [...csvData.headers, ...enrichedColumns];
          setAvailableColumns(newColumns);
        }
      }

      let finalMatches: any[] = [];

      if (shouldFindDuplicates) {
        setCurrentStep('Finding fuzzy matches...');
        console.log('Starting fuzzy matching with', workingRows.length, 'rows');

        const fuzzyMatches = FuzzyMatcher.findDuplicates(
          workingRows,
          config,
          (progress) => {
            const baseProgress = shouldEnrich ? 0.2 : 0;
            const range = config.useAI ? 0.5 : 0.8;
            setProgress(baseProgress + progress * range);
            setStats(prev => ({
              ...prev,
              processedRows: Math.floor(progress * workingRows.length),
              processingTime: (Date.now() - startTime) / 1000,
              enrichedRows: enrichedCount
            }));
          }
        );

        console.log('Fuzzy matches found:', fuzzyMatches.length);

        finalMatches = fuzzyMatches;

        if (config.useAI && fuzzyMatches.length > 0) {
          setCurrentStep('Enhancing matches with AI...');
          const baseProgress = shouldEnrich ? 0.7 : 0.5;
          finalMatches = await AIMatcher.enhanceMatches(
            fuzzyMatches,
            config,
            undefined,
            (progress) => {
              setProgress(baseProgress + progress * 0.3);
            }
          );
        }
      } else {
        setProgress(1);
      }

      const hierarchiesCount = finalMatches.filter(m => m.hierarchyType && m.hierarchyType !== 'unknown').length;

      console.log('Final matches:', finalMatches.length);
      console.log('Hierarchies identified:', hierarchiesCount);

      setMatches(finalMatches);
      setProgress(1);
      setCurrentStep('Processing complete');
      setStats(prev => ({
        ...prev,
        processedRows: csvData.rows.length,
        duplicatesFound: finalMatches.length,
        hierarchiesIdentified: hierarchiesCount,
        processingTime: (Date.now() - startTime) / 1000,
        enrichedRows: enrichedCount
      }));

      if (config.operationMode === 'enrich-only') {
        alert(`Enrichment complete! ${enrichedCount} rows enriched. You can now export the results.`);
      } else if (shouldFindDuplicates && finalMatches.length === 0) {
        alert('No duplicates found with the current settings. Try lowering the similarity threshold.');
      }

    } catch (error) {
      console.error('Error processing data:', error);
      alert('Error processing data: ' + (error instanceof Error ? error.message : String(error)));
      setCurrentStep('Error occurred during processing');
    } finally {
      setIsProcessing(false);
    }
  }, [csvData, config]);

  const handleActionChange = useCallback((matchId: string, action: MatchResult['action']) => {
    setMatches(prev => prev.map(match => 
      match.id === matchId ? { ...match, action } : match
    ));
  }, []);

  const handleBulkAction = useCallback((matchIds: string[], action: MatchResult['action']) => {
    setMatches(prev => prev.map(match => 
      matchIds.includes(match.id) ? { ...match, action } : match
    ));
  }, []);

  const buildEnhancedRows = useCallback(() => {
    if (!csvData) return { headers: [], rows: [] };

    const additionalColumns = ['DUPLICATE_STATUS', 'MATCH_CONFIDENCE'];
    if (config.domainEnrichment && enrichmentData.size > 0) {
      additionalColumns.push('ENRICHED_COMPANY', 'ENRICHED_DOMAIN');
      additionalColumns.push(
        'ENRICHED_HEADQUARTERS',
        'ENRICHED_HQ_COUNTRY',
        'ENRICHED_DESCRIPTION',
        'ENRICHED_SHORT_DESCRIPTION',
        'ENRICHED_INDUSTRY',
        'ENRICHED_VERTICAL',
        'ENRICHED_EMPLOYEE_COUNT',
        'ENRICHED_REVENUE',
        'ENRICHED_FOUNDED',
        'ENRICHED_FOUNDED_COUNTRY',
        'ENRICHED_FUNDING',
        'ENRICHED_FUNDING_TYPE',
        'ENRICHED_FUNDING_STAGE',
        'ENRICHED_BUSINESS_TYPE',
        'ENRICHED_REVENUE_MODEL',
        'ENRICHED_COMPANY_STAGE',
        'ENRICHED_TICKER_SYMBOL'
      );
    }
    const enhancedHeaders = [...csvData.headers, ...additionalColumns];

    const processedRows = csvData.rows.map((row, index) => {
      const matchAsOriginal = matches.find(match => match.originalRow === row);
      const matchAsDuplicate = matches.find(match => match.duplicateRow === row);
      
      let duplicateStatus = '';
      let matchConfidence = '';
      
      if (matchAsOriginal && matchAsOriginal.action === 'delete') {
        duplicateStatus = 'DELETE_ORIGINAL';
        matchConfidence = (matchAsOriginal.confidence * 100).toFixed(1) + '%';
      } else if (matchAsDuplicate && matchAsDuplicate.action === 'delete') {
        duplicateStatus = 'DELETE_DUPLICATE';
        matchConfidence = (matchAsDuplicate.confidence * 100).toFixed(1) + '%';
      } else if (matchAsOriginal && matchAsOriginal.action === 'merge') {
        duplicateStatus = 'MERGE_MASTER';
        matchConfidence = (matchAsOriginal.confidence * 100).toFixed(1) + '%';
      } else if (matchAsDuplicate && matchAsDuplicate.action === 'merge') {
        duplicateStatus = 'MERGE_INTO_MASTER';
        matchConfidence = (matchAsDuplicate.confidence * 100).toFixed(1) + '%';
      } else if (matchAsOriginal || matchAsDuplicate) {
        const match = matchAsOriginal || matchAsDuplicate;
        duplicateStatus = match!.action.toUpperCase();
        matchConfidence = (match!.confidence * 100).toFixed(1) + '%';
      }
      
      const enrichment = enrichmentData.get(index);
      const result: any = {
        ...row,
        'DUPLICATE_STATUS': duplicateStatus,
        'MATCH_CONFIDENCE': matchConfidence
      };

      if (config.domainEnrichment && enrichment) {
        result['ENRICHED_COMPANY'] = enrichment.companyName || '';
        result['ENRICHED_DOMAIN'] = enrichment.normalizedDomain || '';
        result['ENRICHED_HEADQUARTERS'] = enrichment.headquarters || '';
        result['ENRICHED_HQ_COUNTRY'] = enrichment.hqCountry || '';
        result['ENRICHED_DESCRIPTION'] = enrichment.description || '';
        result['ENRICHED_SHORT_DESCRIPTION'] = enrichment.shortDescription || '';
        result['ENRICHED_INDUSTRY'] = enrichment.industry || '';
        result['ENRICHED_VERTICAL'] = enrichment.vertical || '';
        result['ENRICHED_EMPLOYEE_COUNT'] = enrichment.employeeCount || '';
        result['ENRICHED_REVENUE'] = enrichment.revenue || '';
        result['ENRICHED_FOUNDED'] = enrichment.founded || '';
        result['ENRICHED_FOUNDED_COUNTRY'] = enrichment.foundedCountry || '';
        result['ENRICHED_FUNDING'] = enrichment.funding || '';
        result['ENRICHED_FUNDING_TYPE'] = enrichment.fundingType || '';
        result['ENRICHED_FUNDING_STAGE'] = enrichment.fundingStage || '';
        result['ENRICHED_BUSINESS_TYPE'] = enrichment.businessType || '';
        result['ENRICHED_REVENUE_MODEL'] = enrichment.revenueModel || '';
        result['ENRICHED_COMPANY_STAGE'] = enrichment.companyStage || '';
        result['ENRICHED_TICKER_SYMBOL'] = enrichment.tickerSymbol || '';
      }

      return result;
    });

    return { headers: enhancedHeaders, rows: processedRows };
  }, [csvData, matches, config.domainEnrichment, enrichmentData]);

  const exportCSV = useCallback(() => {
    if (!csvData) return;

    try {
      const { headers, rows } = buildEnhancedRows();
      const csvContent = CSVParser.exportToCSV(headers, rows);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enriched_${filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('CSV export successful');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [csvData, filename, buildEnhancedRows]);

  const exportExcel = useCallback(() => {
    if (!csvData) return;

    try {
      const { headers, rows } = buildEnhancedRows();
      
      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Enriched Data');
      
      // Generate Excel file
      XLSX.writeFile(wb, `enriched_${filename.replace('.csv', '')}.xlsx`);
      console.log('Excel export successful');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Error exporting Excel: ' + (error instanceof Error ? error.message : String(error)));
    }
  }, [csvData, filename, buildEnhancedRows]);

  const handleClearAll = useCallback(async () => {
    if (window.confirm('Are you sure you want to clear all data, results, and cache? This cannot be undone.')) {
      try {
        // Clear backend cache
        await BackendApi.clearCache();
        
        // Clear frontend cache
        EnrichmentService.clearCache();
        
        // Reset all state
        setCsvData(null);
        setFilename('');
        setMatches([]);
        setEnrichmentData(new Map());
        setIsProcessing(false);
        setProgress(0);
        setCurrentStep('Ready to process');
        setStats({
          totalRows: 0,
          processedRows: 0,
          duplicatesFound: 0,
          hierarchiesIdentified: 0,
          processingTime: 0
        });
        setAvailableColumns([]);
        setConfig(prev => ({
          ...prev,
          selectedColumns: [],
          domainColumn: ''
        }));
        
        console.log('All data and cache cleared successfully');
        alert('All data, results, and cache have been cleared!');
      } catch (error) {
        console.error('Error clearing cache:', error);
        alert('Error clearing cache: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Database className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Salesforce Data Cleaner</h1>
                <p className="text-sm text-gray-600">Advanced duplicate detection and hierarchy analysis</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Zap className="h-4 w-4" />
                <span>Fuzzy Matching</span>
              </div>
              <div className="flex items-center space-x-1">
                <Brain className="h-4 w-4" />
                <span>AI Enhanced</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* File Upload */}
          {!csvData && (
            <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
          )}

          {/* Configuration */}
          {csvData && (
            <>
              <OperationMode
                mode={config.operationMode}
                onModeChange={(mode) => setConfig(prev => ({ ...prev, operationMode: mode }))}
              />

              {(config.operationMode === 'duplicates-only' || config.operationMode === 'both') && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <ColumnSelector
                    columns={availableColumns}
                    selectedColumns={config.selectedColumns}
                    onColumnToggle={handleColumnToggle}
                    onSelectAll={handleSelectAllColumns}
                    onClearAll={handleClearAllColumns}
                  />
                  <MatchingConfig config={config} onConfigChange={setConfig} />
                </div>
              )}

              {(config.operationMode === 'enrich-only' || config.operationMode === 'both') && (
                <DomainEnrichment
                  enabled={config.domainEnrichment}
                  onToggle={(enabled) => setConfig(prev => ({ ...prev, domainEnrichment: enabled }))}
                  columns={csvData.headers}
                  selectedColumn={config.domainColumn}
                  onColumnSelect={(column) => setConfig(prev => ({ ...prev, domainColumn: column }))}
                  provider={config.enrichmentProvider}
                  onProviderChange={(provider) => setConfig(prev => ({ ...prev, enrichmentProvider: provider }))}
                  apiKey={config.enrichmentApiKey || ''}
                  onApiKeyChange={(apiKey) => setConfig(prev => ({ ...prev, enrichmentApiKey: apiKey }))}
                  perplexicaUrl={config.perplexicaUrl}
                  onPerplexicaUrlChange={(url) => setConfig(prev => ({ ...prev, perplexicaUrl: url }))}
                  extendedEnrichment={config.extendedEnrichment}
                  onExtendedToggle={(extended) => setConfig(prev => ({ ...prev, extendedEnrichment: extended }))}
                  enrichmentFields={config.enrichmentFields}
                  onFieldsChange={(fields) => setConfig(prev => ({ ...prev, enrichmentFields: fields }))}
                  useEmergentKey={config.useEmergentKey}
                  onUseEmergentKeyChange={(use) => setConfig(prev => ({ ...prev, useEmergentKey: use }))}
                />
              )}

              {/* Processing Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={processData}
                    disabled={isProcessing}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Zap className="h-5 w-5" />
                    <span>
                      {isProcessing ? 'Processing...' :
                       config.operationMode === 'enrich-only' ? 'Enrich Data' :
                       config.operationMode === 'duplicates-only' ? 'Find Duplicates' :
                       'Enrich & Find Duplicates'}
                    </span>
                  </button>

                  <button
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Clear All</span>
                  </button>
                </div>

                <div className="text-sm text-gray-600">
                  {csvData.rows.length.toLocaleString()} rows loaded from {filename}
                </div>
              </div>

              {/* Progress */}
              <ProcessingProgress
                isProcessing={isProcessing}
                progress={progress}
                stats={stats}
                currentStep={currentStep}
                operationMode={config.operationMode}
              />

              {/* Enriched Results Table */}
              {enrichmentData.size > 0 && (
                <EnrichedResultsTable
                  rows={csvData.rows}
                  enrichmentData={enrichmentData}
                  headers={csvData.headers}
                  onExportCSV={exportCSV}
                  onExportExcel={exportExcel}
                />
              )}

              {/* Results */}
              {matches.length > 0 && (
                <MatchResults
                  matches={matches}
                  onActionChange={handleActionChange}
                  onBulkAction={handleBulkAction}
                  onExport={exportCSV}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;