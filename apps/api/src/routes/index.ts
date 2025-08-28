import { Router } from 'express'
import { healthRouter } from './health'
import { audioJobRouter } from './audio-jobs'
import { videoJobRouter } from './video-jobs'

const router = Router()

// Mount health routes
router.use(healthRouter)

// Mount audio job routes
router.use(audioJobRouter)

// Mount video job routes
router.use(videoJobRouter)

export { router }
