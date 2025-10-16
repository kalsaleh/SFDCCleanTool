# Salesforce Data Cleaner

A powerful desktop application for cleaning Salesforce CSV data with advanced duplicate detection and corporate hierarchy analysis.

## Features

- **Advanced Duplicate Detection**: Fuzzy matching with configurable similarity thresholds
- **AI Enhancement**: Optional AI-powered matching using OpenAI or Anthropic
- **Hierarchy Analysis**: Automatic detection of Global Parents, Regional Parents, and Subsidiaries
- **Large Dataset Support**: Efficient processing of large CSV files with chunked processing
- **Interactive Review**: Filter and manage matches with confidence scoring
- **Database Integration**: Save results to Supabase or direct database connection
- **Export Functionality**: Export marked data with duplicate status and confidence levels

## Installation

### Prerequisites

- Node.js (v18 or higher)
- Rust (for Tauri)
- macOS 10.13 or higher

### Setup

1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Configure your database connection in `.env.local`

5. Initialize Tauri:
   ```bash
   cargo tauri init
   ```

### Development

Run in development mode:
```bash
npm run tauri:dev
```

### Building

Build for production:
```bash
npm run tauri:build
```

This creates a DMG file in `src-tauri/target/release/bundle/dmg/`

## Database Setup

### Option 1: Supabase (Recommended)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Add your URL and anon key to `.env.local`
4. Create required tables (see database schema below)

### Option 2: Direct Database Connection

Configure your PostgreSQL/MySQL connection in `.env.local`

## Database Schema

```sql
-- Processing results table
CREATE TABLE processing_results (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_data JSONB,
  matches JSONB,
  processed_at TIMESTAMP DEFAULT NOW(),
  total_rows INTEGER,
  duplicates_found INTEGER
);

-- Cleaned accounts table
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  billing_street TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_country VARCHAR(100),
  billing_postal_code VARCHAR(20),
  phone VARCHAR(50),
  website VARCHAR(255),
  industry VARCHAR(100),
  annual_revenue DECIMAL,
  employee_count INTEGER,
  duplicate_status VARCHAR(50),
  match_confidence VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Usage

1. **Upload CSV**: Drag and drop or select your Salesforce CSV file
2. **Configure Columns**: Select which columns to use for matching
3. **Set Parameters**: Adjust similarity threshold and processing options
4. **Process Data**: Click "Find Duplicates" to analyze the data
5. **Review Matches**: Filter and review detected duplicates
6. **Mark Actions**: Choose to keep, merge, or delete each match
7. **Export Results**: Download CSV with duplicate markings

## Configuration Options

- **Similarity Threshold**: 50-100% matching sensitivity
- **Chunk Size**: Processing batch size for large files
- **AI Enhancement**: Optional AI-powered matching
- **Hierarchy Detection**: Identify corporate structures
- **Column Selection**: Choose relevant fields for comparison

## AI Integration

Configure AI providers in `.env.local`:
- OpenAI GPT models
- Anthropic Claude models
- Local processing (no API required)

## Troubleshooting

### Common Issues

1. **Rust Installation**: Use Homebrew if curl fails
2. **SSL Certificates**: Update certificates or use `-k` flag
3. **Database Connection**: Check firewall and credentials
4. **Large Files**: Increase chunk size for better performance

### Performance Tips

- Use lower similarity thresholds for more matches
- Increase chunk size for faster processing
- Enable AI only for critical accuracy needs
- Select relevant columns to improve speed

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue in the project repository.