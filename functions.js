/**
 * Counter-based dynamic response - per journeyId
 * UPDATE: Returns ID, stores mapping, fetches response from EDS
 * PARAM: Uses ID to fetch corresponding response
 */

const idMap = {};
const counters = {};

function journeyBasedResponse(request) {
  const body = JSON.parse(request.body || '{}');
  const path = request.path || '';
  const isUpdate = path.includes('DropOffUpdate');
  const isParam = path.includes('DropOffParam');
  
  if (isUpdate) {
    const jid = body.journeyId || 'default';
    counters[jid] = counters[jid] || 1;
    const rid = counters[jid]++;
    const id = `${Date.now()}_${rid}`;
    idMap[id] = { jid, rid };
    
    console.log(`[UPDATE] Journey:${jid} ID:${id} Response:${rid}`);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SUCCESS', id: id, message: 'Journey drop-off data saved' })
    };
  }
  
  if (isParam) {
    const id = body.id || body.customerId;
    const info = idMap[id];
    if (info) {
      console.log(`[PARAM] ID:${id} Response:${info.rid}`);
      return fetch(`https://main--api-virtualization--hdfc-forms.aem.page/responses/dropoff-param-${info.rid}.json`, id);
    }
    return { statusCode: 404, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'NOT_FOUND' }) };
  }
  
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'OK' }) };
}

function fetch(url, id) {
  const https = require('https');
  const u = require('url');
  const p = u.parse(url + '?t=' + Date.now());
  
  return new Promise((resolve) => {
    https.request({ hostname: p.hostname, path: p.path, method: 'GET' }, (res) => {
      let d = '';
      res.on('data', (c) => d += c);
      res.on('end', () => {
        try {
          const m = JSON.parse(d);
          const b = m.responseBody || {};
          if (id) b.id = id;
          resolve({ statusCode: m.statusCode || 200, headers: m.responseHeaders || { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
        } catch (e) {
          resolve({ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) });
        }
      });
    }).on('error', (e) => resolve({ statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: e.message }) })).end();
  });
}

// Export all functions
module.exports = {
  journeyBasedResponse
};

