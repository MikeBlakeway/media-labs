import { Router } from 'express'
import { healthRouter } from './health'

const router = Router()

// Mount health routes
router.use(healthRouter)

export { router }
