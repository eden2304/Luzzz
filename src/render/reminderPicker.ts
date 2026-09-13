import type { ReminderSpec } from '../types';

export interface ReminderPicker {
  setSelected: (specs: ReminderSpec[]) => void;
  getSelected: () => ReminderSpec[];
}

export function initReminderPicker(container: HTMLElement, onChange: () => void): ReminderPicker {
  container.innerHTML = '';
  container.classList.add('reminder-picker');

  let dayBeforeSelected = false;
  let customSelected = false;

  const dayChip = document.createElement('button');
  dayChip.type = 'button';
  dayChip.className = 'reminder-chip';
  dayChip.textContent = 'יום לפני';
  dayChip.addEventListener('click', () => {
    dayBeforeSelected = !dayBeforeSelected;
    dayChip.classList.toggle('selected', dayBeforeSelected);
    onChange();
  });

  const customChip = document.createElement('div');
  customChip.className = 'reminder-chip reminder-chip-custom';

  const minutesInput = document.createElement('input');
  minutesInput.type = 'text';
  minutesInput.inputMode = 'numeric';
  minutesInput.pattern = '[0-9]*';
  minutesInput.maxLength = 3;
  minutesInput.placeholder = '30';
  minutesInput.className = 'reminder-minutes-input';
  minutesInput.setAttribute('aria-label', 'מספר דקות לפני האירוע');

  const customLabel = document.createElement('span');
  customLabel.textContent = 'דקות לפני';

  customChip.append(minutesInput, customLabel);

  function setCustomSelected(value: boolean): void {
    customSelected = value;
    customChip.classList.toggle('selected', value);
  }

  minutesInput.addEventListener('click', (e) => e.stopPropagation());
  minutesInput.addEventListener('input', () => {
    minutesInput.value = minutesInput.value.replace(/[^0-9]/g, '').slice(0, 3);
    setCustomSelected(Number(minutesInput.value) > 0);
    onChange();
  });

  // tapping the chip (but not the input itself, handled above) toggles it — if turning it
  // on with nothing typed yet, focus the input instead of "selecting" an empty reminder
  customChip.addEventListener('click', (e) => {
    if (e.target === minutesInput) return;
    if (!customSelected && !minutesInput.value) {
      minutesInput.focus();
      return;
    }
    setCustomSelected(!customSelected);
    onChange();
  });

  container.append(dayChip, customChip);

  return {
    setSelected: (specs) => {
      dayBeforeSelected = specs.some((s) => s.type === 'day_before');
      dayChip.classList.toggle('selected', dayBeforeSelected);

      const custom = specs.find((s) => s.type === 'minutes_before');
      minutesInput.value = custom?.minutesBefore ? String(custom.minutesBefore) : '';
      setCustomSelected(!!custom?.minutesBefore);
    },
    getSelected: () => {
      const specs: ReminderSpec[] = [];
      if (dayBeforeSelected) specs.push({ type: 'day_before' });
      const minutes = Number(minutesInput.value);
      if (customSelected && minutes > 0) specs.push({ type: 'minutes_before', minutesBefore: minutes });
      return specs;
    },
  };
}
