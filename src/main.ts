import './style.css';
import type { CalEvent } from './types';
import { loadEvents, saveEvents, createId } from './storage';
import { todayKey, timeToMinutes, minutesToTime } from './dateUtils';
import { DEFAULT_EVENT_COLOR } from './colors';
import { renderCalendar } from './render/calendar';
import { renderDayModal } from './render/dayModal';
import { renderAgenda } from './render/agenda';
import { renderSearchResults } from './render/search';
import { initColorPicker, setSelectedColor, getSelectedColor } from './render/colorPicker';
import { initDatePicker, type DatePicker } from './render/datePicker';
import { initTimePicker, type TimePicker } from './render/timePicker';
import { initMiniCalendar, type MiniCalendar } from './render/miniCalendar';
import { showToast } from './toast';

// ---------- State ----------
let events: CalEvent[] = loadEvents();
const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let selectedDateKey: string | null = null;
let editingEventId: string | null = null;
let defaultFormDate: string = todayKey();
let cameFromDayModal = false;
let formMode: 'single' | 'multi' = 'single';
let endManuallySet = false;

// ---------- Elements ----------
const prevBtn = document.getElementById('prev-month') as HTMLButtonElement;
const nextBtn = document.getElementById('next-month') as HTMLButtonElement;
const todayBtn = document.getElementById('today-btn') as HTMLButtonElement;
const fabAdd = document.getElementById('fab-add') as HTMLButtonElement;
const dayAddEventBtn = document.getElementById('day-add-event') as HTMLButtonElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

const eventForm = document.getElementById('event-form') as HTMLFormElement;
const evTitle = document.getElementById('ev-title') as HTMLInputElement;
const evNote = document.getElementById('ev-note') as HTMLInputElement;
const formTitle = document.getElementById('event-form-title') as HTMLElement;
const formError = document.getElementById('form-error') as HTMLElement;
const deleteBtn = document.getElementById('delete-event-btn') as HTMLButtonElement;
const calendarGrid = document.getElementById('calendar-grid') as HTMLElement;

const modeToggle = document.getElementById('mode-toggle') as HTMLElement;
const singleDateField = document.getElementById('single-date-field') as HTMLElement;
const multiDateField = document.getElementById('multi-date-field') as HTMLElement;
const dateReadable = document.getElementById('date-readable') as HTMLElement;
const multiDateCount = document.getElementById('multi-date-count') as HTMLElement;

// ---------- Pickers ----------
const datePicker: DatePicker = initDatePicker(
  document.getElementById('date-picker') as HTMLElement,
  dateReadable,
  () => formError.classList.add('hidden')
);

const startTimePicker: TimePicker = initTimePicker(
  document.getElementById('start-time-picker') as HTMLElement,
  '09:00',
  (value) => {
    formError.classList.add('hidden');
    if (!endManuallySet) {
      const newEnd = minutesToTime(timeToMinutes(value) + 60);
      endTimePicker.setTime(newEnd, true);
    }
  }
);

const endTimePicker: TimePicker = initTimePicker(
  document.getElementById('end-time-picker') as HTMLElement,
  '10:00',
  () => {
    endManuallySet = true;
    formError.classList.add('hidden');
  }
);

const miniCalendar: MiniCalendar = initMiniCalendar(
  document.getElementById('mini-calendar') as HTMLElement,
  (count) => {
    multiDateCount.textContent = count === 0
      ? 'לא נבחרו תאריכים'
      : `נבחרו ${count} תאריכים`;
    formError.classList.add('hidden');
  }
);

function computeDefaultStart(): string {
  const now = new Date();
  const rounded = Math.ceil(now.getMinutes() / 15) * 15;
  return minutesToTime(now.getHours() * 60 + rounded);
}

// ---------- Modal helpers ----------
function openModal(id: string): void {
  const el = document.getElementById(id) as HTMLElement;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const firstInput = el.querySelector<HTMLElement>('input, button.primary-btn');
  requestAnimationFrame(() => firstInput?.focus());
}

function closeModal(id: string): void {
  const el = document.getElementById(id) as HTMLElement;
  el.classList.add('hidden');
  const anyOpen = document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
  if (!anyOpen) document.body.style.overflow = '';
}

function dismissDayModal(): void {
  closeModal('day-modal');
  selectedDateKey = null;
  refresh();
}

function dismissEventForm(): void {
  closeModal('event-form-modal');
  if (cameFromDayModal && selectedDateKey) {
    openModal('day-modal');
  }
}

function handleDismiss(id: string): void {
  if (id === 'day-modal') { dismissDayModal(); return; }
  if (id === 'event-form-modal') { dismissEventForm(); return; }
  closeModal(id);
}

document.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => handleDismiss(btn.dataset.close as string));
});

document.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) handleDismiss(overlay.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll<HTMLElement>('.modal-overlay:not(.hidden)').forEach((overlay) => {
      handleDismiss(overlay.id);
    });
  }
});

// ---------- Rendering ----------
function refresh(): void {
  renderCalendar(viewYear, viewMonth, events, selectedDateKey, { onDayClick: openDayModal });
  renderAgenda(events, (ev) => {
    viewYear = Number(ev.date.slice(0, 4));
    viewMonth = Number(ev.date.slice(5, 7)) - 1;
    openDayModal(ev.date);
  });
  if (selectedDateKey) {
    renderDayModal(selectedDateKey, events, (ev) => openEventFormForEdit(ev));
  }
}

function openDayModal(dateKey: string): void {
  selectedDateKey = dateKey;
  refresh();
  openModal('day-modal');
}

// ---------- Event form ----------
function setFormMode(mode: 'single' | 'multi'): void {
  formMode = mode;
  modeToggle.querySelectorAll<HTMLElement>('.mode-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  singleDateField.classList.toggle('hidden', mode !== 'single');
  multiDateField.classList.toggle('hidden', mode !== 'multi');
  formError.classList.add('hidden');
}

modeToggle.querySelectorAll<HTMLElement>('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => setFormMode(btn.dataset.mode as 'single' | 'multi'));
});

function resetForm(): void {
  eventForm.reset();
  formError.classList.add('hidden');
  deleteBtn.classList.add('hidden');
  editingEventId = null;
  endManuallySet = false;
  setSelectedColor(DEFAULT_EVENT_COLOR);
  setFormMode('single');
}

function openEventFormForNew(dateKey: string, fromDayModal: boolean): void {
  resetForm();
  formTitle.textContent = 'אירוע חדש';
  cameFromDayModal = fromDayModal;
  modeToggle.classList.toggle('hidden', fromDayModal);
  closeModal('day-modal');
  openModal('event-form-modal');
  // pickers need real layout (not display:none) to auto-scroll to the selection
  datePicker.setDate(dateKey);
  const start = computeDefaultStart();
  startTimePicker.setTime(start, false);
  endTimePicker.setTime(minutesToTime(timeToMinutes(start) + 60), false);
  const [y, m] = dateKey.split('-').map(Number);
  miniCalendar.reset(y, m - 1);
}

function openEventFormForEdit(ev: CalEvent): void {
  resetForm();
  formTitle.textContent = 'עריכת אירוע';
  editingEventId = ev.id;
  evTitle.value = ev.title;
  evNote.value = ev.note ?? '';
  setSelectedColor(ev.color);
  deleteBtn.classList.remove('hidden');
  modeToggle.classList.add('hidden');
  cameFromDayModal = true;
  closeModal('day-modal');
  openModal('event-form-modal');
  datePicker.setDate(ev.date);
  startTimePicker.setTime(ev.startTime, false);
  endTimePicker.setTime(ev.endTime, false);
  endManuallySet = true;
}

initColorPicker(() => formError.classList.add('hidden'));

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = evTitle.value.trim();
  const start = startTimePicker.getTime();
  const end = endTimePicker.getTime();
  const note = evNote.value.trim();
  const color = getSelectedColor();

  if (!title) {
    formError.textContent = 'נא להזין שם לאירוע';
    formError.classList.remove('hidden');
    return;
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    formError.textContent = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה';
    formError.classList.remove('hidden');
    return;
  }

  if (formMode === 'multi' && !editingEventId) {
    const dates = miniCalendar.getSelected();
    if (dates.length === 0) {
      formError.textContent = 'בחרו לפחות תאריך אחד';
      formError.classList.remove('hidden');
      return;
    }
    for (const date of dates) {
      events.push({
        id: createId(),
        title,
        date,
        startTime: start,
        endTime: end,
        note: note || undefined,
        color,
      });
    }
    saveEvents(events);
    showToast(dates.length === 1 ? 'האירוע נוסף בהצלחה 🌸' : `${dates.length} אירועים נוספו בהצלחה 🌸`);
    const last = dates[dates.length - 1];
    viewYear = Number(last.slice(0, 4));
    viewMonth = Number(last.slice(5, 7)) - 1;
    closeModal('event-form-modal');
    refresh();
    return;
  }

  const date = datePicker.getDate();

  if (editingEventId) {
    const idx = events.findIndex((e2) => e2.id === editingEventId);
    if (idx !== -1) {
      events[idx] = { ...events[idx], title, date, startTime: start, endTime: end, note: note || undefined, color };
    }
    showToast('האירוע עודכן בהצלחה 🌸');
  } else {
    events.push({ id: createId(), title, date, startTime: start, endTime: end, note: note || undefined, color });
    showToast('האירוע נוסף בהצלחה 🌸');
  }

  saveEvents(events);
  viewYear = Number(date.slice(0, 4));
  viewMonth = Number(date.slice(5, 7)) - 1;
  selectedDateKey = date;
  closeModal('event-form-modal');
  refresh();
  if (cameFromDayModal) openModal('day-modal');
});

deleteBtn.addEventListener('click', () => {
  if (!editingEventId) return;
  if (!confirm('למחוק את האירוע הזה?')) return;
  const deletedDate = events.find((e) => e.id === editingEventId)?.date ?? selectedDateKey;
  events = events.filter((e) => e.id !== editingEventId);
  saveEvents(events);
  showToast('האירוע נמחק');
  selectedDateKey = deletedDate;
  closeModal('event-form-modal');
  refresh();
  if (cameFromDayModal) openModal('day-modal');
});

// ---------- Navigation ----------
prevBtn.addEventListener('click', () => {
  viewMonth -= 1;
  if (viewMonth < 0) {
    viewMonth = 11;
    viewYear -= 1;
  }
  refresh();
});

nextBtn.addEventListener('click', () => {
  viewMonth += 1;
  if (viewMonth > 11) {
    viewMonth = 0;
    viewYear += 1;
  }
  refresh();
});

todayBtn.addEventListener('click', () => {
  viewYear = today.getFullYear();
  viewMonth = today.getMonth();
  refresh();
});

// Swipe gesture for mobile month navigation
let touchStartX = 0;
calendarGrid.addEventListener('touchstart', (e) => {
  touchStartX = e.changedTouches[0].clientX;
}, { passive: true });

calendarGrid.addEventListener('touchend', (e) => {
  const deltaX = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(deltaX) < 45) return;
  if (deltaX < 0) nextBtn.click();
  else prevBtn.click();
}, { passive: true });

// ---------- Add event entry points ----------
fabAdd.addEventListener('click', () => {
  openEventFormForNew(selectedDateKey ?? defaultFormDate, false);
});

dayAddEventBtn.addEventListener('click', () => {
  if (selectedDateKey) openEventFormForNew(selectedDateKey, true);
});

// ---------- Search ----------
searchBtn.addEventListener('click', () => {
  openModal('search-modal');
  searchInput.value = '';
  renderSearchResults('', events, onSearchResultClick);
});

searchInput.addEventListener('input', () => {
  renderSearchResults(searchInput.value, events, onSearchResultClick);
});

function onSearchResultClick(ev: CalEvent): void {
  closeModal('search-modal');
  viewYear = Number(ev.date.slice(0, 4));
  viewMonth = Number(ev.date.slice(5, 7)) - 1;
  openDayModal(ev.date);
}

// ---------- Init ----------
refresh();
