import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPool, withErrorHandling } from '../_db';

export default withErrorHandling(async function handler(req: VercelRequest, res: VercelResponse) {
  const id = typeof req.query.id === 'string' ? req.query.id : undefined;
  if (!id) {
    res.status(400).json({ error: 'Missing id' });
    return;
  }

  const pool = getPool();

  if (req.method === 'PUT') {
    const { title, date, startTime, endTime, color, note } = req.body ?? {};
    if (!title || !date || !startTime || !endTime || !color) {
      res.status(400).json({ error: 'Invalid event payload' });
      return;
    }
    const result = await pool.query(
      `UPDATE events
       SET title = $1, date = $2, start_time = $3, end_time = $4, color = $5, note = $6
       WHERE id = $7`,
      [title, date, startTime, endTime, color, note ?? null, id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Allow', 'PUT, DELETE');
  res.status(405).json({ error: 'Method not allowed' });
});
