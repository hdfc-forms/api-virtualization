/**
 * Unit tests for mock aggregation script
 * Tests the aggregation logic that creates mocks.json
 */

const fs = require('fs');
const path = require('path');
const { aggregateMocks, getAllJsonFiles } = require('../scripts/aggregate-mocks');

describe('getAllJsonFiles', () => {
  const testDir = path.join(__dirname, '..', 'mocks');

  test('should find JSON files recursively', () => {
    const files = getAllJsonFiles(testDir);

    expect(files.length).toBeGreaterThan(0);
    files.forEach(file => {
      expect(file).toMatch(/\.json$/);
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  test('should not include non-JSON files', () => {
    const files = getAllJsonFiles(testDir);

    const nonJsonFiles = files.filter(file => !file.endsWith('.json'));
    expect(nonJsonFiles).toHaveLength(0);
  });

  test('should find files in subdirectories', () => {
    const files = getAllJsonFiles(testDir);
    const subdirFiles = files.filter(file => file.includes('pl-etbwo'));

    expect(subdirFiles.length).toBeGreaterThan(0);
  });
});

describe('aggregateMocks', () => {
  const mocksDir = path.join(__dirname, '..', 'mocks');
  let consoleLogSpy;

  beforeEach(() => {
    // Suppress console.log during tests to avoid verbose output
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console.log after each test
    consoleLogSpy.mockRestore();
  });

  test('should aggregate all mock files', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    expect(output).toBeDefined();
    expect(output.version).toBe('1.0.0');
    expect(output.totalMocks).toBeGreaterThan(0);
    expect(output.mocks).toBeInstanceOf(Array);
    expect(output.mocks.length).toBe(output.totalMocks);
  });

  test('should remove responseBody and responseHeaders', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    output.mocks.forEach((mock, index) => {
      expect(mock.responseBody).toEqual({});
      expect(mock.responseHeaders).toEqual({});
    });
  });

  test('should add metadata to each mock', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    output.mocks.forEach(mock => {
      expect(mock._metadata).toBeDefined();
      expect(mock._metadata.sourceFile).toBeDefined();
      expect(mock._metadata.lastModified).toBeDefined();
      
      // Validate ISO date format
      expect(() => new Date(mock._metadata.lastModified)).not.toThrow();
      expect(new Date(mock._metadata.lastModified).toISOString()).toBe(mock._metadata.lastModified);
    });
  });

  test('should preserve original mock fields except responseBody and responseHeaders', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    output.mocks.forEach(mock => {
      expect(mock.apiName).toBeDefined();
      
      // Should preserve these if they exist
      if (mock.businessName !== undefined) {
        expect(typeof mock.businessName).toBe('string');
      }
      if (mock.method !== undefined) {
        expect(typeof mock.method).toBe('string');
      }
      if (mock.predicate !== undefined) {
        expect(typeof mock.predicate).toBe('object');
      }
      if (mock.statusCode !== undefined) {
        expect(typeof mock.statusCode).toBe('number');
      }
      if (mock.latencyMs !== undefined) {
        expect(typeof mock.latencyMs).toBe('number');
      }
      if (mock.responseFunction !== undefined) {
        expect(typeof mock.responseFunction).toBe('string');
      }
    });
  });

  test('should include generatedAt timestamp in ISO format', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    expect(output.generatedAt).toBeDefined();
    expect(() => new Date(output.generatedAt)).not.toThrow();
    expect(new Date(output.generatedAt).toISOString()).toBe(output.generatedAt);
  });

  test('should include comment about auto-generation', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    expect(output._comment).toContain('AUTO-GENERATED');
    expect(output._comment).toContain('DO NOT EDIT MANUALLY');
  });

  test('should handle errors gracefully', () => {
    // Test with non-existent directory
    const nonExistentDir = path.join(__dirname, 'non-existent-directory');
    
    expect(() => {
      aggregateMocks(nonExistentDir);
    }).toThrow();
  });

  test('sourceFile paths should be relative to mocks directory', () => {
    const { output, errors } = aggregateMocks(mocksDir);

    output.mocks.forEach(mock => {
      const sourceFile = mock._metadata.sourceFile;
      
      // Should not start with absolute path or ../
      expect(sourceFile).not.toMatch(/^\//);
      expect(sourceFile).not.toMatch(/^\.\./);
      
      // Should end with .json
      expect(sourceFile).toMatch(/\.json$/);
    });
  });

  test('should match the count of files to mocks in output', () => {
    const allFiles = getAllJsonFiles(mocksDir);
    const { output, errors } = aggregateMocks(mocksDir);

    // Total mocks should equal total JSON files (accounting for errors)
    expect(output.totalMocks + errors.length).toBe(allFiles.length);
  });
});

describe('Aggregated mocks.json file', () => {
  test('actual mocks.json should exist', () => {
    const mocksJsonPath = path.join(__dirname, '..', 'mocks.json');
    expect(fs.existsSync(mocksJsonPath)).toBe(true);
  });

  test('actual mocks.json should be valid JSON', () => {
    const mocksJsonPath = path.join(__dirname, '..', 'mocks.json');
    const content = fs.readFileSync(mocksJsonPath, 'utf8');
    
    expect(() => JSON.parse(content)).not.toThrow();
  });

  test('actual mocks.json should have required structure', () => {
    const mocksJsonPath = path.join(__dirname, '..', 'mocks.json');
    const content = fs.readFileSync(mocksJsonPath, 'utf8');
    const data = JSON.parse(content);

    expect(data.version).toBeDefined();
    expect(data.generatedAt).toBeDefined();
    expect(data.totalMocks).toBeDefined();
    expect(data.mocks).toBeInstanceOf(Array);
    expect(data.mocks.length).toBe(data.totalMocks);
  });

  test('actual mocks.json should be under 10MB', () => {
    const mocksJsonPath = path.join(__dirname, '..', 'mocks.json');
    const stats = fs.statSync(mocksJsonPath);
    const sizeMB = stats.size / 1024 / 1024;

    expect(sizeMB).toBeLessThan(10);
    console.log(`  ℹ  mocks.json size: ${sizeMB.toFixed(2)} MB`);
  });
});

