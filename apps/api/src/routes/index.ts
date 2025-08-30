import { Router } from 'express'
import { healthRouter } from './health'
import { audioJobRouter } from './audio-jobs'
import { videoJobRouter } from './video-jobs'
import { sseRouter } from './sse'
import { jobRouter } from './jobs'
import { callbackRouter } from './callbacks'
import { uploadsRouter } from './uploads'

const router = Router()

// Mount health routes
router.use(healthRouter)

// Mount SSE routes (must come before generic job routes to avoid conflicts)
router.use(sseRouter)

// Mount uploads routes
router.use(uploadsRouter)

// Mount generic job routes
router.use(jobRouter)

// Mount audio job routes
router.use(audioJobRouter)

// Mount video job routes
router.use(videoJobRouter)

// Mount callback routes
router.use(callbackRouter)

export { router }
