import { CSVRow } from '../types';
import { EnrichmentCache, CachedEnrichment } from '../services/enrichmentCache';

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
  provider?: 'openai' | 'perplexica' | 'claude' | 'cloudflare' | 'local-llm';
}

export class DomainEnrichment {
  private static cache = new Map<string, EnrichmentResult>();
  private static readonly REQUEST_TIMEOUT = 30000;
  private static readonly MAX_RETRIES = 2;
  private static useDbCache = true;

  private static async fetchWithTimeout(url: string, options: RequestInit, timeout: number = this.REQUEST_TIMEOUT): Promise<Response> {
    return Promise.race([
      fetch(url, options),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  }

  private static async fetchWithRetry(url: string, options: RequestInit, retries: number = this.MAX_RETRIES): Promise<Response> {
    for (let i = 0; i <= retries; i++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        if (response.ok || response.status === 400 || response.status === 401) {
          return response;
        }
        if (i < retries) {
          console.warn(`Request failed with status ${response.status}, retrying... (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } else {
          return response;
        }
      } catch (error) {
        if (i < retries) {
          console.warn(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}, retrying... (${i + 1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries exceeded');
  }

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
    provider: 'openai' | 'perplexica' | 'claude' | 'cloudflare' | 'local-llm' = 'cloudflare',
    apiKey?: string,
    extended: boolean = false,
    enrichmentType: 'domain' | 'company' = 'domain',
    perplexicaUrl?: string,
    localLlmUrl?: string,
    localLlmModel?: string
  ): Promise<EnrichmentResult> {
    const normalized = enrichmentType === 'domain' ? this.normalizeDomain(domain) : domain.toLowerCase().trim();
    const cacheKey = `${normalized}-${provider}-${extended}-${enrichmentType}`;

    // Check memory cache
    if (this.cache.has(cacheKey)) {
      console.log(`Memory cache hit: ${domain}`);
      return this.cache.get(cacheKey)!;
    }

    // Check database cache
    if (this.useDbCache) {
      try {
        const cached = await EnrichmentCache.get(normalized, provider, enrichmentType);
        if (cached && cached.success) {
          const result: EnrichmentResult = {
            domain,
            companyName: cached.company_name,
            normalizedDomain: normalized,
            success: cached.success,
            headquarters: cached.headquarters,
            description: cached.description,
            industry: cached.industry,
            employeeCount: cached.employee_count,
            revenue: cached.revenue,
            founded: cached.founded,
            provider: cached.provider as any
          };
          this.cache.set(cacheKey, result);
          console.log(`DB cache hit: ${domain} - saved API call!`);
          return result;
        }
      } catch (error) {
        console.warn('DB cache lookup failed:', error);
      }
    }

    try {
      if (provider === 'openai' && apiKey) {
        return await this.enrichWithOpenAI(domain, normalized, apiKey, cacheKey, enrichmentType);
      } else if (provider === 'claude' && apiKey) {
        return await this.enrichWithClaude(domain, normalized, apiKey, cacheKey, enrichmentType);
      } else if (provider === 'cloudflare' && apiKey) {
        return await this.enrichWithCloudflare(domain, normalized, apiKey, cacheKey, enrichmentType);
      } else if (provider === 'perplexica' && perplexicaUrl) {
        return await this.enrichWithPerplexica(domain, normalized, perplexicaUrl, cacheKey, enrichmentType);
      } else if (provider === 'local-llm' && localLlmUrl && localLlmModel) {
        return await this.enrichWithLocalLLM(domain, normalized, localLlmUrl, localLlmModel, cacheKey, enrichmentType);
      } else {
        throw new Error(`Missing API key or URL for provider: ${provider}`);
      }
    } catch (error) {
      const fallbackName = enrichmentType === 'company' ? domain : this.generateFallbackCompanyName(domain);
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

  private static async enrichWithOpenAI(
    domain: string,
    normalized: string,
    apiKey: string,
    cacheKey: string,
    enrichmentType: 'domain' | 'company' = 'domain'
  ): Promise<EnrichmentResult> {
    const queryText = enrichmentType === 'company'
      ? `Research the company named "${domain}" thoroughly.`
      : `Research the company with domain "${domain}" thoroughly. Visit their website, check company databases, and recent news.`;

    const response = await this.fetchWithRetry('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert business intelligence researcher with access to comprehensive company databases and web search. Your task is to find detailed, accurate, and current information about companies. Thoroughly research each company using multiple sources. Provide specific details, not generic descriptions. Return only valid JSON.'
          },
          {
            role: 'user',
            content: queryText + ` Provide comprehensive, specific information:\n\n1. **companyName**: Full official company name (legal name if different from brand)\n2. **headquarters**: Specific address format "City, State/Province, Country" (e.g., "San Francisco, California, USA" not just "San Francisco, USA")\n3. **description**: Write 3-4 detailed sentences covering:\n   - What products/services they offer\n   - Their target market and customers\n   - What makes them unique or notable\n   - Their business model or key value proposition\n4. **industry**: Be specific (e.g., "Enterprise SaaS - Customer Relationship Management" not just "Software")\n5. **employeeCount**: Research current count, use ranges: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"\n6. **revenue**: Annual revenue with currency, ranges: "<$1M", "$1M-5M", "$5M-10M", "$10M-50M", "$50M-100M", "$100M-500M", "$500M-1B", "$1B+"\n7. **founded**: Exact year (YYYY)\n\nReturn ONLY valid JSON. Be thorough and specific - this is for business intelligence purposes.`
          }
        ],
        temperature: 0.1,
        max_tokens: 800
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

  private static async enrichWithClaude(
    domain: string,
    normalized: string,
    apiKey: string,
    cacheKey: string,
    enrichmentType: 'domain' | 'company' = 'domain'
  ): Promise<EnrichmentResult> {
    console.log(`Claude: Enriching ${enrichmentType}:`, domain);

    const queryText = enrichmentType === 'company'
      ? `Research the company named "${domain}" thoroughly.`
      : `Research the company with domain "${domain}" thoroughly. Visit their website, check company databases, and recent news.`;

    const response = await this.fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: queryText + ` Provide comprehensive, specific information:

1. **companyName**: Full official company name (legal name if different from brand)
2. **headquarters**: Specific address format "City, State/Province, Country" (e.g., "San Francisco, California, USA" not just "San Francisco, USA")
3. **description**: Write 3-4 detailed sentences covering:
   - What products/services they offer
   - Their target market and customers
   - What makes them unique or notable
   - Their business model or key value proposition
4. **industry**: Be specific (e.g., "Enterprise SaaS - Customer Relationship Management" not just "Software")
5. **employeeCount**: Research current count, use ranges: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"
6. **revenue**: Annual revenue with currency, ranges: "<$1M", "$1M-5M", "$5M-10M", "$10M-50M", "$50M-100M", "$100M-500M", "$500M-1B", "$1B+"
7. **founded**: Exact year (YYYY)

Return ONLY valid JSON. Be thorough and specific - this is for business intelligence purposes.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error('No content in Claude response');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
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
        provider: 'claude'
      };
      this.cache.set(cacheKey, result);
      return result;
    } catch (parseError) {
      throw new Error('Failed to parse Claude response');
    }
  }

  private static async enrichWithCloudflare(
    domain: string,
    normalized: string,
    apiKey: string,
    cacheKey: string,
    enrichmentType: 'domain' | 'company' = 'domain'
  ): Promise<EnrichmentResult> {
    console.log(`Cloudflare AI: Enriching ${enrichmentType}:`, domain);

    const parts = apiKey.split(':');
    if (parts.length !== 2) {
      throw new Error('Cloudflare API key must be in format "accountId:apiToken"');
    }

    const accountId = parts[0].trim();
    const apiToken = parts[1].trim();

    if (!accountId || !apiToken) {
      throw new Error('Cloudflare API key must be in format "accountId:apiToken"');
    }

    console.log('Using Cloudflare account:', accountId);

    const prompt = enrichmentType === 'company'
      ? `Company: "${domain}". JSON: {companyName, headquarters:"City, Country", description:"2 sentences", industry, employeeCount:"range", revenue:"range", founded:"year"}`
      : `Domain: "${domain}". JSON: {companyName, headquarters:"City, Country", description:"2 sentences", industry, employeeCount:"range", revenue:"range", founded:"year"}`;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/cloudflare-ai-proxy`;

    const response = await this.fetchWithRetry(
      edgeFunctionUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          accountId,
          apiToken,
          prompt,
          model: '@cf/meta/llama-3.1-8b-instruct'
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare API error response:', errorText);
      throw new Error(`Cloudflare AI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Cloudflare API response:', JSON.stringify(data, null, 2));

    const content = data.result?.response;

    if (!content) {
      console.error('Cloudflare response structure:', data);
      throw new Error('No content in Cloudflare AI response');
    }

    console.log('Cloudflare AI content:', content);

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Cloudflare AI response');
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
        provider: 'cloudflare'
      };
      this.cache.set(cacheKey, result);
      await this.saveToCache(result, 'cloudflare', enrichmentType);
      return result;
    } catch (parseError) {
      throw new Error('Failed to parse Cloudflare AI response');
    }
  }

  private static async enrichWithPerplexica(
    domain: string,
    normalized: string,
    perplexicaUrl: string,
    cacheKey: string,
    enrichmentType: 'domain' | 'company' = 'domain'
  ): Promise<EnrichmentResult> {
    console.log(`Perplexica: Enriching ${enrichmentType}:`, domain, 'using URL:', perplexicaUrl);

    const apiUrl = perplexicaUrl.endsWith('/') ? `${perplexicaUrl}api/search` : `${perplexicaUrl}/api/search`;

    const queryStart = enrichmentType === 'company'
      ? `Conduct comprehensive research on the company named "${domain}".`
      : `Conduct comprehensive research on the company with domain "${domain}". Search their official website, company databases (LinkedIn, Crunchbase), and recent news articles.`;

    const response = await this.fetchWithRetry(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        focusMode: 'webSearch',
        query: queryStart + ` Provide highly detailed and specific information:

1. **companyName**: Full official legal company name
2. **headquarters**: Complete address format "City, State/Province, Country" (e.g., "Austin, Texas, USA")
3. **description**: Write 3-4 detailed sentences that explain:
   - What specific products or services they provide
   - Who their target customers are (B2B, B2C, industry focus)
   - What differentiates them in the market
   - Their business model or key offerings
4. **industry**: Be very specific with sector and subsector (e.g., "FinTech - Payment Processing" or "Healthcare - Electronic Medical Records")
5. **employeeCount**: Find the current employee count and use these ranges: "1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+"
6. **revenue**: Annual revenue with proper ranges: "<$1M", "$1M-5M", "$5M-10M", "$10M-50M", "$50M-100M", "$100M-500M", "$500M-1B", "$1B+"
7. **founded**: Exact founding year (YYYY format)

Format your response as valid JSON only. Be thorough and accurate - this is for business intelligence and data enrichment purposes. Include all available information.`,
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

  private static async enrichWithLocalLLM(
    domain: string,
    normalized: string,
    localLlmUrl: string,
    localLlmModel: string,
    cacheKey: string,
    enrichmentType: 'domain' | 'company' = 'domain'
  ): Promise<EnrichmentResult> {
    console.log(`Local LLM: Enriching ${enrichmentType}:`, domain);

    const prompt = enrichmentType === 'company'
      ? `Company: "${domain}". JSON: {companyName, headquarters:"City, Country", description:"2 sentences", industry, employeeCount:"range", revenue:"range", founded:"year"}`
      : `Domain: "${domain}". JSON: {companyName, headquarters:"City, Country", description:"2 sentences", industry, employeeCount:"range", revenue:"range", founded:"year"}`;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/local-llm-proxy`;

    const response = await this.fetchWithRetry(
      edgeFunctionUrl,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey
        },
        body: JSON.stringify({
          url: localLlmUrl,
          model: localLlmModel,
          prompt
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Local LLM API error response:', errorText);
      throw new Error(`Local LLM API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.response;

    if (!content) {
      throw new Error('No response from local LLM');
    }

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.log('Local LLM: No JSON found in response');
        const result: EnrichmentResult = {
          domain,
          companyName: this.generateFallbackCompanyName(domain),
          normalizedDomain: normalized,
          success: false,
          provider: 'local-llm'
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
        provider: 'local-llm'
      };
      this.cache.set(cacheKey, result);
      await this.saveToCache(result, 'local-llm', enrichmentType);
      console.log('Local LLM success:', result.companyName);
      return result;
    } catch (parseError) {
      console.error('Local LLM parse error:', parseError);
      throw new Error('Failed to parse local LLM response');
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

  private static async saveToCache(result: EnrichmentResult, provider: string, enrichmentType: 'domain' | 'company'): Promise<void> {
    if (!this.useDbCache) return;

    try {
      const cached: CachedEnrichment = {
        cache_key: EnrichmentCache.generateCacheKey(result.normalizedDomain, provider, enrichmentType),
        domain: result.domain,
        provider,
        enrichment_type: enrichmentType,
        company_name: result.companyName,
        headquarters: result.headquarters,
        description: result.description,
        industry: result.industry,
        employee_count: result.employeeCount,
        revenue: result.revenue,
        founded: result.founded,
        success: result.success,
        error_message: result.error
      };
      await EnrichmentCache.set(cached);
    } catch (error) {
      console.warn('Failed to save to cache:', error);
    }
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
