/**
 * Unit tests for mock JSON validation
 * Ensures all mock files conform to the expected schema
 */

const fs = require('fs');
const path = require('path');

// Helper function to get all JSON files recursively
function getAllJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      getAllJsonFiles(filePath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Mock schema validator
function validateMockSchema(mock, filePath) {
  const errors = [];

  // Required fields
  if (!mock.apiName) {
    errors.push('Missing required field: apiName');
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
  }

  // Status code validation
  if (mock.statusCode !== undefined) {
    if (typeof mock.statusCode !== 'number' || mock.statusCode < 100 || mock.statusCode > 599) {
      errors.push('statusCode must be a number between 100 and 599');
    }
  }

  // Latency validation
  if (mock.latencyMs !== undefined) {
    if (typeof mock.latencyMs !== 'number' || mock.latencyMs < 0) {
      errors.push('latencyMs must be a non-negative number');
    }
  }

  // Predicate validation
  if (mock.predicate) {
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

  return errors;
}

describe('Mock JSON Files Validation', () => {
  const mocksDir = path.join(__dirname, '..', 'mocks');
  let mockFiles;

  beforeAll(() => {
    mockFiles = getAllJsonFiles(mocksDir);
  });

  test('should find at least one mock file', () => {
    expect(mockFiles.length).toBeGreaterThan(0);
  });

  test('all mock files should be valid JSON', () => {
    mockFiles.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      
      expect(() => {
        const content = fs.readFileSync(filePath, 'utf8');
        JSON.parse(content);
      }).not.toThrow();
    });
  });

  test('all mock files should conform to schema', () => {
    const invalidMocks = [];

    mockFiles.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const mock = JSON.parse(content);

      const errors = validateMockSchema(mock, relativePath);
      
      if (errors.length > 0) {
        invalidMocks.push({
          file: relativePath,
          errors: errors
        });
      }
    });

    if (invalidMocks.length > 0) {
      const errorMessage = invalidMocks.map(({ file, errors }) => 
        `${file}:\n  - ${errors.join('\n  - ')}`
      ).join('\n\n');

      throw new Error(`Found ${invalidMocks.length} invalid mock file(s):\n\n${errorMessage}`);
    }
  });

  test('all mock files should have unique combinations of apiName and predicate', () => {
    const seen = new Map();
    const duplicates = [];

    mockFiles.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const mock = JSON.parse(content);

      // Create a unique key from apiName and predicate
      const predicateKey = JSON.stringify(mock.predicate || {});
      const key = `${mock.apiName}::${predicateKey}`;

      if (seen.has(key)) {
        duplicates.push({
          file1: seen.get(key),
          file2: relativePath,
          apiName: mock.apiName
        });
      } else {
        seen.set(key, relativePath);
      }
    });

    if (duplicates.length > 0) {
      const errorMessage = duplicates.map(({ file1, file2, apiName }) =>
        `Duplicate mock for ${apiName}:\n  - ${file1}\n  - ${file2}`
      ).join('\n\n');

      throw new Error(`Found ${duplicates.length} duplicate mock(s):\n\n${errorMessage}`);
    }
  });

  test('all mock files with responseFunction should reference valid functions', () => {
    const functions = require('../functions');
    const exportedFunctions = Object.keys(functions);
    const invalidReferences = [];

    mockFiles.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const mock = JSON.parse(content);

      if (mock.responseFunction && typeof mock.responseFunction === 'string') {
        // Check if it's a function reference (not inline code)
        // Inline code would be a full function definition
        if (!mock.responseFunction.includes('function') && 
            !mock.responseFunction.includes('=>')) {
          // It's a function name reference
          if (!exportedFunctions.includes(mock.responseFunction)) {
            invalidReferences.push({
              file: relativePath,
              functionName: mock.responseFunction,
              availableFunctions: exportedFunctions
            });
          }
        }
      }
    });

    if (invalidReferences.length > 0) {
      const errorMessage = invalidReferences.map(({ file, functionName, availableFunctions }) =>
        `${file}:\n  Function '${functionName}' not found.\n  Available: ${availableFunctions.join(', ')}`
      ).join('\n\n');

      throw new Error(`Found ${invalidReferences.length} invalid function reference(s):\n\n${errorMessage}`);
    }
  });

  test('response headers should be valid objects if present', () => {
    const invalidHeaders = [];

    mockFiles.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const mock = JSON.parse(content);

      if (mock.responseHeaders) {
        if (typeof mock.responseHeaders !== 'object' || Array.isArray(mock.responseHeaders)) {
          invalidHeaders.push(relativePath);
        }
      }
    });

    if (invalidHeaders.length > 0) {
      throw new Error(`Found ${invalidHeaders.length} mock(s) with invalid responseHeaders:\n- ${invalidHeaders.join('\n- ')}`);
    }
  });

  test('businessName should be a non-empty string if present', () => {
    const invalidBusinessNames = [];

    mockFiles.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      const content = fs.readFileSync(filePath, 'utf8');
      const mock = JSON.parse(content);

      if (mock.businessName !== undefined) {
        if (typeof mock.businessName !== 'string' || mock.businessName.trim() === '') {
          invalidBusinessNames.push(relativePath);
        }
      }
    });

    if (invalidBusinessNames.length > 0) {
      throw new Error(`Found ${invalidBusinessNames.length} mock(s) with invalid businessName:\n- ${invalidBusinessNames.join('\n- ')}`);
    }
  });
});

describe('Mock File Naming Conventions', () => {
  const mocksDir = path.join(__dirname, '..', 'mocks');
  let mockFiles;

  beforeAll(() => {
    mockFiles = getAllJsonFiles(mocksDir);
  });

  test('mock files should use kebab-case naming', () => {
    const invalidNames = [];

    mockFiles.forEach(filePath => {
      const fileName = path.basename(filePath, '.json');
      const relativePath = path.relative(mocksDir, filePath);

      // Check if filename uses kebab-case (lowercase with hyphens)
      // Allow numbers and underscores for special cases
      if (!/^[a-z0-9]+(-[a-z0-9]+)*(_\d+)?$/.test(fileName)) {
        invalidNames.push(relativePath);
      }
    });

    if (invalidNames.length > 0) {
      console.warn(`Warning: ${invalidNames.length} mock file(s) don't follow kebab-case naming:\n- ${invalidNames.join('\n- ')}`);
    }
  });

  test('example mocks should be in root mocks directory', () => {
    const exampleMocks = mockFiles.filter(filePath => {
      const fileName = path.basename(filePath);
      return fileName.startsWith('example-');
    });

    exampleMocks.forEach(filePath => {
      const relativePath = path.relative(mocksDir, filePath);
      const dirName = path.dirname(relativePath);

      expect(dirName).toBe('.');
    });
  });
});

