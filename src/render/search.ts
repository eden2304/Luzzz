import type { CalEvent } from '../types';
import { formatDateKeyHuman, timeToMinutes } from '../dateUtils';
import { createEventCard } from './eventCard';

const resultsEl = document.getElementById('search-results') as HTMLElement;

export function renderSearchResults(
  query: string,
  events: CalEvent[],
  onEventClick: (ev: CalEvent) => void
): void {
  resultsEl.innerHTML = '';
  const q = query.trim().toLowerCase();

  if (!q) {
    const empty = document.createElement('div');
    empty.className = 'day-empty-state';
    empty.innerHTML = `<span class="empty-emoji">🔍</span>הקלידו כדי לחפש אירועים`;
    resultsEl.appendChild(empty);
    return;
  }

  const matches = events
    .filter((e) => e.title.toLowerCase().includes(q) || (e.note ?? '').toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    });

  if (matches.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'day-empty-state';
    empty.innerHTML = `<span class="empty-emoji">🙈</span>לא נמצאו אירועים תואמים`;
    resultsEl.appendChild(empty);
    return;
  }

  for (const ev of matches) {
    const card = createEventCard(ev, { onClick: onEventClick });
    const body = card.querySelector('.event-card-body') as HTMLElement;
    const dateLine = document.createElement('div');
    dateLine.className = 'event-card-note';
    dateLine.textContent = formatDateKeyHuman(ev.date);
    body.insertBefore(dateLine, body.children[1] ?? null);
    resultsEl.appendChild(card);
  }
}
