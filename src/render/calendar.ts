import { buildMonthGrid, HEBREW_MONTHS, HEBREW_WEEKDAYS_SHORT, timeToMinutes } from '../dateUtils';
import { getHolidayName } from '../holidays';
import type { CalEvent } from '../types';

const weekdayRow = document.getElementById('weekday-row') as HTMLElement;
const grid = document.getElementById('calendar-grid') as HTMLElement;
const monthLabel = document.getElementById('month-label') as HTMLElement;

let initialized = false;

function ensureWeekdayRow(): void {
  if (initialized) return;
  weekdayRow.innerHTML = HEBREW_WEEKDAYS_SHORT.map(
    (d) => `<div class="weekday-cell">${d}</div>`
  ).join('');
  initialized = true;
}

export interface CalendarCallbacks {
  onDayClick: (dateKey: string) => void;
}

export function renderCalendar(
  year: number,
  month: number,
  events: CalEvent[],
  selectedDateKey: string | null,
  callbacks: CalendarCallbacks
): void {
  ensureWeekdayRow();
  monthLabel.textContent = `${HEBREW_MONTHS[month]} ${year}`;

  const cells = buildMonthGrid(year, month);
  const eventsByDate = new Map<string, CalEvent[]>();
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? [];
    list.push(ev);
    eventsByDate.set(ev.date, list);
  }
  for (const list of eventsByDate.values()) {
    list.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }

  grid.innerHTML = '';
  const frag = document.createDocumentFragment();

  for (const cell of cells) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'day-cell';
    if (!cell.inCurrentMonth) btn.classList.add('muted');
    if (cell.isToday) btn.classList.add('is-today');
    if (cell.dateKey === selectedDateKey) btn.classList.add('is-selected');

    const dayEvents = eventsByDate.get(cell.dateKey) ?? [];

    const num = document.createElement('span');
    num.className = 'day-number';
    num.textContent = String(cell.day);
    btn.appendChild(num);

    const holidayName = getHolidayName(cell.dateKey);
    if (holidayName) {
      const holidayEl = document.createElement('span');
      holidayEl.className = 'holiday-label';
      holidayEl.textContent = holidayName;
      btn.appendChild(holidayEl);
    }

    if (dayEvents.length > 0) {
      const dots = document.createElement('div');
      dots.className = 'day-dots';
      for (const ev of dayEvents.slice(0, 4)) {
        const dot = document.createElement('span');
        dot.className = 'day-dot';
        dot.style.background = ev.color;
        dots.appendChild(dot);
      }
      btn.appendChild(dots);

      const chips = document.createElement('div');
      chips.className = 'day-chips';
      for (const ev of dayEvents.slice(0, 2)) {
        const chip = document.createElement('span');
        chip.className = 'day-chip';
        chip.style.background = ev.color;
        chip.textContent = ev.title;
        chips.appendChild(chip);
      }
      if (dayEvents.length > 2) {
        const more = document.createElement('span');
        more.className = 'day-chip-more';
        more.textContent = `+${dayEvents.length - 2} עוד`;
        chips.appendChild(more);
      }
      btn.appendChild(chips);
    }

    btn.addEventListener('click', () => callbacks.onDayClick(cell.dateKey));
    frag.appendChild(btn);
  }

  grid.appendChild(frag);
}
