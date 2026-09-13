export type ReminderOffsetType = 'day_before' | 'minutes_before';

export interface ReminderSpec {
  type: ReminderOffsetType;
  minutesBefore?: number; // required when type === 'minutes_before'
}

export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string; // hex
  note?: string;
  reminders?: ReminderSpec[];
}

export interface EventColor {
  key: string;
  hex: string;
  label: string;
}
