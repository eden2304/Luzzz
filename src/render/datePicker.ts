import { addDays, dateToKey, formatDateKeyHuman, parseDateKey, todayKey, HEBREW_WEEKDAYS_SHORT, HEBREW_MONTHS } from '../dateUtils';
import { createChipScroller, type ChipScroller, type ChipItem } from './chipScroller';

const PAST_BUFFER_DAYS = 14;
const FUTURE_BUFFER_DAYS = 90;

function buildRange(centerKey: string): ChipItem[] {
  const today = parseDateKey(todayKey());
  const center = parseDateKey(centerKey);

  let start = addDays(today, -PAST_BUFFER_DAYS);
  let end = addDays(today, FUTURE_BUFFER_DAYS);
  if (center < start) start = addDays(center, -3);
  if (center > end) end = addDays(center, 3);

  const items: ChipItem[] = [];
  let cursor = start;
  while (cursor <= end) {
    const key = dateToKey(cursor);
    const isFirstOfMonth = cursor.getDate() === 1;
    items.push({
      value: key,
      line1: HEBREW_WEEKDAYS_SHORT[cursor.getDay()],
      line2: String(cursor.getDate()),
      marker: isFirstOfMonth ? HEBREW_MONTHS[cursor.getMonth()] : undefined,
    });
    cursor = addDays(cursor, 1);
  }
  return items;
}

export interface DatePicker {
  setDate: (dateKey: string) => void;
  getDate: () => string;
}

export function initDatePicker(
  container: HTMLElement,
  readableEl: HTMLElement,
  onChange: (dateKey: string) => void
): DatePicker {
  let scroller: ChipScroller | null = null;

  function render(dateKey: string): void {
    const items = buildRange(dateKey);
    if (!scroller) {
      scroller = createChipScroller(container, (value) => {
        readableEl.textContent = formatDateKeyHuman(value);
        onChange(value);
      });
    }
    scroller.setItems(items, dateKey);
    readableEl.textContent = formatDateKeyHuman(dateKey);
  }

  return {
    setDate: (dateKey: string) => render(dateKey),
    getDate: () => scroller?.getSelected() ?? todayKey(),
  };
}
