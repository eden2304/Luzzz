import { pad2 } from '../dateUtils';

const MINUTE_STEP = 5;
const ITEM_HEIGHT = 36;
const VISIBLE_ROWS = 5;
const PADDING = ((VISIBLE_ROWS - 1) / 2) * ITEM_HEIGHT;

const HOURS = Array.from({ length: 24 }, (_, h) => pad2(h));
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => pad2(i * MINUTE_STEP));

export interface TimePicker {
  setTime: (time: string, smooth?: boolean) => void;
  getTime: () => string;
}

/** Rounds to the nearest 5-minute step, carrying the hour when minutes round up to 60. */
function roundToStep(time: string): [hour: string, minute: string] {
  const [h, m] = time.split(':').map(Number);
  const totalMinutes = (Math.round((h * 60 + m) / MINUTE_STEP) * MINUTE_STEP) % (24 * 60);
  return [pad2(Math.floor(totalMinutes / 60)), pad2(totalMinutes % 60)];
}

/** One scrollable wheel column (hours, or minutes). Snapping and selection are driven
 * entirely by JS (scroll position -> nearest index), not CSS scroll-snap — a CSS
 * scroll-snap-type column nested inside the form sheet's own swipe-to-dismiss drag
 * caused iOS to misroute the touch gesture in an earlier version of this app's calendar,
 * so this app avoids that combination everywhere touch scrolling is layered inside
 * another gesture area. */
function createWheelColumn(
  container: HTMLElement,
  values: string[],
  onSettle: (value: string) => void
): { setValue: (value: string, smooth?: boolean) => void; getValue: () => string } {
  container.classList.add('wheel-col');
  container.style.paddingBlock = `${PADDING}px`;

  let current = values[0];
  const items: HTMLElement[] = [];

  for (const value of values) {
    const item = document.createElement('div');
    item.className = 'wheel-item';
    item.textContent = value;
    item.style.height = `${ITEM_HEIGHT}px`;
    item.addEventListener('click', () => scrollToIndex(values.indexOf(value), true));
    container.appendChild(item);
    items.push(item);
  }

  // keep bubbling from reaching the sheet's swipe-to-dismiss drag (same reasoning as the
  // day-chips scroller in render/calendar.ts)
  container.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
  container.addEventListener('touchmove', (e) => e.stopPropagation(), { passive: true });
  container.addEventListener('touchend', (e) => e.stopPropagation(), { passive: true });

  function indexFromScroll(): number {
    const idx = Math.round(container.scrollTop / ITEM_HEIGHT);
    return Math.min(values.length - 1, Math.max(0, idx));
  }

  function highlight(index: number): void {
    items.forEach((item, i) => item.classList.toggle('is-center', i === index));
  }

  function scrollToIndex(index: number, smooth: boolean): void {
    container.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'instant' });
    highlight(index);
    current = values[index];
  }

  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  container.addEventListener('scroll', () => {
    const index = indexFromScroll();
    highlight(index);
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => {
      const settledIndex = indexFromScroll();
      scrollToIndex(settledIndex, true);
      current = values[settledIndex];
      onSettle(current);
    }, 120);
  });

  return {
    setValue: (value, smooth = true) => {
      const index = Math.max(0, values.indexOf(value));
      scrollToIndex(index, smooth);
    },
    getValue: () => current,
  };
}

export function initTimePicker(
  container: HTMLElement,
  defaultTime: string,
  onChange: (time: string) => void
): TimePicker {
  container.classList.add('time-wheel-field');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'time-wheel-toggle';

  const panel = document.createElement('div');
  panel.className = 'time-wheel-panel hidden';
  const highlightBar = document.createElement('div');
  highlightBar.className = 'wheel-highlight';
  const hourCol = document.createElement('div');
  const colon = document.createElement('span');
  colon.className = 'wheel-colon';
  colon.textContent = ':';
  const minuteCol = document.createElement('div');
  panel.append(highlightBar, hourCol, colon, minuteCol);

  container.append(toggle, panel);

  const [defaultH, defaultM] = roundToStep(defaultTime);

  function currentTime(): string {
    return `${hourWheel.getValue()}:${minuteWheel.getValue()}`;
  }

  function refreshToggleLabel(): void {
    toggle.textContent = currentTime();
  }

  const hourWheel = createWheelColumn(hourCol, HOURS, () => {
    refreshToggleLabel();
    onChange(currentTime());
  });
  const minuteWheel = createWheelColumn(minuteCol, MINUTES, () => {
    refreshToggleLabel();
    onChange(currentTime());
  });

  hourWheel.setValue(defaultH, false);
  minuteWheel.setValue(defaultM, false);
  refreshToggleLabel();

  toggle.addEventListener('click', () => {
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    toggle.classList.toggle('is-open', opening);
    if (opening) {
      // the panel (and its wheel columns) was display:none until now, so every
      // setValue()/setTime() call made while collapsed silently no-opped its scrollTo —
      // you can't scroll an element with no size. The highlighted value was still tracked
      // correctly internally (the toggle label is always right), just not reflected in
      // scroll position — fix that up now that the columns can actually be measured/scrolled.
      hourWheel.setValue(hourWheel.getValue(), false);
      minuteWheel.setValue(minuteWheel.getValue(), false);
    }
  });

  return {
    setTime: (time, smooth = true) => {
      const [h, m] = roundToStep(time);
      hourWheel.setValue(h, smooth);
      minuteWheel.setValue(m, smooth);
      refreshToggleLabel();
    },
    getTime: () => currentTime(),
  };
}
