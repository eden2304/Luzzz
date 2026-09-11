import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';

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
}

export function toApiEvent(row: EventRow): ApiEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    color: row.color,
    note: row.note ?? undefined,
  };
}

export function withErrorHandling(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
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
    (e.note === undefined || typeof e.note === 'string')
  );
}
