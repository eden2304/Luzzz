import type { CalEvent } from '../types';

export function createEventCard(ev: CalEvent, onClick: (ev: CalEvent) => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'day-event-card';

  const bar = document.createElement('span');
  bar.className = 'event-color-bar';
  bar.style.background = ev.color;
  card.appendChild(bar);

  const body = document.createElement('div');
  body.className = 'event-card-body';

  const title = document.createElement('div');
  title.className = 'event-card-title';
  title.textContent = ev.title;
  body.appendChild(title);

  const time = document.createElement('div');
  time.className = 'event-card-time';
  time.textContent = `${ev.startTime} – ${ev.endTime}`;
  body.appendChild(time);

  if (ev.note) {
    const note = document.createElement('div');
    note.className = 'event-card-note';
    note.textContent = ev.note;
    body.appendChild(note);
  }

  card.appendChild(body);
  card.addEventListener('click', () => onClick(ev));
  return card;
}
