import { minutesToTime } from '../dateUtils';
import { createChipScroller, type ChipScroller, type ChipItem } from './chipScroller';

const STEP_MINUTES = 15;

function buildTimeItems(): ChipItem[] {
  const items: ChipItem[] = [];
  for (let m = 0; m < 24 * 60; m += STEP_MINUTES) {
    const time = minutesToTime(m);
    items.push({ value: time, line1: time, line2: '' });
  }
  return items;
}

const TIME_ITEMS = buildTimeItems();

export interface TimePicker {
  setTime: (time: string, smooth?: boolean) => void;
  getTime: () => string;
}

export function initTimePicker(
  container: HTMLElement,
  defaultTime: string,
  onChange: (time: string) => void
): TimePicker {
  const scroller: ChipScroller = createChipScroller(container, (value) => onChange(value));
  scroller.setItems(TIME_ITEMS, defaultTime);

  return {
    setTime: (time: string, smooth = true) => scroller.setSelected(time, smooth),
    getTime: () => scroller.getSelected(),
  };
}
