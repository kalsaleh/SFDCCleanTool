import { BackendApi, EnrichmentResponse } from './backendApi';
import { CSVRow } from '../types';
import { DomainEnrichment } from '../utils/domainEnrichment';

export class EnrichmentService {
  private static cache = new Map<string, EnrichmentResponse>();

  static async enrichRows(
    rows: CSVRow[],
    domainColumn: string,
    provider: 'openai' | 'claude' | 'perplexica' | 'cloudflare',
    fields: string[],
    useEmergentKey: boolean,
    customApiKey?: string,
    perplexicaUrl?: string,
    enrichmentType: 'domain' | 'company' = 'domain',
    onProgress?: (progress: number, enrichedCount: number) => void
  ): Promise<Map<number, EnrichmentResponse>> {
    const enrichmentMap = new Map<number, EnrichmentResponse>();
    const totalRows = rows.length;
    let enrichedCount = 0;

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

        let domain = value;
        let normalized = value;

        // For domain type, extract and normalize domain
        if (enrichmentType === 'domain') {
          domain = BackendApi.extractDomain(value);
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
          normalized = BackendApi.normalizeDomain(domain);
        } else {
          // For company type, use the value as-is
          normalized = value.toLowerCase().trim();
        }

        // Check cache
        const cacheKey = `${normalized}-${provider}-${fields.join(',')}-${enrichmentType}`;

        if (this.cache.has(cacheKey)) {
          const cachedResult = this.cache.get(cacheKey)!;
          enrichmentMap.set(i, cachedResult);
          if (cachedResult.success) enrichedCount++;
        } else {
          let enrichment: EnrichmentResponse;

          // Use frontend enrichment for cloudflare
          if (provider === 'cloudflare') {
            const extended = fields.length > 0;
            const result = await DomainEnrichment.enrichDomain(
              domain,
              provider,
              customApiKey,
              extended,
              enrichmentType
            );

            enrichment = {
              domain: result.domain,
              companyName: result.companyName,
              normalizedDomain: result.normalizedDomain,
              success: result.success,
              error: result.error,
              headquarters: result.headquarters,
              description: result.description,
              industry: result.industry,
              employeeCount: result.employeeCount,
              revenue: result.revenue,
              founded: result.founded,
              provider: result.provider || provider
            };
          } else {
            // Call backend API for openai, claude, perplexica
            enrichment = await BackendApi.enrichDomain({
              domain,
              provider: provider as 'openai' | 'claude' | 'perplexica',
              fields,
              custom_api_key: !useEmergentKey ? customApiKey : undefined,
              perplexica_url: perplexicaUrl
            });
          }

          this.cache.set(cacheKey, enrichment);
          enrichmentMap.set(i, enrichment);
          if (enrichment.success) enrichedCount++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Enrichment failed';
        console.error(`Error enriching row ${i} (${value}):`, errorMessage, error);
        enrichmentMap.set(i, {
          domain: value || '',
          normalizedDomain: value || '',
          success: false,
          error: errorMessage,
          provider
        });
      }

      // Update progress
      if (onProgress && (i % 5 === 0 || i === totalRows - 1)) {
        onProgress((i + 1) / totalRows, enrichedCount);
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
