export interface CSVRow {
  [key: string]: string;
}

export interface MatchResult {
  id: string;
  originalRow: CSVRow;
  duplicateRow: CSVRow;
  confidence: number;
  matchType: 'exact' | 'fuzzy' | 'ai';
  matchedFields: string[];
  hierarchyType?: 'global_parent' | 'regional_parent' | 'subsidiary' | 'unknown';
  action: 'keep' | 'merge' | 'delete' | 'pending';
}

export interface MatchingConfig {
  selectedColumns: string[];
  fuzzyThreshold: number;
  useAI: boolean;
  aiProvider: 'openai' | 'anthropic' | 'local';
  chunkSize: number;
  hierarchyDetection: boolean;
  domainEnrichment: boolean;
  domainColumn: string;
  enrichmentProvider: 'clearbit' | 'openai' | 'perplexica';
  enrichmentApiKey?: string;
  perplexicaUrl?: string;
  extendedEnrichment: boolean;
  operationMode: 'enrich-only' | 'duplicates-only' | 'both';
}

export interface ProcessingStats {
  totalRows: number;
  processedRows: number;
  duplicatesFound: number;
  hierarchiesIdentified: number;
  processingTime: number;
  enrichedRows?: number;
}

export interface HierarchyNode {
  id: string;
  name: string;
  type: 'global_parent' | 'regional_parent' | 'subsidiary';
  children: HierarchyNode[];
  data: CSVRow;
  confidence: number;
}