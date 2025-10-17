/**
 * External Response Functions for Dynamic Mocks
 * 
 * This file contains response functions that can be referenced in mocks.json
 * using the "responseFunctionName" field.
 * 
 * Each function receives the request object and should return a response.
 * These functions are injected into Mountebank for dynamic stub behavior.
 */

/**
 * Example: Generate dynamic loan status based on request
 */
function dynamicLoanStatus(request) {
  const body = JSON.parse(request.body);
  const loanId = body.loanId || 'UNKNOWN';
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Response-Time': new Date().toISOString()
    },
    body: JSON.stringify({
      loanId: loanId,
      status: 'APPROVED',
      amount: Math.floor(Math.random() * 100000) + 50000,
      timestamp: new Date().toISOString(),
      message: `Dynamic response for loan ${loanId}`
    })
  };
}

/**
 * Example: Conditional response based on request headers
 */
function conditionalResponse(request) {
  const headers = request.headers;
  const authToken = headers['authorization'] || headers['Authorization'];
  
  if (!authToken || authToken === 'Bearer invalid') {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid or missing authorization token'
      })
    };
  }
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'success',
      data: {
        authenticated: true,
        timestamp: new Date().toISOString()
      }
    })
  };
}

/**
 * Example: Simulate latency and random failures
 */
function unreliableService(request) {
  const body = JSON.parse(request.body);
  const random = Math.random();
  
  // 10% chance of error
  if (random < 0.1) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: 'Service temporarily unavailable'
      })
    };
  }
  
  // 20% chance of timeout (simulate with 404)
  if (random < 0.3) {
    return {
      statusCode: 504,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Gateway Timeout',
        message: 'Request timed out'
      })
    };
  }
  
  // Success case
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'success',
      requestId: body.requestId || 'REQ-' + Date.now(),
      timestamp: new Date().toISOString()
    })
  };
}


/**
 * Example: Add 2 minutes to a datetime string from request
 * Expects request body to contain a "timeInfo" field with datetime string
 */
function addTwoMinutesToTime(request) {
  const body = JSON.parse(request.body);
  const timeInfo = body.timeInfo || new Date().toISOString();
  
  // Parse the datetime string
  const originalDate = new Date(timeInfo);
  
  // Add 2 minutes (2 * 60 * 1000 milliseconds)
  const updatedDate = new Date(originalDate.getTime() + 2 * 60 * 1000);
  
  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'X-Processing-Time': new Date().toISOString()
    },
    body: JSON.stringify({
      original: {
        timeInfo: timeInfo,
        parsed: originalDate.toISOString()
      },
      updated: {
        timeInfo: updatedDate.toISOString(),
        timestamp: updatedDate.getTime()
      },
      modification: {
        minutesAdded: 2,
        description: 'Added 2 minutes to the original time'
      },
      ...body
    })
  };
}

// Export all functions
module.exports = {
  dynamicLoanStatus,
  conditionalResponse,
  addTwoMinutesToTime,
  unreliableService
};

