# Audio Job API Documentation

## Overview

The Audio Job API provides endpoints for submitting, listing, and retrieving audio processing jobs. These endpoints support audio separation, enhancement, and transcoding operations.

## Base URL
```
/api/audio/jobs
```

## Endpoints

### Create Audio Job

**POST** `/api/audio/jobs`

Creates a new audio processing job.

#### Request Body

```json
{
  "inputs": [
    {
      "name": "string",          // File name (required)
      "path": "string",          // File path (required)
      "contentType": "string",   // Audio MIME type (required, must start with "audio/")
      "size": "number"           // File size in bytes (required, positive)
    }
  ],
  "sampleRate": "number",        // Sample rate in Hz (optional, default: 44100)
  "channels": "number",          // Number of channels (optional, 1-32)
  "processing": {
    "mode": "string",            // Processing mode: "separate", "enhance", or "transcode" (required)
    "presets": "string"          // Processing presets (optional)
  },
  "metadata": {                  // Additional metadata (optional)
    "key": "value"
  }
}
```

#### Example Request

```bash
curl -X POST http://localhost:3000/api/audio/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "name": "song.mp3",
        "path": "/uploads/song.mp3",
        "contentType": "audio/mpeg",
        "size": 5242880
      }
    ],
    "sampleRate": 44100,
    "channels": 2,
    "processing": {
      "mode": "separate",
      "presets": "high-quality"
    },
    "metadata": {
      "title": "My Song",
      "artist": "Artist Name"
    }
  }'
```

#### Response (201 Created)

```json
{
  "id": "clxx1234567890abcdef",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z",
  "status": "QUEUED",
  "lane": "AUDIO",
  "inputs": [
    {
      "name": "song.mp3",
      "path": "/uploads/song.mp3",
      "contentType": "audio/mpeg",
      "size": 5242880
    }
  ],
  "sampleRate": 44100,
  "channels": 2,
  "processing": {
    "mode": "separate",
    "presets": "high-quality"
  },
  "metadata": {
    "title": "My Song",
    "artist": "Artist Name"
  },
  "progressPct": null,
  "outputUrl": null,
  "resultPaths": null,
  "failureReason": null
}
```

### List Audio Jobs

**GET** `/api/audio/jobs`

Retrieves a paginated list of audio jobs with optional filtering.

#### Query Parameters

- `page` (optional): Page number (default: 1)
- `limit` (optional): Number of jobs per page (default: 10, max: 100)
- `status` (optional): Filter by job status (`QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELED`)

#### Example Request

```bash
curl "http://localhost:3000/api/audio/jobs?page=1&limit=5&status=COMPLETED"
```

#### Response (200 OK)

```json
{
  "jobs": [
    {
      "id": "clxx1234567890abcdef",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:05:00.000Z",
      "status": "COMPLETED",
      "lane": "AUDIO",
      "sampleRate": 44100,
      "channels": 2,
      "processing": {
        "mode": "separate"
      },
      "progressPct": 100,
      "outputUrl": "https://storage.example.com/outputs/clxx1234567890abcdef.zip",
      "resultPaths": [
        "/stems/vocals.wav",
        "/stems/instruments.wav"
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### Get Audio Job Details

**GET** `/api/audio/jobs/:id`

Retrieves detailed information about a specific audio job.

#### Path Parameters

- `id`: Job ID (required)

#### Example Request

```bash
curl "http://localhost:3000/api/audio/jobs/clxx1234567890abcdef"
```

#### Response (200 OK)

```json
{
  "id": "clxx1234567890abcdef",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:05:00.000Z",
  "status": "COMPLETED",
  "lane": "AUDIO",
  "inputs": [
    {
      "name": "song.mp3",
      "path": "/uploads/song.mp3",
      "contentType": "audio/mpeg",
      "size": 5242880
    }
  ],
  "sampleRate": 44100,
  "channels": 2,
  "processing": {
    "mode": "separate",
    "presets": "high-quality"
  },
  "metadata": {
    "title": "My Song",
    "artist": "Artist Name"
  },
  "progressPct": 100,
  "outputUrl": "https://storage.example.com/outputs/clxx1234567890abcdef.zip",
  "resultPaths": [
    "/stems/vocals.wav",
    "/stems/instruments.wav",
    "/stems/bass.wav",
    "/stems/drums.wav"
  ],
  "failureReason": null
}
```

## Error Responses

### Validation Error (400 Bad Request)

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "inputs.0.contentType",
      "message": "Must be an audio content type",
      "code": "invalid_string"
    }
  ]
}
```

### Not Found (404 Not Found)

```json
{
  "error": "Not found",
  "message": "Audio job not found"
}
```

### Internal Server Error (500 Internal Server Error)

```json
{
  "error": "Internal server error",
  "message": "Failed to create audio job"
}
```

## Job Status Flow

1. **QUEUED** - Job has been created and is waiting to be processed
2. **RUNNING** - Job is currently being processed by a worker
3. **COMPLETED** - Job has finished successfully with output files available
4. **FAILED** - Job encountered an error during processing
5. **CANCELED** - Job was manually canceled before completion

## Processing Modes

- **separate** - Separates audio into stems (vocals, instruments, etc.)
- **enhance** - Applies audio enhancement filters (denoise, normalize, etc.)
- **transcode** - Converts audio between different formats

## Supported Audio Formats

The API accepts any content type starting with `audio/`, including:

- `audio/mpeg` (MP3)
- `audio/wav` (WAV)
- `audio/flac` (FLAC)
- `audio/ogg` (OGG)
- `audio/aac` (AAC)

## Rate Limiting

Currently, there are no rate limits implemented, but they may be added in future versions as part of EPIC-009.

## Authentication

Authentication is not currently required for these endpoints, but may be added in future versions as part of EPIC-009.