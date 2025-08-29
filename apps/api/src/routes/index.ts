import { Router } from 'express'
import { healthRouter } from './health'
import { audioJobRouter } from './audio-jobs'
import { videoJobRouter } from './video-jobs'
import { sseRouter } from './sse'
import { callbackRouter } from './callbacks'

const router = Router()

// Mount health routes
router.use(healthRouter)

// Mount audio job routes
router.use(audioJobRouter)

// Mount video job routes
router.use(videoJobRouter)

// Mount SSE routes
router.use(sseRouter)

// Mount callback routes
router.use(callbackRouter)

export { router }
