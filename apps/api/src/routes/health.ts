import { Router, Request, Response } from 'express'

const router = Router()

// Health check endpoint
router.get('/_health', (req: Request, res: Response) => {
  res.status(200).json({ ok: true })
})

export { router as healthRouter }
