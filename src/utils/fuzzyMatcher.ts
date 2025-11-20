import { CSVRow, MatchResult, MatchingConfig } from '../types';

export class FuzzyMatcher {
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private static similarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;
    
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return (maxLength - distance) / maxLength;
  }

  private static normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(inc|corp|corporation|ltd|limited|llc|co|company)\b\.?/g, '')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private static detectHierarchyType(row: CSVRow): 'global_parent' | 'regional_parent' | 'subsidiary' | 'unknown' {
    const companyName = (row['Company Name'] || row['Account Name'] || '').toLowerCase();
    const description = (row['Description'] || '').toLowerCase();
    const dupDesignation = (row['DUP Designation'] || '').toLowerCase();

    // Check for DUP designation from ZoomInfo or D&B
    if (dupDesignation.includes('ultimate parent') || dupDesignation.includes('global parent')) {
      return 'global_parent';
    }
    if (dupDesignation.includes('domestic parent') || dupDesignation.includes('regional parent')) {
      return 'regional_parent';
    }
    if (dupDesignation.includes('subsidiary') || dupDesignation.includes('branch')) {
      return 'subsidiary';
    }

    // Heuristic detection based on company name patterns
    const globalIndicators = ['international', 'worldwide', 'global', 'holdings', 'group'];
    const subsidiaryIndicators = ['subsidiary', 'division', 'branch', 'unit', 'dept'];

    const hasGlobalIndicator = globalIndicators.some(indicator => 
      companyName.includes(indicator) || description.includes(indicator)
    );
    const hasSubsidiaryIndicator = subsidiaryIndicators.some(indicator => 
      companyName.includes(indicator) || description.includes(indicator)
    );

    if (hasGlobalIndicator) return 'global_parent';
    if (hasSubsidiaryIndicator) return 'subsidiary';

    return 'unknown';
  }

  static findDuplicates(
    rows: CSVRow[],
    config: MatchingConfig,
    onProgress?: (progress: number) => void
  ): MatchResult[] {
    const matches: MatchResult[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < rows.length; i++) {
      if (processed.has(i)) continue;
      
      onProgress?.(i / rows.length);

      for (let j = i + 1; j < rows.length; j++) {
        if (processed.has(j)) continue;

        const match = this.compareRows(rows[i], rows[j], config, `${i}-${j}`);
        if (match && match.confidence >= config.fuzzyThreshold) {
          matches.push(match);
          processed.add(j);
        }
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private static compareRows(
    row1: CSVRow,
    row2: CSVRow,
    config: MatchingConfig,
    id: string
  ): MatchResult | null {
    const matchedFields: string[] = [];
    let totalSimilarity = 0;
    let fieldCount = 0;

    for (const column of config.selectedColumns) {
      const value1 = row1[column] || '';
      const value2 = row2[column] || '';

      if (!value1 && !value2) continue;

      let similarity: number;
      
      if (column.toLowerCase().includes('name') || column.toLowerCase().includes('company')) {
        const normalized1 = this.normalizeCompanyName(value1);
        const normalized2 = this.normalizeCompanyName(value2);
        similarity = this.similarity(normalized1, normalized2);
      } else {
        similarity = this.similarity(value1, value2);
      }

      if (similarity > 0.8) {
        matchedFields.push(column);
      }

      totalSimilarity += similarity;
      fieldCount++;
    }

    if (fieldCount === 0) return null;

    const confidence = totalSimilarity / fieldCount;
    
    if (confidence < config.fuzzyThreshold) return null;

    const hierarchyType = config.hierarchyDetection ? this.detectHierarchyType(row1) : undefined;

    const originalIdentifier = config.uniqueIdentifierColumn ? row1[config.uniqueIdentifierColumn] : undefined;
    const duplicateIdentifier = config.uniqueIdentifierColumn ? row2[config.uniqueIdentifierColumn] : undefined;

    return {
      id,
      originalRow: row1,
      duplicateRow: row2,
      confidence,
      matchType: confidence > 0.95 ? 'exact' : 'fuzzy',
      matchedFields,
      hierarchyType,
      action: 'pending',
      originalIdentifier,
      duplicateIdentifier
    };
  }
}