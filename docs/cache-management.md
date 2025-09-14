# Model Cache Management System

## Overview

The Model Cache Management System implements intelligent caching and eviction strategies to maintain optimal RunPod volume utilization while preserving performance for frequently accessed models. The system uses LRU (Least Recently Used) algorithms enhanced with heat scores to make smart eviction decisions.

## Architecture

### Core Components

1. **Cache Manager** (`src/lib/cache-manager.ts`) - Core algorithms and configuration
2. **API Endpoints** (`src/app/api/cache/`) - RESTful cache management interface
3. **Analytics Hook** (`src/hooks/useCacheAnalytics.ts`) - React hooks for cache state
4. **Dashboard UI** (`src/components/CacheDashboard.tsx`) - Administrative interface

### Heat Score Algorithm

Models are scored based on multiple factors to determine their value in the cache:

```typescript
score = (accessCount * 0.4) + (recency * 0.3) + (size penalty * -0.2) + (pin bonus * 0.5) + (in-use bonus * 1.0)
```

**Factors:**
- **Access Count (40%)**: Logarithmic scaling favoring frequently used models
- **Recency (30%)**: Time-based decay over 7 days
- **Size Penalty (-20%)**: Larger models get lower scores (20GB = max penalty)
- **Pin Bonus (0.5)**: Manually pinned models get protection
- **In-Use Bonus (1.0)**: Models currently processing workflows are protected

### Protection Mechanisms

Models are protected from eviction if they meet any of these criteria:
- **Pinned**: Manually marked as important
- **In Use**: Currently processing workflows
- **Recently Accessed**: Within protection window (default 24 hours)
- **High Heat Score**: Above minimum threshold

## Configuration

Environment variables control cache behavior:

```bash
# Cache thresholds
CACHE_HIGH_WATER_MARK=90          # Trigger eviction at 90% usage
CACHE_LOW_WATER_MARK=75           # Stop eviction at 75% usage
CACHE_MIN_HEAT_SCORE=0.1          # Minimum score to keep model
CACHE_PROTECTION_HOURS=24         # Protect recently accessed models
CACHE_CLEANUP_SCHEDULE="0 2 * * *" # Daily cleanup at 2 AM
```

## API Endpoints

### Cache Status
```http
GET /api/cache/status
```
Returns current cache state, volume statistics, and model information.

**Response:**
```json
{
  "success": true,
  "cacheStatus": {
    "volumeStats": {
      "totalBytes": 64424509440,
      "usedBytes": 28991029248,
      "freeBytes": 35433480192,
      "usagePercent": 45.0
    },
    "modelCount": 15,
    "pinnedModels": 3,
    "inUseModels": 1,
    "nextScheduledCleanup": "2024-01-02T02:00:00.000Z"
  },
  "models": [...],
  "config": {...}
}
```

### Trigger Optimization
```http
POST /api/cache/optimize
```
Manually trigger cache optimization cycle.

**Request:**
```json
{
  "force": false,
  "targetPercent": 75,
  "dryRun": true
}
```

**Response:**
```json
{
  "success": true,
  "evictedModels": ["model1.safetensors", "model2.safetensors"],
  "reclaimedBytes": 5368709120,
  "newUsagePercent": 67.5,
  "plannedEvictions": [...]
}
```

### Pin/Unpin Models
```http
POST /api/cache/pin
```
Protect models from eviction.

**Request:**
```json
{
  "modelName": "flux1-dev.safetensors",
  "pinned": true
}
```

### Manual Eviction
```http
DELETE /api/cache/evict
```
Manually evict specific models.

**Request:**
```json
{
  "modelName": "unused-model.safetensors",
  "force": false
}
```

### Track Model Access
```http
POST /api/cache/track-access
```
Record model usage for analytics (automatically called by preflight system).

**Request:**
```json
{
  "modelName": "flux1-dev.safetensors",
  "modelType": "unet",
  "workflowId": "text-to-image",
  "userId": "user123"
}
```

## Usage

### Administrative Dashboard

Access the cache dashboard at `/admin/cache` for:
- Real-time volume usage monitoring
- Model heat map with access patterns
- Manual pin/unpin and eviction controls
- Cache efficiency metrics

### Programmatic Integration

```typescript
import { useCacheAnalytics } from '@/hooks/useCacheAnalytics'

function MyComponent() {
  const {
    cacheStatus,
    models,
    loading,
    error,
    pinModel,
    unpinModel,
    triggerOptimization
  } = useCacheAnalytics()

  // Use cache data in your component
}
```

### Automatic Integration

The system automatically tracks model access through the existing preflight system. No additional code changes are required for basic usage tracking.

## Performance Targets

- **Volume Efficiency**: Maintain 85-95% usage without performance degradation
- **Eviction Accuracy**: >90% of evicted models remain unused for 7+ days
- **System Impact**: <5ms overhead for preflight operations

## Monitoring

### Key Metrics

- **Hit Ratio**: Percentage of model requests served from cache
- **Volume Usage**: Current storage utilization
- **Average Heat Score**: Overall cache "temperature"
- **Eviction Efficiency**: Space reclaimed per eviction cycle

### Alerts

The system automatically alerts when:
- Volume usage exceeds high water mark (90%)
- No models available for eviction (all protected)
- Cache efficiency drops below thresholds

## Safety Features

### Concurrent Access Protection
- Models in active use cannot be evicted
- Graceful handling of race conditions during eviction
- Rollback capability for failed operations

### Error Recovery
- Automatic retry for failed evictions
- Fallback to manual intervention when automation fails
- Comprehensive error logging and reporting

## Future Enhancements

### Planned Features
- **Predictive Caching**: Preload models based on usage patterns
- **B2 Cold Storage**: Automatic migration to cold storage
- **Multi-tier Caching**: Different retention policies by model type
- **Scheduled Optimization**: Automated cleanup during low-usage periods

### Database Integration
Currently uses in-memory storage for simplicity. Production deployment should integrate with persistent storage:

```typescript
// Example database schema
interface ModelCacheRecord {
  modelName: string
  lastAccessed: Date
  accessCount: number
  totalDownloads: number
  avgProcessingTime: number
  userRatings: number[]
  isPinned: boolean
  tags: string[]
}
```

## Troubleshooting

### Common Issues

**High Memory Usage**
- Cache tracks model metadata in memory
- Consider database integration for large model counts

**Slow Eviction**
- Volume worker operations can be slow for large models
- Monitor `/api/cache/optimize?dryRun=true` for planning

**Models Not Protected**
- Check protection window configuration
- Verify pin status in dashboard
- Review heat score calculations

### Debug Information

Enable debug logging:
```bash
export DEBUG=cache:*
npm run dev
```

View cache analytics:
```http
GET /api/cache/analytics/metrics
GET /api/cache/analytics/volume-history?hours=24
```

## Integration with Existing Systems

### Preflight System
Model access is automatically tracked when workflows run preflight checks.

### Volume Worker
Cache eviction operations use the existing volume worker infrastructure.

### RunPod Integration
Compatible with RunPod volume management and does not interfere with existing operations.