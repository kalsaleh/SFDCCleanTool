import { CSVRow } from '../types';

export interface EnrichmentResult {
  domain: string;
  companyName?: string;
  normalizedDomain: string;
  success: boolean;
  error?: string;
  headquarters?: string;
  description?: string;
  industry?: string;
  employeeCount?: string;
  revenue?: string;
  founded?: string;
  provider?: 'clearbit' | 'openai' | 'perplexica';
}

export class DomainEnrichment {
  private static cache = new Map<string, EnrichmentResult>();

  static extractDomain(email: string): string | null {
    const emailPattern = /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const match = email.match(emailPattern);
    if (match) return match[1].toLowerCase();

    const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    const urlMatch = email.match(urlPattern);
    if (urlMatch) return urlMatch[1].toLowerCase();

    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return email.toLowerCase();
    }

    return null;
  }

  static normalizeDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, '');
  }

  static async enrichDomain(
    domain: string,
    provider: 'clearbit' | 'openai' | 'perplexica' = 'clearbit',
    apiKey?: string,
    extended: boolean = false,
    perplexicaUrl?: string
  ): Promise<EnrichmentResult> {
    const normalized = this.normalizeDomain(domain);
    const cacheKey = `${normalized}-${provider}-${extended}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      if (provider === 'openai' && apiKey && extended) {
        return await this.enrichWithOpenAI(domain, normalized, apiKey, cacheKey);
      } else if (provider === 'perplexica' && perplexicaUrl && extended) {
        return await this.enrichWithPerplexica(domain, normalized, perplexicaUrl, cacheKey);
      } else {
        return await this.enrichWithClearbit(domain, normalized, cacheKey);
      }
    } catch (error) {
      const fallbackName = this.generateFallbackCompanyName(domain);
      const result: EnrichmentResult = {
        domain,
        companyName: fallbackName,
        normalizedDomain: normalized,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provider
      };
      this.cache.set(cacheKey, result);
      return result;
    }
  }

  private static async enrichWithClearbit(
    domain: string,
    normalized: string,
    cacheKey: string
  ): Promise<EnrichmentResult> {
    console.log('Clearbit: Enriching domain:', domain);

    try {
      const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(domain)}`);
      console.log('Clearbit response status:', response.status);

      if (response.ok) {
        const results = await response.json();
        console.log('Clearbit results for', domain, ':', results);

        if (results && results.length > 0) {
          const result: EnrichmentResult = {
            domain,
            companyName: results[0].name,
            normalizedDomain: normalized,
            success: true,
            provider: 'clearbit'
          };
          this.cache.set(cacheKey, result);
          console.log('Clearbit success:', result.companyName);
          return result;
        }
      }
    } catch (error) {
      console.error('Clearbit API error:', error);
      throw error;
    }

    console.log('Clearbit: No results found for', domain);
    const fallbackName = this.generateFallbackCompanyName(domain);
    const result: EnrichmentResult = {
      domain,
      companyName: fallbackName,
      normalizedDomain: normalized,
      success: false,
      error: 'No data found from Clearbit',
      provider: 'clearbit'
    };
    this.cache.set(cacheKey, result);
    return result;
  }

  private static async enrichWithOpenAI(
    domain: string,
    normalized: string,
    apiKey: string,
    cacheKey: string
  ): Promise<EnrichmentResult> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a business intelligence assistant. Provide accurate company information in JSON format only. If you cannot find information, use null for that field.'
          },
          {
            role: 'user',
            content: `Provide detailed information about the company at domain: ${domain}. Return ONLY valid JSON with these fields: companyName, headquarters (city, country), description (one sentence), industry, employeeCount (approximate range like "100-500"), revenue (approximate range with currency), founded (year). Example: {"companyName":"Example Inc","headquarters":"San Francisco, USA","description":"A software company","industry":"Technology","employeeCount":"100-500","revenue":"$10M-50M","founded":"2015"}`
          }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    try {
      const parsed = JSON.parse(content);
      const result: EnrichmentResult = {
        domain,
        companyName: parsed.companyName || this.generateFallbackCompanyName(domain),
        normalizedDomain: normalized,
        success: true,
        headquarters: parsed.headquarters,
        description: parsed.description,
        industry: parsed.industry,
        employeeCount: parsed.employeeCount,
        revenue: parsed.revenue,
        founded: parsed.founded,
        provider: 'openai'
      };
      this.cache.set(cacheKey, result);
      return result;
    } catch (parseError) {
      throw new Error('Failed to parse OpenAI response');
    }
  }

  private static async enrichWithPerplexica(
    domain: string,
    normalized: string,
    perplexicaUrl: string,
    cacheKey: string
  ): Promise<EnrichmentResult> {
    console.log('Perplexica: Enriching domain:', domain, 'using URL:', perplexicaUrl);

    const apiUrl = perplexicaUrl.endsWith('/') ? `${perplexicaUrl}api/search` : `${perplexicaUrl}/api/search`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        focusMode: 'webSearch',
        query: `Provide detailed information about the company at domain: ${domain}. Include: company name, headquarters location (city, country), brief description, industry, employee count range, revenue range, and year founded. Format as JSON with fields: companyName, headquarters, description, industry, employeeCount, revenue, founded.`,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Perplexica API error:', response.status, await response.text());
      throw new Error(`Perplexica API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Perplexica response:', data);

    const content = data.message;

    if (!content) {
      throw new Error('No content in Perplexica response');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('Perplexica: No JSON found in response, using text extraction');
        const companyName = this.extractCompanyName(content, domain);
        const result: EnrichmentResult = {
          domain,
          companyName: companyName || this.generateFallbackCompanyName(domain),
          normalizedDomain: normalized,
          success: !!companyName,
          description: content.substring(0, 200),
          provider: 'perplexica'
        };
        this.cache.set(cacheKey, result);
        return result;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const result: EnrichmentResult = {
        domain,
        companyName: parsed.companyName || this.generateFallbackCompanyName(domain),
        normalizedDomain: normalized,
        success: true,
        headquarters: parsed.headquarters,
        description: parsed.description,
        industry: parsed.industry,
        employeeCount: parsed.employeeCount,
        revenue: parsed.revenue,
        founded: parsed.founded,
        provider: 'perplexica'
      };
      this.cache.set(cacheKey, result);
      console.log('Perplexica success:', result.companyName);
      return result;
    } catch (parseError) {
      console.error('Perplexica parse error:', parseError);
      throw new Error('Failed to parse Perplexica response');
    }
  }

  private static extractCompanyName(text: string, domain: string): string | null {
    const patterns = [
      new RegExp(`(?:company name|called|named)\s*[:"]?\s*([^,\.\n]+)`, 'i'),
      new RegExp(`${domain}[^,\.]*\s+(?:is|was)\s+([A-Z][^,\.\n]+?)(?:\s+(?:is|was|that|which)|[,\.]|$)`, 'i'),
      new RegExp(`([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*?)\s+\(${domain}\)`, 'i')
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  private static generateFallbackCompanyName(domain: string): string {
    const normalized = this.normalizeDomain(domain);
    const parts = normalized.split('.');
    const mainPart = parts[0];

    return mainPart
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  static async enrichRows(
    rows: CSVRow[],
    columns: string[],
    provider: 'clearbit' | 'openai' | 'perplexica' = 'clearbit',
    apiKey?: string,
    extended: boolean = false,
    onProgress?: (progress: number) => void,
    perplexicaUrl?: string
  ): Promise<Map<number, EnrichmentResult>> {
    const enrichmentMap = new Map<number, EnrichmentResult>();
    const totalRows = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      let domainFound = false;

      try {
        for (const column of columns) {
          const value = row[column];
          if (!value) continue;

          const domain = this.extractDomain(value);
          if (domain) {
            try {
              const enrichment = await this.enrichDomain(domain, provider, apiKey, extended, perplexicaUrl);
              enrichmentMap.set(i, enrichment);
              domainFound = true;
              break;
            } catch (enrichError) {
              console.error(`Error enriching domain ${domain}:`, enrichError);
              enrichmentMap.set(i, {
                domain,
                companyName: this.generateFallbackCompanyName(domain),
                normalizedDomain: this.normalizeDomain(domain),
                success: false,
                error: enrichError instanceof Error ? enrichError.message : 'Enrichment failed',
                provider
              });
              domainFound = true;
              break;
            }
          }
        }

        if (!domainFound) {
          enrichmentMap.set(i, {
            domain: '',
            normalizedDomain: '',
            success: false,
            error: 'No domain found'
          });
        }
      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError);
        enrichmentMap.set(i, {
          domain: '',
          normalizedDomain: '',
          success: false,
          error: rowError instanceof Error ? rowError.message : 'Row processing failed'
        });
      }

      if (onProgress && (i % 10 === 0 || i === totalRows - 1)) {
        onProgress((i + 1) / totalRows);
      }

      if (provider !== 'clearbit' && i < rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return enrichmentMap;
  }

  static findDomainMatches(enrichmentMap: Map<number, EnrichmentResult>): Map<string, number[]> {
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

  static clearCache(): void {
    this.cache.clear();
  }
}
