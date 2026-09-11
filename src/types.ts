export interface CalEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  color: string; // hex
  note?: string;
  remindDayBefore?: boolean;
}

export interface EventColor {
  key: string;
  hex: string;
  label: string;
}
