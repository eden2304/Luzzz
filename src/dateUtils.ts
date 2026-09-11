export const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export const HEBREW_WEEKDAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

export const HEBREW_WEEKDAYS_FULL = [
  'יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי',
  'יום חמישי', 'יום שישי', 'יום שבת',
];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

export function todayKey(): string {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface DayCell {
  date: Date;
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

/** Builds a fixed 42-cell (6x7) grid for the given month, starting on Sunday. */
export function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstWeekday = new Date(year, month, 1).getDay(); // 0 = Sunday
  const totalDaysThisMonth = daysInMonth(year, month);
  const totalDaysPrevMonth = daysInMonth(year, month - 1 < 0 ? 11 : month - 1);
  const prevYear = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const tKey = todayKey();

  const cells: DayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = totalDaysPrevMonth - i;
    const date = new Date(prevYear, prevMonth, day);
    const dateKey = toDateKey(prevYear, prevMonth, day);
    cells.push({ date, dateKey, day, inCurrentMonth: false, isToday: dateKey === tKey, isWeekend: date.getDay() === 5 || date.getDay() === 6 });
  }

  for (let day = 1; day <= totalDaysThisMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = toDateKey(year, month, day);
    cells.push({ date, dateKey, day, inCurrentMonth: true, isToday: dateKey === tKey, isWeekend: date.getDay() === 5 || date.getDay() === 6 });
  }

  let nextDay = 1;
  while (cells.length < 42) {
    const date = new Date(nextYear, nextMonth, nextDay);
    const dateKey = toDateKey(nextYear, nextMonth, nextDay);
    cells.push({ date, dateKey, day: nextDay, inCurrentMonth: false, isToday: dateKey === tKey, isWeekend: date.getDay() === 5 || date.getDay() === 6 });
    nextDay++;
  }

  return cells;
}

export function formatDateKeyHuman(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = HEBREW_WEEKDAYS_FULL[date.getDay()];
  return `${weekday}, ${d} ב${HEBREW_MONTHS[m - 1]} ${y}`;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
