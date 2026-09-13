import { Router } from 'express';
import type { Pool, PoolClient } from 'pg';
import { getPool, toApiEvent, isValidEvent, withErrorHandling, type EventRow, type ReminderSpec } from '../db.js';
import { computeTriggerAt } from '../reminderTypes.js';

export const eventsRouter = Router();

async function setReminders(
  db: Pool | PoolClient,
  eventId: string,
  reminders: ReminderSpec[],
  date: string,
  startTime: string
): Promise<void> {
  await db.query('DELETE FROM reminders WHERE event_id = $1', [eventId]);
  for (const reminder of reminders) {
    const triggerAt = computeTriggerAt(reminder.type, date, startTime, reminder.minutesBefore);
    await db.query(
      'INSERT INTO reminders (event_id, offset_type, minutes_before, trigger_at) VALUES ($1, $2, $3, $4)',
      [eventId, reminder.type, reminder.minutesBefore ?? null, triggerAt]
    );
  }
}

eventsRouter.get('/api/events', withErrorHandling(async (req, res) => {
  const pool = getPool();
  const { rows: eventRows } = await pool.query<EventRow>(
    'SELECT * FROM events ORDER BY date ASC, start_time ASC'
  );
  const { rows: reminderRows } = await pool.query<{ event_id: string } & ReminderSpec>(
    'SELECT event_id, offset_type AS type, minutes_before AS "minutesBefore" FROM reminders'
  );
  const remindersByEvent = new Map<string, ReminderSpec[]>();
  for (const r of reminderRows) {
    const list = remindersByEvent.get(r.event_id) ?? [];
    list.push({ type: r.type, minutesBefore: r.minutesBefore ?? undefined });
    remindersByEvent.set(r.event_id, list);
  }
  res.status(200).json(eventRows.map((row) => toApiEvent(row, remindersByEvent.get(row.id) ?? [])));
}));

eventsRouter.post('/api/events', withErrorHandling(async (req, res) => {
  if (!isValidEvent(req.body)) {
    res.status(400).json({ error: 'Invalid event payload' });
    return;
  }
  const { id, title, date, startTime, endTime, color, note, reminders } = req.body;
  const pool = getPool();
  await pool.query(
    `INSERT INTO events (id, title, date, start_time, end_time, color, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [id, title, date, startTime, endTime, color, note ?? null]
  );
  await setReminders(pool, id, reminders ?? [], date, startTime);
  res.status(201).json({ ok: true, id });
}));

eventsRouter.put('/api/events/:id', withErrorHandling(async (req, res) => {
  const id = req.params.id as string;
  const { title, date, startTime, endTime, color, note, reminders } = req.body ?? {};
  if (!title || !date || !startTime || !endTime || !color) {
    res.status(400).json({ error: 'Invalid event payload' });
    return;
  }
  const pool = getPool();
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
  await setReminders(pool, id, reminders ?? [], date, startTime);
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
        `INSERT INTO events (id, title, date, start_time, end_time, color, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [ev.id, ev.title, ev.date, ev.startTime, ev.endTime, ev.color, ev.note ?? null]
      );
      await setReminders(client, ev.id, ev.reminders ?? [], ev.date, ev.startTime);
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
