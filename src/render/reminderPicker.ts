import { REMINDER_OPTIONS } from '../reminderOptions';

export interface ReminderPicker {
  setSelected: (keys: string[]) => void;
  getSelected: () => string[];
}

export function initReminderPicker(container: HTMLElement, onChange: () => void): ReminderPicker {
  const selected = new Set<string>();

  container.innerHTML = '';
  for (const option of REMINDER_OPTIONS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'reminder-chip';
    chip.dataset.key = option.key;
    chip.textContent = option.label;
    chip.addEventListener('click', () => {
      if (selected.has(option.key)) selected.delete(option.key);
      else selected.add(option.key);
      chip.classList.toggle('selected', selected.has(option.key));
      onChange();
    });
    container.appendChild(chip);
  }

  return {
    setSelected: (keys: string[]) => {
      selected.clear();
      keys.forEach((k) => selected.add(k));
      container.querySelectorAll<HTMLElement>('.reminder-chip').forEach((chip) => {
        chip.classList.toggle('selected', selected.has(chip.dataset.key ?? ''));
      });
    },
    getSelected: () => Array.from(selected),
  };
}
