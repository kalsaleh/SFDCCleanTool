// Use relative path - Vite will proxy to backend
const API_BASE_URL = '';

export interface EnrichmentRequest {
  domain: string;
  provider: 'openai' | 'claude' | 'perplexica';
  fields: string[];
  custom_api_key?: string;
  perplexica_url?: string;
}

export interface EnrichmentResponse {
  domain: string;
  companyName?: string;
  normalizedDomain: string;
  success: boolean;
  error?: string;
  headquarters?: string;
  hqCountry?: string;
  description?: string;
  shortDescription?: string;
  industry?: string;
  vertical?: string;
  employeeCount?: string;
  revenue?: string;
  founded?: string;
  foundedCountry?: string;
  funding?: string;
  fundingType?: string;
  fundingStage?: string;
  businessType?: string;
  revenueModel?: string;
  companyStage?: string;
  tickerSymbol?: string;
  provider: string;
  fromCache?: boolean;
}

export class BackendApi {
  static async enrichDomain(request: EnrichmentRequest): Promise<EnrichmentResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/enrich`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || `API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    }
  }

  static async getConfig() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config`);
      if (!response.ok) {
        throw new Error(`Config API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Config API error:', error);
      throw error;
    }
  }

  static async clearCache() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/clear-cache`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Clear cache API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Clear cache API error:', error);
      throw error;
    }
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
}
