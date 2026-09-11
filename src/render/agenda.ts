import type { CalEvent } from '../types';
import { formatDateShort, timeToMinutes, todayKey } from '../dateUtils';

const listEl = document.getElementById('agenda-list') as HTMLElement;

export function renderAgenda(events: CalEvent[], onItemClick: (ev: CalEvent) => void): void {
  listEl.innerHTML = '';
  const t = todayKey();

  const upcoming = events
    .filter((e) => e.date >= t)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
    })
    .slice(0, 12);

  if (upcoming.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'agenda-empty';
    empty.textContent = 'אין אירועים קרובים 🌷';
    listEl.appendChild(empty);
    return;
  }

  for (const ev of upcoming) {
    const item = document.createElement('div');
    item.className = 'agenda-item';

    const bar = document.createElement('span');
    bar.className = 'agenda-color-bar';
    bar.style.background = ev.color;
    item.appendChild(bar);

    const text = document.createElement('div');
    text.className = 'agenda-item-text';
    text.innerHTML = `
      <span class="agenda-item-title"></span>
      <span class="agenda-item-meta"></span>
    `;
    (text.querySelector('.agenda-item-title') as HTMLElement).textContent = ev.title;
    (text.querySelector('.agenda-item-meta') as HTMLElement).textContent =
      `${formatDateShort(ev.date)} · ${ev.startTime}`;
    item.appendChild(text);

    item.addEventListener('click', () => onItemClick(ev));
    listEl.appendChild(item);
  }
}
