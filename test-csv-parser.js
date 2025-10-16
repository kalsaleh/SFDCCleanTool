// Quick test of CSV parser

class CSVParser {
  static parseCSVLine(line) {
    const result = [];
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
      } else if (char === ',' && !inQuotes) {
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
}

// Test cases
const test1 = 'Name,Email,Company,Phone';
const test2 = '"Company Name","Contact Email","Phone Number"';
const test3 = 'Account Name,Address,City,State,Zip';

console.log('Test 1:', test1);
console.log('Result:', CSVParser.parseCSVLine(test1));
console.log('Count:', CSVParser.parseCSVLine(test1).length);
console.log('');

console.log('Test 2:', test2);
console.log('Result:', CSVParser.parseCSVLine(test2));
console.log('Count:', CSVParser.parseCSVLine(test2).length);
console.log('');

console.log('Test 3:', test3);
console.log('Result:', CSVParser.parseCSVLine(test3));
console.log('Count:', CSVParser.parseCSVLine(test3).length);
