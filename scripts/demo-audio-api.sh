#!/bin/bash

# Audio Job API Examples
# This script demonstrates the audio job endpoints

API_BASE="http://localhost:4000"

echo "=== Audio Job API Demo ==="
echo

echo "1. Creating an audio separation job..."
RESPONSE=$(curl -s -X POST ${API_BASE}/api/audio/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "name": "demo-song.mp3",
        "path": "/uploads/demo-song.mp3",
        "contentType": "audio/mpeg",
        "size": 4194304
      }
    ],
    "sampleRate": 44100,
    "channels": 2,
    "processing": {
      "mode": "separate",
      "presets": "studio-quality"
    },
    "metadata": {
      "title": "Demo Song",
      "artist": "Demo Artist",
      "genre": "Electronic"
    }
  }')

echo "Response: $RESPONSE" | jq .
JOB_ID=$(echo "$RESPONSE" | jq -r '.id')
echo "Created job with ID: $JOB_ID"
echo

echo "2. Listing all audio jobs..."
curl -s "${API_BASE}/api/audio/jobs" | jq .
echo

echo "3. Getting specific job details..."
curl -s "${API_BASE}/api/audio/jobs/${JOB_ID}" | jq .
echo

echo "4. Creating an audio enhancement job..."
curl -s -X POST ${API_BASE}/api/audio/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "name": "podcast.wav",
        "path": "/uploads/podcast.wav",
        "contentType": "audio/wav",
        "size": 8388608
      }
    ],
    "sampleRate": 48000,
    "channels": 1,
    "processing": {
      "mode": "enhance",
      "presets": "voice-optimization"
    }
  }' | jq .
echo

echo "5. Listing jobs with pagination..."
curl -s "${API_BASE}/api/audio/jobs?page=1&limit=5" | jq .
echo

echo "6. Testing validation error..."
curl -s -X POST ${API_BASE}/api/audio/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "name": "document.pdf",
        "path": "/uploads/document.pdf",
        "contentType": "application/pdf",
        "size": 1024
      }
    ],
    "processing": {
      "mode": "separate"
    }
  }' | jq .
echo

echo "Demo completed!"