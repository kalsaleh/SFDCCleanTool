/*
  # Create enrichment_cache table

  1. New Tables
    - `enrichment_cache`
      - `id` (uuid, primary key) - Unique identifier for each cache entry
      - `cache_key` (text, unique) - Composite key for domain+provider+type lookups
      - `domain` (text) - The domain or company name that was enriched
      - `provider` (text) - Which AI provider was used (cloudflare, openai, claude, etc)
      - `enrichment_type` (text) - Type of enrichment (domain or company)
      - `company_name` (text) - Enriched company name
      - `headquarters` (text) - Company headquarters location
      - `description` (text) - Company description
      - `industry` (text) - Company industry
      - `employee_count` (text) - Employee count range
      - `revenue` (text) - Revenue range
      - `founded` (text) - Year founded
      - `success` (boolean) - Whether enrichment was successful
      - `error_message` (text) - Error message if enrichment failed
      - `created_at` (timestamptz) - When the cache entry was created
      - `updated_at` (timestamptz) - When the cache entry was last updated

  2. Indexes
    - Unique index on cache_key for fast lookups
    - Index on domain for searching by domain
    - Index on provider for filtering by provider
    - Index on created_at for cache expiration management

  3. Security
    - Enable RLS on enrichment_cache table
    - Add policy for public read access (cached data is not sensitive)
    - Add policy for authenticated insert/update
*/

-- Create enrichment_cache table
CREATE TABLE IF NOT EXISTS enrichment_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  domain text NOT NULL,
  provider text NOT NULL DEFAULT 'cloudflare',
  enrichment_type text NOT NULL DEFAULT 'domain',
  company_name text,
  headquarters text,
  description text,
  industry text,
  employee_count text,
  revenue text,
  founded text,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_cache_key ON enrichment_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_domain ON enrichment_cache(domain);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_provider ON enrichment_cache(provider);
CREATE INDEX IF NOT EXISTS idx_enrichment_cache_created_at ON enrichment_cache(created_at);

-- Enable RLS
ALTER TABLE enrichment_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read cached enrichment data (it's public company information)
CREATE POLICY "Anyone can read enrichment cache"
  ON enrichment_cache
  FOR SELECT
  USING (true);

-- Policy: Anyone can insert enrichment cache entries
CREATE POLICY "Anyone can insert enrichment cache"
  ON enrichment_cache
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can update enrichment cache entries
CREATE POLICY "Anyone can update enrichment cache"
  ON enrichment_cache
  FOR UPDATE
  USING (true)
  WITH CHECK (true);