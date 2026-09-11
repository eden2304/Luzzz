import type { CalEvent } from '../types';
import { formatDateKeyHuman, timeToMinutes } from '../dateUtils';
import { createEventCard } from './eventCard';

const titleEl = document.getElementById('day-modal-title') as HTMLElement;
const listEl = document.getElementById('day-events-list') as HTMLElement;

export function renderDayModal(
  dateKey: string,
  events: CalEvent[],
  onEventClick: (ev: CalEvent) => void
): void {
  titleEl.textContent = formatDateKeyHuman(dateKey);
  listEl.innerHTML = '';

  const dayEvents = events
    .filter((e) => e.date === dateKey)
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

  if (dayEvents.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'day-empty-state';
    empty.innerHTML = `<span class="empty-emoji">🌸</span>אין אירועים ביום הזה`;
    listEl.appendChild(empty);
    return;
  }

  for (const ev of dayEvents) {
    listEl.appendChild(createEventCard(ev, onEventClick));
  }
}
