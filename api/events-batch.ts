import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool, isValidEvent, withErrorHandling } from './_db';

export default withErrorHandling(async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const events = req.body?.events;
  if (!Array.isArray(events) || events.length === 0 || !events.every(isValidEvent)) {
    res.status(400).json({ error: 'Invalid events payload' });
    return;
  }

  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const ev of events) {
      await client.query(
        `INSERT INTO events (id, title, date, start_time, end_time, color, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ev.id, ev.title, ev.date, ev.startTime, ev.endTime, ev.color, ev.note ?? null]
      );
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json({ ok: true, count: events.length });
});
