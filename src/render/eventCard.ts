import type { CalEvent } from '../types';

export interface EventCardOptions {
  onClick: (ev: CalEvent) => void;
  onEdit?: (ev: CalEvent) => void;
  onDelete?: (ev: CalEvent) => void;
}

export function createEventCard(ev: CalEvent, options: EventCardOptions): HTMLElement {
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

  if (options.onEdit || options.onDelete) {
    const actions = document.createElement('div');
    actions.className = 'event-card-actions';

    if (options.onEdit) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'event-action-btn';
      editBtn.setAttribute('aria-label', 'עריכת אירוע');
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onEdit?.(ev);
      });
      actions.appendChild(editBtn);
    }

    if (options.onDelete) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'event-action-btn event-action-delete';
      deleteBtn.setAttribute('aria-label', 'מחיקת אירוע');
      deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onDelete?.(ev);
      });
      actions.appendChild(deleteBtn);
    }

    card.appendChild(actions);
  }

  card.addEventListener('click', () => options.onClick(ev));
  return card;
}
