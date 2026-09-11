import './style.css';
import type { CalEvent } from './types';
import { loadEvents, saveEvents, createId } from './storage';
import { todayKey, timeToMinutes } from './dateUtils';
import { DEFAULT_EVENT_COLOR } from './colors';
import { renderCalendar } from './render/calendar';
import { renderDayModal } from './render/dayModal';
import { renderAgenda } from './render/agenda';
import { renderSearchResults } from './render/search';
import { initColorPicker, setSelectedColor, getSelectedColor } from './render/colorPicker';
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
const evDate = document.getElementById('ev-date') as HTMLInputElement;
const evStart = document.getElementById('ev-start') as HTMLInputElement;
const evEnd = document.getElementById('ev-end') as HTMLInputElement;
const evNote = document.getElementById('ev-note') as HTMLInputElement;
const formTitle = document.getElementById('event-form-title') as HTMLElement;
const formError = document.getElementById('form-error') as HTMLElement;
const deleteBtn = document.getElementById('delete-event-btn') as HTMLButtonElement;
const calendarGrid = document.getElementById('calendar-grid') as HTMLElement;

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

document.querySelectorAll<HTMLElement>('[data-close]').forEach((btn) => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close as string));
});

document.querySelectorAll<HTMLElement>('.modal-overlay').forEach((overlay) => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll<HTMLElement>('.modal-overlay:not(.hidden)').forEach((overlay) => {
      closeModal(overlay.id);
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
function resetForm(): void {
  eventForm.reset();
  formError.classList.add('hidden');
  deleteBtn.classList.add('hidden');
  editingEventId = null;
  setSelectedColor(DEFAULT_EVENT_COLOR);
}

function openEventFormForNew(dateKey: string, fromDayModal: boolean): void {
  resetForm();
  formTitle.textContent = 'אירוע חדש';
  evDate.value = dateKey;
  cameFromDayModal = fromDayModal;
  closeModal('day-modal');
  openModal('event-form-modal');
}

function openEventFormForEdit(ev: CalEvent): void {
  resetForm();
  formTitle.textContent = 'עריכת אירוע';
  editingEventId = ev.id;
  evTitle.value = ev.title;
  evDate.value = ev.date;
  evStart.value = ev.startTime;
  evEnd.value = ev.endTime;
  evNote.value = ev.note ?? '';
  setSelectedColor(ev.color);
  deleteBtn.classList.remove('hidden');
  cameFromDayModal = true;
  closeModal('day-modal');
  openModal('event-form-modal');
}

initColorPicker(() => formError.classList.add('hidden'));

eventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const title = evTitle.value.trim();
  const date = evDate.value;
  const start = evStart.value;
  const end = evEnd.value;
  const note = evNote.value.trim();

  if (!title || !date || !start || !end) {
    formError.textContent = 'נא למלא את כל השדות החיוניים';
    formError.classList.remove('hidden');
    return;
  }
  if (timeToMinutes(end) <= timeToMinutes(start)) {
    formError.textContent = 'שעת הסיום חייבת להיות אחרי שעת ההתחלה';
    formError.classList.remove('hidden');
    return;
  }

  if (editingEventId) {
    const idx = events.findIndex((e2) => e2.id === editingEventId);
    if (idx !== -1) {
      events[idx] = {
        ...events[idx],
        title,
        date,
        startTime: start,
        endTime: end,
        note: note || undefined,
        color: getSelectedColor(),
      };
    }
    showToast('האירוע עודכן בהצלחה 🌸');
  } else {
    events.push({
      id: createId(),
      title,
      date,
      startTime: start,
      endTime: end,
      note: note || undefined,
      color: getSelectedColor(),
    });
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
