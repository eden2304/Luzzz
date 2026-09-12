export type ReminderOffsetType =
  | 'day_before'
  | 'same_day_8am'
  | 'hour_before'
  | 'half_hour_before'
  | 'quarter_hour_before'
  | 'five_min_before';

export const REMINDER_OFFSET_TYPES: ReminderOffsetType[] = [
  'day_before',
  'same_day_8am',
  'hour_before',
  'half_hour_before',
  'quarter_hour_before',
  'five_min_before',
];

export function isReminderOffsetType(value: unknown): value is ReminderOffsetType {
  return typeof value === 'string' && (REMINDER_OFFSET_TYPES as string[]).includes(value);
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Computes the trigger moment for a reminder as a naive 'YYYY-MM-DD HH:MM:00' string
 * representing Israel wall-clock time — matching how `date`/`startTime` are entered
 * in the app. Uses a plain Date object purely as a wall-clock calculator (constructed
 * and read back with the same local getters), so the server's own timezone never
 * matters — only the relative +/- minutes arithmetic does.
 */
export function computeTriggerAt(
  offsetType: ReminderOffsetType,
  date: string,
  startTime: string
): string {
  const [y, m, d] = date.split('-').map(Number);
  const [h, min] = startTime.split(':').map(Number);
  const dt = new Date(y, m - 1, d, h, min);

  switch (offsetType) {
    case 'day_before':
      dt.setMinutes(dt.getMinutes() - 24 * 60);
      break;
    case 'same_day_8am':
      dt.setHours(8, 0, 0, 0);
      break;
    case 'hour_before':
      dt.setMinutes(dt.getMinutes() - 60);
      break;
    case 'half_hour_before':
      dt.setMinutes(dt.getMinutes() - 30);
      break;
    case 'quarter_hour_before':
      dt.setMinutes(dt.getMinutes() - 15);
      break;
    case 'five_min_before':
      dt.setMinutes(dt.getMinutes() - 5);
      break;
  }

  const datePart = `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
  const timePart = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}:00`;
  return `${datePart} ${timePart}`;
}

export function reminderBodyText(offsetType: ReminderOffsetType, startTime: string): string {
  switch (offsetType) {
    case 'day_before':
      return `מחר ב-${startTime}`;
    case 'same_day_8am':
      return `היום ב-${startTime}`;
    case 'hour_before':
      return 'בעוד שעה';
    case 'half_hour_before':
      return 'בעוד חצי שעה';
    case 'quarter_hour_before':
      return 'בעוד רבע שעה';
    case 'five_min_before':
      return 'בעוד 5 דקות';
  }
}
