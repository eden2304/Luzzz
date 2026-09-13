import './style.css';
import type { CalEvent } from './types';
import { fetchEvents, createEvent, createEventsBatch, updateEvent, deleteEvent, createId } from './storage';
import { todayKey, timeToMinutes, minutesToTime, formatDateKeyHuman } from './dateUtils';
import { DEFAULT_EVENT_COLOR } from './colors';
import { renderCalendar } from './render/calendar';
import { renderDayModal } from './render/dayModal';
import { renderAgenda } from './render/agenda';
import { renderSearchResults } from './render/search';
import { initColorPicker, setSelectedColor, getSelectedColor } from './render/colorPicker';
import { initDatePicker, type DatePicker } from './render/datePicker';
import { initTimePicker, type TimePicker } from './render/timePicker';
import { initMiniCalendar, type MiniCalendar } from './render/miniCalendar';
import { initReminderPicker, type ReminderPicker } from './render/reminderPicker';
import { showToast } from './toast';
import { isPushSupported, getNotificationPermission, enablePushNotifications, syncPushSubscriptionIfGranted } from './push';

// ---------- State ----------
let events: CalEvent[] = [];
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
const reminderPicker: ReminderPicker = initReminderPicker(
  document.getElementById('reminder-picker') as HTMLElement,
  () => formError.classList.add('hidden')
);
const formTitle = document.getElementById('event-form-title') as HTMLElement;
const formError = document.getElementById('form-error') as HTMLElement;
const deleteBtn = document.getElementById('delete-event-btn') as HTMLButtonElement;
const calendarGrid = document.getElementById('calendar-grid') as HTMLElement;

const syncBanner = document.getElementById('sync-banner') as HTMLButtonElement;
const notifBanner = document.getElementById('notif-banner') as HTMLButtonElement;

const detailsTitle = document.getElementById('details-title') as HTMLElement;
const detailsColor = document.getElementById('details-color') as HTMLElement;
const detailsTime = document.getElementById('details-time') as HTMLElement;
const detailsDate = document.getElementById('details-date') as HTMLElement;
const detailsNote = document.getElementById('details-note') as HTMLElement;

const confirmMessage = document.getElementById('confirm-message') as HTMLElement;
const confirmCancelBtn = document.getElementById('confirm-cancel-btn') as HTMLButtonElement;
const confirmOkBtn = document.getElementById('confirm-ok-btn') as HTMLButtonElement;

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
      const newEndMinutes = Math.min(timeToMinutes(value) + 60, 23 * 60 + 45);
      endTimePicker.setTime(minutesToTime(newEndMinutes), true);
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

// ---------- Sync with the server ----------
function showLoadingBanner(): void {
  syncBanner.textContent = 'טוען אירועים…';
  syncBanner.className = 'sync-banner loading';
}

function showErrorBanner(): void {
  syncBanner.textContent = 'שגיאה בטעינת האירועים — לחצו לנסות שוב';
  syncBanner.className = 'sync-banner error';
}

function hideBanner(): void {
  syncBanner.className = 'sync-banner hidden';
}

async function loadInitialEvents(): Promise<void> {
  showLoadingBanner();
  try {
    events = await fetchEvents();
    hideBanner();
  } catch (err) {
    console.error(err);
    showErrorBanner();
  }
  refresh();
}

syncBanner.addEventListener('click', () => {
  if (syncBanner.classList.contains('error')) loadInitialEvents();
});

/** Fires an API call in the background after an optimistic local update; rolls back on failure. */
function syncInBackground(promise: Promise<void>, rollback: () => void): void {
  promise.catch((err) => {
    console.error(err);
    rollback();
    refresh();
    showToast('שגיאה בסנכרון — נסו שוב 😕');
  });
}

// ---------- Push notifications ----------
const NOTIF_DISMISSED_KEY = 'luzzz.notifBannerDismissed';

function initNotificationBanner(): void {
  if (!isPushSupported()) return;
  if (getNotificationPermission() !== 'default') return;
  if (localStorage.getItem(NOTIF_DISMISSED_KEY)) return;
  notifBanner.classList.remove('hidden');
}

notifBanner.addEventListener('click', async () => {
  notifBanner.classList.add('hidden');
  localStorage.setItem(NOTIF_DISMISSED_KEY, '1');
  const ok = await enablePushNotifications();
  showToast(ok ? 'התראות הופעלו 🔔' : 'לא הצלחנו להפעיל התראות');
});

// ---------- Modal helpers ----------
function openModal(id: string, autofocus = true): void {
  const el = document.getElementById(id) as HTMLElement;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  if (autofocus) {
    const firstInput = el.querySelector<HTMLElement>('input, button.primary-btn');
    requestAnimationFrame(() => firstInput?.focus());
  }
}

/**
 * Lets the sheet be dragged down to dismiss, like a native bottom sheet. Only takes over
 * once the sheet is already scrolled to its top (so it doesn't fight normal scrolling of
 * the form content) and once the drag is clearly more vertical than horizontal (so it
 * doesn't fight the horizontal chip scrollers for date/color/reminders, which don't stop
 * propagation the way the wheel time picker and day-chips do).
 */
function enableSwipeToDismiss(sheet: HTMLElement, onDismiss: () => void): void {
  let startX = 0;
  let startY = 0;
  let lastY = 0;
  let dragging = false;

  sheet.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    lastY = startY;
    dragging = false;
  }, { passive: true });

  sheet.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 1 || sheet.scrollTop > 0) return;
    lastY = e.touches[0].clientY;
    const deltaX = e.touches[0].clientX - startX;
    const deltaY = lastY - startY;
    if (!dragging) {
      if (deltaY < 8 || Math.abs(deltaX) > Math.abs(deltaY)) return;
      dragging = true;
      sheet.style.transition = 'none';
    }
    e.preventDefault();
    sheet.style.transform = `translateY(${deltaY}px)`;
  }, { passive: false });

  sheet.addEventListener('touchend', () => {
    if (!dragging) return;
    dragging = false;
    const deltaY = lastY - startY;
    sheet.style.transition = 'transform 0.22s ease';
    if (deltaY > 90) {
      sheet.style.transform = 'translateY(100%)';
      setTimeout(() => {
        sheet.style.transition = '';
        sheet.style.transform = '';
        onDismiss();
      }, 200);
    } else {
      sheet.style.transform = 'translateY(0)';
      setTimeout(() => { sheet.style.transition = ''; }, 220);
    }
  });
}

function closeModal(id: string): void {
  const el = document.getElementById(id) as HTMLElement;
  el.classList.add('hidden');
  const anyOpen = document.querySelectorAll('.modal-overlay:not(.hidden)').length > 0;
  if (!anyOpen) document.body.style.overflow = '';
}

function showConfirmModal(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    confirmMessage.textContent = message;
    const modalEl = document.getElementById('confirm-modal') as HTMLElement;
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) return;
      settled = true;
      confirmOkBtn.removeEventListener('click', onOk);
      confirmCancelBtn.removeEventListener('click', onCancel);
      observer.disconnect();
      resolve(result);
    };
    const onOk = () => { closeModal('confirm-modal'); finish(true); };
    const onCancel = () => { closeModal('confirm-modal'); finish(false); };

    // catches dismissal via backdrop click / Escape / any other generic close path
    const observer = new MutationObserver(() => {
      if (modalEl.classList.contains('hidden')) finish(false);
    });
    observer.observe(modalEl, { attributes: true, attributeFilter: ['class'] });

    confirmOkBtn.addEventListener('click', onOk);
    confirmCancelBtn.addEventListener('click', onCancel);
    openModal('confirm-modal');
    requestAnimationFrame(() => confirmCancelBtn.focus());
  });
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
    // only the topmost stacked modal (later in DOM = visually on top) — not every open one
    const openOverlays = document.querySelectorAll<HTMLElement>('.modal-overlay:not(.hidden)');
    const topmost = openOverlays[openOverlays.length - 1];
    if (topmost) handleDismiss(topmost.id);
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
    renderDayModal(selectedDateKey, events, {
      onOpenDetails: openEventDetails,
      onEdit: (ev) => openEventFormForEdit(ev),
      onDelete: (ev) => deleteEventById(ev.id, { fromEventForm: false }),
    });
  }
}

function openDayModal(dateKey: string): void {
  selectedDateKey = dateKey;
  refresh();
  openModal('day-modal');
}

function openEventDetails(ev: CalEvent): void {
  detailsTitle.textContent = ev.title;
  detailsColor.style.background = ev.color;
  detailsTime.textContent = `${ev.startTime} – ${ev.endTime}`;
  detailsDate.textContent = formatDateKeyHuman(ev.date);
  if (ev.note) {
    detailsNote.textContent = ev.note;
    detailsNote.classList.remove('hidden');
  } else {
    detailsNote.classList.add('hidden');
  }
  openModal('event-details-modal');
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
  reminderPicker.setSelected([]);
  setSelectedColor(DEFAULT_EVENT_COLOR);
  setFormMode('single');
}

function openEventFormForNew(dateKey: string, fromDayModal: boolean): void {
  resetForm();
  formTitle.textContent = 'אירוע חדש';
  cameFromDayModal = fromDayModal;
  modeToggle.classList.toggle('hidden', fromDayModal);
  closeModal('day-modal');
  openModal('event-form-modal', false);
  // pickers need real layout (not display:none) to auto-scroll to the selection
  datePicker.setDate(dateKey);
  const start = computeDefaultStart();
  startTimePicker.setTime(start, false);
  const defaultEndMinutes = Math.min(timeToMinutes(start) + 60, 23 * 60 + 45);
  endTimePicker.setTime(minutesToTime(defaultEndMinutes), false);
  const [y, m] = dateKey.split('-').map(Number);
  miniCalendar.reset(y, m - 1);
}

function openEventFormForEdit(ev: CalEvent): void {
  resetForm();
  formTitle.textContent = 'עריכת אירוע';
  editingEventId = ev.id;
  evTitle.value = ev.title;
  evNote.value = ev.note ?? '';
  reminderPicker.setSelected(ev.reminders ?? []);
  setSelectedColor(ev.color);
  deleteBtn.classList.remove('hidden');
  modeToggle.classList.add('hidden');
  cameFromDayModal = true;
  closeModal('day-modal');
  openModal('event-form-modal', false);
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
  const reminders = reminderPicker.getSelected();

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
    const newEvents: CalEvent[] = dates.map((date) => ({
      id: createId(),
      title,
      date,
      startTime: start,
      endTime: end,
      note: note || undefined,
      color,
      reminders,
    }));
    events.push(...newEvents);
    showToast(dates.length === 1 ? 'האירוע נוסף בהצלחה 🌸' : `${dates.length} אירועים נוספו בהצלחה 🌸`);
    const last = dates[dates.length - 1];
    viewYear = Number(last.slice(0, 4));
    viewMonth = Number(last.slice(5, 7)) - 1;
    closeModal('event-form-modal');
    refresh();
    syncInBackground(createEventsBatch(newEvents), () => {
      const ids = new Set(newEvents.map((ev) => ev.id));
      events = events.filter((ev) => !ids.has(ev.id));
    });
    return;
  }

  const date = datePicker.getDate();

  if (editingEventId) {
    const idx = events.findIndex((e2) => e2.id === editingEventId);
    if (idx !== -1) {
      const previous = events[idx];
      const updated: CalEvent = { ...previous, title, date, startTime: start, endTime: end, note: note || undefined, color, reminders };
      events[idx] = updated;
      showToast('האירוע עודכן בהצלחה 🌸');
      syncInBackground(updateEvent(updated), () => {
        const i2 = events.findIndex((e2) => e2.id === updated.id);
        if (i2 !== -1) events[i2] = previous;
      });
    }
  } else {
    const newEvent: CalEvent = { id: createId(), title, date, startTime: start, endTime: end, note: note || undefined, color, reminders };
    events.push(newEvent);
    showToast('האירוע נוסף בהצלחה 🌸');
    syncInBackground(createEvent(newEvent), () => {
      events = events.filter((ev) => ev.id !== newEvent.id);
    });
  }

  viewYear = Number(date.slice(0, 4));
  viewMonth = Number(date.slice(5, 7)) - 1;
  selectedDateKey = date;
  closeModal('event-form-modal');
  refresh();
  if (cameFromDayModal) openModal('day-modal');
});

async function deleteEventById(id: string, options: { fromEventForm: boolean }): Promise<void> {
  const removed = events.find((e) => e.id === id);
  if (!removed) return;
  const confirmed = await showConfirmModal(`למחוק את "${removed.title}"?`);
  if (!confirmed) return;
  events = events.filter((e) => e.id !== id);
  showToast('האירוע נמחק');
  selectedDateKey = removed.date;
  if (options.fromEventForm) closeModal('event-form-modal');
  refresh();
  if (options.fromEventForm && cameFromDayModal) openModal('day-modal');
  syncInBackground(deleteEvent(removed.id), () => {
    events.push(removed);
  });
}

deleteBtn.addEventListener('click', () => {
  if (!editingEventId) return;
  deleteEventById(editingEventId, { fromEventForm: true });
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
  // without this, the browser still synthesizes a click after touchend; by the time it
  // fires the month has already changed, so it lands on whatever day-cell is now at that
  // same screen position and opens/selects it as a ghost tap
  e.preventDefault();
  if (deltaX < 0) prevBtn.click();
  else nextBtn.click();
}, { passive: false });

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
loadInitialEvents();
initNotificationBanner();
syncPushSubscriptionIfGranted();
enableSwipeToDismiss(
  document.querySelector('#event-form-modal .modal-sheet') as HTMLElement,
  dismissEventForm
);
