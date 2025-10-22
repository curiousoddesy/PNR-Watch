# PNR Status Checking Endpoints Implementation

## Overview
This document describes the implementation of task 5.2: "Implement PNR status checking endpoints" from the PNR Tracker webapp specification.

## Implemented Features

### 1. Cache Service (`src/services/cache.ts`)
- **Redis-based caching** for PNR status to reduce IRCTC request frequency
- **TTL Configuration**: 30 minutes for individual PNR status, 10 minutes for batch results
- **Graceful degradation**: Application works without cache if Redis is unavailable
- **Cache invalidation** methods for maintaining data freshness

### 2. Individual PNR Status Endpoint
**Endpoint**: `GET /api/pnrs/:id/status`

**Features**:
- Retrieves current status for a specific tracked PNR
- Implements caching to reduce IRCTC requests
- Falls back to database status if IRCTC is unavailable
- Updates database with fresh status when available
- Proper authentication and authorization checks

**Response Format**:
```json
{
  "success": true,
  "data": {
    "pnr": "1234567890",
    "from": "NEW DELHI",
    "to": "MUMBAI CENTRAL",
    "date": "2024-01-15",
    "status": "CNF/S1/25",
    "isFlushed": false,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "message": "PNR status retrieved successfully"
}
```

### 3. Batch PNR Status Checking Endpoint
**Endpoint**: `POST /api/pnrs/check-all`

**Features**:
- Checks status for all user's PNRs or specific PNRs
- Implements batch caching for improved performance
- Uses BatchProcessorService for rate limiting and error handling
- Supports partial PNR checking via `pnrIds` parameter
- Updates database and cache with fresh statuses

**Request Format**:
```json
{
  "pnrIds": ["uuid1", "uuid2"] // Optional: check specific PNRs
}
```

**Response Format**:
```json
{
  "success": true,
  "data": [
    {
      "pnr": "1234567890",
      "from": "NEW DELHI",
      "to": "MUMBAI CENTRAL",
      "date": "2024-01-15",
      "status": "CNF/S1/25",
      "isFlushed": false,
      "lastUpdated": "2024-01-15T10:30:00.000Z"
    }
  ],
  "message": "Checked 1 PNR statuses"
}
```

## Cache Implementation Details

### Cache Keys
- Individual PNR: `pnr:status:{pnr_number}`
- Batch results: `batch:check:{user_id}`

### Cache TTL
- Individual PNR status: 30 minutes
- Batch check results: 10 minutes

### Cache Behavior
1. **Cache Hit**: Returns cached data immediately
2. **Cache Miss**: Fetches from IRCTC, caches result, updates database
3. **IRCTC Failure**: Returns cached data from database with error indication

## Integration Points

### Application Startup
- Cache service is initialized in `src/index.ts`
- Graceful shutdown includes cache cleanup

### Error Handling
- Comprehensive error handling for Redis connection issues
- Fallback to database when cache is unavailable
- Proper error logging and monitoring

### Rate Limiting
- Uses existing BatchProcessorService for IRCTC request throttling
- 1-second delay between requests to respect IRCTC rate limits
- Exponential backoff for failed requests

## Requirements Fulfilled

✅ **Requirement 3.1**: Real-time status updates with caching
✅ **Requirement 3.2**: Journey details display with current status
✅ **Requirement 3.4**: Last update timestamp indication

## API Usage Examples

### Check Individual PNR Status
```bash
curl -X GET "http://localhost:3001/api/pnrs/{pnr-id}/status" \
  -H "Authorization: Bearer {jwt-token}"
```

### Check All User PNRs
```bash
curl -X POST "http://localhost:3001/api/pnrs/check-all" \
  -H "Authorization: Bearer {jwt-token}" \
  -H "Content-Type: application/json" \
  -d "{}"
```

### Check Specific PNRs
```bash
curl -X POST "http://localhost:3001/api/pnrs/check-all" \
  -H "Authorization: Bearer {jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{"pnrIds": ["uuid1", "uuid2"]}'
```

## Environment Configuration

Add to `.env` file:
```
REDIS_URL=redis://localhost:6379
```

## Dependencies Used
- `redis`: Redis client for caching
- Existing services: IRCTCScraperService, BatchProcessorService
- Existing models: TrackedPNR
- Existing middleware: authenticateToken, validateRequest

## Performance Benefits
- **Reduced IRCTC load**: 30-minute cache reduces repeated requests
- **Faster response times**: Cached responses are near-instantaneous
- **Batch optimization**: Intelligent caching for multiple PNR checks
- **Graceful degradation**: Works without cache for reliability