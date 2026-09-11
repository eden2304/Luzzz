import type { EventColor } from './types';

export const EVENT_COLORS: EventColor[] = [
  { key: 'rose', hex: '#ff8fb8', label: 'ורוד' },
  { key: 'coral', hex: '#ff9d8a', label: 'קורל' },
  { key: 'peach', hex: '#ffbf86', label: 'אפרסק' },
  { key: 'lemon', hex: '#f4d35e', label: 'לימון' },
  { key: 'mint', hex: '#7fd9b6', label: 'מנטה' },
  { key: 'sky', hex: '#7fc4e0', label: 'תכלת' },
  { key: 'lavender', hex: '#b39ddb', label: 'לבנדר' },
  { key: 'plum', hex: '#d17fb0', label: 'שזיף' },
];

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].hex;
