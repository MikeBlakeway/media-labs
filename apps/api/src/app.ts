import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import { router } from './routes'

// Load environment variables first
dotenv.config()

const app = express()

// Middleware
app.use(express.json())

// Serve uploaded files statically (only when uploads are enabled)
function isUploadsEnabled(): boolean {
  return process.env.LOCAL_FAKE_UPLOADS_ENABLED === 'true' || process.env.VIDEO_RUN_MODE === 'local_fake'
}

if (isUploadsEnabled()) {
  const uploadsDir = process.env.UPLOADS_DIR || './storage/uploads'
  app.use('/uploads', express.static(path.resolve(uploadsDir)))
  console.log(`📁 Serving uploaded files from ${uploadsDir} at /uploads`)
}

// Routes
app.use(router)

export { app }
