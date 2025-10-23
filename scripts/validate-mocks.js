/**
 * Validate Mock JSON Files
 * 
 * Validates all JSON files in mocks/ directory against the mock schema
 * Exits with code 1 if validation fails
 */

const fs = require('fs');
const path = require('path');

// Get all JSON files recursively
function getAllJsonFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsonFiles(filePath));
    } else if (file.endsWith('.json')) {
      results.push(filePath);
    }
  });
  
  return results;
}

// Validate mock schema
function validateMockSchema(mock, filePath) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!mock.apiName || typeof mock.apiName !== 'string' || mock.apiName.trim() === '') {
    errors.push('Missing or invalid required field: apiName');
  }

  if (!mock.responseBody && !mock.responseFunction) {
    errors.push('Must have either responseBody or responseFunction');
  }

  // Method validation
  if (mock.method) {
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    if (!validMethods.includes(mock.method)) {
      errors.push(`Invalid method: ${mock.method}. Must be one of ${validMethods.join(', ')}`);
    }
  } else {
    warnings.push('Method not specified, will default to POST');
  }

  // Status code validation
  if (mock.statusCode !== undefined) {
    if (typeof mock.statusCode !== 'number' || mock.statusCode < 100 || mock.statusCode > 599) {
      errors.push('statusCode must be a number between 100 and 599');
    }
  }

  // Latency validation
  if (mock.latencyMs !== undefined) {
    if (typeof mock.latencyMs !== 'number' || mock.latencyMs < 0 || mock.latencyMs > 30000) {
      errors.push('latencyMs must be a number between 0 and 30000');
    }
  }

  // Predicate validation
  if (!mock.predicate) {
    warnings.push('No predicate specified, will match any request');
  } else {
    if (typeof mock.predicate !== 'object') {
      errors.push('predicate must be an object');
    } else {
      if (!mock.predicate.request || typeof mock.predicate.request !== 'object') {
        errors.push('predicate.request must be an object');
      }
      // headers and query are optional - only validate if present
      if (mock.predicate.headers !== undefined && typeof mock.predicate.headers !== 'object') {
        errors.push('predicate.headers must be an object (if provided)');
      }
      if (mock.predicate.query !== undefined && typeof mock.predicate.query !== 'object') {
        errors.push('predicate.query must be an object (if provided)');
      }
    }
  }

  // Response headers validation
  if (mock.responseHeaders !== undefined) {
    if (typeof mock.responseHeaders !== 'object' || Array.isArray(mock.responseHeaders)) {
      errors.push('responseHeaders must be an object (not an array)');
    }
  }

  // Business name validation
  if (mock.businessName !== undefined) {
    if (typeof mock.businessName !== 'string' || mock.businessName.trim() === '') {
      errors.push('businessName must be a non-empty string');
    }
  }

  // Response function validation
  if (mock.responseFunction && typeof mock.responseFunction === 'string') {
    // Check if it's a function reference (not inline code)
    if (!mock.responseFunction.includes('function') && !mock.responseFunction.includes('=>')) {
      // It's a function name reference - validate it exists
      try {
        const functions = require('../functions');
        const exportedFunctions = Object.keys(functions);
        
        if (!exportedFunctions.includes(mock.responseFunction)) {
          errors.push(`responseFunction '${mock.responseFunction}' not found in functions.js. Available: ${exportedFunctions.join(', ')}`);
        }
      } catch (err) {
        warnings.push(`Could not validate responseFunction: ${err.message}`);
      }
    }
  }

  return { errors, warnings };
}

// Main validation
function main() {
  const mocksDir = path.join(process.cwd(), 'mocks');
  
  console.log(' Validating mock JSON files...\n');
  
  const mockFiles = getAllJsonFiles(mocksDir);
  
  console.log(`Found ${mockFiles.length} JSON file(s)\n`);
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let validCount = 0;
  
  mockFiles.forEach(filePath => {
    const relativePath = path.relative(mocksDir, filePath);
    
    try {
      // Check if file is valid JSON
      const content = fs.readFileSync(filePath, 'utf8');
      const mock = JSON.parse(content);
      
      // Validate schema
      const { errors, warnings } = validateMockSchema(mock, relativePath);
      
      if (errors.length === 0 && warnings.length === 0) {
        console.log(` ${relativePath}`);
        validCount++;
      } else {
        if (errors.length > 0) {
          console.log(` ${relativePath}`);
          errors.forEach(err => console.log(`  ERROR: ${err}`));
          totalErrors += errors.length;
        } else {
          console.log(` ${relativePath}`);
        }
        
        if (warnings.length > 0) {
          warnings.forEach(warn => console.log(`  WARNING: ${warn}`));
          totalWarnings += warnings.length;
        }
      }
      
    } catch (err) {
      console.log(` ${relativePath}`);
      console.log(`  ERROR: Invalid JSON - ${err.message}`);
      totalErrors++;
    }
  });
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`\n Validation Summary:`);
  console.log(`   Total files: ${mockFiles.length}`);
  console.log(`    Valid: ${validCount}`);
  console.log(`    Errors: ${totalErrors}`);
  console.log(`    Warnings: ${totalWarnings}`);
  
  if (totalErrors > 0) {
    console.log(`\n Validation failed with ${totalErrors} error(s)`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`\n  Validation passed with ${totalWarnings} warning(s)`);
  } else {
    console.log(`\n All mocks are valid!`);
  }
}

// Export for testing
module.exports = {
  validateMockSchema,
  getAllJsonFiles
};

// Run if executed directly
if (require.main === module) {
  main();
}

