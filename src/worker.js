// Cloudflare Worker for handling CSV processing and API endpoints
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    try {
      // Route handling
      if (url.pathname === '/api/process-csv') {
        return await handleCSVProcessing(request, env, corsHeaders);
      }

      if (url.pathname === '/api/save-results') {
        return await handleSaveResults(request, env, corsHeaders);
      }

      if (url.pathname === '/api/load-results') {
        return await handleLoadResults(request, env, corsHeaders);
      }

      if (url.pathname === '/api/health') {
        return new Response(JSON.stringify({ 
          status: 'healthy', 
          timestamp: new Date().toISOString() 
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // Default response for unknown routes
      return new Response('Not Found', { 
        status: 404, 
        headers: corsHeaders 
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};

// Handle CSV processing requests
async function handleCSVProcessing(request, env, corsHeaders) {
  try {
    const { csvData, config } = await request.json();
    
    if (!csvData || !config) {
      return new Response(JSON.stringify({ 
        error: 'Missing csvData or config' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Process CSV data using fuzzy matching
    const matches = await processCSVData(csvData, config);
    
    // Store results in KV for later retrieval
    const resultId = generateId();
    await env.DATA_STORE.put(`processing:${resultId}`, JSON.stringify({
      matches,
      config,
      timestamp: new Date().toISOString(),
      totalRows: csvData.rows.length
    }), {
      expirationTtl: 86400 // 24 hours
    });

    return new Response(JSON.stringify({ 
      matches,
      resultId,
      totalProcessed: csvData.rows.length,
      duplicatesFound: matches.length
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('CSV processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Processing failed',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Handle saving results to KV storage
async function handleSaveResults(request, env, corsHeaders) {
  try {
    const { filename, results, matches } = await request.json();
    
    const saveId = generateId();
    await env.DATA_STORE.put(`results:${saveId}`, JSON.stringify({
      filename,
      results,
      matches,
      savedAt: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ 
      success: true, 
      saveId 
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Save results error:', error);
    return new Response(JSON.stringify({ 
      error: 'Save failed',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Handle loading previous results
async function handleLoadResults(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const resultId = url.searchParams.get('id');
    
    if (!resultId) {
      return new Response(JSON.stringify({ 
        error: 'Missing result ID' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const data = await env.DATA_STORE.get(`results:${resultId}`, 'json');
    
    if (!data) {
      return new Response(JSON.stringify({ 
        error: 'Results not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error) {
    console.error('Load results error:', error);
    return new Response(JSON.stringify({ 
      error: 'Load failed',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

// Process CSV data with fuzzy matching
async function processCSVData(csvData, config) {
  const matches = [];
  const { rows } = csvData;
  const { selectedColumns, fuzzyThreshold } = config;

  // Simple fuzzy matching implementation
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const similarity = calculateSimilarity(
        rows[i], 
        rows[j], 
        selectedColumns
      );
      
      if (similarity >= fuzzyThreshold) {
        matches.push({
          id: `${i}-${j}`,
          originalRow: rows[i],
          duplicateRow: rows[j],
          confidence: similarity,
          matchType: similarity > 0.95 ? 'exact' : 'fuzzy',
          matchedFields: selectedColumns.filter(col => 
            normalizeString(rows[i][col]) === normalizeString(rows[j][col])
          ),
          hierarchyType: detectHierarchy(rows[i], rows[j]),
          action: 'pending'
        });
      }
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

// Calculate similarity between two rows
function calculateSimilarity(row1, row2, columns) {
  let totalSimilarity = 0;
  let fieldCount = 0;

  for (const column of columns) {
    const value1 = normalizeString(row1[column] || '');
    const value2 = normalizeString(row2[column] || '');
    
    if (value1 && value2) {
      const similarity = stringSimilarity(value1, value2);
      totalSimilarity += similarity;
      fieldCount++;
    }
  }

  return fieldCount > 0 ? totalSimilarity / fieldCount : 0;
}

// Normalize strings for comparison
function normalizeString(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Calculate string similarity using Levenshtein distance
function stringSimilarity(str1, str2) {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return (maxLength - distance) / maxLength;
}

// Levenshtein distance implementation
function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1).fill(null).map(() => 
    Array(str1.length + 1).fill(null)
  );
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Detect corporate hierarchy relationships
function detectHierarchy(row1, row2) {
  const name1 = normalizeString(row1['Company Name'] || row1['Account Name'] || '');
  const name2 = normalizeString(row2['Company Name'] || row2['Account Name'] || '');
  
  // Simple hierarchy detection based on name patterns
  const globalIndicators = ['international', 'worldwide', 'global', 'holdings', 'group'];
  const subsidiaryIndicators = ['subsidiary', 'division', 'branch', 'unit'];
  
  const hasGlobal1 = globalIndicators.some(indicator => name1.includes(indicator));
  const hasGlobal2 = globalIndicators.some(indicator => name2.includes(indicator));
  const hasSub1 = subsidiaryIndicators.some(indicator => name1.includes(indicator));
  const hasSub2 = subsidiaryIndicators.some(indicator => name2.includes(indicator));
  
  if (hasGlobal1 || hasGlobal2) return 'global_parent';
  if (hasSub1 || hasSub2) return 'subsidiary';
  
  return 'unknown';
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}