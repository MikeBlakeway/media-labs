import { Router } from 'express'
import { healthRouter } from './health'
import { audioJobRouter } from './audio-jobs'

const router = Router()

// Mount health routes
router.use(healthRouter)

// Mount audio job routes
router.use(audioJobRouter)

export { router }
