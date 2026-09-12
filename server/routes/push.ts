import { Router } from 'express';
import { getPool, withErrorHandling } from '../db.js';

export const pushRouter = Router();

pushRouter.post('/api/push/subscribe', withErrorHandling(async (req, res) => {
  const endpoint = req.body?.endpoint;
  const p256dh = req.body?.keys?.p256dh;
  const auth = req.body?.keys?.auth;

  if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
    res.status(400).json({ error: 'Invalid subscription payload' });
    return;
  }

  const pool = getPool();
  await pool.query(
    `INSERT INTO push_subscriptions (endpoint, p256dh, auth)
     VALUES ($1, $2, $3)
     ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
    [endpoint, p256dh, auth]
  );

  res.status(201).json({ ok: true });
}));
