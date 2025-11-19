import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export interface CachedEnrichment {
  cache_key: string;
  domain: string;
  provider: string;
  enrichment_type: 'domain' | 'company';
  company_name?: string;
  headquarters?: string;
  description?: string;
  industry?: string;
  employee_count?: string;
  revenue?: string;
  founded?: string;
  success: boolean;
  error_message?: string;
  created_at?: string;
  accessed_at?: string;
  access_count?: number;
}

export class EnrichmentCache {
  private static tableName = 'enrichment_cache';
  private static memoryCache = new Map<string, CachedEnrichment>();
  private static cacheHits = 0;
  private static cacheMisses = 0;

  static generateCacheKey(
    domain: string,
    provider: string,
    enrichmentType: 'domain' | 'company'
  ): string {
    const normalized = domain.toLowerCase().trim();
    return `${normalized}-${provider}-${enrichmentType}`;
  }

  static async get(
    domain: string,
    provider: string,
    enrichmentType: 'domain' | 'company'
  ): Promise<CachedEnrichment | null> {
    const cacheKey = this.generateCacheKey(domain, provider, enrichmentType);

    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      this.cacheHits++;
      console.log(`Memory cache HIT for ${cacheKey} (${this.cacheHits} hits, ${this.cacheMisses} misses)`);
      return this.memoryCache.get(cacheKey)!;
    }

    // Check database cache
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('cache_key', cacheKey)
        .maybeSingle();

      if (error) {
        console.warn('Cache lookup error:', error);
        this.cacheMisses++;
        return null;
      }

      if (data) {
        // Update access stats
        await supabase
          .from(this.tableName)
          .update({
            accessed_at: new Date().toISOString(),
            access_count: (data.access_count || 0) + 1
          })
          .eq('cache_key', cacheKey);

        // Store in memory cache
        this.memoryCache.set(cacheKey, data);
        this.cacheHits++;
        console.log(`DB cache HIT for ${cacheKey} (${this.cacheHits} hits, ${this.cacheMisses} misses)`);
        return data;
      }

      this.cacheMisses++;
      return null;
    } catch (error) {
      console.error('Cache lookup failed:', error);
      this.cacheMisses++;
      return null;
    }
  }

  static async set(enrichment: CachedEnrichment): Promise<void> {
    // Store in memory cache
    this.memoryCache.set(enrichment.cache_key, enrichment);

    // Store in database cache
    try {
      const { error } = await supabase
        .from(this.tableName)
        .upsert({
          ...enrichment,
          accessed_at: new Date().toISOString(),
          access_count: 1
        }, {
          onConflict: 'cache_key'
        });

      if (error) {
        console.warn('Failed to cache enrichment:', error);
      } else {
        console.log(`Cached enrichment for ${enrichment.domain}`);
      }
    } catch (error) {
      console.error('Cache save failed:', error);
    }
  }

  static async bulkGet(
    requests: Array<{ domain: string; provider: string; enrichmentType: 'domain' | 'company' }>
  ): Promise<Map<string, CachedEnrichment>> {
    const results = new Map<string, CachedEnrichment>();
    const cacheKeys = requests.map(r => this.generateCacheKey(r.domain, r.provider, r.enrichmentType));

    // Check memory cache first
    const dbLookups: string[] = [];
    for (const key of cacheKeys) {
      if (this.memoryCache.has(key)) {
        results.set(key, this.memoryCache.get(key)!);
        this.cacheHits++;
      } else {
        dbLookups.push(key);
      }
    }

    // Bulk lookup from database
    if (dbLookups.length > 0) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .in('cache_key', dbLookups);

        if (!error && data) {
          for (const item of data) {
            results.set(item.cache_key, item);
            this.memoryCache.set(item.cache_key, item);
            this.cacheHits++;

            // Update access stats in background
            supabase
              .from(this.tableName)
              .update({
                accessed_at: new Date().toISOString(),
                access_count: (item.access_count || 0) + 1
              })
              .eq('cache_key', item.cache_key)
              .then(() => {});
          }

          console.log(`Bulk cache: ${data.length} hits, ${dbLookups.length - data.length} misses`);
        }

        this.cacheMisses += dbLookups.length - (data?.length || 0);
      } catch (error) {
        console.error('Bulk cache lookup failed:', error);
        this.cacheMisses += dbLookups.length;
      }
    }

    return results;
  }

  static getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? (this.cacheHits / total) * 100 : 0;
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  static clearMemoryCache(): void {
    this.memoryCache.clear();
    console.log('Memory cache cleared');
  }

  static async clearAllCache(): Promise<void> {
    this.memoryCache.clear();
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) {
        console.error('Failed to clear database cache:', error);
      } else {
        console.log('All cache cleared');
      }
    } catch (error) {
      console.error('Cache clear failed:', error);
    }
  }
}
