# SSE Hook & Video Playback Implementation

This document describes the implementation of the SSE (Server-Sent Events) hook and video playback components for real-time job status updates in the FLF2V (First-Last Frame to Video) application.

## Overview

The implementation provides:
- Real-time job status updates via Server-Sent Events
- Video playback component with download functionality  
- Proper cleanup and error handling
- Integration with the existing FLF2V page

## Components

### 1. `hooks/useJobSSE.ts`

React hook that connects to the SSE endpoint and manages job status updates.

**Features:**
- Connects to `/api/jobs/stream?jobId={jobId}` endpoint
- Handles SSE events: `connected`, `job_status_update`, `heartbeat`
- Auto-fetches complete job details when status becomes `COMPLETED`
- Automatic reconnection on connection failure
- Proper cleanup on unmount or jobId change

**Usage:**
```typescript
const { job, isConnected, error, reconnect } = useJobSSE(jobId)
```

### 2. `components/VideoPlayer.tsx`

Video player component with download functionality for completed videos.

**Features:**
- HTML5 video player with native controls
- Fullscreen toggle button
- Download functionality with progress indicator
- Error handling for download failures
- Responsive design with dark/light mode support

**Usage:**
```typescript
<VideoPlayer
  videoUrl={job.outputUrl}
  downloadUrl={job.downloadUrl}
  title="Generated Video"
/>
```

### 3. `components/JobStatusDisplay.tsx`

Status display component showing real-time job progress and connection state.

**Features:**
- Visual status indicators with icons and colors
- Progress bar for RUNNING jobs
- Connection status monitoring
- Error display and reconnection controls
- Job details (ID, last updated time)

**Usage:**
```typescript
<JobStatusDisplay
  job={job}
  isConnected={isConnected}
  error={error}
  onReconnect={reconnect}
/>
```

## Integration

### FLF2V Page Updates

The main FLF2V page (`app/flf2v/page.tsx`) has been updated to:

1. **Use SSE Hook**: Automatically starts tracking job status after creation
2. **Progressive UI States**:
   - Form submission → Job creation
   - Real-time status tracking → Progress updates
   - Job completion → Video playback
3. **Form Management**: Hides form during processing, shows reset option
4. **Error Handling**: Displays both job errors and SSE connection issues

### User Flow

1. User uploads images and sets parameters
2. Form submits and creates job via API
3. SSE connection automatically established
4. Real-time status updates displayed
5. When job completes, video player appears
6. User can play and download the generated video

## Testing

### Test Page (`app/test-sse/page.tsx`)

A dedicated test page allows manual testing of the SSE functionality:
- Input field for job ID
- Live connection status monitoring
- Real-time status updates
- Video playback on completion

### Automated Tests

The implementation includes test scripts demonstrating:
- Job creation via API
- SSE connection establishment
- Event handling and status updates
- Job completion detection
- Video playback functionality

## API Integration

### SSE Endpoint
- **URL**: `GET /api/jobs/stream?jobId={jobId}`
- **Events**: `connected`, `job_status_update`, `heartbeat`
- **Headers**: Standard SSE headers with CORS support

### Job Endpoint  
- **URL**: `GET /api/jobs/{jobId}`
- **Response**: Complete job details with `downloadUrl` for completed jobs
- **Usage**: Auto-fetched when job completes via SSE

## Error Handling

### Connection Errors
- Automatic reconnection with exponential backoff
- User-facing error messages with reconnect option
- Graceful degradation when SSE unavailable

### Job Errors
- Display job failure reasons from API
- Separate handling of SSE vs job processing errors
- Form re-enabling on job failure

## Browser Compatibility

- Uses native `EventSource` API (supported in all modern browsers)
- Fallback error handling for unsupported browsers
- Progressive enhancement approach

## Performance Considerations

- Automatic cleanup of SSE connections
- Memory leak prevention for blob URLs
- Efficient re-rendering with React hooks
- Connection pooling handled by browser

## Local Development

### Setup
1. Start API server: `pnpm --filter ./apps/api dev`
2. Start UI server: `pnpm --filter ./apps/ui dev`  
3. Set `VIDEO_RUN_MODE=local_fake` for testing without GPU

### Testing URLs
- Main page: `http://localhost:3000/flf2v`
- Test page: `http://localhost:3000/test-sse`
- API health: `http://localhost:4000/_health`

## Future Enhancements

- WebSocket fallback for better reliability
- Progress streaming for more granular updates
- Video thumbnail generation
- Batch job processing support
- Real-time collaboration features