import { Router } from 'express';
import { getPool, toApiEvent, isValidEvent, withErrorHandling, type EventRow } from '../db.js';

export const eventsRouter = Router();

eventsRouter.get('/api/events', withErrorHandling(async (req, res) => {
  const pool = getPool();
  const { rows } = await pool.query<EventRow>(
    'SELECT * FROM events ORDER BY date ASC, start_time ASC'
  );
  res.status(200).json(rows.map(toApiEvent));
}));

eventsRouter.post('/api/events', withErrorHandling(async (req, res) => {
  if (!isValidEvent(req.body)) {
    res.status(400).json({ error: 'Invalid event payload' });
    return;
  }
  const { id, title, date, startTime, endTime, color, note, remindDayBefore } = req.body;
  const pool = getPool();
  await pool.query(
    `INSERT INTO events (id, title, date, start_time, end_time, color, note, remind_day_before)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, title, date, startTime, endTime, color, note ?? null, remindDayBefore ?? false]
  );
  res.status(201).json({ ok: true, id });
}));

eventsRouter.put('/api/events/:id', withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const { title, date, startTime, endTime, color, note, remindDayBefore } = req.body ?? {};
  if (!title || !date || !startTime || !endTime || !color) {
    res.status(400).json({ error: 'Invalid event payload' });
    return;
  }
  const pool = getPool();
  const result = await pool.query(
    `UPDATE events
     SET title = $1, date = $2, start_time = $3, end_time = $4, color = $5, note = $6,
         remind_day_before = $7, reminder_sent_at = NULL
     WHERE id = $8`,
    [title, date, startTime, endTime, color, note ?? null, remindDayBefore ?? false, id]
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.status(200).json({ ok: true });
}));

eventsRouter.delete('/api/events/:id', withErrorHandling(async (req, res) => {
  const { id } = req.params;
  const pool = getPool();
  await pool.query('DELETE FROM events WHERE id = $1', [id]);
  res.status(200).json({ ok: true });
}));

eventsRouter.post('/api/events-batch', withErrorHandling(async (req, res) => {
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
        `INSERT INTO events (id, title, date, start_time, end_time, color, note, remind_day_before)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [ev.id, ev.title, ev.date, ev.startTime, ev.endTime, ev.color, ev.note ?? null, ev.remindDayBefore ?? false]
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
}));
