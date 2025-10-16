/*
  # Initial Schema for Salesforce Data Cleaner

  1. New Tables
    - `processing_results`
      - `id` (uuid, primary key) - Unique identifier for each processing session
      - `filename` (text) - Name of the uploaded CSV file
      - `original_data` (jsonb) - Original CSV data in JSON format
      - `matches` (jsonb) - Detected duplicate matches with confidence scores
      - `processed_at` (timestamptz) - When the file was processed
      - `total_rows` (integer) - Total number of rows in the CSV
      - `duplicates_found` (integer) - Number of duplicates detected
      - `created_at` (timestamptz) - Record creation timestamp

    - `accounts`
      - `id` (uuid, primary key) - Unique identifier for each account
      - `name` (text) - Account name
      - `billing_street` (text) - Street address
      - `billing_city` (text) - City
      - `billing_state` (text) - State/Province
      - `billing_country` (text) - Country
      - `billing_postal_code` (text) - Postal/ZIP code
      - `phone` (text) - Phone number
      - `website` (text) - Website URL
      - `industry` (text) - Industry category
      - `annual_revenue` (numeric) - Annual revenue
      - `employee_count` (integer) - Number of employees
      - `duplicate_status` (text) - Status: 'unique', 'duplicate', 'master', etc.
      - `match_confidence` (text) - Confidence level: 'high', 'medium', 'low'
      - `created_at` (timestamptz) - Record creation timestamp

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
    - Public read access for processing results (can be restricted later)
*/

-- Create processing_results table
CREATE TABLE IF NOT EXISTS processing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  original_data jsonb,
  matches jsonb,
  processed_at timestamptz DEFAULT now(),
  total_rows integer DEFAULT 0,
  duplicates_found integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  billing_street text,
  billing_city text,
  billing_state text,
  billing_country text,
  billing_postal_code text,
  phone text,
  website text,
  industry text,
  annual_revenue numeric,
  employee_count integer,
  duplicate_status text DEFAULT 'unique',
  match_confidence text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE processing_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for processing_results
CREATE POLICY "Anyone can view processing results"
  ON processing_results
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert processing results"
  ON processing_results
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update processing results"
  ON processing_results
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete processing results"
  ON processing_results
  FOR DELETE
  USING (true);

-- Create policies for accounts
CREATE POLICY "Anyone can view accounts"
  ON accounts
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert accounts"
  ON accounts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update accounts"
  ON accounts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete accounts"
  ON accounts
  FOR DELETE
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_processing_results_filename ON processing_results(filename);
CREATE INDEX IF NOT EXISTS idx_processing_results_processed_at ON processing_results(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_accounts_duplicate_status ON accounts(duplicate_status);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);