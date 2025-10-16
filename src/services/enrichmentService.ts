import { BackendApi, EnrichmentResponse } from './backendApi';
import { CSVRow } from '../types';

export class EnrichmentService {
  private static cache = new Map<string, EnrichmentResponse>();

  static async enrichRows(
    rows: CSVRow[],
    domainColumn: string,
    provider: 'openai' | 'claude' | 'perplexica',
    fields: string[],
    useEmergentKey: boolean,
    customApiKey?: string,
    perplexicaUrl?: string,
    onProgress?: (progress: number) => void
  ): Promise<Map<number, EnrichmentResponse>> {
    const enrichmentMap = new Map<number, EnrichmentResponse>();
    const totalRows = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const value = row[domainColumn];

      try {
        if (!value) {
          enrichmentMap.set(i, {
            domain: '',
            normalizedDomain: '',
            success: false,
            error: 'No domain value',
            provider
          });
          continue;
        }

        const domain = BackendApi.extractDomain(value);
        if (!domain) {
          enrichmentMap.set(i, {
            domain: value,
            normalizedDomain: value,
            success: false,
            error: 'Could not extract domain',
            provider
          });
          continue;
        }

        // Check cache
        const normalized = BackendApi.normalizeDomain(domain);
        const cacheKey = `${normalized}-${provider}-${fields.join(',')}`;
        
        if (this.cache.has(cacheKey)) {
          enrichmentMap.set(i, this.cache.get(cacheKey)!);
        } else {
          // Call backend API
          const enrichment = await BackendApi.enrichDomain({
            domain,
            provider,
            fields,
            custom_api_key: !useEmergentKey ? customApiKey : undefined,
            perplexica_url: perplexicaUrl
          });

          this.cache.set(cacheKey, enrichment);
          enrichmentMap.set(i, enrichment);
        }
      } catch (error) {
        console.error(`Error enriching row ${i}:`, error);
        enrichmentMap.set(i, {
          domain: value || '',
          normalizedDomain: value || '',
          success: false,
          error: error instanceof Error ? error.message : 'Enrichment failed',
          provider
        });
      }

      // Update progress
      if (onProgress && (i % 5 === 0 || i === totalRows - 1)) {
        onProgress((i + 1) / totalRows);
      }

      // Rate limiting
      if (i < rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return enrichmentMap;
  }

  static clearCache(): void {
    this.cache.clear();
  }

  static findDomainMatches(enrichmentMap: Map<number, EnrichmentResponse>): Map<string, number[]> {
    const domainGroups = new Map<string, number[]>();

    enrichmentMap.forEach((enrichment, rowIndex) => {
      if (enrichment.success && enrichment.normalizedDomain) {
        const existing = domainGroups.get(enrichment.normalizedDomain) || [];
        existing.push(rowIndex);
        domainGroups.set(enrichment.normalizedDomain, existing);
      }
    });

    const matches = new Map<string, number[]>();
    domainGroups.forEach((rowIndices, domain) => {
      if (rowIndices.length > 1) {
        matches.set(domain, rowIndices);
      }
    });

    return matches;
  }
}
