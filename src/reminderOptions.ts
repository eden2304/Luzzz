export interface ReminderOption {
  key: string;
  label: string;
}

// Keys must match server/reminderTypes.ts exactly — sent as-is to the API.
export const REMINDER_OPTIONS: ReminderOption[] = [
  { key: 'day_before', label: 'יום לפני' },
  { key: 'same_day_8am', label: '8 בבוקר של אותו יום' },
  { key: 'hour_before', label: 'שעה לפני' },
  { key: 'half_hour_before', label: 'חצי שעה לפני' },
  { key: 'quarter_hour_before', label: 'רבע שעה לפני' },
  { key: 'five_min_before', label: '5 דקות לפני' },
];
