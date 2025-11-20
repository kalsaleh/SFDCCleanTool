/*
  # Add access tracking to enrichment_cache

  1. Changes
    - Add `accessed_at` column to track when cache entries were last accessed
    - Add `access_count` column to track how many times each entry was used
    
  2. Notes
    - These columns help with cache analytics and optimization
    - Default values ensure existing rows work properly
*/

-- Add access tracking columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrichment_cache' AND column_name = 'accessed_at'
  ) THEN
    ALTER TABLE enrichment_cache ADD COLUMN accessed_at timestamptz DEFAULT now();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrichment_cache' AND column_name = 'access_count'
  ) THEN
    ALTER TABLE enrichment_cache ADD COLUMN access_count integer DEFAULT 0;
  END IF;
END $$;