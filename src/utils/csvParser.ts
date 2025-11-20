import { CSVRow } from '../types';

export class CSVParser {
  private static detectDelimiter(line: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detectedDelimiter = ',';

    for (const delimiter of delimiters) {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') inQuotes = !inQuotes;
        if (line[i] === delimiter && !inQuotes) count++;
      }
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delimiter;
      }
    }

    console.log('Detected delimiter:', detectedDelimiter === '\t' ? 'TAB' : detectedDelimiter, '(count:', maxCount, ')');
    return detectedDelimiter;
  }

  static parseCSV(csvContent: string): { headers: string[]; rows: CSVRow[] } {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };

    console.log('First line (raw):', lines[0]);
    const delimiter = this.detectDelimiter(lines[0]);
    const headers = this.parseCSVLine(lines[0], delimiter);
    console.log('Parsed headers:', headers);
    console.log('Number of headers:', headers.length);

    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i], delimiter);

      if (values.length > 0) {
        const row: CSVRow = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        rows.push(row);
      }
    }

    console.log('Total rows parsed:', rows.length);
    return { headers, rows };
  }

  private static parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else if (char !== '\r') {
        current += char;
      }
    }

    if (current || result.length > 0) {
      result.push(current.trim());
    }

    return result;
  }

  static exportToCSV(headers: string[], rows: CSVRow[]): string {
    const csvLines = [headers.join(',')];
    
    rows.forEach(row => {
      const values = headers.map(header => {
        const rawValue = row[header];
        const value = String(rawValue ?? '');
        // Escape quotes and wrap in quotes if contains comma or quote
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  }
}