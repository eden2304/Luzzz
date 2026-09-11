import type { CalEvent } from './types';

const API_BASE = '/api/events';

async function checkOk(res: Response, action: string): Promise<void> {
  if (!res.ok) {
    throw new Error(`${action} failed (${res.status})`);
  }
}

export async function fetchEvents(): Promise<CalEvent[]> {
  const res = await fetch(API_BASE);
  await checkOk(res, 'Loading events');
  return res.json();
}

export async function createEvent(event: CalEvent): Promise<void> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  await checkOk(res, 'Creating event');
}

export async function createEventsBatch(events: CalEvent[]): Promise<void> {
  const res = await fetch('/api/events-batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events }),
  });
  await checkOk(res, 'Creating events');
}

export async function updateEvent(event: CalEvent): Promise<void> {
  const res = await fetch(`${API_BASE}/${event.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  await checkOk(res, 'Updating event');
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
  await checkOk(res, 'Deleting event');
}

export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
