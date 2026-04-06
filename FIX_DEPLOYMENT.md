# Fix for Railway deployment: PostgreSQL client and rate limiting

## Issues Fixed:

### 1. HTTP 429 Too Many Requests - OpenStreetMap API
**Problem**: The application was hitting OpenStreetMap's rate limits when geocoding addresses.

**Solution Implemented**:
- Added 1-second delay between API calls to respect rate limiting
- Reduced API request limit from 10 to 5 results per query
- Added proper HTTP headers including 'Accept: application/json'
- Added 429 status code handling with user-friendly error messages
- Implemented error handling for both forward and reverse geocoding

**Files Modified**:
- `client/src/components/CellManagement.jsx`: Enhanced `searchAddress()` and `handleMapClick()` functions

### 2. pg_dump ENOENT Error - PostgreSQL Utilities Missing
**Problem**: Production environment lacks PostgreSQL client utilities (pg_dump) for database backups.

**Solution Implemented**:
- Added `postgres` npm package as fallback for backup functionality
- Created Dockerfile with PostgreSQL client installation
- Added PG_DUMP_URL environment variable configuration
- Enhanced backup controller to use Node.js client when pg_dump fails

**Files Modified**:
- `server/package.json`: Added `postgres: ^3.4.4` dependency
- `server/.env`: Added `PG_DUMP_URL` configuration
- `server/.env.example`: Added `PG_DUMP_URL` template
- `Dockerfile`: New file with PostgreSQL client installation

## Deployment Instructions:

### For Railway:
1. The backup controller already has fallback logic using Node.js PostgreSQL client
2. Ensure PG_DUMP_URL environment variable is set in Railway dashboard
3. The application will automatically use the Node.js client if pg_dump is not available

### For Docker Deployment:
1. Use the provided Dockerfile which includes PostgreSQL client installation
2. Build and deploy as usual

## Rate Limiting Best Practices:
- OpenStreetMap allows approximately 1 request per second
- The application now enforces this limit with delays
- Users will see clear error messages when rate limits are hit
- Reduced result sets to minimize API usage

## Backup Functionality:
- Primary method: pg_dump (if available)
- Fallback method: Node.js PostgreSQL client (always available)
- Both methods generate SQL dumps compatible with PostgreSQL
- Backup functionality works in all deployment environments
