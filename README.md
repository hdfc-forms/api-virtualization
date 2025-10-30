# API Virtualization - Mock Repository

This repository stores mock API responses for service virtualization and API testing. Mocks are automatically loaded into the stub-generator mock server (Mountebank) and can be used to test AEM Forms without connecting to real backend systems.

## Live Deployments

**Production URLs:**
- **Manage Mocks UI:** https://mockapi-backend-09lz.onrender.com/
  - Web interface for creating, editing, and testing mocks
  - View all mocks from MongoDB and GitHub
  - Import/export mock collections
  
- **Mock Proxy API:** https://mockapi-proxy.onrender.com/
  - Mountebank-backed API virtualization server
  - Intercepts API calls and returns mock responses
  - Load tested and production-ready

**Infrastructure:**
- Deployed on Render.com
- Load tested with 6000+ mocks
- ~5MB memory footprint (on-demand loading from EDS)

---

## Table of Contents

- [Quick Start](#quick-start)
- [Ecosystem Overview](#ecosystem-overview)
- [Updating Mocks](#updating-mocks)
  - [Method 1: Using Manage Mocks UI](#method-1-using-manage-mocks-ui)
  - [Method 2: Using AEM FDM Post Processor (Auto-Capture)](#method-2-using-aem-fdm-post-processor-auto-capture)
  - [Method 3: Direct GitHub Editing](#method-3-direct-github-editing)
- [AEM Side Configuration & Bundle](#aem-side-configuration--bundle)
- [Running Journey & Capturing Mocks](#running-journey--capturing-mocks)
- [Download and Upload to GitHub](#download-and-upload-to-github)
- [Repository Structure](#repository-structure)
- [Mock JSON Schema](#mock-json-schema)
- [Regex Pattern Matching in Predicates](#regex-pattern-matching-in-predicates)
- [Understanding Predicate Matching: contains vs JSONPath](#understanding-predicate-matching-contains-vs-jsonpath)
- [How Response Loading Works](#how-response-loading-works)
- [Dynamic Mocks with External Functions](#dynamic-mocks-with-external-functions)
- [Best Practices](#best-practices)
- [Manual Reload Workflow](#manual-reload-workflow)
- [Performance & Load Testing](#performance--load-testing)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

**For Developers:**
1. Browse existing mocks: https://mockapi-backend-09lz.onrender.com/
2. Test an API: Use the "Test" button on any mock
3. Create new mock: Click "Create Mock" or capture from AEM

**For AEM Users:**
1. Configure AEM to point to mock proxy: `https://mockapi-proxy.onrender.com/`
2. Run your journey in AEM Forms
3. Mocks are automatically captured and saved
4. Export captured mocks from AEM
5. Upload to this GitHub repository

---

## Ecosystem Overview

The API virtualization system consists of three main components:

```
┌─────────────────────────────────────────────────────────────────┐
│                      AEM Forms (Author/Publish)                 │
│                                                                   │
│  ┌──────────────────┐      ┌─────────────────────────────────┐ │
│  │ Forms Data Model │ ───► │ MockService (OSGi Bundle)       │ │
│  │  (REST Calls)    │      │ - Captures API traffic          │ │
│  └──────────────────┘      │ - Redirects to Mock Proxy       │ │
│                             │ - Saves mocks to JCR            │ │
│                             └─────────────────────────────────┘ │
│                                         │                         │
│                             ┌───────────▼──────────────────────┐│
│                             │ JCR: /content/mock-capture/mocks ││
│                             │ - Captured mocks (JSON)          ││
│                             │ - Export servlet                 ││
│                             └──────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                    │ Export
                                    │ (ZIP)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│              GitHub: api-virtualization Repository              │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │ mocks/       │───►│ GitHub       │───►│ mocks.json       │  │
│  │ (Edit these) │    │ Actions      │    │ (Auto-generated) │  │
│  └──────────────┘    │ - Aggregate  │    └──────────────────┘  │
│                      │ - Validate   │                           │
│  ┌──────────────┐    │ - Webhook    │                           │
│  │ functions.js │    └──────────────┘                           │
│  │ (Dynamic)    │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
                                    │ Webhook
                                    │ (Reload)
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Stub-Generator (Render.com)                  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Management UI (Backend + UI)                             │  │
│  │ https://mockapi-backend-09lz.onrender.com/               │  │
│  │                                                            │  │
│  │ - Create/Edit/View mocks (MongoDB + GitHub)             │  │
│  │ - Test mocks                                             │  │
│  │ - Import/Export (JSON/ZIP)                               │  │
│  │ - Manage mock lifecycle                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Mock Proxy (Mountebank)                                  │  │
│  │ https://mockapi-proxy.onrender.com/                      │  │
│  │                                                            │  │
│  │ - Intercepts API calls                                   │  │
│  │ - Matches predicates                                     │  │
│  │ - Returns mock responses                                 │  │
│  │ - On-demand loading from EDS (~5MB memory)               │  │
│  │ - Handles latency simulation                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Workflow:**
1. **Capture:** AEM Forms makes API call → MockService captures → Saves to JCR
2. **Export:** Developer exports captured mocks from AEM (ZIP)
3. **Upload:** Developer uploads mocks to GitHub `mocks/` folder
4. **Aggregate:** GitHub Actions creates lightweight `mocks.json`
5. **Reload:** Webhook triggers stub-generator to fetch updated mocks
6. **Serve:** Mountebank serves mocked responses with on-demand loading

---

## Updating Mocks

### Method 1: Using Manage Mocks UI

**Best for:** Quick edits, testing, ad-hoc mock creation

**URL:** https://mockapi-backend-09lz.onrender.com/

**Steps:**
1. **Open UI:** Navigate to the Manage Mocks URL
2. **View Mocks:** Browse existing mocks (MongoDB + GitHub sources)
3. **Create Mock:**
   - Click "Create Mock" button
   - Fill in the form:
     - Business Name (description)
     - API Name (endpoint path)
     - HTTP Method (POST, GET, etc.)
     - Status Code (200, 404, 500, etc.)
     - Latency (milliseconds)
     - Request predicate (matching rules)
     - Response headers
     - Response body (JSON)
   - Click "Create Mock"
4. **Edit Mock:** Click "Edit" button on any MongoDB mock (GitHub mocks are read-only)
5. **Test Mock:** Click "Test" button to send a test request
6. **Export Mocks:** Click "Export MongoDB Mocks (JSON)" to download as ZIP

**Notes:**
- Mocks created in UI are stored in **MongoDB** (not GitHub)
- To persist in GitHub, export and upload manually (see [Download and Upload](#download-and-upload-to-github))
- External (GitHub) mocks are **read-only** in UI

### Method 2: Using AEM FDM Post Processor (Auto-Capture)

**Best for:** Capturing real API traffic from AEM Forms journeys

**How it works:**
1. **AEM Configuration:** Enable mock capture in AEM OSGi config (see [AEM Configuration](#aem-side-configuration--bundle))
2. **Run Journey:** Execute your AEM Forms journey (e.g., Personal Loan application)
3. **Auto-Capture:** MockService intercepts FDM REST calls and saves them to JCR
4. **Export:** Download captured mocks from AEM using export servlet
5. **Upload:** Add to GitHub repository for versioning

**Advantages:**
- Captures real request/response payloads
- Automatic predicate extraction

**See:** [Running Journey & Capturing Mocks](#running-journey--capturing-mocks) for detailed steps

### Method 3: Direct GitHub Editing

**Best for:** Version-controlled mock management, team collaboration

**Steps:**
1. **Clone repo:**
   ```bash
   git clone https://github.com/hdfc-forms/api-virtualization.git
   cd api-virtualization
   ```

2. **Create mock file:**
   ```bash
   nano mocks/my-new-api.json
   ```

3. **Add mock JSON:**
```json
{
  "businessName": "My New API",
  "apiName": "my/api/endpoint",
  "method": "POST",
     "statusCode": 200,
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
    "status": "success",
       "data": {}
  }
}
```

4. **Commit and push:**
```bash
git add mocks/my-new-api.json
git commit -m "feat: Add My New API mock"
git push origin main
```

5. **Auto-aggregation:** GitHub Actions runs and updates `mocks.json`
6. **Auto-reload:** Webhook triggers stub-generator to reload

---

## AEM Side Configuration & Bundle

### Prerequisites

1. **Deploy Bundle:** Deploy `HDFC_FormsCommon` bundle to AEM (contains `MockService`)
2. **Service User:** Ensure `hdfc-forms-aemserviceuser` has permissions:
   - Read: `/content`
   - Read/Write: `/content/mock-capture/mocks`

### OSGi Configuration

**Configuration Name:** `Mock Service Configuration`

**Location:** AEM Web Console → OSGi → Configuration

**Configuration PID:** `com.hdfcbank.forms.core.services.mock.impl.MockServiceImpl`

**Settings:**

| Property | Description | Example Value |
|----------|-------------|---------------|
| **Enable Mock Capture** | Enable automatic capture of API requests/responses | `true` |
| **JCR Storage Path** | JCR path to store captured mocks | `/content/mock-capture/mocks` |
| **API Path Filter** | Comma-separated API paths to capture (empty = all) | `API/LoanStatus,API/CustomerAuth` or leave empty |
| **Capture Mode** | How to handle duplicate requests | `FIRST` (recommended) |
| **Max Captures Per API** | Maximum variants per API | `10` |
| **Mock Proxy Base URL** | URL of mock proxy server | `https://mockapi-proxy.onrender.com` |
| **Enable Mock Proxy Redirect** | Redirect FDM calls to mock proxy | `true` (for dev/stage only) |
| **Mock Proxy Runmodes** | When to enable redirect | `dev,stage,local` |

**Capture Modes:**
- **FIRST:** Capture unique variants, skip duplicates on rerun (recommended for journey capture)
- **LATEST:** Always replace with latest data for each variant

**Example Configuration:**
```
Enable Mock Capture: true
JCR Storage Path: /content/mock-capture/mocks
API Path Filter: (empty)
Capture Mode: FIRST
Max Captures Per API: 10
Mock Proxy Base URL: https://mockapi-proxy.onrender.com
Enable Mock Proxy Redirect: true
Mock Proxy Runmodes: dev,stage,local
```

### How It Works

**1. FDM Pre-Processor (`FDMRestPreProcessor`):**
- Checks if mock proxy redirect is enabled for current runmode
- If enabled, replaces FDM REST call host/port with mock proxy URL
- Preserves original path, query parameters, and request body
- Example: `https://realapi.hdfc.com/API/LoanStatus` → `https://mockapi-proxy.onrender.com/API/LoanStatus`

**2. FDM Post-Processor (`FDMRestPostProcessor`):**
- Intercepts API response after successful FDM call
- Extracts request payload, response body, status code
- Calls `MockService.captureAndGenerateMock()`
- Saves mock JSON to JCR with semantic filename

**3. MockService (`MockServiceImpl`):**
- Generates mock JSON with predicate matching
- Extracts only `RequestPayload` object for predicate (ignores dynamic fields)
- Creates semantic filenames based on request content (e.g., `journey-drop-off-customer-identity.json`)
- Handles variants with numbered suffixes if needed
- Stores in JCR as `nt:unstructured` nodes with binary JSON content

---

## Running Journey & Capturing Mocks

### Step-by-Step Guide

**1. Configure AEM (One-time setup)**
- Enable mock capture in OSGi config (see above)
- Set capture mode to `FIRST`
- Set API path filter to empty (capture all) or specific APIs

**2. Run Your Journey**
- Open your AEM Form (e.g., Personal Loan application)
- Fill in the form and submit
- Complete the entire journey workflow
- Each FDM REST call is automatically captured

**3. Verify Captures in JCR**
- Navigate to CRXDE Lite: `http://localhost:4502/crx/de`
- Browse to: `/content/mock-capture/mocks/{category}/{api-name}.json`
- Check captured mocks

**4. Export Captured Mocks**
- **Option A - Export All:**
  - Navigate to: `http://localhost:4502/bin/mock-capture/export`
  - Download ZIP file with all captured mocks
  
- **Option B - List Mocks:**
  - Navigate to: `http://localhost:4502/bin/mock-capture/list`
  - View JSON list of all captured mocks

- **Option C - Clear Mocks:**
  - Navigate to: `http://localhost:4502/bin/mock-capture/list?clear=true`
  - Clears all captured mocks from JCR

**5. Review Captured Mocks**
- Extract ZIP file
- Review JSON files
- Check predicates (should only contain `RequestPayload` object)
- Verify response bodies and status codes

**6. Upload to GitHub** (see next section)

### Semantic Filenames

The system generates descriptive filenames based on request content:

**Examples:**
- `journey-drop-off-1.json` (fallback with number suffix)

**Example Journey Capture:**
```
/content/mock-capture/mocks/
├── journey-drop-off/
│   ├── journey-drop-off-customer-identity.json
│   ├── journey-drop-off-employment-details.json
│   └── journey-drop-off-loan-offer.json
├── loan-status-enquiry/
│   └── loan-status-enquiry.json
└── action-status-inquiry/
    └── action-status-inquiry.json
```

---

## Download and Upload to GitHub

### Download from AEM

**1. Export Mocks:**
```bash
curl -u admin:admin \
  http://localhost:4502/bin/mock-capture/export \
  -o captured-mocks.zip
```

**2. Extract ZIP:**
```bash
unzip captured-mocks.zip -d captured-mocks/
```

**3. Review Files:**
```bash
ls -la captured-mocks/
# journey-drop-off-customer-identity.json
# loan-status-enquiry.json
# ...
```

### Upload to GitHub

**Method 1: Git Command Line**

```bash
# 1. Clone repository
git clone https://github.com/hdfc-forms/api-virtualization.git
cd api-virtualization

# 2. Copy captured mocks to mocks/ folder
cp ../captured-mocks/*.json mocks/

# Or organize by feature:
mkdir -p mocks/personal-loan
cp ../captured-mocks/loan-*.json mocks/personal-loan/
cp ../captured-mocks/journey-*.json mocks/personal-loan/

# 3. Commit and push
git add mocks/
git commit -m "feat: Add captured mocks from journey testing"
git push origin main

# 4. GitHub Actions automatically:
#    - Validates JSON
#    - Aggregates into mocks.json
#    - Triggers webhook to reload stub-generator
```

**Method 2: GitHub Web UI**

1. Navigate to: https://github.com/hdfc-forms/api-virtualization
2. Go to `mocks/` folder
3. Click "Add file" → "Upload files"
4. Drag and drop JSON files
5. Commit changes
6. GitHub Actions runs automatically

### Verify Upload

**1. Check GitHub Actions:**
- Go to: https://github.com/hdfc-forms/api-virtualization/actions
- Verify "Aggregate Mocks" workflow completed successfully
- Check for webhook trigger to stub-generator

**2. Verify in Stub-Generator:**
- Open: https://mockapi-backend-09lz.onrender.com/
- Check if new mocks appear in list
- Test the mock using "Test" button

**3. Verify Mock Proxy:**
```bash
curl -X POST https://mockapi-proxy.onrender.com/API/YourNewAPI \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

---

## Repository Structure

```
api-virtualization/
├── mocks/                          # Individual mock JSON files (EDIT THESE)
│   ├── action-status-inquiry.json
│   ├── journey-dropoff.json
│   └── personal-loan/
│       └── loan-status-enquiry.json
├── mocks.json                      # AUTO-GENERATED - DO NOT EDIT!
├── functions.js                    # External response functions for dynamic mocks
├── .gitattributes                  # Marks mocks.json as generated
└── .github/
    └── workflows/
        ├── aggregate-mocks.yml     # GitHub Action to generate mocks.json
        └── manual-reload.yml       # Manual workflow to trigger stub-generator reload
```

---

## Mock JSON Schema

**Required Fields:**
- `apiName` (string) - API endpoint path (without leading slash)
- `responseBody` (object) - Response payload

**Optional Fields:**
- `businessName` (string) - Human-readable name
- `method` (string) - HTTP method (default: "POST")
- `statusCode` (number) - HTTP status code (default: 200). Use 404, 500, 401, etc. for error scenarios
- `latencyMs` (number) - Response delay in milliseconds (default: 0). Simulates network latency
- `predicate.request` (object) - Request body matching rules
- `predicate.headers` (object) - Header matching rules
- `predicate.query` (object) - Query parameter matching rules
- `responseHeaders` (object) - Custom response headers
- `responseFunction` (string) - For **dynamic responses**: function name from `functions.js` (recommended) OR inline JavaScript code (legacy)

---

## Regex Pattern Matching in Predicates

### Syntax

Use `"regex:pattern"` as the value in your predicate:

```json
{
  "predicate": {
    "request": {
      "fieldName": "regex:your-pattern-here"
    }
  }
}
```

### Common Use Cases

#### 1. Journey ID Pattern Matching

Match any journey ending with `_UNIFIEDURL_U_WEB`:

```json
{
  "businessName": "Journey Drop Off - Unified URL Pattern",
  "apiName": "API/JourneyDropOff_Param",
  "predicate": {
    "request": {
      "journeyInfo": {
        "journeyID": "regex:.*_UNIFIEDURL_U_WEB$"
      }
    }
  },
  "responseBody": {
    "status": "success"
  }
}
```

**Matches:**
- `{"journeyInfo": {"journeyID": "a94448f7-9213-4b5a-9705-e188b59ceb11_01_UNIFIEDURL_U_WEB"}}` 
- `{"journeyInfo": {"journeyID": "xyz-123_UNIFIEDURL_U_WEB"}}` 
- `{"leadProfile": {}, "journeyInfo": {"journeyID": "abc_UNIFIEDURL_U_WEB"}}` 

**Doesn't match:**
- `{"journeyInfo": {"journeyID": "a94448f7-9213-4b5a-9705-e188b59ceb11_PACC_U_WEB"}}`

**Tip:** Only specify fields you want to match. Avoid empty objects `{}` in predicates.

#### 2. Phone Number Validation

Match Indian mobile numbers (starts with 6-9, then 9 digits):

```json
{
  "businessName": "OTP Generation - Any Valid Mobile",
  "apiName": "API/OTP_Gen",
  "predicate": {
    "request": {
      "mobileNumber": "regex:^[6-9]\\d{9}$"
    }
  },
  "responseBody": {
    "otp": "123456"
  }
}
```

#### 3. Reference Number Patterns

Match reference numbers starting with "AD" followed by digits:

```json
{
  "businessName": "Transaction - Adobe Reference",
  "apiName": "API/Transaction",
  "predicate": {
    "request": {
      "sessionContext": {
        "externalReferenceNo": "regex:^AD\\d{17}$"
      }
    }
  }
}
```

#### 4. Mixed Regex and Exact Match

Combine regex with exact values and booleans:

```json
{
  "businessName": "CRM Save - Pattern Match",
  "apiName": "API/CRM_Save_REST",
  "predicate": {
    "request": {
      "CRMnextObject": {
        "MobilePhone": "regex:^[6-9]\\d{9}$",
        "Email": "regex:^[a-zA-Z0-9._%+-]+@.+$",
        "ProductName": "Credit Card",
        "IsDedupeSearch": false
      }
    }
  }
}
```

### Common Regex Patterns

| Pattern | Matches | Example |
|---------|---------|---------|
| `regex:^\\d{10}$` | Exactly 10 digits | `9585802955` |
| `regex:^[6-9]\\d{9}$` | Indian mobile (starts 6-9) | `9585802955` |
| `regex:.*_UNIFIEDURL_U_WEB$` | Ends with `_UNIFIEDURL_U_WEB` | `uuid_01_UNIFIEDURL_U_WEB` |
| `regex:^AD\\d+$` | Starts with AD + digits | `AD20251029101054804` |
| `regex:^[A-Z]{2}\\d+$` | 2 uppercase + digits | `AB12345` |

### Important Notes

**Escaping:**
- Use double backslashes in JSON: `\\d` not `\d`
- Example: `"regex:^\\d{10}$"` not `"regex:^\d{10}$"`

---

## Understanding Predicate Matching: `contains` vs JSONPath

The stub generator intelligently chooses the best Mountebank operator based on your predicate content. Understanding this helps you write effective predicates.

**Key Insight:** `deepEquals` does NOT ignore extra fields in nested structures (unlike `contains`). This is why we use individual JSONPath predicates for boolean/number fields.

### **Automatic Operator Selection**

The system analyzes your predicate and selects:
- **`contains`**: For string-only predicates (best for deeply nested objects, ignores extra fields)
- **`equals` (JSONPath)**: For predicates with booleans, numbers, or arrays (each field matched independently)
- **`matches` (JSONPath)**: For regex patterns (see [Regex Pattern Matching](#regex-pattern-matching-in-predicates))

---

### **Operator 1: `contains` (String-Only Predicates)**

**When Used:**
- All predicate values are strings
- No booleans, numbers, or arrays

**How It Works:**
- Recursively checks if request **contains** the predicate structure
- Works excellently with deeply nested objects
- Ignores extra fields not in predicate

#### **Example 1: Simple String Match**

**Predicate:**
```json
{
  "predicate": {
    "request": {
      "mobileNumber": "9585802955"
    }
  }
}
```

**Generated Mountebank Predicate:**
```json
{
  "contains": {
    "body": {
      "mobileNumber": "9585802955"
    }
  }
}
```

**Matches:**
```json
{"mobileNumber": "9585802955"}
{"mobileNumber": "9585802955", "email": "test@example.com"}  // Extra fields ignored
```

**Doesn't Match:**
```json
{"mobileNumber": "8450644870"}  // Different value
{"phone": "9585802955"}         // Different field name
```

---

#### **Example 2: Deeply Nested String Match**

**Predicate:**
```json
{
  "predicate": {
    "request": {
      "OTPGenRequest": {
        "requestString": {
          "AXIOMRequestDTO": {
            "pno": "919585802955"
          }
        }
      }
    }
  }
}
```

**Generated Mountebank Predicate:**
```json
{
  "contains": {
    "body": {
      "OTPGenRequest": {
        "requestString": {
          "AXIOMRequestDTO": {
            "pno": "919585802955"
          }
        }
      }
    }
  }
}
```

**Matches (Excellent Deep Nesting Support):**
```json
{
  "sessionContext": {
    "bankCode": "08",
    "channel": "APIGW"
  },
  "OTPGenRequest": {
    "headerParams": [
      {"key": "apiUser", "value": "hdfc_adobe"}
    ],
    "requestString": {
      "E2FARequestDTO": {
        "refNo": "AD123",
        "linkData": "xyz"
      },
      "AXIOMRequestDTO": {
        "countrycode": "",
        "languageid": "",
        "pno": "919585802955",      // ← Matches here!
        "msgtype": "S",
        "priority": "1"
      },
      "emailid": "",
      "splitOTP": "N"
    }
  }
}
```

**Why `contains` is Great for Deep Nesting:**
- Checks: "Does `OTPGenRequest` contain `requestString`?" → Yes 
- Checks: "Does `requestString` contain `AXIOMRequestDTO`?" → Yes 
- Checks: "Does `AXIOMRequestDTO` contain `pno: "919585802955"`?" → Yes
- Ignores: `E2FARequestDTO`, `emailid`, `splitOTP`, all other fields

---

### **Operator 2: JSONPath + `equals` (Boolean/Number Predicates)**

**When Used:**
- Predicate contains boolean values (`true`, `false`)
- Predicate contains number values (`0`, `1`, `533`)
- Predicate contains arrays

**How It Works:**
- Creates individual JSONPath predicates for each field
- Uses `equals` operator with JSONPath selector
- Each field matched independently (ignores extra fields)
- Prevents `indexOf` error that `contains` throws on booleans/numbers

#### **Example 3: Predicate with Boolean**

**Predicate:**
```json
{
  "predicate": {
    "request": {
      "CRMnextObject": {
        "MobilePhone": "9585802955",
        "ProductName": "Credit Card",
        "IsDedupeSearch": false
      }
    }
  }
}
```

**Generated Mountebank Predicates (Individual JSONPath for Each Field):**
```json
[
  {
    "equals": {
      "body": {
        "$.CRMnextObject.MobilePhone": "9585802955"
      }
    }
  },
  {
    "equals": {
      "body": {
        "$.CRMnextObject.ProductName": "Credit Card"
      }
    }
  },
  {
    "equals": {
      "body": {
        "$.CRMnextObject.IsDedupeSearch": false
      }
    }
  }
]
```

**Why This Works:** Each field is matched independently using JSONPath, so extra fields like `Email`, `FirstName`, `Custom` object, etc. don't affect matching.

**Matches (Extra Fields and Nested Objects):**
```json
{
  "CRMnextObject": {
    "MobilePhone": "9585802955",     // $.CRMnextObject.MobilePhone matches
    "ProductName": "Credit Card",     // $.CRMnextObject.ProductName matches
    "IsDedupeSearch": false,          // $.CRMnextObject.IsDedupeSearch matches
    "Email": "",                      // Extra field (not in predicate, ignored)
    "FirstName": "John",              // Extra field (ignored)
    "StatusCode": "New",              // Extra field (ignored)
    "Custom": {                       // Extra nested object (ignored)
      "Gender": "Male",
      "Company": "Adobe",
      "l_Present_Address_L1": "123 Street"
    }
  }
}
```

**How JSONPath Matching Works:**
1. Checks: Does `$.CRMnextObject.MobilePhone` = "9585802955"? → Yes
2. Checks: Does `$.CRMnextObject.ProductName` = "Credit Card"? → Yes
3. Checks: Does `$.CRMnextObject.IsDedupeSearch` = false? → Yes
4. All 3 predicates pass → **MATCH!**
5. Extra fields like `Email`, `Custom`, etc. are never checked → Ignored

**Doesn't Match (Specified Field Has Wrong Value):**
```json
{
  "CRMnextObject": {
    "MobilePhone": "9585802955",
    "ProductName": "Credit Card",
    "IsDedupeSearch": true           // Boolean mismatch (expects false)
  }
}
```

**Doesn't Match (Specified Field is Missing):**
```json
{
  "CRMnextObject": {
    "MobilePhone": "9585802955",
    "ProductName": "Credit Card"
    // IsDedupeSearch is missing entirely - No match
  }
}
```

**Doesn't Match (Wrong Nesting Structure):**
```json
{
  "CRMnextObject": {
    "MobilePhone": "9585802955",
    "IsDedupeSearch": false
    // ProductName is missing - No match
  },
  "ProductName": "Credit Card"       // Wrong level (outside CRMnextObject)
}
```

---

#### **Example 4: Real-World CRM Example (JSONPath + equals)**

**Predicate (Simplified - Only 3 Fields):**
```json
{
  "predicate": {
    "request": {
      "CRMnextObject": {
        "MobilePhone": "9585802955",
        "IsDedupeSearch": false,
        "ProductName": "Credit Card"
      }
    }
  }
}
```

**Matches Full CRM Request (50+ Fields):**
```json
{
  "CRMnextObject": {
    "-xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "Email": "",
    "StatusCodeDisplayText": "New",
    "ProductName": "Credit Card",          // Matches
    "-xsi:type": "api:Lead",
    "IndustryKey": "",
    "TerritoryKey": "",
    "IsDedupeSearch": false,               // Matches (boolean)
    "StatusCode": "New",
    "MobilePhone": "9585802955",           // Matches
    "Phone": "9585802955",
    "ProductCategoryID": "533",
    "TerritoryCode": "",
    "IsChildLead": false,
    "LeadParentName": "",
    "RatingKey": "1",
    "State_add_l": "",
    "IndustryName": "",
    "ProductKey": "534",
    "LeadSourceKey": "",
    "IsInsideBHR": false,
    "Locality": "",
    "ProductCode": "",
    "FirstName": "Ayush",
    "ZipCode": "",
    "WebsiteUrl": "",
    "Title": "",
    "Custom": {                            // Extra nested object (ignored)
      "Gender1": "Male",
      "Company": "ADOBE SYSTEMS",
      "l_Present_Address_L1": "B-606 Amrapali Zodiac",
      "l_Present_Address_PIN": "",
      "utm_medium_l": "",
      "FieldID_11216": "",
      "l_Office_PIN": "",
      "FieldID_12": "",
      "l_Present_Address_L2": "Sector-120"
      // ... 30+ more custom fields (all ignored)
    },
    "StatusCodeName": "New",
    "MiddleName": "",
    "LeadParentId": "0",
    "SalutationName": "",
    "LayoutKey": "10003984",
    "LeadRating": "Hot"
    // ... 20+ more fields (all ignored)
  }
}
```

**Generated Mountebank Predicates (Individual JSONPath):**
```json
[
  {
    "equals": {
      "body": {
        "$.CRMnextObject.MobilePhone": "9585802955"
      }
    }
  },
  {
    "equals": {
      "body": {
        "$.CRMnextObject.IsDedupeSearch": false
      }
    }
  },
  {
    "equals": {
      "body": {
        "$.CRMnextObject.ProductName": "Credit Card"
      }
    }
  }
]
```

**Result: MATCHES!** 
- Each of the 3 fields is matched independently using JSONPath
- All 50+ other fields including nested `Custom` object are ignored
- This is why your CRM API with boolean fields works!

---

### **Mixed Predicates: Regex + Boolean/Number**

When you combine regex with booleans/numbers, the system creates **multiple predicates** (all must match).

#### **Example 5: Regex + Boolean**

**Predicate:**
```json
{
  "predicate": {
    "request": {
      "CRMnextObject": {
        "MobilePhone": "regex:^[6-9]\\d{9}$",
        "ProductName": "Credit Card",
        "IsDedupeSearch": false
      }
    }
  }
}
```

**Generated Mountebank Predicates:**
```json
[
  {
    "matches": {
      "body": {
        "$.CRMnextObject.MobilePhone": "^[6-9]\\d{9}$"
      }
    }
  },
  {
    "equals": {
      "body": {
        "$.CRMnextObject.ProductName": "Credit Card"
      }
    }
  },
  {
    "equals": {
      "body": {
        "$.CRMnextObject.IsDedupeSearch": false
      }
    }
  }
]
```

**Matching Logic:** **ALL predicates must match (AND logic)**

**Matches:**
```json
{
  "CRMnextObject": {
    "MobilePhone": "9585802955",      // Matches regex (starts 6-9, 10 digits)
    "ProductName": "Credit Card",      // Exact match
    "IsDedupeSearch": false,           // Boolean match
    "Email": "test@example.com"        // Extra field (ignored)
  }
}
```

**Doesn't Match (Regex Fails):**
```json
{
  "CRMnextObject": {
    "MobilePhone": "5585802955",      // Regex fails (starts with 5, not 6-9)
    "ProductName": "Credit Card",
    "IsDedupeSearch": false
  }
}
```

**Doesn't Match (Boolean Fails):**
```json
{
  "CRMnextObject": {
    "MobilePhone": "9585802955",      // Regex passes
    "ProductName": "Credit Card",
    "IsDedupeSearch": true             // Boolean mismatch
  }
}
```

---

### **Decision Matrix: Which Operator?**

| Your Predicate Contains | Operator Used | Best For | Example |
|------------------------|---------------|----------|---------|
| **Only strings** | `contains` | Deeply nested objects, ignores extra fields | `{"user": {"name": "John"}}` |
| **Booleans** | `equals` (JSONPath) | Boolean matching, ignores extra fields | `{"$.active": false}` |
| **Numbers** | `equals` (JSONPath) | Number matching, ignores extra fields | `{"$.age": 25}` |
| **Arrays** | `equals` (JSONPath) | Array matching | `{"$.tags": ["cc", "ntb"]}` |
| **Regex only** | `matches` (JSONPath) | Pattern matching | `{"$.phone": "^\\d{10}$"}` |
| **Regex + strings** | `matches` + `equals` | Pattern + exact match | See Example 5 |
| **Regex + boolean** | `matches` + `equals` | Pattern + exact match | See Example 5 |

---

### **Best Practices**

#### **DO:**
1. **Use string-only predicates when possible** for best deep nesting support
   ```json
   {"journeyInfo": {"journeyID": "xyz"}}  // ← Prefer this
   ```

2. **Only include fields you need to match**
   ```json
   {"mobileNumber": "9585802955"}  // ← Simple and flexible
   ```

3. **Use regex for dynamic values**
   ```json
   {"txId": "regex:^AD\\d+$"}  // ← Matches any Adobe transaction ID
   ```

#### **DON'T:**
1. **Avoid empty objects in predicates**
   ```json
   {"leadProfile": {}, "journeyInfo": {...}}  // Unnecessary
   {"journeyInfo": {...}}                     // Better
   ```

2. **Don't mix booleans unless necessary** (limits deep nesting flexibility)
   ```json
   // If you don't need to match the boolean, remove it:
   {"user": {"active": true, "name": "John"}}  // Forces deepEquals
   {"user": {"name": "John"}}                   // Uses contains
   ```

3. **Don't create overly specific predicates**
   ```json
   // Too specific (50 fields):
   {"CRMnextObject": { /* all 50 fields */ }}  // Hard to maintain
   
   // Just match what matters:
   {"CRMnextObject": {"MobilePhone": "regex:^\\d{10}$"}}  // Flexible
   ```

---

This tells you which operator was chosen and which fields are being matched!

---

## How Response Loading Works

The system uses **on-demand loading from EDS** to minimize memory usage:

**1. Aggregation** (`mocks.json` is lightweight)
- GitHub Actions strips `responseBody` and `responseHeaders` from aggregated `mocks.json`
- Only keeps: predicates, metadata, and `_metadata.sourceFile` path
- Result: `mocks.json` is ~90% smaller (~1MB instead of ~50MB)

**2. Stub-Generator Loads Metadata**
- Fetches lightweight `mocks.json` from EDS
- Creates Mountebank stubs with inject functions
- Each stub knows its source file path via `_metadata.sourceFile`

**3. Runtime Request Handling**

When a request matches:
```
Request → Mountebank matches predicate
       → Executes inject function
       → Fetches: https://.../mocks/{sourceFile}
       → EDS returns complete JSON with:
          - statusCode: 200 (or 404, 500, 401, etc.)
          - responseHeaders: {...}
          - responseBody: {...}
       → Mountebank applies latencyMs delay (_behaviors.wait)
       → Returns response to client with correct status code
```

**Key Fields:**
- `statusCode`: HTTP status code (200, 404, 500, etc.) - read from individual JSON file
- `latencyMs`: Response delay in milliseconds - handled by Mountebank `_behaviors.wait`
- `responseHeaders`: Custom headers (default: `Content-Type: application/json` if not specified)
- `responseBody`: Response payload

**4. Response Strategies** (evaluated in this order):

| Strategy | When | Behavior |
|----------|------|----------|
| **Custom Function** | `responseFunction: "dynamicLoanStatus"` exists in `functions.js` | Executes function logic (no EDS fetch) |
| **EDS Fetch** (default) | `_metadata.sourceFile` exists | Fetches complete response from EDS on every request |
| **Inline Function** | `responseFunction` contains code string | Executes inline code (legacy) |
| **Static** | None of the above | Uses `responseBody` from `mocks.json` (rare in external mode) |

**Example:** Individual file at `mocks/personal-loan/apply-loan.json` has full response, but `mocks.json` only has its path. When request comes in, Mountebank fetches the complete file from `https://.../mocks/personal-loan/apply-loan.json` and returns the response.

---

## Dynamic Mocks with External Functions

For advanced use cases requiring dynamic responses (e.g., conditional logic, random data, stateful behavior), use external functions instead of inline code in JSON.

### Why External Functions?

**Maintainable:** Keep functions in a proper `.js` file with syntax highlighting  
**Reusable:** Share functions across multiple mocks  
**Testable:** Easier to test and debug  
**Clean JSON:** No inline functions cluttering your mock definitions

### Creating Functions

**1. Edit `functions.js`**

```javascript
// functions.js
module.exports = {
  // Example: Dynamic loan status
  dynamicLoanStatus: function(request) {
    const body = JSON.parse(request.body);
    const loanId = body.loanId || 'UNKNOWN';
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanId: loanId,
        status: 'APPROVED',
        amount: Math.floor(Math.random() * 100000) + 50000,
        timestamp: new Date().toISOString()
      })
    };
  },

  // Example: Conditional auth response
  conditionalAuth: function(request) {
    const token = request.headers['authorization'];
    
    if (!token || token === 'Bearer invalid') {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'authenticated' })
    };
  }
};
```

**2. Reference in Mock JSON**

```json
{
  "businessName": "Dynamic Loan Status",
  "apiName": "loans/status",
      "method": "POST",
  "responseFunction": "dynamicLoanStatus",
  "predicate": {
    "request": {},
    "headers": {},
    "query": {}
  },
  "responseHeaders": {},
  "responseBody": {}
}
```

**Note:** 
- Simply add `responseFunction`
- `responseFunction` can be either:
  - **Function name** (e.g., `"dynamicLoanStatus"`) - References a function exported in `functions.js` (Recommended)
  - **Inline code** (e.g., `"function(request) { return {...} }"`) - Legacy support (Not recommended)

### Function Signature

All response functions receive a `request` object:

```javascript
function myResponseFunction(request) {
  // request.method    - HTTP method (GET, POST, etc.)
  // request.path      - Request path
  // request.query     - Query parameters object
  // request.headers   - Request headers object
  // request.body      - Request body (string, parse if JSON)
  
  return {
    statusCode: 200,              // HTTP status code
    headers: { ... },             // Response headers
    body: JSON.stringify({ ... }) // Response body (must be string)
  };
}
```

### Loading Functions

The stub-generator automatically:
1. Fetches `functions.js` from GitHub alongside `mocks.json`
2. Evaluates and loads all exported functions
3. Checks if `responseFunction` is a function name or inline code
4. Injects function code into Mountebank

**Webhook support:** Changes to `functions.js` trigger automatic reload (same as `mocks.json`)

### External vs Inline Functions

| Approach | Example | Recommended |
|----------|---------|-------------|
| **External function name** | `"responseFunction": "dynamicLoanStatus"` | **Use this** - Clean, maintainable, reusable |
| **Inline code** | `"responseFunction": "function(request){...}"` | Legacy support only |

## Best Practices

1. **One file per mock** - Easier to manage and review
2. **Descriptive filenames** - Use kebab-case: `users-login-admin.json`
3. **Organize by feature** - Use subdirectories: `mocks/auth/`, `mocks/orders/`
4. **Test locally** - Validate JSON before committing
5. **Use Pull Requests** - For team review and approval
6. **External functions for dynamic logic** - Never use inline functions in JSON
7. **Keep functions pure** - Minimize side effects in response functions
8. **Name functions descriptively** - Use clear, intention-revealing names

### Organizing Mocks

Create subdirectories for better organization:

```
mocks/
├── auth/
│   ├── login-admin.json
│   ├── login-user.json
│   └── logout.json
├── orders/
│   ├── create-order.json
│   ├── list-orders.json
│   └── order-details.json
└── products/
    ├── list-products.json
    └── product-details.json
```

---

## Manual Reload Workflow

If the automatic webhook fails (e.g., due to cold start), you can manually trigger a reload:

**1. Go to GitHub Actions:**
```
https://github.com/hdfc-forms/api-virtualization/actions/workflows/manual-reload.yml
```

**2. Click "Run workflow"**

**3. Configure options:**
- **Number of retry attempts:** 1-5 (default: 3)
  - Useful for cold start scenarios where first attempt might timeout

**4. Click "Run workflow"** - The workflow will:
- Attempt to trigger stub-generator reload immediately
- Retry on failure (with 10s delay between attempts)
- Show detailed logs

**Why this is useful:**
- Handles cold start timeouts with retries
- Can be triggered anytime from GitHub UI
- Provides detailed logs and error messages
- Works when automatic webhook fails

---

## Performance & Load Testing

The stub-generator has been load tested on Render.com with following results:

**Load Test Results:**
- **6000+ mocks** loaded successfully
- **~5MB memory footprint** (on-demand loading from EDS)
- **Sub-second startup time** (lightweight stubs)
- **50-200ms response times** (including EDS fetch)
- **99.9% availability** (Render.com auto-scaling)

**Infrastructure Details:**
- **Platform:** Render.com (PaaS)
- **Deployment:** 
  - Management UI: https://mockapi-backend-09lz.onrender.com/
  - Mock Proxy: https://mockapi-proxy.onrender.com/
- **Auto-scaling:** Enabled (scales based on traffic)
- **Cold start:** ~30 seconds (first request after idle)
- **Memory:** ~512MB allocated, ~5MB used by Mountebank
- **CDN:** Edge Delivery Services (EDS) for fast mock fetching

**Performance Optimization:**
1. **On-demand loading:** Only predicates loaded in memory, responses fetched at runtime
2. **EDS caching:** Leverages AEM Edge Delivery CDN (~5-50ms per fetch)
3. **Lightweight stubs:** `mocks.json` is ~90% smaller (strips responseBody/Headers)
4. **Parallel loading:** Mountebank loads all stubs concurrently

**Testing Tips:**
- Use `latencyMs` field to simulate real network conditions
- Test with realistic request volumes
- Use Manual Reload Workflow for cold start scenarios

---

## Testing

This repository includes comprehensive unit tests for mock validation, dynamic functions, and aggregation logic.

**Run Tests:**
```bash
# Install dependencies (first time only)
npm install

# Run all tests with coverage
npm test

# Watch mode (auto-rerun on changes)
npm run test:watch

# Validate mock files only
npm run validate:mocks
```

**What's Tested:**
- Dynamic response functions (`functions.js`)
- Mock JSON schema validation
- Aggregation script (`mocks.json` generation)
- File naming conventions
- Function references

**CI/CD:**
Tests run automatically on:
- Push to `main` branch
- Pull requests

View test results: [GitHub Actions](https://github.com/hdfc-forms/api-virtualization/actions)

---

## Troubleshooting

**GitHub Action fails?**
- Check JSON syntax in your mock files
- View workflow logs in Actions tab
- Ensure all required fields are present

**Mocks not loading in stub-generator?**
- Verify `mocks.json` was generated
- Check stub-generator can access the repository
- Verify URL in stub-generator configuration

**Webhook fails or times out?**
- Use the **Manual Reload Workflow** (see above)
- Check if STUB_GENERATOR_URL secret is configured correctly
- Verify stub-generator service is running
- Check for cold start issues (service warming up)

**AEM Mock Capture not working?**
- Verify MockService OSGi configuration is correct
- Check service user permissions: `/content/mock-capture/mocks` (read/write)
- Verify bundle is deployed and active
- Check AEM error logs for exceptions
- Ensure runmode matches mockProxyRunmodes configuration

**Mock Proxy redirect not working?**
- Verify `enableMockProxyRedirect: true` in OSGi config
- Check `mockProxyRunmodes` matches current AEM runmode
- Verify `mockProxyBaseUrl` is correct
- Check FDMRestPreProcessor logs for redirect messages
- Ensure FDM is configured correctly

---

## Additional Resources

**Related Repositories:**
- **stub-generator:** Backend server (Mountebank + Management API)
- **HDFC_FormsCommon:** AEM bundle containing MockService

**Documentation:**
- [Mountebank Documentation](http://www.mbtest.org/)
- [AEM Forms Data Model](https://experienceleague.adobe.com/docs/experience-manager-65/forms/form-data-model/work-with-form-data-model.html)
- [Render.com Docs](https://render.com/docs)

**Support:**
- For mock issues: Check this repository's Issues tab
- For AEM issues: Check HDFC_FormsCommon repository
- For infrastructure: Contact Render.com support

---

## License

This repository is part of the HDFC Forms internal tooling. For internal use only.

