import { supabase } from '../config/database';
import { CSVRow, MatchResult } from '../types';

export class DatabaseService {
  // Save processed results to database
  static async saveResults(
    filename: string,
    originalData: CSVRow[],
    matches: MatchResult[]
  ) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping database save');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('processing_results')
        .insert({
          filename,
          original_data: originalData,
          matches,
          processed_at: new Date().toISOString(),
          total_rows: originalData.length,
          duplicates_found: matches.length,
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Database save error:', error);
      throw error;
    }
  }

  // Load previous results
  static async loadResults(filename: string) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping database load');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('processing_results')
        .select('*')
        .eq('filename', filename)
        .order('processed_at', { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Database load error:', error);
      throw error;
    }
  }

  // Save cleaned data to accounts table
  static async saveCleanedAccounts(cleanedData: CSVRow[]) {
    if (!supabase) {
      console.warn('Supabase not configured, skipping account save');
      return null;
    }

    try {
      // Map CSV data to account structure
      const accounts = cleanedData.map(row => ({
        name: row['Company Name'] || row['Account Name'] || row['Name'],
        billing_street: row['Address'] || row['Street'],
        billing_city: row['City'],
        billing_state: row['State'] || row['Province'],
        billing_country: row['Country'],
        billing_postal_code: row['Postal Code'] || row['ZIP'],
        phone: row['Phone'],
        website: row['Website'],
        industry: row['Industry'],
        annual_revenue: row['Annual Revenue'],
        employee_count: row['Employees'] || row['Employee Count'],
        duplicate_status: row['DUPLICATE_STATUS'],
        match_confidence: row['MATCH_CONFIDENCE'],
        created_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('accounts')
        .upsert(accounts, { onConflict: 'name' });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Account save error:', error);
      throw error;
    }
  }

  // Get processing history
  static async getProcessingHistory() {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('processing_results')
        .select('filename, processed_at, total_rows, duplicates_found')
        .order('processed_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('History load error:', error);
      return [];
    }
  }
}