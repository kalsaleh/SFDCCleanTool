import { createClient } from '@supabase/supabase-js';

// Supabase configuration (recommended)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Direct database configuration (alternative)
export const dbConfig = {
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_DB_PORT || '5432'),
  database: import.meta.env.VITE_DB_NAME || 'salesforce_cleaner',
  user: import.meta.env.VITE_DB_USER || 'postgres',
  password: import.meta.env.VITE_DB_PASSWORD || '',
};

// AI configuration
export const aiConfig = {
  openaiKey: import.meta.env.VITE_OPENAI_API_KEY,
  anthropicKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
};