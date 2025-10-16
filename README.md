# API Virtualization - Mock Repository

This repository stores mock API responses that are automatically loaded into the stub-generator mock server.

## Structure

```
api-virtualization/
├── mocks/                          # Individual mock JSON files (EDIT THESE)
│   ├── action-status-inquiry.json
│   ├── journey-dropoff.json
│   └── ...
├── mocks.json                      # ⚠️ AUTO-GENERATED - DO NOT EDIT!
├── .gitattributes                  # Marks mocks.json as generated
└── .github/
    └── workflows/
        └── aggregate-mocks.yml     # GitHub Action to generate mocks.json
```

## How It Works

### 1. **Add Mock Files**

Create individual JSON files in the `mocks/` directory:

**Example: `mocks/my-new-api.json`**

```json
{
  "businessName": "My New API",
  "apiName": "my/api/endpoint",
  "method": "POST",
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
    "data": {...}
  }
}
```

### 2. **Commit and Push**

```bash
git add mocks/my-new-api.json
git commit -m "feat: Add My New API mock"
git push origin main
```

### 3. **Auto-Aggregation**

- GitHub Action automatically runs on push
- Reads all JSON files from `mocks/` folder
- Generates `mocks.json` with all mocks aggregated
- Commits `mocks.json` back to the repo

### 4. **Stub-Generator Fetches**

The stub-generator server automatically:
- Fetches `mocks.json` from this repo
- Loads all mocks into Mountebank
- Serves the mock APIs

## Mock JSON Schema

**Required Fields:**
- `apiName` (string) - API endpoint path (without leading slash)
- `responseBody` (object) - Response payload

**Optional Fields:**
- `businessName` (string) - Human-readable name
- `method` (string) - HTTP method (default: "POST")
- `predicate.request` (object) - Request body matching rules
- `predicate.headers` (object) - Header matching rules
- `predicate.query` (object) - Query parameter matching rules
- `responseHeaders` (object) - Custom response headers
- `responseType` (string) - "static" or "dynamic"
- `responseFunction` (string) - JavaScript function for dynamic responses

## GitHub Action

The aggregation workflow runs on:
- Push to `main` branch (when mock files change)
- Pull Request merge to `main`

**What it does:**
1. Reads all `.json` files from `mocks/` directory
2. Validates JSON syntax
3. Aggregates into `mocks.json`
4. Commits back to repository

**⚠️ IMPORTANT:** Never edit `mocks.json` manually! It will be overwritten by the GitHub Action. Always edit individual files in `mocks/` folder.

## Generated `mocks.json` Format

```json
{
  "version": "1.0.0",
  "generatedAt": "2025-10-16T12:00:00.000Z",
  "totalMocks": 2,
  "mocks": [
    {
      "businessName": "...",
      "apiName": "...",
      "method": "POST",
      "predicate": {...},
      "responseHeaders": {...},
      "responseBody": {...},
      "_metadata": {
        "sourceFile": "action-status-inquiry.json",
        "lastModified": "2025-10-16T12:00:00.000Z"
      }
    }
  ]
}
```

## Integration with Stub-Generator

The stub-generator server fetches mocks from this repository:

**AEM Edge Delivery:**

**URL:** `https://main--{site}--{org}.aem.live/mocks.json`

## Best Practices

1. **One file per mock** - Easier to manage and review
2. **Descriptive filenames** - Use kebab-case: `users-login-admin.json`
3. **Organize by feature** - Use subdirectories: `mocks/auth/`, `mocks/orders/`
4. **Test locally** - Validate JSON before committing
5. **Use Pull Requests** - For team review and approval

## Organizing Mocks

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

## Troubleshooting

**GitHub Action fails?**
- Check JSON syntax in your mock files
- View workflow logs in Actions tab
- Ensure all required fields are present

**Mocks not loading in stub-generator?**
- Verify `mocks.json` was generated
- Check stub-generator can access the repository
- Verify URL in stub-generator configuration

