import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/_health', (req, res) => {
  res.status(200).json({ ok: true });
});

export { router as healthRouter };