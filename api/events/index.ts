import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool, toApiEvent, isValidEvent, withErrorHandling, type EventRow } from '../_db.js';

export default withErrorHandling(async function handler(req: VercelRequest, res: VercelResponse) {
  const pool = getPool();

  if (req.method === 'GET') {
    const { rows } = await pool.query<EventRow>(
      'SELECT * FROM events ORDER BY date ASC, start_time ASC'
    );
    res.status(200).json(rows.map(toApiEvent));
    return;
  }

  if (req.method === 'POST') {
    if (!isValidEvent(req.body)) {
      res.status(400).json({ error: 'Invalid event payload' });
      return;
    }
    const { id, title, date, startTime, endTime, color, note, remindDayBefore } = req.body;
    await pool.query(
      `INSERT INTO events (id, title, date, start_time, end_time, color, note, remind_day_before)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, title, date, startTime, endTime, color, note ?? null, remindDayBefore ?? false]
    );
    res.status(201).json({ ok: true, id });
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Method not allowed' });
});
