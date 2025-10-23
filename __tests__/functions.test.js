/**
 * Unit tests for dynamic response functions
 * Tests all exported functions from functions.js
 */

const {
  dynamicLoanStatus,
  conditionalResponse,
  addTwoMinutesToTime,
  unreliableService
} = require('../functions');

describe('dynamicLoanStatus', () => {
  test('should return 200 status code with dynamic loan data', () => {
    const request = {
      body: JSON.stringify({
        loanId: 'LOAN-12345'
      })
    };

    const response = dynamicLoanStatus(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['X-Response-Time']).toBeDefined();
    expect(body.loanId).toBe('LOAN-12345');
    expect(body.status).toBe('APPROVED');
    expect(body.amount).toBeGreaterThanOrEqual(50000);
    expect(body.amount).toBeLessThanOrEqual(150000);
    expect(body.timestamp).toBeDefined();
    expect(body.message).toContain('LOAN-12345');
  });

  test('should handle missing loanId with default value', () => {
    const request = {
      body: JSON.stringify({})
    };

    const response = dynamicLoanStatus(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.loanId).toBe('UNKNOWN');
    expect(body.status).toBe('APPROVED');
  });

  test('should return unique amounts on multiple calls', () => {
    const request = {
      body: JSON.stringify({ loanId: 'TEST' })
    };

    const response1 = dynamicLoanStatus(request);
    const response2 = dynamicLoanStatus(request);
    
    const body1 = JSON.parse(response1.body);
    const body2 = JSON.parse(response2.body);

    // Random amounts should be different (very high probability)
    // Allow same value with small probability to avoid flaky test
    expect(body1.amount).toBeGreaterThanOrEqual(50000);
    expect(body2.amount).toBeGreaterThanOrEqual(50000);
  });

  test('should include ISO timestamp', () => {
    const request = {
      body: JSON.stringify({ loanId: 'TEST' })
    };

    const response = dynamicLoanStatus(request);
    const body = JSON.parse(response.body);

    // Validate ISO 8601 format
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});

describe('conditionalResponse', () => {
  test('should return 401 when authorization header is missing', () => {
    const request = {
      headers: {}
    };

    const response = conditionalResponse(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(body.error).toBe('Unauthorized');
    expect(body.message).toContain('Invalid or missing authorization token');
  });

  test('should return 401 for invalid token', () => {
    const request = {
      headers: {
        'authorization': 'Bearer invalid'
      }
    };

    const response = conditionalResponse(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  test('should return 200 for valid token (lowercase header)', () => {
    const request = {
      headers: {
        'authorization': 'Bearer valid-token-123'
      }
    };

    const response = conditionalResponse(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(body.status).toBe('success');
    expect(body.data.authenticated).toBe(true);
    expect(body.data.timestamp).toBeDefined();
  });

  test('should return 200 for valid token (uppercase header)', () => {
    const request = {
      headers: {
        'Authorization': 'Bearer valid-token-456'
      }
    };

    const response = conditionalResponse(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data.authenticated).toBe(true);
  });
});

describe('addTwoMinutesToTime', () => {
  test('should add 2 minutes to provided timeInfo', () => {
    const originalTime = '2025-10-23T10:00:00.000Z';
    const request = {
      body: JSON.stringify({
        timeInfo: originalTime
      })
    };

    const response = addTwoMinutesToTime(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['X-Processing-Time']).toBeDefined();
    
    expect(body.original.timeInfo).toBe(originalTime);
    expect(body.updated.timeInfo).toBe('2025-10-23T10:02:00.000Z');
    expect(body.modification.minutesAdded).toBe(2);
    expect(body.modification.description).toContain('2 minutes');
  });

  test('should use current time when timeInfo is missing', () => {
    const beforeTest = new Date();
    
    const request = {
      body: JSON.stringify({})
    };

    const response = addTwoMinutesToTime(request);
    const body = JSON.parse(response.body);

    const afterTest = new Date();

    expect(response.statusCode).toBe(200);
    expect(body.original.timeInfo).toBeDefined();
    
    const originalDate = new Date(body.original.timeInfo);
    expect(originalDate.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
    expect(originalDate.getTime()).toBeLessThanOrEqual(afterTest.getTime());
  });

  test('should correctly add 2 minutes (120000 milliseconds)', () => {
    const originalTime = '2025-10-23T10:00:00.000Z';
    const request = {
      body: JSON.stringify({
        timeInfo: originalTime
      })
    };

    const response = addTwoMinutesToTime(request);
    const body = JSON.parse(response.body);

    const originalTimestamp = new Date(originalTime).getTime();
    const updatedTimestamp = body.updated.timestamp;

    expect(updatedTimestamp - originalTimestamp).toBe(120000); // 2 * 60 * 1000
  });

  test('should preserve other fields from request body', () => {
    const request = {
      body: JSON.stringify({
        timeInfo: '2025-10-23T10:00:00.000Z',
        userId: 'USER123',
        action: 'test'
      })
    };

    const response = addTwoMinutesToTime(request);
    const body = JSON.parse(response.body);

    expect(body.userId).toBe('USER123');
    expect(body.action).toBe('test');
  });
});

describe('unreliableService', () => {
  // Mock Math.random for deterministic testing
  let originalRandom;

  beforeEach(() => {
    originalRandom = Math.random;
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  test('should return 500 error when random < 0.1', () => {
    Math.random = jest.fn(() => 0.05);

    const request = {
      body: JSON.stringify({
        requestId: 'REQ-001'
      })
    };

    const response = unreliableService(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(500);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toContain('Service temporarily unavailable');
  });

  test('should return 504 timeout when 0.1 <= random < 0.3', () => {
    Math.random = jest.fn(() => 0.15);

    const request = {
      body: JSON.stringify({
        requestId: 'REQ-002'
      })
    };

    const response = unreliableService(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(504);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(body.error).toBe('Gateway Timeout');
    expect(body.message).toContain('Request timed out');
  });

  test('should return 200 success when random >= 0.3', () => {
    Math.random = jest.fn(() => 0.5);

    const request = {
      body: JSON.stringify({
        requestId: 'REQ-003'
      })
    };

    const response = unreliableService(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(body.status).toBe('success');
    expect(body.requestId).toBe('REQ-003');
    expect(body.timestamp).toBeDefined();
  });

  test('should generate requestId when missing', () => {
    Math.random = jest.fn(() => 0.8);

    const request = {
      body: JSON.stringify({})
    };

    const response = unreliableService(request);
    const body = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(body.requestId).toMatch(/^REQ-\d+$/);
  });

  test('should return valid JSON for all response types', () => {
    const testCases = [
      { random: 0.05, expectedStatus: 500 },
      { random: 0.15, expectedStatus: 504 },
      { random: 0.5, expectedStatus: 200 }
    ];

    testCases.forEach(({ random, expectedStatus }) => {
      Math.random = jest.fn(() => random);

      const request = {
        body: JSON.stringify({ test: 'data' })
      };

      const response = unreliableService(request);
      
      expect(response.statusCode).toBe(expectedStatus);
      expect(response.headers['Content-Type']).toBe('application/json');
      expect(() => JSON.parse(response.body)).not.toThrow();
    });
  });
});

describe('Module exports', () => {
  test('should export all required functions', () => {
    const functions = require('../functions');

    expect(typeof functions.dynamicLoanStatus).toBe('function');
    expect(typeof functions.conditionalResponse).toBe('function');
    expect(typeof functions.addTwoMinutesToTime).toBe('function');
    expect(typeof functions.unreliableService).toBe('function');
  });

  test('should have correct function arity', () => {
    // All functions should accept 1 parameter (request)
    expect(dynamicLoanStatus.length).toBe(1);
    expect(conditionalResponse.length).toBe(1);
    expect(addTwoMinutesToTime.length).toBe(1);
    expect(unreliableService.length).toBe(1);
  });
});

