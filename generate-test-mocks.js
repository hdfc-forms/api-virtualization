#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Base mock template
const baseMock = {
  "businessName": "Personal Loan Test Mock",
  "apiName": "API/PersonalLoan_TestAPI",
  "method": "POST",
  "latencyMs": 0,
  "predicate": {
    "request": {},
    "headers": {},
    "query": {}
  },
  "responseHeaders": {
    "Content-Type": "application/json"
  },
  "responseBody": {
    "Status": "SUCCESS",
    "ResponseSignatureEncryptedValue": null,
    "Scope": null,
    "responseString": {
      "loanAmount": 500000,
      "interestRate": 10.5,
      "tenure": 36,
      "acknowledgementId": "TEST12345",
      "status": "APPROVED"
    },
    "errorMessage": null,
    "contextParam": {
      "bankJourneyID": "TEST_JOURNEY_ID",
      "partnerJourneyID": "test-uuid",
      "partnerID": "HDFCBANK",
      "channelID": "ADOBE",
      "productName": "PL"
    },
    "errorCode": null,
    "originMessage": null,
    "originCode": null,
    "status": {
      "errorDesc": "",
      "errorCode": "",
      "responseCode": "0"
    },
    "TransactionId": "TXN_TEST_ID"
  }
};

// API endpoints for each folder (12 different endpoints)
const apiEndpoints = [
  'OTPGeneration',
  'OTPValidation',
  'FetchDemographics',
  'FetchOffers',
  'ApplyForLoan',
  'GetBureauOffer',
  'InitiateEKYC',
  'GetEKYCStatus',
  'AccountSelection',
  'LoanStatusEnquiry',
  'InitiateIncomeUpload',
  'ActionStatusInquiry'
];

// Create base output directory
const baseOutputDir = path.join(__dirname, 'mocks', 'personal-loan');
if (!fs.existsSync(baseOutputDir)) {
  fs.mkdirSync(baseOutputDir, { recursive: true });
}

// Generate 500 folders
console.log('🚀 Generating 500 folders with 12 JSON files each (6000 total files)...\n');

let totalFiles = 0;

for (let folderNum = 1; folderNum <= 500; folderNum++) {
  // Create folder
  const folderName = `test-folder-${folderNum}`;
  const folderPath = path.join(baseOutputDir, folderName);
  
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
  
  // Generate 12 JSON files in this folder
  for (let fileNum = 0; fileNum < 12; fileNum++) {
    // Clone base mock
    const mock = JSON.parse(JSON.stringify(baseMock));
    
    const endpoint = apiEndpoints[fileNum];
    
    // Customize each mock
    mock.businessName = `${endpoint} - Folder ${folderNum}`;
    mock.apiName = `API/PersonalLoan_${endpoint}_${folderNum}`;
    mock.responseBody.responseString.acknowledgementId = `TEST${folderNum}${String(fileNum).padStart(3, '0')}`;
    mock.responseBody.responseString.loanAmount = 100000 + (folderNum * 1000) + (fileNum * 100);
    mock.responseBody.contextParam.bankJourneyID = `TEST_JOURNEY_${folderNum}_${fileNum}`;
    mock.responseBody.contextParam.partnerJourneyID = `test-uuid-${folderNum}-${fileNum}`;
    mock.responseBody.TransactionId = `TXN_TEST_${folderNum}_${fileNum}`;
    
    // Write to file
    const filename = `${endpoint.toLowerCase()}-${folderNum}.json`;
    const filepath = path.join(folderPath, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(mock, null, 2));
    totalFiles++;
  }
  
  // Progress indicator
  if (folderNum % 50 === 0) {
    console.log(`   Generated ${folderNum}/500 folders (${totalFiles} files)...`);
  }
}

console.log('\n✅ Successfully generated test structure!');
console.log(`📁 Location: ${baseOutputDir}`);
console.log(`\n📊 Stats:`);
console.log(`   - Total folders: 500`);
console.log(`   - Files per folder: 12`);
console.log(`   - Total files: ${totalFiles}`);
console.log(`   - File size: ~${Math.round(JSON.stringify(baseMock, null, 2).length / 1024)} KB each`);
console.log(`   - Total size: ~${Math.round((JSON.stringify(baseMock, null, 2).length * totalFiles) / 1024 / 1024)} MB`);
console.log(`\n🧪 To test with Mountebank:`);
console.log(`   1. Run: cd /Users/rismehta/api-virtualization`);
console.log(`   2. Aggregate mocks: node aggregate-mocks.js`);
console.log(`   3. Check mocks.json size and file count`);
console.log(`   4. Start stub-generator and monitor:`);
console.log(`      - Loading time`);
console.log(`      - Memory usage`);
console.log(`      - Response time for test API calls`);

