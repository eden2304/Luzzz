import type { ReminderSpec } from '../types';

export interface ReminderPicker {
  setSelected: (specs: ReminderSpec[]) => void;
  getSelected: () => ReminderSpec[];
}

function createCustomRow(list: HTMLElement, onChange: () => void, initialValue?: number): void {
  const row = document.createElement('div');
  row.className = 'reminder-custom-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.pattern = '[0-9]*';
  input.maxLength = 3;
  input.placeholder = '30';
  input.className = 'reminder-minutes-input';
  input.setAttribute('aria-label', 'מספר דקות לפני האירוע');
  if (initialValue) input.value = String(initialValue);

  const label = document.createElement('span');
  label.className = 'reminder-custom-label';
  label.textContent = 'דקות לפני';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'reminder-remove-btn';
  removeBtn.setAttribute('aria-label', 'הסרת תזכורת זו');
  removeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="6" y1="18" x2="18" y2="6"/></svg>';

  input.addEventListener('input', () => {
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 3);
    onChange();
  });

  removeBtn.addEventListener('click', () => {
    row.remove();
    onChange();
  });

  row.append(input, label, removeBtn);
  list.appendChild(row);
}

export function initReminderPicker(container: HTMLElement, onChange: () => void): ReminderPicker {
  container.innerHTML = '';
  container.classList.add('reminder-picker');

  let dayBeforeSelected = false;

  const dayChip = document.createElement('button');
  dayChip.type = 'button';
  dayChip.className = 'reminder-chip';
  dayChip.textContent = 'יום לפני';
  dayChip.addEventListener('click', () => {
    dayBeforeSelected = !dayBeforeSelected;
    dayChip.classList.toggle('selected', dayBeforeSelected);
    onChange();
  });

  const customList = document.createElement('div');
  customList.className = 'reminder-custom-list';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'reminder-add-btn';
  addBtn.textContent = '+ הוספת תזכורת בדקות';
  addBtn.addEventListener('click', () => {
    createCustomRow(customList, onChange);
    customList.lastElementChild?.querySelector('input')?.focus();
  });

  container.append(dayChip, customList, addBtn);

  return {
    setSelected: (specs) => {
      dayBeforeSelected = specs.some((s) => s.type === 'day_before');
      dayChip.classList.toggle('selected', dayBeforeSelected);

      customList.innerHTML = '';
      for (const spec of specs) {
        if (spec.type === 'minutes_before' && spec.minutesBefore) {
          createCustomRow(customList, onChange, spec.minutesBefore);
        }
      }
    },
    getSelected: () => {
      const specs: ReminderSpec[] = [];
      if (dayBeforeSelected) specs.push({ type: 'day_before' });
      customList.querySelectorAll<HTMLInputElement>('.reminder-minutes-input').forEach((input) => {
        const minutesBefore = Number(input.value);
        if (minutesBefore > 0) specs.push({ type: 'minutes_before', minutesBefore });
      });
      return specs;
    },
  };
}
