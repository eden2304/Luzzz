import type { Request, Response } from 'express';
import { Pool } from 'pg';
import { isReminderOffsetType, type ReminderOffsetType } from './reminderTypes.js';

export interface ReminderSpec {
  type: ReminderOffsetType;
  minutesBefore?: number;
}

function isValidReminderSpec(value: unknown): value is ReminderSpec {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  if (!isReminderOffsetType(r.type)) return false;
  if (r.type === 'minutes_before') {
    return typeof r.minutesBefore === 'number' && Number.isInteger(r.minutesBefore) && r.minutesBefore > 0;
  }
  return true;
}

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Missing DATABASE_URL (or POSTGRES_URL) environment variable');
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export interface EventRow {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  color: string;
  note: string | null;
}

export interface ApiEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  note?: string;
  reminders?: ReminderSpec[];
}

export function toApiEvent(row: EventRow, reminders: ReminderSpec[] = []): ApiEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    color: row.color,
    note: row.note ?? undefined,
    reminders,
  };
}

export function withErrorHandling(
  handler: (req: Request, res: Response) => Promise<void>
) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  };
}

export function isValidEvent(body: unknown): body is ApiEvent {
  if (!body || typeof body !== 'object') return false;
  const e = body as Record<string, unknown>;
  return (
    typeof e.id === 'string' && e.id.length > 0 &&
    typeof e.title === 'string' && e.title.trim().length > 0 &&
    typeof e.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.startTime === 'string' && /^\d{2}:\d{2}$/.test(e.startTime) &&
    typeof e.endTime === 'string' && /^\d{2}:\d{2}$/.test(e.endTime) &&
    typeof e.color === 'string' && e.color.length > 0 &&
    (e.note === undefined || typeof e.note === 'string') &&
    (e.reminders === undefined ||
      (Array.isArray(e.reminders) && e.reminders.every(isValidReminderSpec)))
  );
}
