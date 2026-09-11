import type { CalEvent } from '../types';
import { formatDateKeyHuman, timeToMinutes } from '../dateUtils';
import { getHolidayName } from '../holidays';
import { createEventCard } from './eventCard';

const titleEl = document.getElementById('day-modal-title') as HTMLElement;
const listEl = document.getElementById('day-events-list') as HTMLElement;

export interface DayModalCallbacks {
  onOpenDetails: (ev: CalEvent) => void;
  onEdit: (ev: CalEvent) => void;
  onDelete: (ev: CalEvent) => void;
}

export function renderDayModal(
  dateKey: string,
  events: CalEvent[],
  callbacks: DayModalCallbacks
): void {
  titleEl.textContent = formatDateKeyHuman(dateKey);
  listEl.innerHTML = '';

  const holidayName = getHolidayName(dateKey);
  if (holidayName) {
    const banner = document.createElement('div');
    banner.className = 'holiday-banner';
    banner.innerHTML = `<span class="holiday-banner-icon">✡️</span>${holidayName}`;
    listEl.appendChild(banner);
  }

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
    listEl.appendChild(createEventCard(ev, {
      onClick: callbacks.onOpenDetails,
      onEdit: callbacks.onEdit,
      onDelete: callbacks.onDelete,
    }));
  }
}
